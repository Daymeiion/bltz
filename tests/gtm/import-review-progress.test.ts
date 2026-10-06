import { describe, expect, it } from "vitest";
import {
  captureImportReviewProgress, restoreImportReviewProgress, importPlayerReviewsSha256,
  validateImportReviewSelections, resolveImportPlayerReview, importReviewPage,
  GTM_REVIEW_CHECKPOINT_MAX_BYTES,
} from "@/lib/gtm/import-review-progress";
import type { PlayerMatchReview } from "@/lib/gtm/player-matching";

const sourceId = (number: number) => number.toString(16).padStart(64, "0");
function review(number: number, strength: PlayerMatchReview["strength"] = "possible"): PlayerMatchReview {
  return {
    sourceRecordId: sourceId(number), rowNumber: number + 1, displayName: "Synthetic Private Name", currentCompany: "Synthetic Private Company",
    strength, candidates: [{ id: "00-0000001", playerId: null, name: "Synthetic Private Name", team: "Synthetic Private Team", school: "Synthetic Private College", college: ["Synthetic Private College"], position: "QB", level: "NFL", status: "RET", matchType: strength === "strong" ? "name_and_team" : "name_only", confidence: strength === "strong" ? 0.96 : 0.65 }],
  };
}
const context = () => ({ contentSha256: "a".repeat(64), mapping: { displayName: "Full Name", currentCompany: "Organization" }, playerReviews: [review(1), review(2, "ambiguous"), review(3, "strong")] });

describe("GTM import review choices", () => {
  it("retains deferred possible and ambiguous reviews without linking or verifying a Player", () => {
    for (const strength of ["possible", "ambiguous"] as const) {
      const result = resolveImportPlayerReview(review(1, strength), false, undefined, true);
      expect(result).toMatchObject({ match: null, manualPlayerVerification: false, identityReviewStatus: strength });
      expect(result.identityReviewReason).toContain("deferred");
    }
  });
  it("keeps automatic exact suggestions unverified and explicit choices separate", () => {
    const strong = review(1, "strong");
    expect(resolveImportPlayerReview(strong, false, undefined, false)).toMatchObject({ manualPlayerVerification: false, identityReviewStatus: "clear", match: { id: "00-0000001" } });
    expect(resolveImportPlayerReview(strong, true, "00-0000001", false)).toMatchObject({ manualPlayerVerification: true, identityReviewStatus: "manual_verified" });
    expect(resolveImportPlayerReview(strong, true, null, false)).toMatchObject({ match: null, manualPlayerVerification: false, identityReviewStatus: "rejected" });
    expect(resolveImportPlayerReview(review(1), false, undefined, false).match).toBeNull();
  });
  it("validates current accepted reviews and rejects forged, overlapping, duplicate or strong deferrals", () => {
    const reviews = new Map(context().playerReviews.map((item) => [item.sourceRecordId, item]));
    expect(validateImportReviewSelections({ [sourceId(1)]: null }, [sourceId(2)], reviews)).toEqual({ matches: { [sourceId(1)]: null }, deferred: [sourceId(2)] });
    expect(() => validateImportReviewSelections({}, [sourceId(99)], reviews)).toThrow("invalid");
    expect(() => validateImportReviewSelections({}, [sourceId(3)], reviews)).toThrow("invalid");
    expect(() => validateImportReviewSelections({ [sourceId(1)]: null }, [sourceId(1)], reviews)).toThrow("invalid");
    expect(() => validateImportReviewSelections({}, [sourceId(1), sourceId(1)], reviews)).toThrow("invalid");
    expect(() => validateImportReviewSelections({ [sourceId(1)]: "forged" }, [], reviews)).toThrow("no longer valid");
    expect(() => validateImportReviewSelections([], [], reviews)).toThrow("invalid");
  });
  it("bounds large review and diagnostic pages without losing rows", () => {
    const rows = Array.from({ length: 535 }, (_, index) => index);
    const pages = Array.from({ length: 27 }, (_, index) => importReviewPage(rows, index + 1));
    expect(pages[0].rows).toHaveLength(20);
    expect(pages[26].rows).toHaveLength(15);
    expect(pages.flatMap((item) => item.rows)).toEqual(rows);
    expect(importReviewPage(rows, 999)).toMatchObject({ page: 27, pages: 27 });
    expect(importReviewPage([], NaN)).toMatchObject({ page: 1, pages: 1, total: 0 });
  });
});

describe("Opt-in import review checkpoints", () => {
  it("round trips decisions and deferrals without raw rows, names, companies or emails", async () => {
    const current = context();
    const selections = { matches: { [sourceId(1)]: "00-0000001", [sourceId(3)]: null }, deferred: [sourceId(2)] };
    const text = await captureImportReviewProgress(current, selections);
    expect(text).not.toMatch(/Synthetic Private|Full Name|Organization|email|confirmed|idempotency/i);
    expect(await restoreImportReviewProgress(text, current)).toEqual(selections);
  });
  it("rejects a different file, mapping or current candidate/context, including same-GSIS changes", async () => {
    const current = context();
    const text = await captureImportReviewProgress(current, { matches: { [sourceId(1)]: "00-0000001" }, deferred: [sourceId(2)] });
    await expect(restoreImportReviewProgress(text, { ...current, contentSha256: "b".repeat(64) })).rejects.toThrow("different CSV");
    await expect(restoreImportReviewProgress(text, { ...current, mapping: { displayName: "Other column" } })).rejects.toThrow("different CSV");
    for (const change of ["company", "team", "status", "playerId"] as const) {
      const changed = context();
      if (change === "company") changed.playerReviews[0].currentCompany = "Changed Company";
      else if (change === "playerId") changed.playerReviews[0].candidates[0].playerId = "00000000-0000-4000-8000-000000000001";
      else changed.playerReviews[0].candidates[0][change] = "Changed Value";
      await expect(restoreImportReviewProgress(text, changed)).rejects.toThrow("context changed");
    }
  });
  it("preserves unchanged choices during revalidation and clears only stale entries", async () => {
    const current = context();
    const text = await captureImportReviewProgress(current, { matches: { [sourceId(1)]: "00-0000001" }, deferred: [sourceId(2)] });
    const changed = context(); changed.playerReviews[0].candidates[0].team = "Changed Team";
    expect(await restoreImportReviewProgress(text, changed, true)).toEqual({ matches: {}, deferred: [sourceId(2)] });
  });
  it("rejects malformed, oversized or duplicate checkpoint decisions", async () => {
    const current = context();
    await expect(restoreImportReviewProgress("not-json", current)).rejects.toThrow("valid BLTZ");
    await expect(restoreImportReviewProgress("x".repeat(GTM_REVIEW_CHECKPOINT_MAX_BYTES + 1), current)).rejects.toThrow("exceeds");
    const candidate = JSON.parse(await captureImportReviewProgress(current, { matches: {}, deferred: [sourceId(1)] }));
    candidate.entries.push(candidate.entries[0]);
    await expect(restoreImportReviewProgress(JSON.stringify(candidate), current)).rejects.toThrow("repeated");
  });
  it("binds server summary to sorted candidates and exact context, not presentation order", async () => {
    const current = context().playerReviews;
    expect(await importPlayerReviewsSha256(current)).toBe(await importPlayerReviewsSha256([...current].reverse()));
    const changed = context().playerReviews; changed[0].currentCompany = "Changed Company";
    expect(await importPlayerReviewsSha256(current)).not.toBe(await importPlayerReviewsSha256(changed));
  });
});
