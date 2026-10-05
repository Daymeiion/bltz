import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LabView } from "@/app/admin/intelligence/LabView";
import { ContentEvidence } from "@/app/admin/intelligence/ContentEvidence";
import { confidenceLabel, safeSourceUrl } from "@/lib/intelligence/lab-format";
import type { LabResult } from "@/lib/intelligence/lab-types";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), service: vi.fn(), tables: {} as Record<string, { data: unknown; error: unknown }>, queries: [] as Array<{ table: string; select?: string; filters: Array<[string, unknown]> }> }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.auth }, rpc: mocks.rpc }) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: mocks.service }));
import { authorizeIntelligenceLab, loadIntelligenceLab } from "@/lib/intelligence/lab-server";
import { loadIntelligenceResearch } from "@/lib/intelligence/research-server";

const PLAYER = "c5dae871-a277-4256-9a0c-17a40940ad3f";
const MOMENT = "00000000-0000-4000-8000-000000000002";
const SOURCE = "00000000-0000-4000-8000-000000000003";
const EVIDENCE = "00000000-0000-4000-8000-000000000004";
const INGESTION = "00000000-0000-4000-8000-000000000005";
const player = { id: PLAYER, name: "Keith Rivers", full_name: "Keith Rivers", slug: "keith-rivers", school: "USC", position: "LB", team: null, is_verified: null };
function chain(table: string) {
  const record = { table, select: "", filters: [] as Array<[string, unknown]> };
  mocks.queries.push(record);
  const query = {
    select(value: string) { record.select = value; return query; },
    eq(key: string, value: unknown) { record.filters.push([key, value]); return query; },
    in(key: string, value: unknown) { record.filters.push([key, value]); return query; },
    ilike(key: string, value: unknown) { record.filters.push([key, value]); return query; },
    order() { return query; }, limit() { return query; },
    maybeSingle() { const result = mocks.tables[table] ?? { data: [], error: null }; return Promise.resolve({ ...result, data: Array.isArray(result.data) ? result.data[0] ?? null : result.data }); },
    then(resolve: (result: { data: unknown; error: unknown }) => unknown) { return Promise.resolve(mocks.tables[table] ?? { data: [], error: null }).then(resolve); },
  };
  return query;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.tables = { players: { data: [player], error: null } };
  mocks.queries = [];
  mocks.auth.mockResolvedValue({ data: { user: { id: "test-user" } }, error: null });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.service.mockImplementation(() => ({ from: chain }));
});

