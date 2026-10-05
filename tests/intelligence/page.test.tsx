import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks = vi.hoisted(() => ({ workspace: vi.fn(), research: vi.fn(), redirect: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/intelligence/workspace-server", () => ({ loadIntelligenceWorkspace: mocks.workspace }));
vi.mock("@/lib/intelligence/research-server", () => ({ loadIntelligenceResearch: mocks.research }));
vi.mock("@/app/admin/intelligence/CareerWorkspace", () => ({ CareerWorkspace: () => <div>Live career workspace</div> }));
import Page from "@/app/admin/intelligence/page";
import { IntelligenceAccessError } from "@/lib/intelligence/lab-server";
import { trialWindowAt } from "@/lib/intelligence/research";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.workspace.mockResolvedValue({});
  mocks.redirect.mockImplementation(() => { throw new Error("AUTH_REDIRECT"); });
  mocks.research.mockResolvedValue({ checkedAt: "2026-10-04T18:30:00Z", trial: trialWindowAt("2026-10-04T18:30:00Z"), cooldown: { state: "unavailable", until: null, lastRateLimitAt: null } });
});
describe("Production Intelligence route", () => {
  it("opens the real workspace by default", async () => {
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("Live career workspace");
    expect(mocks.workspace).toHaveBeenCalledWith({ q: undefined, athlete: undefined, asOf: undefined });
    expect(mocks.research).not.toHaveBeenCalled();
  });
  it("passes canonical search context to the protected reader", async () => {
    await Page({ searchParams: Promise.resolve({ athlete: "c5dae871-a277-4256-9a0c-17a40940ad3f", q: "Rivers", asOf: "2026-10-04", view: "moment" }) });
    expect(mocks.workspace).toHaveBeenCalledWith({ athlete: "c5dae871-a277-4256-9a0c-17a40940ad3f", q: "Rivers", asOf: "2026-10-04" });
  });
  it("legacy example URLs load real data instead of fictional records", async () => {
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ view: "example" }) }));
    expect(html).toContain("Live career workspace");
    expect(html).not.toContain("Illustrative example");
  });
  it("retains explicitly selected protected provider findings", async () => {
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ view: "findings" }) }));
    expect(html).toContain("Findings so far");
    expect(mocks.research).toHaveBeenCalledOnce();
    expect(mocks.workspace).not.toHaveBeenCalled();
  });
  it.each([401, 403] as const)("redirects denied access (%s)", async status => {
    mocks.workspace.mockRejectedValue(new IntelligenceAccessError(status));
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow("AUTH_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/auth/admin?error=not_admin");
  });
  it("shows a truthful error state without exposing private failures", async () => {
    mocks.workspace.mockRejectedValue(new Error("PRIVATE_PROVIDER_PAYLOAD"));
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("Intelligence data is temporarily unavailable");
    expect(html).not.toContain("PRIVATE_PROVIDER_PAYLOAD");
  });
});
