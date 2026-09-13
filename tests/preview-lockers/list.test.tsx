import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import PreviewList from "@/app/admin/preview-lockers/page";
const mocked = vi.hoisted(() => ({ admin: vi.fn() }));
vi.mock("@/lib/preview-lockers/server", () => ({ previewAdmin: mocked.admin }));
let request: { select: ReturnType<typeof vi.fn>; ilike: ReturnType<typeof vi.fn>; order: ReturnType<typeof vi.fn>; range: ReturnType<typeof vi.fn> };
beforeEach(() => {
  request = { select: vi.fn(), ilike: vi.fn(), order: vi.fn(), range: vi.fn() };
  request.select.mockReturnValue(request); request.ilike.mockReturnValue(request); request.order.mockReturnValue(request);
  mocked.admin.mockResolvedValue({ client: { from: () => request } });
});
it("searches before pagination, retains filters, and provides compact accessible row actions", async () => {
  request.range.mockResolvedValue({ data: Array.from({ length: 51 }, (_, i) => ({ id: `id-${i}`, slug: `athlete-${i}`, full_name: `Athlete ${i}`, school: null })), error: null });
  const html = renderToStaticMarkup(await PreviewList({ searchParams: Promise.resolve({ q: "Athlete", sort: "name", page: "2" }) }));
  expect(request.ilike).toHaveBeenCalledWith("full_name", "%Athlete%");
  expect(request.range).toHaveBeenCalledWith(50, 100);
  expect(request.order).toHaveBeenCalledWith("full_name", { ascending: true });
  const host = document.createElement("div"); host.innerHTML = html;
  expect(host.querySelectorAll("li")).toHaveLength(50);
  expect(host.querySelector('[aria-label="Edit Athlete 0"]')?.textContent).toBe("Edit");
  expect(host.querySelector('[title="Photos"]')?.getAttribute("href")).toBe("/preview-lockers/athlete-0/photos");
  expect(host.querySelector('[title="Film Room"]')?.getAttribute("aria-label")).toBe("Film Room for Athlete 0");
  expect(html).toContain("q=Athlete&amp;sort=name&amp;page=3");
});
it("provides search empty and load error states without exposing rows", async () => {
  request.range.mockResolvedValue({ data: [], error: null });
  expect(renderToStaticMarkup(await PreviewList({ searchParams: Promise.resolve({ q: "Missing" }) }))).toContain("No previews match");
  request.range.mockResolvedValue({ data: null, error: { message: "private database detail" } });
  const html = renderToStaticMarkup(await PreviewList({ searchParams: Promise.resolve({}) }));
  expect(html).toContain("Saved previews are unavailable");
  expect(html).not.toContain("private database detail");
});
it("requires admin authorization before querying saved previews", async () => {
  mocked.admin.mockRejectedValueOnce(new Error("unauthorized"));
  await expect(PreviewList({ searchParams: Promise.resolve({}) })).rejects.toThrow("unauthorized");
  expect(request.select).not.toHaveBeenCalled();
});
