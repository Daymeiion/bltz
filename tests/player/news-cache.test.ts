// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ discover: vi.fn(), provider: vi.fn(), metadata: vi.fn(), cache: vi.fn() }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: (...args: unknown[]) => unknown, keys: string[], options: unknown) => {
  mocks.cache(keys, options);
  const entries = new Map<string, unknown>();
  return (...args: unknown[]) => {
    const key = JSON.stringify(args);
    if (!entries.has(key)) entries.set(key, fn(...args));
    return entries.get(key);
  };
} }));
vi.mock("@/lib/enrichment/news", async original => ({ ...await original<typeof import("@/lib/enrichment/news")>(), discoverNews: mocks.discover }));
vi.mock("@/lib/enrichment/search-provider", () => ({ configuredSearchProvider: mocks.provider }));
vi.mock("@/lib/enrichment/safe-fetch", () => ({ fetchArticleMetadata: mocks.metadata }));
import { readPublicPlayerNews } from "@/lib/player/news";
const identity = { fullName: "Fixture Player", schools: ["Cal"], teams: ["SD"], sport: "football" };
beforeEach(() => { mocks.discover.mockReset(); mocks.provider.mockReturnValue({ name: "fixture" }); });
afterEach(() => vi.unstubAllEnvs());
it("reuses public results for the same identity and refreshes the key when career context changes", async () => {
  mocks.discover.mockResolvedValue({ articles: [{ headline: "Career football article" }], status: "complete", errors: ["PRIVATE_DIAGNOSTIC"] });
  const first = await readPublicPlayerNews("cached-player", identity);
  const second = await readPublicPlayerNews("cached-player", identity);
  expect(first).toEqual(second);
  expect(mocks.discover).toHaveBeenCalledTimes(1);
  expect(mocks.cache).toHaveBeenCalledWith(expect.any(Array), { revalidate: 3600 });
  expect(first).not.toHaveProperty("errors");
  await readPublicPlayerNews("cached-player", { ...identity, schools: ["Stanford"] });
  expect(mocks.discover).toHaveBeenCalledTimes(2);
});
it("does not search without server configuration", async () => {
  mocks.provider.mockReturnValue(null);
  expect(await readPublicPlayerNews("no-key", identity)).toEqual({ articles: [], status: "unavailable" });
  expect(mocks.discover).not.toHaveBeenCalled();
});
it("fails softly without exposing provider errors", async () => {
  mocks.discover.mockRejectedValue(new Error("PRIVATE_PROVIDER_ERROR"));
  expect(await readPublicPlayerNews("failed-provider", identity)).toEqual({ articles: [], status: "unavailable" });
});