describe("Intelligence Lab access and graph boundaries", () => {
  it("rejects anonymous users before service-role construction", async () => {
    mocks.auth.mockResolvedValue({ data: { user: null }, error: null });
    await expect(loadIntelligenceLab({})).rejects.toMatchObject({ status: 401 });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it("rejects users without platform assignment despite profile/JWT roles", async () => {
    mocks.auth.mockResolvedValue({ data: { user: { id: "test-user", user_metadata: { role: "admin" } } }, error: null });
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    await expect(loadIntelligenceLab({})).rejects.toMatchObject({ status: 403 });
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it("fails closed on authorization RPC errors", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: { message: "private" } });
    await expect(authorizeIntelligenceLab()).rejects.toMatchObject({ status: 503 });
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it("uses canonical athlete IDs without reading cohort/contact/account data", async () => {
    const result = await loadIntelligenceLab({ athlete: PLAYER, asOf: "2026-09-30" });
    expect(result.selected?.id).toBe(PLAYER);
    expect(result.selected?.moments.rows).toEqual([]);
    expect(result.selected?.intelligence.signals).toEqual([]);
    expect(mocks.queries.map(row => row.table)).not.toContain("preview_lockers");
    for (const row of mocks.queries) {
      expect(row.select).not.toMatch(/raw_payload|raw_profile|stripe|email|user_id|\*/);
      if (["media", "videos", "intelligence_evidence", "moment_athletes", "player_external_ids"].includes(row.table)) expect(row.filters).toContainEqual(["player_id", PLAYER]);
    }
  });
  it("distinguishes missing graph schema from genuine empty data and suppresses intelligence", async () => {
    mocks.tables.moment_athletes = { data: null, error: { code: "PGRST205" } };
    const result = await loadIntelligenceLab({ athlete: PLAYER });
    expect(result.selected?.moments.state).toBe("unavailable");
    expect(result.selected?.intelligenceState).toBe("incomplete");
  });
  it("blocks signals if evidence or provenance reads fail", async () => {
    mocks.tables.intelligence_evidence = { data: null, error: { code: "42501" } };
    const result = await loadIntelligenceLab({ athlete: PLAYER });
    expect(result.selected?.evidence.state).toBe("unavailable");
    expect(result.selected?.intelligence.signals).toEqual([]);
  });
  it("does not treat an invalid selection as a provider ID or query arbitrary entities", async () => {
    const result = await loadIntelligenceLab({ athlete: "provider:123", q: "100%_\\" });
    expect(result.selectionState).toBe("invalid");
    expect(mocks.queries).toHaveLength(1);
    expect(mocks.queries[0].filters).toContainEqual(["name", "%100\\%\\_\\\\%"]);
  });
  it("reports bounded results and rejects malformed database rows", async () => {
    mocks.tables.players = { data: Array.from({ length: 26 }, () => player), error: null };
    expect((await loadIntelligenceLab({})).search.truncated).toBe(true);
    mocks.tables.players = { data: [{ id: "invalid" }], error: null };
    expect((await loadIntelligenceLab({})).search.state).toBe("unavailable");
  });
  it("evaluates a sourced exact-date Moment through a verified athlete relationship", async () => {
    // Synthetic occurrence used to test the pipeline; not asserted as Keith Rivers history.
    mocks.tables.moment_athletes = { data: [{ id: EVIDENCE, player_id: PLAYER, moment_id: MOMENT, relationship_type: "participant", status: "verified", confidence: 1 }], error: null };
    mocks.tables.moments = { data: [{ id: MOMENT, title: "Synthetic test occurrence", occurred_on: "2006-10-01", occurred_year: 2006, date_precision: "day", sport: "football", event_id: null, status: "verified", confidence: 1 }], error: null };
    mocks.tables.intelligence_sources = { data: [{ id: SOURCE, name: "Synthetic manual research", provider: "manual" }], error: null };
    mocks.tables.intelligence_ingestions = { data: [{ id: INGESTION, locator: null, fetched_at: "2026-09-29T12:00:00Z" }], error: null };
    mocks.tables.intelligence_evidence = { data: [{ id: EVIDENCE, player_id: PLAYER, moment_id: MOMENT, source_id: SOURCE, ingestion_id: INGESTION, fact_type: "moment_occurrence", statement: "Synthetic test occurrence date", structured_data: { occurredOn: "2006-10-01" }, status: "verified", confidence: 1 }], error: null };
    const result = await loadIntelligenceLab({ athlete: PLAYER, asOf: "2026-09-30" });
    expect(result.selected?.intelligence.signals).toHaveLength(1);
    expect(result.selected?.intelligence.opportunities).toHaveLength(1);
    expect(result.selected?.intelligence.signals[0].evidence[0].sourceId).toBe(SOURCE);
    mocks.tables.intelligence_sources = { data: [{ id: SOURCE, name: "Synthetic provider evidence", provider: "sportradar" }], error: null };
    mocks.tables.intelligence_ingestions = { data: [{ id: INGESTION, locator: "/nfl/official/trial/v7/en/games/test/statistics.json", fetched_at: "2026-09-29T12:00:00Z" }], error: null };
    const providerResult = await loadIntelligenceLab({ athlete: PLAYER, asOf: "2026-09-30" });
    expect(providerResult.selected?.intelligence.signals).toHaveLength(1);
    expect(providerResult.selected?.evidence.rows[0].source.locator).toMatch(/^\/nfl\//);
  });
});

describe("Intelligence Lab rendering", () => {
  const base: LabResult = { query: "", asOf: "2026-09-30", search: { state: "ready", rows: [], truncated: false }, selected: null, selectionState: "none" };
  it("shows accessible search, evaluation date, empty selection and no fabricated metrics", () => {
    const html = renderToStaticMarkup(<LabView result={base} />);
    expect(html).toContain('role="search"');
    expect(html).toContain("Evaluation date (UTC)");
    expect(html).toContain("No canonical athletes match");
    expect(html).toContain("Select an athlete");
    expect(html).not.toContain("demo data");
  });
  it("renders actual empty graph sections without suggesting missing data is complete", async () => {
    const result = await loadIntelligenceLab({ athlete: PLAYER });
    const html = renderToStaticMarkup(<LabView result={result} />);
    expect(html).toContain("Keith Rivers");
    expect(html).toContain("No Moments are linked");
    expect(html).toContain("Moment-to-media linking");
    expect(html).toContain("No opportunities have been derived");
  });
  it("suppresses secret-bearing/unsafe provider source links and displays unknown confidence", () => {
    expect(safeSourceUrl("javascript:alert(1)")).toBeNull();
    expect(safeSourceUrl("https://api.sportradar.com/path?api_key=secret")).toBeNull();
    expect(safeSourceUrl("https://example.com/item?token=secret")).toBeNull();
    expect(safeSourceUrl("https://user:password@example.com")).toBeNull();
    expect(safeSourceUrl("https://example.com/evidence")).toBe("https://example.com/evidence");
    expect(confidenceLabel(null)).toBe("Confidence not recorded");
  });
  it("keeps linked video release dates unknown when only the publisher newsletter is dated", () => {
    const html = renderToStaticMarkup(<ContentEvidence available evaluatedAt="2026-10-01T04:00:00Z" evidence={[{
      id: EVIDENCE, athleteId: PLAYER, momentId: null, factType: "content_item", statement: "Publisher links an interview with the former NFL linebacker.", status: "verified", confidence: 0.98, ingestionId: INGESTION,
      source: { id: SOURCE, name: "Publisher", provider: "public_web", locator: "https://example.com/newsletter", fetchedAt: "2026-10-01T03:55:00Z" },
      data: { title: "Post-career interview", url: "https://www.youtube.com/watch?v=_kVz5UI_tJE", publisher: "Publisher", contentType: "video", publishedOn: null, releasedOn: null, describedEventOn: null, careerContext: "postcareer", matchMethod: "explicit_publisher_link", matchConfidence: 0.98, identityStatus: "verified", metadataDateBasis: "Newsletter date is not the video upload date." },
    }]} />);
    expect(html).toContain("Post-career content");
    expect(html).toContain("Recency not established");
    expect(html).toContain("Newsletter date is not the video upload date");
    expect(html).toContain(`href="#evidence-${EVIDENCE}"`);
    expect(html).toContain("Publisher source");
    expect(html).not.toContain("Published within 30 days");
  });
});

describe("Intelligence evaluation time", () => {
  it("caps today's and future selected dates at the actual evaluation instant", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T03:56:00Z"));
    try {
      expect((await loadIntelligenceLab({ asOf: "2026-10-01" })).evaluatedAt).toBe("2026-10-01T03:56:00.000Z");
      expect((await loadIntelligenceLab({ asOf: "2026-10-07" })).evaluatedAt).toBe("2026-10-01T03:56:00.000Z");
      expect((await loadIntelligenceLab({ asOf: "2026-09-30" })).evaluatedAt).toBe("2026-09-30T23:59:59.999Z");
    } finally { vi.useRealTimers(); }
  });
});

describe("Private findings ledger read", () => {
  it("denies anonymous and non-admin visitors before constructing the service client", async () => {
    mocks.auth.mockResolvedValue({ data: { user: null }, error: null });
    await expect(loadIntelligenceResearch()).rejects.toMatchObject({ status: 401 });
    expect(mocks.service).not.toHaveBeenCalled();
    mocks.auth.mockResolvedValue({ data: { user: { id: "test-user" } }, error: null });
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    await expect(loadIntelligenceResearch()).rejects.toMatchObject({ status: 403 });
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it("reads only the latest non-cache 429 timestamp and performs no provider request", async () => {
    const requestedAt = new Date(Date.now() - 60_000).toISOString();
    mocks.tables.provider_request_logs = { data: [{ requested_at: requestedAt }], error: null };
    const result = await loadIntelligenceResearch();
    expect(result.cooldown.state).toBe("active");
    expect(mocks.queries).toEqual([{ table: "provider_request_logs", select: "requested_at", filters: [["provider", "sportradar"], ["cache_hit", false], ["response_status", 429]] }]);
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith("is_internal_admin");
  });
  it("distinguishes unavailable or malformed ledger data from an empty ledger", async () => {
    expect((await loadIntelligenceResearch()).cooldown.state).toBe("clear");
    mocks.tables.provider_request_logs = { data: null, error: { code: "42501" } };
    expect((await loadIntelligenceResearch()).cooldown.state).toBe("unavailable");
    mocks.tables.provider_request_logs = { data: [{ requested_at: "invalid" }], error: null };
    expect((await loadIntelligenceResearch()).cooldown.state).toBe("unavailable");
  });
});
