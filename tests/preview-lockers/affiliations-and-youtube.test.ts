import { describe, expect, it } from "vitest";
import { suggestPreviewAffiliations } from "@/lib/preview-lockers/affiliations";
import { parseYouTubeBatch } from "@/lib/preview-lockers/youtube-bulk";
import { previewRecord } from "@/lib/preview-lockers/validation";
import { previewMediaBelongsTo, previewContent } from "@/lib/preview-lockers/validation";
import { previewPhotoData } from "@/lib/preview-lockers/mapper";

describe("preview builder source suggestions", () => {
  it("adds the master school and every distinct imported team with colors", () => {
    const record = previewRecord.parse({ id: "11111111-1111-4111-8111-111111111111", revision: 1,
      created_at: "2026-09-29T00:00:00Z", updated_at: "2026-09-29T00:00:00Z",
      slug: "example-player", full_name: "Example Player", schools: [],
      pro_teams: [{ label: "Dallas Cowboys", color: "#003594", logo: null }] });
    const result = suggestPreviewAffiliations(record, { college: "California", seasons: [
      { team: "Dallas Cowboys" }, { team: "Las Vegas Raiders" }, { team: "Las Vegas Raiders" },
    ] }, [{ display_name: "California", abbreviation: "CAL", primary_color: "#003262", logo_url: null, logo_dark_url: null }]);
    expect(result.schools).toEqual([{ label: "CAL", color: "#003262", logo: null }]);
    expect(result.pro_teams.map(team => team.label)).toEqual(["Dallas Cowboys", "Las Vegas Raiders"]);
    expect(result.pro_teams[1].color).toBe("#000000");
  });
});

describe("bulk YouTube entry", () => {
  it("deduplicates video IDs and gives each link an editable title and thumbnail", () => {
    const result = parseYouTubeBatch("https://youtu.be/abcDEF12345\nhttps://www.youtube.com/watch?v=abcDEF12345\nhttps://www.youtube.com/watch?v=xyz9876_QrS\nhttps://example.com", []);
    expect(result.videos).toHaveLength(2);
    expect(result.duplicate).toBe(1);
    expect(result.invalid).toBe(1);
    expect(result.videos[0]).toMatchObject({ title: "YouTube video 1", thumb: "https://img.youtube.com/vi/abcDEF12345/hqdefault.jpg" });
  });
});

describe("private ad banner", () => {
  it("requires the image path to belong to the preview and keeps empty banners collapsed", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const content = previewContent.parse({ slug: "example-player", full_name: "Example Player" });
    expect(previewPhotoData({ ...content, id, revision: 1, created_at: "now", updated_at: "now" }).adBanner).toBeNull();
    const path = `${id}/photos/22222222-2222-4222-8222-222222222222.png`;
    expect(previewMediaBelongsTo(id, { ...content, photo_room_banner_storage_path: path })).toBe(true);
    expect(previewMediaBelongsTo(id, { ...content, photo_room_banner_storage_path: path.replace(id, "33333333-3333-4333-8333-333333333333") })).toBe(false);
    expect(previewPhotoData({ ...content, id, revision: 1, created_at: "now", updated_at: "now", photo_room_banner_link: "https://advertiser.example", photo_room_banner_storage_path: path, photo_room_banner_resolved_url: "https://private.example/signed" }).adBanner).toEqual({ imageUrl: "https://private.example/signed", linkUrl: "https://advertiser.example" });
  });
});
