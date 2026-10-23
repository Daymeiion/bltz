import { beforeEach, describe, expect, it, vi } from "vitest";
const { authorize } = vi.hoisted(() => ({ authorize: vi.fn() }));
vi.mock("@/lib/rbac", () => ({ getCurrentAuthorizationProfile: authorize }));
import { GET } from "@/app/admin/getty-partnership/download/route";

describe("private Getty meeting PDF downloads", () => {
  beforeEach(() => { authorize.mockReset(); });

  it.each([[null, 401], [{ role: "fan" }, 403], [{ role: "player" }, 403]])("denies PDF access to %j", async (profile, status) => {
    authorize.mockResolvedValue(profile);
    const response = await GET(new Request("https://bltz.me/admin/getty-partnership/download?document=one-sheet"));
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it.each(["", "../meeting-content.json", "__proto__", "constructor"])("rejects unrecognized document %s", async document => {
    authorize.mockResolvedValue({ role: "admin" });
    const response = await GET(new Request(`https://bltz.me/admin/getty-partnership/download?document=${encodeURIComponent(document)}`));
    expect(response.status).toBe(404);
  });

  it.each([["one-sheet", "getty-one-sheet.pdf"], ["workflow", "getty-image-workflow.pdf"]])("serves the bundled %s PDF to admins without caching", async (document, filename) => {
    authorize.mockResolvedValue({ role: "admin" });
    const response = await GET(new Request(`https://bltz.me/admin/getty-partnership/download?document=${document}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(`attachment; filename="BLTZ-${filename}"`);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1000);
  });
});
