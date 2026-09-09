import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PreviewLockerForm from "@/app/admin/preview-lockers/PreviewLockerForm";
import { previewContent } from "@/lib/preview-lockers/validation";

const mocks = vi.hoisted(() => ({ storageFrom: vi.fn(), upload: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/preview-lockers/stream-client", () => ({ readDiscovery: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ storage: { from: mocks.storageFrom } }) }));
let host: HTMLDivElement; let root: Root;
beforeEach(() => { vi.resetAllMocks(); host = document.createElement("div"); document.body.append(host); root = createRoot(host); mocks.storageFrom.mockReturnValue({ uploadToSignedUrl: mocks.upload }); mocks.upload.mockResolvedValue({ data: {}, error: null }); vi.stubGlobal("fetch", mocks.fetch); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

// Regression: the draft builder exposed only one-at-a-time URL fields and no local multi-file control.
it("offers bounded multiple photo and video selectors only after the draft exists", async () => {
  const content = previewContent.parse({ slug: "fixture-player", full_name: "Fixture Player" });
  const record = { ...content, id: "00000000-0000-4000-8000-000000000001", revision: 1, created_at: "", updated_at: "" };
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  const photos = host.querySelector<HTMLInputElement>('[aria-label="Upload multiple private photos"]')!;
  const videos = host.querySelector<HTMLInputElement>('[aria-label="Upload multiple private videos"]')!;
  expect(photos.multiple).toBe(true); expect(photos.accept).toBe("image/jpeg,image/png,image/webp");
  expect(videos.multiple).toBe(true); expect(videos.accept).toBe("video/mp4,video/webm,video/quicktime");
  expect(host.textContent).toContain("Up to 10 MB each"); expect(host.textContent).toContain("Up to 250 MB each");
});

it("retains every completed file when a multi-photo upload partially fails", async () => {
  const content = previewContent.parse({ slug: "fixture-player", full_name: "Fixture Player" });
  const record = { ...content, id: "00000000-0000-4000-8000-000000000001", revision: 1, created_at: "", updated_at: "" };
  mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ bucket: "preview-locker-photos", path: `${record.id}/photos/00000000-0000-4000-8000-000000000002.jpg`, token: "one" }))).mockResolvedValueOnce(new Response(JSON.stringify({ bucket: "preview-locker-photos", path: `${record.id}/photos/00000000-0000-4000-8000-000000000003.jpg`, token: "two" })));
  mocks.upload.mockResolvedValueOnce({ data: {}, error: null }).mockResolvedValueOnce({ data: null, error: { message: "failed" } });
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  const input = host.querySelector<HTMLInputElement>('[aria-label="Upload multiple private photos"]')!;
  Object.defineProperty(input, "files", { configurable: true, value: [new File(["one"], "one.jpg", { type: "image/jpeg" }), new File(["two"], "two.jpg", { type: "image/jpeg" })] });
  await act(async () => { input.dispatchEvent(new Event("change", { bubbles: true })); await new Promise(resolve => setTimeout(resolve, 0)); });
  expect(host.textContent).toContain("Photo 1"); expect(host.textContent).toContain("one");
  expect(host.textContent).toContain("1 completed upload was retained in this draft");
});
