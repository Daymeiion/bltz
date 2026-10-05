import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), service: vi.fn(), tables: {} as Record<string, { data: unknown; error: unknown }>, queries: [] as Array<{ table: string; columns: string; limit: number; filters: Array<[string, unknown]> }>, optionalMediaUnavailable: false }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.auth }, rpc: mocks.rpc }) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: mocks.service }));
import { loadIntelligenceWorkspace, safeWorkspaceUrl, workspacePriority } from "@/lib/intelligence/workspace-server";
import { projectGraphEvidenceData } from "@/lib/intelligence/evidence-projection";

const PLAYER = "00000000-0000-4000-8000-000000000011";
const OTHER = "00000000-0000-4000-8000-000000000012";
const MOMENT = "00000000-0000-4000-8000-000000000013";
const SOURCE = "00000000-0000-4000-8000-000000000014";
const INGESTION = "00000000-0000-4000-8000-000000000015";
const EVIDENCE = "00000000-0000-4000-8000-000000000016";
const MEDIA = "00000000-0000-4000-8000-000000000017";
const PREVIEW = "00000000-0000-4000-8000-000000000018";
const portrait = "https://images.example.com/portrait.jpg";
const athlete = { id: PLAYER, name: "Synthetic Athlete", full_name: "Synthetic Athlete", slug: "synthetic-athlete", school: "Synthetic University", position: "LB", team: "Synthetic Trojans", is_verified: false, headshot_url: null, image_url: null, profile_image: null, current_status: null, youtube_urls: null, spotify_url: null };

function chain(table: string) {
  const record = { table, columns: "", limit: 1000, filters: [] as Array<[string, unknown]> };
  mocks.queries.push(record);
  function response() {
    const source = mocks.tables[table] ?? { data: [], error: null };
    if (mocks.optionalMediaUnavailable && table === "media" && record.columns.includes("license_status")) return { data: null, error: { code: "42703" } };
    if (source.error || !Array.isArray(source.data)) return source;
    let rows = source.data as Record<string, unknown>[];
    for (const [key, value] of record.filters) {
      if (key === "or") {
        const pattern = String(value).split(",")[0].split(".ilike.%")[1]?.replace(/%$/, "").toLowerCase() ?? "";
        rows = rows.filter(row => ["name", "full_name", "school", "team"].some(column => String(row[column] ?? "").toLowerCase().includes(pattern)));
      } else if (key.startsWith("ilike:")) rows = rows.filter(row => String(row[key.slice(6)] ?? "").toLowerCase().includes(String(value).replace(/^%|%$/g, "").toLowerCase()));
      else if (Array.isArray(value)) rows = rows.filter(row => value.includes(row[key]));
      else rows = rows.filter(row => row[key] === value);
    }
    return { data: rows.slice(0, record.limit), error: null };
  }
  const query = {
    select(columns: string) { record.columns = columns; return query; },
    eq(key: string, value: unknown) { record.filters.push([key, value]); return query; },
    in(key: string, value: unknown) { record.filters.push([key, value]); return query; },
    ilike(key: string, value: unknown) { record.filters.push([`ilike:${key}`, value]); return query; },
    or(value: string) { record.filters.push(["or", value]); return query; },
    order() { return query; },
    limit(value: number) { record.limit = value; return query; },
    maybeSingle() { const result = response(); return Promise.resolve({ ...result, data: Array.isArray(result.data) ? result.data[0] ?? null : result.data }); },
    then(resolve: (result: { data: unknown; error: unknown }) => unknown) { return Promise.resolve(response()).then(resolve); },
  };
  return query;
}

function reviewedGraph() {
  mocks.tables.moment_athletes = { data: [{ id: MEDIA, player_id: PLAYER, moment_id: MOMENT, relationship_type: "participant", status: "verified", confidence: 0.99 }], error: null };
  mocks.tables.moments = { data: [{ id: MOMENT, title: "Synthetic Washington performance", occurred_on: "2006-10-07", occurred_year: 2006, date_precision: "day", sport: "football", event_id: null, status: "verified", confidence: 0.99 }], error: null };
  mocks.tables.intelligence_sources = { data: [{ id: SOURCE, name: "Synthetic primary source", provider: "manual" }], error: null };
  mocks.tables.intelligence_ingestions = { data: [{ id: INGESTION, locator: "https://example.com/occurrence", fetched_at: "2026-09-30T00:00:00Z" }], error: null };
  mocks.tables.intelligence_evidence = { data: [{ id: EVIDENCE, player_id: PLAYER, moment_id: MOMENT, source_id: SOURCE, ingestion_id: INGESTION, fact_type: "moment_occurrence", statement: "Synthetic occurrence on the recorded day", structured_data: { occurredOn: "2006-10-07" }, status: "verified", confidence: 0.99 }], error: null };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tables = { players: { data: [athlete, { ...athlete, id: OTHER, name: "Other Athlete", full_name: "Other Athlete", slug: "other-athlete" }], error: null } };
  mocks.queries = [];
  mocks.optionalMediaUnavailable = false;
  mocks.auth.mockResolvedValue({ data: { user: { id: "internal-admin" } }, error: null });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.service.mockImplementation(() => ({ from: chain }));
});

