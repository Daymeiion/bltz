import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/lib/intelligence/workspace-server", () => ({ loadIntelligenceWorkspace: mocks.load }));
import { GET } from "@/app/api/admin/intelligence/route";
import { IntelligenceAccessError } from "@/lib/intelligence/lab-server";

beforeEach(() => { vi.clearAllMocks(); });
describe("Protected read-only workspace endpoint", () => {
  it("returns the sanitized workspace without caching and passes search inputs", async () => {
    const data = { result: { selected: null }, directory: { state: "ready", rows: [], truncated: false } };
    mocks.load.mockResolvedValue(data);
    const response = await GET(new Request("https://bltz.me/api/admin/intelligence?q=Rivers&athlete=c5dae871-a277-4256-9a0c-17a40940ad3f&asOf=2026-10-04"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(data);
    expect(mocks.load).toHaveBeenCalledWith({ q: "Rivers", athlete: "c5dae871-a277-4256-9a0c-17a40940ad3f", asOf: "2026-10-04" });
    expect(response.headers.get("cache-control")).toContain("private, no-store");
    expect(response.headers.get("vary")).toBe("Cookie");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
  it.each([401, 403, 503] as const)("returns a closed authorization failure (%s)", async status => {
    mocks.load.mockRejectedValue(new IntelligenceAccessError(status));
    const response = await GET(new Request("https://bltz.me/api/admin/intelligence"));
    expect(response.status).toBe(status);
    expect(await response.json()).toHaveProperty("error");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("does not reveal unexpected database/provider errors", async () => {
    mocks.load.mockRejectedValue(new Error("SECRET_RAW_PAYLOAD"));
    const response = await GET(new Request("https://bltz.me/api/admin/intelligence"));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("SECRET_RAW_PAYLOAD");
  });
  it("rejects unbounded inputs without invoking the reader", async () => {
    const response = await GET(new Request(`https://bltz.me/api/admin/intelligence?q=${"x".repeat(121)}`));
    expect(response.status).toBe(400);
    expect(mocks.load).not.toHaveBeenCalled();
  });
});
