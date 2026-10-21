import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks = vi.hoisted(() => ({ workspace: vi.fn(), research: vi.fn(), redirect: vi.fn(), locker: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/intelligence/workspace-server", () => ({ loadIntelligenceWorkspace: mocks.workspace }));
vi.mock("@/lib/intelligence/research-server", () => ({ loadIntelligenceResearch: mocks.research }));
vi.mock("@/app/admin/intelligence/lab/locker-media", () => ({ loadLockerMedia: mocks.locker }));
vi.mock("@/app/admin/intelligence/lab/LabWorkspace", () => ({ LabWorkspace: ({ initialMomentId }: { initialMomentId: string | null }) => <div>Live career workspace{initialMomentId ? ` · ${initialMomentId}` : ""}</div> }));
import Page from "@/app/admin/intelligence/page";
import { IntelligenceAccessError } from "@/lib/intelligence/lab-server";
import { trialWindowAt } from "@/lib/intelligence/research";

const EMPTY = { result: { selected: null }, profile: null };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.workspace.mockResolvedValue(EMPTY);
  mocks.locker.mockResolvedValue({ state: "ready", slug: "keith-rivers", photos: [], videos: [] });
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
  it("reads Locker media only after the protected workspace selects an athlete", async () => {
    await Page({ searchParams: Promise.resolve({}) });
    expect(mocks.locker).not.toHaveBeenCalled();
    mocks.workspace.mockResolvedValue({ result: { selected: { id: "c5dae871-a277-4256-9a0c-17a40940ad3f" } }, profile: { lockerHref: "/preview-lockers/keith-rivers" } });
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ moment: "moment-1" }) }));
    expect(mocks.locker).toHaveBeenCalledWith("/preview-lockers/keith-rivers");
    expect(html).toContain("moment-1");
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
    expect(mocks.locker).not.toHaveBeenCalled();
  });
  it("shows a truthful error state without exposing private failures", async () => {
    mocks.workspace.mockRejectedValue(new Error("PRIVATE_PROVIDER_PAYLOAD"));
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("Intelligence data is temporarily unavailable");
    expect(html).not.toContain("PRIVATE_PROVIDER_PAYLOAD");
  });
});
