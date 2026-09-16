import { beforeEach, expect, it, vi } from "vitest";
import Page from "@/app/preview-lockers/[slug]/page";
import { previewContent } from "@/lib/preview-lockers/validation";
import { inspectCsv, reviewCsv } from "@/lib/preview-lockers/cfb-csv";
const mocks = vi.hoisted(() => ({ read: vi.fn(), stats: vi.fn() }));
vi.mock("@/lib/preview-lockers/server", () => ({ readPrivatePreview: mocks.read }));
vi.mock("@/lib/player/structured-stats", () => ({ readPreviewStructuredStats: mocks.stats }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/app/player/[slug]/LockerView", () => ({ default: () => null }));
vi.mock("@/components/preview-lockers/ConversionSurface", () => ({ default: () => null }));
beforeEach(() => vi.resetAllMocks());
it("does not read or render statistics before private preview authorization", async () => {
  mocks.read.mockResolvedValue(null);
  await expect(Page({ params: Promise.resolve({ slug: "fixture" }) })).rejects.toThrow("NOT_FOUND");
  expect(mocks.stats).not.toHaveBeenCalled();
});
it("prefers private college imports without replacing NFL statistics", async () => {
  const table = inspectCsv("Year,School,G,Sk\n2007,Fixture,12,2.5", "defense");
  const imported = reviewCsv(table, table.mapping, "defense", "https://www.sports-reference.com/cfb/players/fixture-1.html").imported;
  mocks.read.mockResolvedValue({ ...previewContent.parse({ slug: "fixture", full_name: "Fixture", cfb_stats: [imported] }), id: "fixture" });
  mocks.stats.mockResolvedValue([{ league: "nfl", source: "Sportradar", seasons: [], syncedAt: "2026-09-16" }, { league: "ncaafb", source: "Sportradar", seasons: [], syncedAt: "2026-09-16" }]);
  const result = await Page({ params: Promise.resolve({ slug: "fixture" }) });
  expect(result.props.data.structuredStats).toHaveLength(2);
  expect(result.props.data.structuredStats[0].seasons[0].statistics.sacks).toBe(2.5);
  expect(result.props.data.structuredStats[1].league).toBe("nfl");
  expect(result.props.data.athleteId).toBeNull();
});
