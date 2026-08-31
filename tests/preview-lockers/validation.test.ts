// @vitest-environment node
import { describe, it, expect } from "vitest";
import { previewContent, isPreviewUrl, equivalentPreview, youtubeEmbed } from "@/lib/preview-lockers/validation";
import { mergeSuggestions } from "@/lib/preview-lockers/merge-suggestions";
import { previewLockerData, previewPhotoData } from "@/lib/preview-lockers/mapper";
import { readBody } from "@/lib/preview-lockers/server";

describe("private preview validation", () => {
  it.each(["http://example.com/x", "HTTPS://example.com/x", "https://example.com:443/x", "https://user:pass@example.com/x", "https://127.0.0.1/x", "https://host.local/x", "https://host.invalid/x", "https://example.com/\u0001", "https://example.com/ x", "https://example.com\\x", "javascript:alert(1)"])("rejects unsafe/unrepresentable URL %s", url => expect(isPreviewUrl(url)).toBe(false));
  it.each(["https://example.com/x", "https://EXAMPLE.com/x?q=1#photo", "https://www.youtube.com/watch?v=abcdefghijk"])("accepts public reference %s", url => expect(isPreviewUrl(url)).toBe(true));
  it("bounds fields and nested arrays, rejects unknown fields and duplicate IDs", () => {
    const draft = { slug: "synthetic-preview", full_name: "Synthetic Preview" };
    expect(previewContent.safeParse({ ...draft, dob: "2000-01-01" }).success).toBe(false);
    expect(previewContent.safeParse({ ...draft, bio: "x".repeat(4001) }).success).toBe(false);
    expect(previewContent.safeParse({ ...draft, bio: "bad\u0001" }).success).toBe(false);
    const video = { id: "v1", title: "Demo", url: "https://example.com/demo.mp4", thumb: null };
    expect(previewContent.safeParse({ ...draft, videos: [video, video] }).success).toBe(false);
    expect(previewContent.safeParse({ ...draft, videos: [{ ...video, verified: true }] }).success).toBe(false);
    expect(previewContent.safeParse({ ...draft, videos: Array.from({ length: 25 }, (_, i) => ({ ...video, id: `v${i}` })) }).success).toBe(false);
  });
  it("compares JSONB objects independent of key order, retaining array order", () => {
    expect(equivalentPreview([{ id: "x", title: "y" }], [{ title: "y", id: "x" }])).toBe(true);
    expect(equivalentPreview([1, 2], [2, 1])).toBe(false);
    expect(equivalentPreview({ id: 1 }, { id: 1, extra: null })).toBe(false);
  });
  it("never overwrites entered content with discovery fallback or suggestions", () => {
    const current = previewContent.parse({ slug: "synthetic-preview", full_name: "Synthetic Preview", bio: "Manual biography", photos: [{ id: "p1", url: "https://example.com/p.jpg", title: "Manual photo", level: "cfb" }] });
    const fallback = previewContent.parse({ slug: "other-preview", full_name: "Other suggestion" });
    expect(mergeSuggestions(current, fallback)).toEqual(current);
    expect(mergeSuggestions(current, { ...fallback, school: "Suggested School", bio: "Overwrite" })).toMatchObject({ bio: "Manual biography", school: "Suggested School", photos: current.photos });
  });
  it("projects full views without a canonical identity or raw input", () => {
    const row = { ...previewContent.parse({ slug: "demo-person", full_name: "Demo Person" }), id: "00000000-0000-4000-8000-000000000001", revision: 1, created_at: "", updated_at: "" };
    for (const dto of [previewLockerData(row), previewPhotoData(row)]) {
      expect(dto).toMatchObject({ athleteId: null, privateDemo: true });
      expect(dto).not.toHaveProperty("created_by"); expect(dto).not.toHaveProperty("raw_sources");
    }
  });
  it("only embeds exact supported YouTube hosts", () => {
    expect(youtubeEmbed("https://youtu.be/abcdefghijk")).toBe("https://www.youtube-nocookie.com/embed/abcdefghijk");
    expect(youtubeEmbed("https://youtube.com.evil.com/watch?v=abcdefghijk")).toBeNull();
  });
  it("enforces origin, content type and actual streamed byte limits", async () => {
    const request = (body: string, headers = {}) => new Request("http://localhost/api/preview-lockers", { method: "POST", headers: { origin: "http://localhost", "content-type": "application/json", ...headers }, body });
    await expect(readBody(request("{}", { origin: "https://evil.com" }))).rejects.toMatchObject({ status: 403 });
    await expect(readBody(request("{}", { "content-type": "text/plain" }))).rejects.toMatchObject({ status: 415 });
    await expect(readBody(request('"' + "x".repeat(100) + '"'), 50)).rejects.toMatchObject({ status: 413 });
    await expect(readBody(request("not-json"))).rejects.toMatchObject({ status: 400 });
    await expect(readBody(request("{}", { origin: "http://127.0.0.1:3127", host: "127.0.0.1:3127" }))).resolves.toEqual({});
  });
});