describe("Live Intelligence workspace access", () => {
  it.each([401, 403, 503])("fails closed before service construction for status %s", async expected => {
    if (expected === 401) mocks.auth.mockResolvedValue({ data: { user: null }, error: null });
    if (expected === 403) mocks.rpc.mockResolvedValue({ data: false, error: null });
    if (expected === 503) mocks.rpc.mockResolvedValue({ data: null, error: { message: "private authorization failure" } });
    await expect(loadIntelligenceWorkspace({})).rejects.toMatchObject({ status: expected });
    expect(mocks.service).not.toHaveBeenCalled();
    expect(mocks.queries).toEqual([]);
  });
  it("rejects external or invalid selected IDs instead of resolving them as players", async () => {
    const result = await loadIntelligenceWorkspace({ athlete: "sportradar:123" });
    expect(result.result.selectionState).toBe("invalid");
    expect(result.profile).toBeNull();
    expect(mocks.queries.filter(query => query.table === "players").flatMap(query => query.filters)).not.toContainEqual(["id", "sportradar:123"]);
  });
});

describe("Priority directory and real search", () => {
  it("derives priority for any canonical athlete from complete graph facts, then selects it", async () => {
    reviewedGraph();
    const result = await loadIntelligenceWorkspace({ asOf: "2026-10-01" });
    expect(result.directory.state).toBe("ready");
    expect(result.directory.rows).toHaveLength(1);
    expect(result.directory.rows[0]).toMatchObject({ id: PLAYER, priorityLabel: "High", hasIntelligence: true });
    expect(result.result.selected?.id).toBe(PLAYER);
    expect(result.result.selected?.intelligence.signals).toHaveLength(1);
    expect(result.result.search.rows.find(row => row.id === OTHER)).toMatchObject({ priority: null, priorityLabel: "Awaiting review" });
  });
  it("suppresses the directory if evidence provenance is unavailable or a bound is exceeded", async () => {
    reviewedGraph();
    mocks.tables.intelligence_ingestions = { data: null, error: { code: "42501" } };
    expect((await loadIntelligenceWorkspace({ asOf: "2026-10-01" })).directory).toMatchObject({ state: "unavailable", rows: [] });
    reviewedGraph();
    const row = (mocks.tables.moment_athletes.data as unknown[])[0];
    mocks.tables.moment_athletes.data = Array.from({ length: 201 }, () => row);
    expect((await loadIntelligenceWorkspace({ asOf: "2026-10-01" })).directory).toMatchObject({ state: "unavailable", rows: [], truncated: true });
  });
  it("does not treat an unknown score or confidence as a zero-priority claim", async () => {
    expect(workspacePriority([])).toEqual({ priority: null, priorityLabel: "Awaiting review", hasIntelligence: false });
    expect(workspacePriority([40])).toMatchObject({ priorityLabel: "Low" });
    expect(workspacePriority([41, 70])).toMatchObject({ priority: 70, priorityLabel: "Mid" });
    expect(workspacePriority([71, 100])).toMatchObject({ priority: 100, priorityLabel: "High" });
    expect(workspacePriority([NaN, Infinity, -1, 101])).toMatchObject({ priority: null });
    reviewedGraph();
    (mocks.tables.moment_athletes.data as Array<Record<string, unknown>>)[0].confidence = null;
    expect((await loadIntelligenceWorkspace({ asOf: "2026-10-01" })).directory.rows).toEqual([]);
  });
  it("searches stored school/team/full names and exact linked Moment titles", async () => {
    reviewedGraph();
    const school = await loadIntelligenceWorkspace({ q: "Synthetic University", asOf: "2026-10-01" });
    expect(school.result.search.rows).toHaveLength(2);
    expect(mocks.queries.some(query => query.filters.some(([key, value]) => key === "or" && String(value).includes("full_name.ilike.") && String(value).includes("team.ilike.")))).toBe(true);
    const moment = await loadIntelligenceWorkspace({ q: "Washington", asOf: "2026-10-01" });
    expect(moment.result.search.rows.map(row => row.id)).toEqual([PLAYER]);
    expect(moment.result.selected?.id).toBe(PLAYER);
    await loadIntelligenceWorkspace({ q: "Robert),id.not.is.null" });
    const operands = mocks.queries.flatMap(query => query.filters.filter(([key]) => key === "or").map(([, value]) => String(value)));
    expect(operands.at(-1)).not.toContain("id.not.is.null");
  });
  it("keeps the prioritized list empty while allowing actual unreviewed athletes to be selected", async () => {
    const result = await loadIntelligenceWorkspace({ q: "Other Athlete" });
    expect(result.directory.rows).toEqual([]);
    expect(result.result.selected?.id).toBe(OTHER);
    expect(result.result.search.rows[0]).toMatchObject({ id: OTHER, priorityLabel: "Awaiting review" });
  });
});

