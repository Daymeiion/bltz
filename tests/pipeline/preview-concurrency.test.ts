// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ run: Array.from({ length: 5 }, () => vi.fn()), synthesize: vi.fn() }));
vi.mock("@/lib/pipeline/scrapers", () => ({ SCRAPERS: ["nflverse", "cfbverse", "wikipedia", "espn", "youtube"].map((source, index) => ({ source, run: m.run[index] })) }));
vi.mock("@/lib/pipeline/claude", () => ({ synthesize: m.synthesize }));
import { executePipeline } from "@/lib/pipeline/run";
import type { ScraperResult } from "@/lib/pipeline/types";
const identity = { full_name: "Fixture Player", school: "Cal" };
const sink = () => ({ setStatus: vi.fn(), emit: vi.fn() });
beforeEach(() => { vi.resetAllMocks(); m.synthesize.mockResolvedValue({ ...identity, bio: "Career", awards: [], youtube_urls: [], photos: [], confirmed: {}, sources: [] }); });
it("overlaps three sources but preserves registry priority when they finish out of order", async () => {
  const finish: Array<(value: ScraperResult) => void> = []; let active = 0, maximum = 0;
  m.run.forEach((run, index) => run.mockImplementation(() => new Promise<ScraperResult>(resolve => { active++; maximum = Math.max(maximum, active); finish[index] = value => { active--; resolve(value); }; })));
  const running = executePipeline(sink(), identity, { concurrency: 3 });
  await vi.waitFor(() => expect(finish.filter(Boolean)).toHaveLength(3));
  finish[2]({ source: "wikipedia", ok: true, facts: { school: "Prose college" } });
  await vi.waitFor(() => expect(finish[3]).toBeTypeOf("function")); finish[3]({ source: "espn", ok: false, reason: "no_match" });
  await vi.waitFor(() => expect(finish[4]).toBeTypeOf("function")); finish[4]({ source: "youtube", ok: false, reason: "no_match" });
  finish[1]({ source: "cfbverse", ok: false, reason: "no_match" }); finish[0]({ source: "nflverse", ok: true, facts: { school: "Trusted college" } });
  await running; expect(maximum).toBe(3);
  expect(m.synthesize.mock.calls[0][0].results.map((item: ScraperResult) => item.source)).toEqual(["nflverse", "cfbverse", "wikipedia", "espn", "youtube"]);
});
it("stops scheduling remaining sources and synthesis after cancellation", async () => {
  m.run.forEach(run => run.mockImplementation(() => new Promise(() => {})));
  const controller = new AbortController(), running = executePipeline(sink(), identity, { concurrency: 3, signal: controller.signal });
  const assertion = expect(running).rejects.toThrow(); await vi.waitFor(() => expect(m.run[2]).toHaveBeenCalledOnce()); controller.abort(); await assertion;
  expect(m.run[3]).not.toHaveBeenCalled(); expect(m.run[4]).not.toHaveBeenCalled(); expect(m.synthesize).not.toHaveBeenCalled();
});
