// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { tavilySearch } from "@/lib/search/tavily";
import { configuredSearchProvider } from "@/lib/enrichment/search-provider";

const fetcher = vi.fn();
beforeEach(() => { vi.stubEnv("TAVILY_API_KEY", "unit-secret-do-not-log"); vi.stubGlobal("fetch", fetcher); fetcher.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

it("uses documented Bearer auth and a bounded basic search without generated answers or raw content", async () => {
  fetcher.mockResolvedValue(Response.json({ results: [{ title: "News", url: "https://example.com/story", content: "Snippet", raw_content: "DO NOT KEEP", score: 1 }], answer: "DO NOT KEEP" }));
  const result = await tavilySearch("Fixture Athlete Cal", 6, { includeDomains: [] });
  const [url, request] = fetcher.mock.calls[0];
  expect(url).toBe("https://api.tavily.com/search");
  expect(request).toMatchObject({ method: "POST", cache: "no-store", redirect: "error", headers: { Authorization: "Bearer unit-secret-do-not-log" } });
  expect(JSON.parse(request.body)).toEqual({ query: "Fixture Athlete Cal", max_results: 6, search_depth: "basic", topic: "general", auto_parameters: false, chunks_per_source: 1, include_raw_content: false, include_answer: false, include_images: false, include_domains: [] });
  expect(result).toEqual([{ title: "News", url: "https://example.com/story", snippet: "Snippet" }]);
});

it("projects only candidate URLs into news discovery, dropping provider scores and snippets", async () => {
  fetcher.mockResolvedValue(Response.json({ results: [{ title: "Wrong athlete", url: "https://example.com/story", score: 1, content: "Unverified identity claim" }] }));
  expect(await configuredSearchProvider()!.search("Fixture Athlete", new AbortController().signal)).toEqual([{ url: "https://example.com/story" }]);
});

it("accepts an explicit empty results array", async () => {
  fetcher.mockResolvedValue(Response.json({ results: [] }));
  expect(await tavilySearch("Fixture Athlete")).toEqual([]);
});

it.each([undefined, "", "   "])("never sends a request with missing/blank credentials (%s)", async key => {
  vi.stubEnv("TAVILY_API_KEY", key);
  expect(configuredSearchProvider()).toBeNull();
  await expect(tavilySearch("Fixture Athlete")).rejects.toMatchObject({ code: "search_not_configured" });
  expect(fetcher).not.toHaveBeenCalled();
});

it.each([
  [401, "search_auth_failed"], [403, "search_auth_failed"], [429, "search_rate_limited"],
  [432, "search_quota_exceeded"], [433, "search_quota_exceeded"], [500, "search_unavailable"],
  [503, "search_unavailable"], [504, "search_timeout"], [400, "search_invalid_request"],
] as const)("maps HTTP %s safely without logging or retrying", async (status, code) => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  fetcher.mockResolvedValue(new Response("private provider body unit-secret-do-not-log", { status }));
  await expect(tavilySearch("Fixture Athlete")).rejects.toMatchObject({ code, message: code });
  expect(fetcher).toHaveBeenCalledOnce(); expect(log).not.toHaveBeenCalled();
});

it.each([null, {}, { results: null }, { results: {} }, { results: [null] }, { results: [{ url: 3 }] }, { results: [{ title: "No URL" }] }, { results: [{ url: "" }] }])("rejects malformed results instead of treating them as successful empty discovery: %j", async body => {
  fetcher.mockResolvedValue(Response.json(body));
  await expect(tavilySearch("Fixture Athlete")).rejects.toMatchObject({ code: "search_invalid_response" });
});

it.each(["not JSON", JSON.stringify({ results: [], answer: "x".repeat(256 * 1024) })])("rejects invalid or oversized response bodies", async body => {
  fetcher.mockResolvedValue(new Response(body));
  await expect(tavilySearch("Fixture Athlete")).rejects.toMatchObject({ code: "search_invalid_response" });
});

it("bounds accepted result fields and result count", async () => {
  fetcher.mockResolvedValue(Response.json({ results: Array.from({ length: 3 }, () => ({ title: "x".repeat(600), content: "x".repeat(2000), url: "https://example.com" })) }));
  const result = await tavilySearch("x".repeat(500), 1);
  expect(result).toHaveLength(1); expect(result[0].title).toHaveLength(500); expect(result[0].snippet).toHaveLength(1200);
  expect(JSON.parse(fetcher.mock.calls[0][1].body).query).toHaveLength(400);
});

it("honors caller cancellation with no fetch for an already-aborted request", async () => {
  await expect(tavilySearch("Fixture", 1, { signal: AbortSignal.abort(new Error("private reason")) })).rejects.toMatchObject({ code: "search_aborted", message: "search_aborted" });
  expect(fetcher).not.toHaveBeenCalled();
});

it("applies the five-second deadline and normalizes a pending fetch cancellation", async () => {
  const controller = new AbortController();
  const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
  fetcher.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true })));
  const pending = tavilySearch("Fixture");
  const rejected = expect(pending).rejects.toMatchObject({ code: "search_timeout", message: "search_timeout" });
  controller.abort(new DOMException("private reason", "TimeoutError"));
  await rejected; expect(timeout).toHaveBeenCalledWith(5000); expect(fetcher).toHaveBeenCalledOnce();
});

it.each([["AbortError", "search_aborted"], ["TimeoutError", "search_timeout"], ["TypeError", "search_unavailable"]])("normalizes %s without leaking the underlying message", async (name, code) => {
  fetcher.mockRejectedValue(Object.assign(new Error("private transport details unit-secret-do-not-log"), { name }));
  await expect(tavilySearch("Fixture")).rejects.toMatchObject({ code, message: code });
});
