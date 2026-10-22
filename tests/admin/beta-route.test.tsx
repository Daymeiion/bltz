import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentAuthorizationProfile = vi.fn();
const getBetaIntelligenceDashboard = vi.fn();
const redirect = vi.fn((destination: string) => {
  throw new Error(`REDIRECT:${destination}`);
});

vi.mock("@/lib/rbac", () => ({ getCurrentAuthorizationProfile }));
vi.mock("@/lib/beta-intelligence/query", () => ({ getBetaIntelligenceDashboard }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/admin/AdminSidebar", () => ({ AdminSidebar: () => null }));

describe("retired Beta Intelligence route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retains server-side admin protection for old bookmarks", async () => {
    getCurrentAuthorizationProfile.mockResolvedValue({ id: "player-1", role: "player" });
    const { default: AdminLayout } = await import("@/app/admin/layout");

    await expect(AdminLayout({ children: <div>Private admin content</div> })).rejects.toThrow(
      "REDIRECT:/auth/admin?error=not_admin",
    );
    expect(getBetaIntelligenceDashboard).not.toHaveBeenCalled();
  });

  it("allows an authorized admin to render nested admin content", async () => {
    getCurrentAuthorizationProfile.mockResolvedValue({ id: "admin-1", role: "admin" });
    const { default: AdminLayout } = await import("@/app/admin/layout");

    const result = await AdminLayout({ children: <div>Private admin content</div> });

    expect(result.props.children).toHaveLength(2);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects old bookmarks to the existing funnel without reading beta records", async () => {
    const { default: BetaIntelligencePage } = await import("@/app/admin/beta/page");

    expect(() => BetaIntelligencePage()).toThrow("REDIRECT:/admin/gtm/funnel");
    expect(redirect).toHaveBeenCalledExactlyOnceWith("/admin/gtm/funnel");
    expect(getBetaIntelligenceDashboard).not.toHaveBeenCalled();
  });
});
