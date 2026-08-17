import { beforeEach, describe, expect, it, vi } from "vitest";
import { filterBetaAthletes } from "@/components/admin/beta/BetaIntelligenceDashboard";
import { betaIntelligenceFixture } from "@/lib/beta-intelligence/fixtures";

const getCurrentUserProfile = vi.fn();
const redirect = vi.fn((destination: string) => {
  throw new Error(`REDIRECT:${destination}`);
});

vi.mock("@/lib/rbac", () => ({ getCurrentUserProfile }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/admin/AdminSidebar", () => ({ AdminSidebar: () => null }));

describe("Beta Intelligence dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inherits server-side admin protection from the admin layout", async () => {
    getCurrentUserProfile.mockResolvedValue({ id: "player-1", role: "player" });
    const { default: AdminLayout } = await import("@/app/admin/layout");

    await expect(AdminLayout({ children: <div>Private beta data</div> })).rejects.toThrow(
      "REDIRECT:/auth/admin?error=not_admin",
    );
    expect(redirect).toHaveBeenCalledWith("/auth/admin?error=not_admin");
  });

  it("allows an authorized admin to render nested admin content", async () => {
    getCurrentUserProfile.mockResolvedValue({ id: "admin-1", role: "admin" });
    const { default: AdminLayout } = await import("@/app/admin/layout");

    const result = await AdminLayout({ children: <div>Private beta data</div> });

    expect(result.props.children).toHaveLength(2);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("filters participant summaries without loading raw analytics events", () => {
    const result = filterBetaAthletes(
      betaIntelligenceFixture.athletes,
      { cohort: "current college", participantStatus: "active", dateRange: "30d" },
      new Date(betaIntelligenceFixture.generatedAt),
    );

    expect(result.map((athlete) => athlete.id)).toEqual(["fixture-athlete-03"]);
  });

  it("returns an empty cohort state when filters have no match", () => {
    const result = filterBetaAthletes(
      betaIntelligenceFixture.athletes,
      { cohort: "former teammate", participantStatus: "completed", dateRange: "7d" },
      new Date(betaIntelligenceFixture.generatedAt),
    );

    expect(result).toEqual([]);
  });
});
