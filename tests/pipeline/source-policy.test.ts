// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ scrape: vi.fn(), synthesize: vi.fn() }));
vi.mock("@/lib/pipeline/scrapers", () => ({ SCRAPERS: [{ source: "wikipedia", run: mock.scrape }] }));
vi.mock("@/lib/pipeline/claude", () => ({ synthesize: mock.synthesize }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => { throw new Error("No hosted writes in this test"); } }));
import { executePipeline } from "@/lib/pipeline/run";
const identity = { full_name: "Synthetic Athlete" };
const draft = { full_name: identity.full_name, bio: "", confirmed: {}, sources: [], awards: [], youtube_urls: [], photos: [] };
beforeEach(() => { vi.resetAllMocks(); mock.synthesize.mockResolvedValue(draft); });
it("denies metadata-only/restricted facts before synthesis without misreporting a provider outage", async () => {
  mock.scrape.mockResolvedValue({ source: "wikipedia", ok: true, urls: ["https://www.pro-football-reference.com/players/F/Fixture00.htm"], facts: { games_played: 999, bio_text: "Restricted content" } });
  const sink = { emit: vi.fn(), setStatus: vi.fn() };
  await executePipeline(sink, identity);
  expect(mock.synthesize.mock.calls[0][0].results[0]).toMatchObject({ ok: false, reason: "blocked" });
  expect(mock.synthesize.mock.calls[0][0].results[0]).not.toHaveProperty("facts");
  expect(sink.emit.mock.calls.map(([event]) => event.message).join(" ")).toContain("configured source policy");
  expect(sink.setStatus).not.toHaveBeenCalledWith("error", expect.anything());
});
it("attaches bounded policy provenance to an accepted source before synthesis", async () => {
  mock.scrape.mockResolvedValue({ source: "wikipedia", ok: true, urls: ["https://en.wikipedia.org/wiki/Synthetic_Athlete"], facts: { full_name: identity.full_name } });
  await executePipeline({ emit: vi.fn(), setStatus: vi.fn() }, identity);
  expect(mock.synthesize.mock.calls[0][0].results[0]).toMatchObject({ ok: true, provenance: [{ source_domain: "en.wikipedia.org", discovery_provider: "wikipedia", attribution_required: true, policy_id: "wikipedia-player" }] });
});
it("retains the existing provider-outage guard for an actual unreachable source", async () => {
  mock.scrape.mockResolvedValue({ source: "wikipedia", ok: false, reason: "unreachable" });
  const sink = { emit: vi.fn(), setStatus: vi.fn() };
  await executePipeline(sink, identity);
  expect(sink.setStatus).toHaveBeenCalledWith("error", expect.objectContaining({ error: "all sources unreachable" }));
  expect(mock.synthesize).not.toHaveBeenCalled();
});
