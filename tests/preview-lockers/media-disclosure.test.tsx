import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MediaItem, MediaSection } from "@/app/admin/preview-lockers/MediaDisclosure";

const storage = vi.hoisted(() => ({ sign: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ storage: { from: storage.from } }) }));
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  storage.sign.mockReset();
  storage.from.mockReset().mockReturnValue({ createSignedUrl: storage.sign });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
async function toggle(index: number, open: boolean) {
  await act(async () => {
    const details = host.querySelectorAll("details")[index];
    details.open = open;
    details.dispatchEvent(new Event("toggle"));
  });
}
const photo = { id: "photo-1", title: "Career photo", storagePath: "private/photos/image.jpg", mimeType: "image/jpeg" as const, credits: null, sourceUrl: null, season: null, level: "pro" as const };
it("loads private previews only on expansion and retains the editor when collapsed", async () => {
  storage.sign.mockResolvedValue({ data: { signedUrl: "https://example.com/private.jpg?token=temporary" }, error: null });
  await act(async () => root.render(<MediaSection title="Photos" count={1} limit={40}><MediaItem media={photo} kind="photo" index={0}><input aria-label="Photo title" defaultValue="Career photo" /></MediaItem></MediaSection>));
  expect(storage.sign).not.toHaveBeenCalled();
  await toggle(0, true);
  expect(storage.sign).not.toHaveBeenCalled();
  await toggle(1, true);
  expect(storage.from).toHaveBeenCalledWith("preview-locker-photos");
  expect(storage.sign).toHaveBeenCalledWith(photo.storagePath, 3600);
  expect(host.querySelector('img[alt="Career photo"]')?.getAttribute("src")).toContain("token=temporary");
  const input = host.querySelector("input")!;
  input.value = "Edited title";
  await toggle(0, false);
  expect(host.querySelector("img")).toBeNull();
  await toggle(0, true);
  expect(host.querySelector("input")!.value).toBe("Edited title");
});
it("keeps editing available if private access fails", async () => {
  storage.sign.mockResolvedValue({ data: null, error: { message: "Denied" } });
  await act(async () => root.render(<MediaSection title="Photos" count={1} limit={40}><MediaItem media={photo} kind="photo" index={0}><input aria-label="Photo title" /></MediaItem></MediaSection>));
  await toggle(0, true); await toggle(1, true);
  expect(host.textContent).toContain("Preview unavailable");
  expect(host.querySelector("img")).toBeNull();
  expect(host.querySelector("input")!.disabled).toBe(false);
});
it("unmounts video playback when its row closes", async () => {
  await act(async () => root.render(<MediaSection title="Videos" count={1} limit={24}><MediaItem media={{ id: "video-1", title: "Career highlight", url: "https://example.com/highlight.mp4", thumb: null }} kind="video" index={0}><input /></MediaItem></MediaSection>));
  await toggle(0, true); await toggle(1, true);
  expect(host.querySelector("video")?.controls).toBe(true);
  await toggle(1, false);
  expect(host.querySelector("video")).toBeNull();
});
