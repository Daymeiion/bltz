import { beforeEach, describe, expect, it, vi } from "vitest";
import { filterBetaAthletes } from "@/components/admin/beta/BetaIntelligenceDashboard";
import type { BetaAthleteSummary } from "@/lib/beta-intelligence/contracts";

const getCurrentAuthorizationProfile = vi.fn();
const redirect = vi.fn((destination: string) => {
  throw new Error(`REDIRECT:${destination}`);
});

vi.mock("@/lib/rbac", () => ({ getCurrentAuthorizationProfile }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/admin/AdminSidebar", () => ({ AdminSidebar: () => null }));

function athlete(
  id: string,
  cohort: string,
  status: BetaAthleteSummary["status"],
  invitedAt: string,
): BetaAthleteSummary {
  return {
    id, cohort, status, invitedAt, name: `Athlete ${id}`,
    joinedAt: null, lockerViewedAt: null, lockerClaimedAt: null,
    lockerEditedAt: null, lockerSharedAt: null, feedback: null, insights: [],
    caseStudyCandidate: false, caseStudyPermission: "not_requested",
    baselineCapturedAt: null, engagementLevel: "low",
    activity: {
      lockerViews: 0, filmRoomOpens: 0, photosOpens: 0, mediaViews: 0,
      profileEdits: 0, careerCorrections: 0, mediaUploads: 0, shares: 0,
      socialLinkClicks: 0, returned: false, lastActivityAt: null,
    },
  };
}

const generatedAt = "2026-08-16T12:00:00.000Z";
const athletes = [
  athlete("1", "current college", "active", "2026-08-10T12:00:00.000Z"),
  athlete("2", "former teammate", "completed", "2026-07-01T12:00:00.000Z"),
];

describe("Beta Intelligence dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inherits server-side admin protection from the admin layout", async () => {
    getCurrentAuthorizationProfile.mockResolvedValue({ id: "player-1", role: "player" });
    const { default: AdminLayout } = await import("@/app/admin/layout");

    await expect(AdminLayout({ children: <div>Private beta data</div> })).rejects.toThrow(
      "REDIRECT:/auth/admin?error=not_admin",
    );
    expect(redirect).toHaveBeenCalledWith("/auth/admin?error=not_admin");
  });

  it("allows an authorized admin to render nested admin content", async () => {
    getCurrentAuthorizationProfile.mockResolvedValue({ id: "admin-1", role: "admin" });
    const { default: AdminLayout } = await import("@/app/admin/layout");

    const result = await AdminLayout({ children: <div>Private beta data</div> });

    expect(result.props.children).toHaveLength(2);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("filters participant summaries without loading raw analytics events", () => {
    const result = filterBetaAthletes(
      athletes,
      { cohort: "current college", participantStatus: "active", dateRange: "30d" },
      new Date(generatedAt),
    );

    expect(result.map((athlete) => athlete.id)).toEqual(["1"]);
  });

  it("returns an empty cohort state when filters have no match", () => {
    const result = filterBetaAthletes(
      athletes,
      { cohort: "former teammate", participantStatus: "completed", dateRange: "7d" },
      new Date(generatedAt),
    );

    expect(result).toEqual([]);
  });
});
