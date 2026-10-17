import { beforeEach, expect, it, vi } from "vitest";
import PlayerLocker from "@/app/player/[slug]/page";

const mocks = vi.hoisted(() => ({ client: vi.fn(), news: vi.fn(), stats: vi.fn(), eq: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/player/news", () => ({ readPublicPlayerNews: mocks.news }));
vi.mock("@/lib/player/structured-stats", () => ({ readStructuredStats: mocks.stats }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/app/player/[slug]/LockerView", () => ({ default: () => null }));

const player = { id: "canonical-player", slug: "alex-smith", name: "Alex Smith", full_name: "Alex Smith", school: "Utah", college: ["Utah"],
  nfl_player: { latest_team: "KC", draft_team: "SF", college_name: "Utah" }, cfb_team: null };
function database(row: unknown) {
  return { from: (table: string) => {
    const result = { data: table === "players" ? row : table === "media" || table === "videos" || table === "awards" ? [] : null, error: null };
    const chain: Record<string, unknown> = { maybeSingle: async () => result, then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve) };
    for (const key of ["select", "order", "limit", "in"]) chain[key] = () => chain;
    chain.eq = (...args: unknown[]) => { mocks.eq(...args); return chain; };
    return chain;
  } };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.client.mockResolvedValue(database(player));
  mocks.stats.mockResolvedValue([{ league: "nfl", seasons: [{ team: "Washington Commanders" }] }]);
  mocks.news.mockResolvedValue({ articles: [{ headline: "Actual career coverage" }], status: "complete" });
});
it("does not discover news for an invisible or missing canonical player", async () => {
  mocks.client.mockResolvedValue(database(null));
  await expect(PlayerLocker({ params: Promise.resolve({ slug: "alex-smith" }) })).rejects.toThrow("NOT_FOUND");
  expect(mocks.eq).toHaveBeenCalledWith("visibility", true);
  expect(mocks.news).not.toHaveBeenCalled();
});
it("streams the Locker immediately, then attaches news for the canonical identity and saved history", async () => {
  const page = await PlayerLocker({ params: Promise.resolve({ slug: "alex-smith" }) });
  expect(page.props.data.fullName).toBe("Alex Smith");
  expect(mocks.news).toHaveBeenCalledWith("canonical-player", expect.objectContaining({ fullName: "Alex Smith", schools: ["Utah"], teams: ["KC", "SF", "Washington Commanders"], sport: "football" }));
  expect((await page.props.newsPromise).articles).toEqual([{ headline: "Actual career coverage" }]);
});
it("keeps the public Locker available and distinguishes provider failure from zero matches", async () => {
  mocks.news.mockResolvedValue({ articles: [], status: "unavailable" });
  const page = await PlayerLocker({ params: Promise.resolve({ slug: "alex-smith" }) });
  expect(page.props.data.athleteId).toBe("canonical-player");
  expect(await page.props.newsPromise).toEqual({ articles: [], status: "unavailable" });
});
