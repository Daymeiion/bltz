// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseGtmCsv } from "@/lib/gtm/import";
import { commitGtmCsv, previewGtmCsv } from "@/app/admin/gtm/actions";

const { requireAdmin, createClient, revalidate } = vi.hoisted(() => ({ requireAdmin: vi.fn(), createClient: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/rbac", () => ({ requireInternalAdmin: requireAdmin }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/cache", () => ({ revalidatePath: revalidate }));

const actor = "10000000-0000-4000-8000-000000000001";
const jobId = "20000000-0000-4000-8000-000000000001";
const canonicalId = "30000000-0000-4000-8000-000000000001";
const csv = "Display Name,LinkedIn URL,Company\nPossible Person,https://www.linkedin.com/in/possible-fixture,Independent studio\nAmbiguous Person,https://www.linkedin.com/in/ambiguous-fixture,\nStrong Person,https://www.linkedin.com/in/strong-fixture,Fixture Team\n";
type Candidate = { gsis_id: string; player_id: string | null; display_name: string; college_name: string | null; latest_team: string | null; player_position: string; status: string };
let candidates: Candidate[];
let job: Record<string, unknown> | null;
let jobError: { code: string } | null;
let commitError: { code: string } | null;
let previewArgs: Record<string, unknown>;
let queryFilters: Array<[string, unknown]>;
let contacts: Array<{ id: string; source_record_id?: string; linkedin_url?: string; email?: string }>;

const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
  if (name === "get_gtm_player_match_candidates") return { data: candidates, error: null };
  if (name === "prepare_gtm_import_job_v2") { previewArgs = args; return { data: { id: jobId }, error: null }; }
  if (name === "import_gtm_contacts_v2") return { data: commitError ? null : { id: jobId, rows_created: 3, rows_updated: 0, rows_duplicated: 0, rows_failed: 0 }, error: commitError };
  throw new Error(`Unexpected fixture RPC: ${name}`);
});

function from(table: string) {
  const result = () => table === "gtm_import_jobs" ? { data: job, error: jobError } : { data: contacts, error: null };
  const query = {
    select: () => query,
    eq: (field: string, value: unknown) => { if (table === "gtm_import_jobs") queryFilters.push([field, value]); return query; },
    in: () => query,
    maybeSingle: async () => result(),
    then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
  };
  return query;
}

function form(content = csv, filename = "fixture.csv") {
  const data = new FormData();
  data.set("file", new File([content], filename, { type: "text/csv" }));
  return data;
}

async function preview(content = csv) {
  const result = await previewGtmCsv(form(content));
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.message);
  job = { id: jobId, uploaded_by: actor, import_type: "linkedin_connections", status: "preview_ready",
    filename: previewArgs.p_filename, content_sha256: previewArgs.p_content_sha256,
    field_mapping: previewArgs.p_field_mapping, preview_summary: previewArgs.p_preview_summary,
    rows_created: 0, rows_updated: 0, rows_duplicated: 0, rows_failed: 0 };
  rpc.mockClear();
  queryFilters = [];
  const data = form(content);
  data.set("idempotencyKey", result.value.idempotencyKey);
  const uncertain = result.value.playerReviews.filter(review => review.strength !== "strong").map(review => review.sourceRecordId);
  data.set("deferredPlayerMatches", JSON.stringify(uncertain));
  return { data, value: result.value };
}

function importCalls() { return rpc.mock.calls.filter(([name]) => name === "import_gtm_contacts_v2"); }
function commitRows() { return importCalls()[0][1].p_rows as Array<Record<string, unknown>>; }

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue(undefined);
  createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: actor } }, error: null }) }, from, rpc });
  candidates = [
    { gsis_id: "possible", player_id: canonicalId, display_name: "Possible Person", college_name: "Fixture College", latest_team: "Fixture Team", player_position: "QB", status: "retired" },
    { gsis_id: "ambiguous-one", player_id: canonicalId, display_name: "Ambiguous Person", college_name: null, latest_team: "Team One", player_position: "QB", status: "retired" },
    { gsis_id: "ambiguous-two", player_id: null, display_name: "Ambiguous Person", college_name: null, latest_team: "Team Two", player_position: "RB", status: "retired" },
    { gsis_id: "strong", player_id: canonicalId, display_name: "Strong Person", college_name: "Fixture College", latest_team: "Fixture Team", player_position: "CB", status: "retired" },
  ];
  job = null; jobError = null; commitError = null; contacts = []; previewArgs = {}; queryFilters = [];
});

