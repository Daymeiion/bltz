// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ client: vi.fn(), html: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/enrichment/safe-fetch", () => ({ fetchArticleMetadata: async (url: string, signal: AbortSignal) => {
  const page = await mocks.html(url, signal);
  return (await import("@/lib/enrichment/article-metadata")).extractArticleMetadata(page.html, page.url);
} }));
import { POST } from "@/app/api/preview-lockers/route";
import { previewContent } from "@/lib/preview-lockers/validation";
import { previewIdentityKey } from "@/lib/preview-lockers/enrichment";

const id = "00000000-0000-4000-8000-000000000001";
const content = previewContent.parse({ slug: "fixture-athlete", full_name: "Fixture Athlete", school: "Cal" });
const previous = { status: "complete", news_status: "complete", articles_accepted: 1, updated_at: "2026-09-29T01:00:00Z" };
let active: unknown[];
const fetcher = vi.fn(); const rpc = vi.fn(); const insert = vi.fn();
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("TAVILY_API_KEY", "unit-secret-do-not-log"); vi.stubGlobal("fetch", fetcher);
  active = [{ headline: "Previously saved article" }];
  const row = { id, ...content, revision: 1, created_at: "", updated_at: "" };
  mocks.client.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "admin" } } }) }, rpc,
    from(table: string) {
      if (table === "award_catalog") return { select: () => ({ eq: async () => ({ data: [] }) }) };
      if (table === "preview_enrichments") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { report: previous, identity_key: previewIdentityKey(content) } }) }) }) };
      return { insert: insert.mockReturnValue({ select: () => ({ single: async () => ({ data: row }) }) }) };
    },
  });
  rpc.mockImplementation(async (name, args) => {
    if (name === "save_preview_enrichment") {
      if (args.p_articles !== null) active = args.p_articles;
      return { data: { ...args.p_report, last_news_success: args.p_articles === null ? previous : args.p_report } };
    }
    return { data: name === "admit_preview_discovery" ? "admission" : true };
  });
  mocks.html.mockResolvedValue({ url: "https://sports.example.com/story", html: '<title>Fixture Athlete returns to Cal</title><meta name="description" content="Football career recalled."><p>RAW ARTICLE BODY DO NOT STORE</p>' });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const create = () => POST(new Request("http://localhost/api/preview-lockers", { method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify({ id, content }) }));
const results = () => Response.json({ results: [{ url: "https://sports.example.com/story", score: 1, content: "PROVIDER CONTENT DO NOT STORE", raw_content: "RAW BODY DO NOT STORE" }] });

it.each([
  ["missing", "search_not_configured"], [401, "search_auth_failed"], [403, "search_auth_failed"],
  [429, "search_rate_limited"], [432, "search_quota_exceeded"], [433, "search_quota_exceeded"],
  [500, "search_unavailable"], [503, "search_unavailable"], ["timeout", "search_timeout"],
  ["abort", "search_aborted"], ["network", "search_unavailable"], ["malformed", "search_invalid_response"],
] as const)("keeps base preview and prior articles for Tavily %s", async (failure, code) => {
  if (failure === "missing") vi.stubEnv("TAVILY_API_KEY", "");
  else if (typeof failure === "number") fetcher.mockImplementation(async () => new Response("PRIVATE PROVIDER ERROR", { status: failure }));
  else if (failure === "malformed") fetcher.mockImplementation(async () => Response.json({ results: [{}] }));
  else fetcher.mockRejectedValue(Object.assign(new Error("PRIVATE TRANSPORT ERROR"), { name: failure === "timeout" ? "TimeoutError" : failure === "abort" ? "AbortError" : "TypeError" }));
  const response = await create(); const body = await response.json();
  expect(response.status).toBe(201); expect(insert).toHaveBeenCalledWith(expect.objectContaining({ id }));
  expect(body.enrichment).toMatchObject({ news_status: "unavailable", errors: [code], last_news_success: previous });
  expect(rpc).toHaveBeenCalledWith("save_preview_enrichment", expect.objectContaining({ p_articles: null }));
  expect(active).toEqual([{ headline: "Previously saved article" }]);
  expect(JSON.stringify(body)).not.toMatch(/PRIVATE|unit-secret/);
  expect(mocks.html).not.toHaveBeenCalled(); expect(fetcher).toHaveBeenCalledTimes(failure === "missing" ? 0 : 1);
});

it("preserves the entire prior set if a later query fails after an earlier query succeeded", async () => {
  fetcher.mockImplementationOnce(async () => results()).mockImplementationOnce(async () => new Response(null, { status: 429 }));
  const body = await (await create()).json();
  expect(body.enrichment.news_status).toBe("unavailable"); expect(active).toEqual([{ headline: "Previously saved article" }]);
  expect(mocks.html).not.toHaveBeenCalled();
});

it("persists only vetted publisher metadata on successful discovery", async () => {
  fetcher.mockImplementation(async () => results());
  expect((await create()).status).toBe(201);
  expect(active).toHaveLength(1);
  expect(active[0]).toMatchObject({ headline: "Fixture Athlete returns to Cal", discovery_source: "tavily", status: "accepted", confidence: expect.closeTo(0.95) });
  expect(active[0]).not.toHaveProperty("score");
  expect(JSON.stringify(active)).not.toMatch(/DO NOT STORE|verified|unit-secret/);
  expect(mocks.html).toHaveBeenCalledWith("https://sports.example.com/story", expect.any(AbortSignal));
});

it("replaces articles only on a successful empty search", async () => {
  fetcher.mockImplementation(async () => Response.json({ results: [] }));
  const body = await (await create()).json();
  expect(body.enrichment.news_status).toBe("complete"); expect(active).toEqual([]);
  expect(rpc).toHaveBeenCalledWith("save_preview_enrichment", expect.objectContaining({ p_articles: [] }));
});

it("does not accept a high-scoring namesake without the saved affiliation", async () => {
  fetcher.mockImplementation(async () => results());
  mocks.html.mockResolvedValue({ url: "https://sports.example.com/story", html: '<title>Fixture Athlete football career at Stanford</title>' });
  const body = await (await create()).json();
  expect(active).toEqual([]); expect(body.enrichment.articles_rejected).toBe(1);
});
