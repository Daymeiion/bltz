import { describe, expect, it } from "vitest";
import { contentItemsFromEvidence, contentRecency } from "@/lib/intelligence/content";
import type { GraphEvidence } from "@/lib/intelligence/contracts";

// Actual reviewed source facts; synthetic source/evidence IDs await Graph promotion.
const athleteId = "c5dae871-a277-4256-9a0c-17a40940ad3f";
function observation(): GraphEvidence {
  return { id: "30000000-0000-4000-8000-000000000001", athleteId, momentId: null, factType: "content_item",
    statement: "The publisher interviews former NFL linebacker Keith Rivers about art collecting.",
    status: "verified", confidence: 0.99, ingestionId: null,
    source: { id: "40000000-0000-4000-8000-000000000001", name: "1stDibs Introspective", provider: "1stdibs_introspective",
      locator: "https://www.1stdibs.com/introspective-magazine/keith-rivers/", fetchedAt: "2026-10-01T03:55:39Z" },
    data: { title: "How Keith Rivers Went from NFL Linebacker to Blue-Chip Art Aficionado",
      url: "https://www.1stdibs.com/introspective-magazine/keith-rivers/", publisher: "1stDibs Introspective",
      contentType: "interview", publishedOn: "2021-11-07", releasedOn: null, describedEventOn: null,
      careerContext: "postcareer", matchMethod: "manual_nfl_teams_identity_context", matchConfidence: 0.99,
      identityStatus: "verified", metadataDateBasis: "Publisher header; interview session date not supplied", sourcePaths: ["article publication header"] },
  };
}
const asOf = "2026-10-01T04:00:00Z";

describe("content evidence normalization", () => {
  it("retains true postcareer publication date without inventing an interview date", () => {
    const item = contentItemsFromEvidence([observation()])[0];
    expect(item).toMatchObject({ athleteId, publishedOn: "2021-11-07", releasedOn: null, describedEventOn: null,
      careerContext: "postcareer", status: "verified", fetchedAt: "2026-10-01T03:55:39.000Z" });
    expect(contentRecency(item, asOf)).toBe("historical");
  });

  it("does not confuse a recent fetch with a recent article", () => {
    const item = contentItemsFromEvidence([observation()])[0];
    expect(contentRecency(item, asOf)).not.toBe("recent");
    expect(contentRecency(item, "2026-09-30T00:00:00Z")).toBe("future");
  });

  it("keeps a linked YouTube release unknown even when its newsletter is dated", () => {
    const evidence = observation();
    Object.assign(evidence.data, { contentType: "video", title: "Keith Rivers interview linked by publisher",
      url: "https://www.youtube.com/watch?v=_kVz5UI_tJE", youtubeId: "_kVz5UI_tJE", publishedOn: "2025-09-08" });
    const item = contentItemsFromEvidence([evidence])[0];
    expect(item.youtubeId).toBe("_kVz5UI_tJE");
    expect(item.releasedOn).toBeNull();
    expect(item.describedEventOn).toBeNull();
    expect(contentRecency(item, asOf)).toBe("incomplete");
  });

  it("returns only selected metadata, never raw source bodies/private arbitrary data", () => {
    const evidence = observation();
    evidence.data.secret = "private";
    evidence.data.rawBody = "unrelated copied content";
    const item = contentItemsFromEvidence([evidence])[0];
    expect(item).not.toHaveProperty("data");
    expect(item).not.toHaveProperty("rawBody");
    expect(item).not.toHaveProperty("secret");
  });

  it.each(["javascript:alert(1)", "data:text/html,test", "https://user:pass@example.test/article",
    "https://example.test/article?api_key=private", "https://example.test/article?access_token=private",
    "https://api.sportradar.com/nfl/feed", "http://localhost/article", "http://127.0.0.1/article",
    "http://10.0.0.1/article", "http://172.16.1.1/article", "http://192.168.1.1/article", "http://[fd00::1]/article"]) ("rejects unsafe item URL %s", unsafe => {
    const evidence = observation(); evidence.data.url = unsafe;
    expect(contentItemsFromEvidence([evidence])).toEqual([]);
  });

  it("omits source locators carrying credentials rather than returning them to the browser", () => {
    const evidence = observation(); evidence.source.locator = "https://example.test/article?secret=private";
    expect(contentItemsFromEvidence([evidence])[0].sourceUrl).toBeNull();
    expect(JSON.stringify(contentItemsFromEvidence([evidence]))).not.toContain("private");
  });

  it("does not merge rejected homonyms and keeps uncertain matches candidate", () => {
    const evidence = observation(); evidence.data.identityStatus = "rejected";
    expect(contentItemsFromEvidence([evidence])).toEqual([]);
    evidence.data.identityStatus = "candidate";
    const item = contentItemsFromEvidence([evidence])[0];
    expect(item.status).toBe("candidate");
    expect(contentRecency(item, asOf)).toBe("incomplete");
  });

  it("marks malformed dates incomplete instead of creating a performance date", () => {
    const evidence = observation(); evidence.data.publishedOn = "2026-02-30";
    const item = contentItemsFromEvidence([evidence])[0];
    expect(item.publishedOn).toBeNull();
    expect(item.describedEventOn).toBeNull();
    expect(item.incompleteReasons).toContain("invalid_publishedOn");
  });

  it("never classifies a candidate episode as recent even when a date is known", () => {
    const evidence = observation(); Object.assign(evidence.data, { contentType: "podcast", releasedOn: "2026-09-25", identityStatus: "candidate" });
    expect(contentRecency(contentItemsFromEvidence([evidence])[0], asOf)).toBe("incomplete");
  });

  it("evaluates only an explicit verified release and never asserts an activity spike", () => {
    const evidence = observation(); Object.assign(evidence.data, { contentType: "podcast", releasedOn: "2026-09-25" });
    expect(contentRecency(contentItemsFromEvidence([evidence])[0], asOf)).toBe("recent");
  });

  it("does not infer context from a publication date when the record says unknown", () => {
    const evidence = observation(); evidence.data.careerContext = "unknown";
    expect(contentItemsFromEvidence([evidence])[0].careerContext).toBe("unknown");
  });

  it("preserves independently established publication and event dates", () => {
    const evidence = observation(); Object.assign(evidence.data, { publishedOn: "2015-08-03", describedEventOn: "2015-07-30" });
    expect(contentItemsFromEvidence([evidence])[0]).toMatchObject({ publishedOn: "2015-08-03", describedEventOn: "2015-07-30" });
  });
});