describe("GTM CSV server-action review security", () => {
  it("rejects an unauthorized caller before any database access", async () => {
    requireAdmin.mockRejectedValueOnce(new Error("unauthorized"));
    const result = await commitGtmCsv(form());
    expect(result).toMatchObject({ ok: false, code: "unauthorized" });
    expect(createClient).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("preserves deferred contacts unlinked and uncertain, while an exact context default remains unverified", async () => {
    const { data, value } = await preview();
    expect(await commitGtmCsv(data)).toMatchObject({ ok: true, value: { created: 3 } });
    const rows = commitRows();
    for (const strength of ["possible", "ambiguous"]) {
      const review = value.playerReviews.find(item => item.strength === strength)!;
      expect(rows.find(row => row.sourceRecordId === review.sourceRecordId)).toMatchObject({
        playerMasterGsisId: null, playerId: null, playerMatchVerified: false, identityReviewStatus: strength,
        identityReviewReason: expect.stringContaining("without a new Player link"),
      });
    }
    expect(rows.find(row => row.displayName === "Strong Person")).toMatchObject({ playerMasterGsisId: "strong", playerId: canonicalId, playerMatchVerified: false, playerMatchType: "name_and_team", identityReviewStatus: "clear" });
    expect(importCalls()[0][1].p_preview_summary).toEqual(previewArgs.p_preview_summary);
    expect(queryFilters).toContainEqual(["idempotency_key", value.idempotencyKey]);
  });

  it("marks only an explicit freshly recomputed candidate choice as manually verified", async () => {
    const { data, value } = await preview();
    const possible = value.playerReviews.find(review => review.strength === "possible")!;
    data.set("playerMatchDecisions", JSON.stringify({ [possible.sourceRecordId]: "possible" }));
    data.set("deferredPlayerMatches", JSON.stringify(value.playerReviews.filter(review => review.strength === "ambiguous").map(review => review.sourceRecordId)));
    expect(await commitGtmCsv(data)).toMatchObject({ ok: true });
    expect(commitRows().find(row => row.sourceRecordId === possible.sourceRecordId)).toMatchObject({ playerMasterGsisId: "possible", playerId: canonicalId, playerMatchType: "manual", playerMatchVerified: true, identityReviewStatus: "manual_verified" });
    expect(commitRows().find(row => row.displayName === "Strong Person")?.playerMatchVerified).toBe(false);
  });

  it.each(["unknown source", "forged player", "overlap", "duplicate deferral", "strong deferral", "unfinished review"])("rejects %s before importing", async attack => {
    const { data, value } = await preview();
    const possible = value.playerReviews.find(review => review.strength === "possible")!;
    const strong = value.playerReviews.find(review => review.strength === "strong")!;
    if (attack === "unknown source") data.set("deferredPlayerMatches", JSON.stringify(["f".repeat(64)]));
    if (attack === "forged player") data.set("playerMatchDecisions", JSON.stringify({ [possible.sourceRecordId]: "not-a-candidate" }));
    if (attack === "overlap") data.set("playerMatchDecisions", JSON.stringify({ [possible.sourceRecordId]: "possible" }));
    if (attack === "duplicate deferral") data.set("deferredPlayerMatches", JSON.stringify([possible.sourceRecordId, possible.sourceRecordId]));
    if (attack === "strong deferral") data.set("deferredPlayerMatches", JSON.stringify([strong.sourceRecordId]));
    if (attack === "unfinished review") data.delete("deferredPlayerMatches");
    expect(await commitGtmCsv(data)).toMatchObject({ ok: false, code: "invalid" });
    expect(importCalls()).toHaveLength(0);
  });

  it.each(["actor", "file hash", "filename", "mapping", "import type", "status", "missing job", "query error"])("rejects a mismatching preview %s before importing", async mismatch => {
    const { data } = await preview();
    if (mismatch === "actor") job!.uploaded_by = "10000000-0000-4000-8000-000000000002";
    if (mismatch === "file hash") job!.content_sha256 = "f".repeat(64);
    if (mismatch === "filename") job!.filename = "another.csv";
    if (mismatch === "mapping") job!.field_mapping = { displayName: "Company" };
    if (mismatch === "import type") job!.import_type = "contacts_csv";
    if (mismatch === "status") job!.status = "committing";
    if (mismatch === "missing job") job = null;
    if (mismatch === "query error") jobError = { code: "42501" };
    expect(await commitGtmCsv(data)).toMatchObject({ ok: false, code: "invalid" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each(["candidate context", "canonical association", "missing historical digest"])("rejects %s drift after preview, even when GSIS identifiers stay stable", async drift => {
    const { data } = await preview();
    if (drift === "candidate context") candidates[0].college_name = "Another College";
    if (drift === "canonical association") candidates[0].player_id = null;
    if (drift === "missing historical digest") {
      const summary = job!.preview_summary as Record<string, unknown>;
      job!.preview_summary = Object.fromEntries(Object.entries(summary).filter(([key]) => key !== "playerReviewSha256"));
    }
    expect(await commitGtmCsv(data)).toMatchObject({ ok: false, code: "invalid", message: expect.stringContaining("candidates changed") });
    expect(importCalls()).toHaveLength(0);
  });

  it.each(["completed", "completed_with_errors"])("returns a matching %s receipt without matching or mutating again", async status => {
    const { data } = await preview();
    Object.assign(job!, { status, rows_created: 2, rows_updated: 1, rows_duplicated: 4, rows_failed: status === "completed" ? 0 : 1 });
    expect(await commitGtmCsv(data)).toEqual({ ok: true, value: { jobId, created: 2, updated: 1, skipped: 4, failed: status === "completed" ? 0 : 1 } });
    expect(rpc).not.toHaveBeenCalled();
    job!.uploaded_by = "10000000-0000-4000-8000-000000000002";
    expect(await commitGtmCsv(data)).toMatchObject({ ok: false, code: "invalid" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects an import where all normalized contact identities now collide", async () => {
    const { data } = await preview();
    const parsed = parseGtmCsv(Buffer.from(csv));
    contacts = parsed.rows.flatMap((row, index) => [
      { id: `source-${index}`, source_record_id: row.sourceRecordId },
      { id: `profile-${index}`, linkedin_url: row.linkedinUrl },
    ]);
    expect(await commitGtmCsv(data)).toMatchObject({ ok: false, code: "invalid" });
    expect(importCalls()).toHaveLength(0);
  });

  it("reports a missing import RPC without pretending contacts were imported", async () => {
    const { data } = await preview();
    commitError = { code: "PGRST202" };
    expect(await commitGtmCsv(data)).toMatchObject({ ok: false, code: "unavailable" });
    expect(revalidate).not.toHaveBeenCalled();
  });
});
