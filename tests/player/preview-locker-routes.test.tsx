import { beforeEach, describe, expect, it, vi } from "vitest";
import PreviewFilmsPage from "@/app/preview-lockers/[slug]/videos/page";
import PreviewVideoPage from "@/app/preview-lockers/[slug]/videos/[videoId]/page";

const mocks = vi.hoisted(() => ({ maybeSingle: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/lib/preview-lockers/read", () => ({ readPrivatePreview: async () => {
  const result = await mocks.maybeSingle();
  if (result.error || !result.data) throw new Error("NOT_FOUND");
  return { data: result.data };
} }));
vi.mock("@/lib/preview-lockers/server", () => ({ readPrivatePreview: async () => {
  const result = await mocks.maybeSingle();
  return result.error ? null : result.data;
} }));
vi.mock("@/app/player/[slug]/videos/FilmRoomView", () => ({ default: () => null }));
vi.mock("@/app/player/[slug]/videos/[videoId]/VideoDetailView", () => ({ default: () => null }));

const params = Promise.resolve({ slug: "preview", videoId: "film" });

describe("preview media route boundaries", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([{ data: null, error: null }, { data: null, error: { message: "access denied" } }])("does not render missing or inaccessible records", async (result) => {
    mocks.maybeSingle.mockResolvedValue(result);
    await expect(PreviewFilmsPage({ params })).rejects.toThrow("NOT_FOUND");
    await expect(PreviewVideoPage({ params })).rejects.toThrow("NOT_FOUND");
  });

  it("rejects video IDs that do not belong to the selected preview", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { slug: "preview", full_name: "Athlete", videos: [] }, error: null });
    await expect(PreviewVideoPage({ params })).rejects.toThrow("NOT_FOUND");
  });

  it("renders an existing preview video with preview navigation and no canonical write target", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { slug: "preview", full_name: "Athlete", videos: [{ id: "film", title: "Film", url: null, thumb: null }] }, error: null });
    const result = await PreviewVideoPage({ params });
    expect(result.props.data.lockerHref).toBe("/preview-lockers/preview");
    expect(result.props.data.playerId).toBeNull();
    expect(result.props.data.video.id).toBe("film");
  });
});