describe("Media, profile and unavailable sections", () => {
  it("projects source performance to statistics without leaking review actors through either client graph path", async () => {
    reviewedGraph();
    const reviewId = "00000000-0000-4000-8000-000000000019";
    const actualStatistics = { total_tackles: 12, pass_deflections: 2, tackles_for_loss: 1 };
    const structured = { rights: "unknown", review: { version: 1, reviewedAt: "2026-10-01T03:55:39Z", reviewerId: reviewId }, _review: { reviewerId: reviewId }, factType: "performance", statistics: actualStatistics, significance: "not_evaluated", raw_payload: { authorization: "private" } };
    (mocks.tables.intelligence_evidence.data as unknown[]).push({ id: PREVIEW, player_id: PLAYER, moment_id: MOMENT, source_id: SOURCE, ingestion_id: INGESTION, fact_type: "performance", statement: "The source reports 12 tackles, 2 pass deflections and 1 tackle for loss.", structured_data: structured, status: "verified", confidence: 0.99 });
    const result = await loadIntelligenceWorkspace({ athlete: PLAYER, asOf: "2026-10-01" });
    const direct = result.result.selected?.evidence.rows.find(row => row.factType === "performance");
    const nested = result.result.selected?.moments.rows[0].evidence.find(row => row.factType === "performance");
    expect(direct?.data).toEqual({ statistics: actualStatistics });
    expect(nested?.data).toEqual({ statistics: actualStatistics });
    expect(JSON.stringify(result)).not.toContain(reviewId);
    expect(JSON.stringify(result)).not.toContain("reviewedAt");
    expect(JSON.stringify(result)).not.toContain("raw_payload");
    expect(result.result.selected?.intelligence.signals).toHaveLength(1);
    expect(result.directory.rows[0]?.hasIntelligence).toBe(true);
    expect(structured.review.reviewerId).toBe(reviewId); // Projection leaves stored audit history intact.
  });
  it("preserves rule/content inputs but excludes unknown, raw and identity metadata", () => {
    expect(projectGraphEvidenceData("moment_occurrence", { occurredOn: "2006-10-07", dateBasis: "described_event", _review: { reviewerId: PLAYER }, externalAthleteIdentity: PLAYER })).toEqual({ occurredOn: "2006-10-07", dateBasis: "described_event" });
    expect(projectGraphEvidenceData("career_milestone", { label: "100 tackles", statistic: "tackles", value: 100, threshold: 100, unit: "tackles", review: { version: 1 } })).toEqual({ label: "100 tackles", statistic: "tackles", value: 100, threshold: 100, unit: "tackles" });
    expect(projectGraphEvidenceData("content_item", { title: "Interview", url: "https://example.com/interview", publishedOn: "2025-09-08", releasedOn: null, describedEventOn: null, careerContext: "postcareer", sourcePaths: ["Article heading"], _review: { reviewerId: PLAYER } })).toEqual({ title: "Interview", url: "https://example.com/interview", publishedOn: "2025-09-08", releasedOn: null, describedEventOn: null, careerContext: "postcareer", sourcePaths: ["Article heading"] });
    expect(projectGraphEvidenceData("performance", { statistics_raw: { tackles: 4, reviewer_id: PLAYER, review: { version: 1 }, rights: "unknown", raw: { version: 1 }, draws: 2, assists: NaN, player_id: 123, interceptions: "1" } })).toEqual({ statistics: { tackles: 4, draws: 2 } });
    expect(projectGraphEvidenceData("play_activity", { type: "pass", actions: [{ pointer: "/periods/1/pbp/1/statistics/2", statType: "defense", externalAthleteIdentity: PLAYER, numericMetrics: { ast_tackle: 1, reviewer_id: 123 } }], _review: { reviewerId: PLAYER } })).toEqual({ type: "pass", actions: [{ pointer: "/periods/1/pbp/1/statistics/2", statType: "defense", numericMetrics: { ast_tackle: 1 } }] });
    expect(projectGraphEvidenceData("unknown_fact", { raw_payload: "private", user_id: PLAYER })).toEqual({});
    expect(projectGraphEvidenceData("constructor", { raw_payload: "private" })).toEqual({});
  });
  it("uses only an explicit canonical preview relationship, preserving unknown attribution and contacts", async () => {
    mocks.tables.preview_lockers = { data: [{ id: PREVIEW, player_id: PLAYER, slug: "real-private-preview", headshot_url: portrait, photos: [{ url: portrait, credits: "Source agency", sourceUrl: "https://example.com/photo" }], social: [] }], error: null };
    const result = await loadIntelligenceWorkspace({ athlete: PLAYER });
    expect(result.profile).toMatchObject({ athleteId: PLAYER, portraitUrl: portrait, lockerHref: "/preview-lockers/real-private-preview", email: null, phone: null, statusDate: null, portraitAttribution: { credits: "Source agency", creator: null, owner: null, license: null } });
    expect(mocks.queries.some(query => query.table === "preview_lockers" && query.filters.some(([key, value]) => key === "player_id" && value === PLAYER))).toBe(true);
    expect(result.result.search.rows.find(row => row.id === PLAYER)?.portraitUrl).toBe(portrait);
    mocks.tables.preview_lockers.data = [...mocks.tables.preview_lockers.data as unknown[], { ...(mocks.tables.preview_lockers.data as Record<string, unknown>[])[0], id: SOURCE }];
    const conflict = await loadIntelligenceWorkspace({ athlete: PLAYER });
    expect(conflict.profileState).toBe("unavailable");
    expect(conflict.profile?.portraitUrl).toBeNull();
    expect(conflict.profile?.lockerHref).toBeNull();
  });
  it("keeps legacy assets metadata-only if optional approval fields are unavailable", async () => {
    mocks.tables.media = { data: [{ id: MEDIA, player_id: PLAYER, title: "Existing athlete photo", kind: "photo", provenance: "scraped_candidate" }], error: null };
    mocks.optionalMediaUnavailable = true;
    const result = await loadIntelligenceWorkspace({ athlete: PLAYER });
    expect(result.media).toMatchObject({ state: "ready", rows: [{ id: MEDIA, previewUrl: null, publicationStatus: "unverified", momentIds: [] }] });
    expect(result.mediaPreviewState).toBe("unavailable");
    expect(result.momentMediaState).toBe("not_supported");
  });
  it("requires explicit legacy approval and a safe URL for playable/displayable media", async () => {
    const asset = { id: MEDIA, player_id: PLAYER, title: "Approved image", kind: "photo", provenance: "athlete_uploaded", url: portrait, source_url: null, credits: "Credit", license_status: "approved", public_locker_approved: true, license_kind: "athlete_permission", rights_holder: null };
    mocks.tables.media = { data: [asset], error: null };
    expect((await loadIntelligenceWorkspace({ athlete: PLAYER })).media.rows[0].previewUrl).toBe(portrait);
    mocks.tables.media.data = [{ ...asset, license_status: "pending" }];
    expect((await loadIntelligenceWorkspace({ athlete: PLAYER })).media.rows[0].previewUrl).toBeNull();
    mocks.tables.media.data = [{ ...asset, url: "https://example.com/a?token=private" }];
    expect((await loadIntelligenceWorkspace({ athlete: PLAYER })).media.rows[0].previewUrl).toBeNull();
  });
  it("distinguishes unavailable graph/media from genuine empty and reads no account or cohort data", async () => {
    mocks.tables.media = { data: null, error: { code: "PGRST205" } };
    mocks.tables.intelligence_evidence = { data: null, error: { code: "42501" } };
    const result = await loadIntelligenceWorkspace({ athlete: PLAYER });
    expect(result.media.state).toBe("unavailable");
    expect(result.content.state).toBe("unavailable");
    expect(result.result.selected?.intelligenceState).toBe("incomplete");
    expect(result.result.selected?.intelligence.signals).toEqual([]);
    expect(mocks.queries.map(query => query.table)).not.toContain("profiles");
    for (const query of mocks.queries) expect(query.columns).not.toMatch(/raw_payload|user_id|stripe|email|phone|\*/);
  });
  it.each(["javascript:alert(1)", "http://example.com/photo.jpg", "https://127.0.0.1/photo.jpg", "https://media.internal/photo.jpg", "https://user:password@example.com/photo.jpg", "https://example.com/file?api_key=secret", "https://example.com:8443/photo.jpg", "data:image/png;base64,xxx"])("rejects an unsafe browser reference: %s", value => {
    expect(safeWorkspaceUrl(value)).toBeNull();
  });
});
