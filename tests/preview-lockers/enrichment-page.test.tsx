import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ read: vi.fn(), user: vi.fn(), service: vi.fn(), enrichment: vi.fn(), map: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/lib/preview-lockers/server", () => ({ readPrivatePreview: mocks.read }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.user }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: mocks.service }));
vi.mock("@/lib/preview-lockers/enrichment", () => ({ readPreviewEnrichment: mocks.enrichment }));
vi.mock("@/lib/preview-lockers/mapper", () => ({ previewLockerData: mocks.map }));
vi.mock("@/lib/player/structured-stats", () => ({ readPreviewStructuredStats: async () => [] }));
vi.mock("@/app/player/[slug]/LockerView", () => ({ default: () => null }));
vi.mock("@/components/preview-lockers/ConversionSurface", () => ({ default: () => null }));
import Page from "@/app/preview-lockers/[slug]/page";
const row = { id: "preview-id", slug: "fixture", revision: 2, cfb_stats: [], publicLink: false };
beforeEach(() => {
  vi.clearAllMocks(); mocks.read.mockResolvedValue(row); mocks.map.mockReturnValue({ awards: [], articles: [] });
  mocks.user.mockResolvedValue({ scope: "user" }); mocks.service.mockReturnValue({ scope: "service" });
  mocks.enrichment.mockResolvedValue({ awards: [{ label: "Unverified honor" }], articles: [{ headline: "Persisted coverage" }] });
});
it("does not read enrichment or construct service access for unauthorized previews", async () => {
  mocks.read.mockResolvedValue(null);
  await expect(Page({ params: Promise.resolve({ slug: "fixture" }) })).rejects.toThrow("NOT_FOUND");
  expect(mocks.service).not.toHaveBeenCalled(); expect(mocks.user).not.toHaveBeenCalled(); expect(mocks.enrichment).not.toHaveBeenCalled();
});
it("uses the caller's RLS client for authorized private previews", async () => {
  const result = await Page({ params: Promise.resolve({ slug: "fixture" }) });
  expect(mocks.enrichment).toHaveBeenCalledWith({ scope: "user" }, row.id, row, 2);
  expect(mocks.service).not.toHaveBeenCalled(); expect(mocks.map).toHaveBeenCalledWith(row, false);
  expect(result.props.data.articles).toEqual([{ headline: "Persisted coverage" }]);
});
it("reads permitted evidence for a row already authorized by the published-link gate", async () => {
  const published = { ...row, publicLink: true }; mocks.read.mockResolvedValue(published);
  const result = await Page({ params: Promise.resolve({ slug: "fixture" }) });
  expect(mocks.enrichment).toHaveBeenCalledWith({ scope: "service" }, row.id, published, 2);
  expect(mocks.user).not.toHaveBeenCalled(); expect(mocks.map).toHaveBeenCalledWith(published, true);
  expect(result.props.data.articles).toHaveLength(1);
});
it("keeps the authorized Locker available when persisted enrichment cannot be read", async () => {
  mocks.enrichment.mockRejectedValue(new Error("unavailable"));
  const result = await Page({ params: Promise.resolve({ slug: "fixture" }) });
  expect(result.props.data.articles).toEqual([]);
});
