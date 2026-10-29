import { beforeEach, expect, it, vi } from "vitest";
import type { PipelineSink } from "@/lib/pipeline/run";

const mocks = vi.hoisted(() => ({ synthesize: vi.fn(), active: 0, peak: 0 }));
// Reverse-speed sources: later registry entries finish first.
vi.mock("@/lib/pipeline/scrapers", () => ({
  SCRAPERS: ["nflverse", "cfbverse", "wikipedia", "espn", "youtube"].map((source, index) => ({
    source,
    run: async () => {
      mocks.active++; mocks.peak = Math.max(mocks.peak, mocks.active);
      await new Promise(resolve => setTimeout(resolve, (5 - index) * 10));
      mocks.active--;
      return { source, ok: true, facts: {} };
    },
  })),
}));
vi.mock("@/lib/pipeline/claude", () => ({ synthesize: mocks.synthesize }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({}) }));

beforeEach(() => { mocks.active = 0; mocks.peak = 0; mocks.synthesize.mockReset(); });
const sink = (): PipelineSink => ({ emit: vi.fn(), setStatus: vi.fn() });

it("overlaps sources up to the cap and keeps synthesis input in registry order", async () => {
  mocks.synthesize.mockResolvedValue({ full_name: "Fixture", bio: "", confirmed: {}, sources: [], awards: [], youtube_urls: [], photos: [] });
  const { executePipeline } = await import("@/lib/pipeline/run");
  await executePipeline(sink(), { full_name: "Fixture Player" });
  expect(mocks.peak).toBe(3);
  expect(mocks.synthesize.mock.calls[0][0].results.map((r: { source: string }) => r.source)).toEqual(["nflverse", "cfbverse", "wikipedia", "espn", "youtube"]);
});

it("stops starting sources once the sink refuses events (cancelled stream)", async () => {
  const { executePipeline } = await import("@/lib/pipeline/run");
  const cancelled = sink();
  let count = 0;
  cancelled.emit = vi.fn(() => { if (++count > 1) throw new Error("cancelled"); });
  await expect(executePipeline(cancelled, { full_name: "Fixture Player" })).rejects.toThrow("cancelled");
  expect(mocks.synthesize).not.toHaveBeenCalled();
});
