import { beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalAdmin = vi.fn();
const createServiceClient = vi.fn();
vi.mock("@/lib/rbac", () => ({ requireInternalAdmin }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient }));

const activity = {
  lockerViews: 1, filmRoomOpens: 0, photosOpens: 0, mediaViews: 0,
  profileEdits: 0, careerCorrections: 0, mediaUploads: 0, shares: 0,
  socialLinkClicks: 0, returned: false, lastActivityAt: null,
};

function livePayload() {
  return {
    source: "live",
    generatedAt: new Date().toISOString(),
    athletes: [{
      id: "athlete-1", activity, invitedAt: "2026-08-01T00:00:00.000Z",
      joinedAt: null, lockerClaimedAt: null, status: "active", feedback: null,
      caseStudyCandidate: false,
    }],
    summary: {
      participantDenominator: 1,
      athletesInvited: 1,
      athletesJoined: 0,
      lockersClaimed: 0,
      activeAthletes: 1,
      feedbackCompleted: 0,
      caseStudyCandidates: 0,
      actionPercentages: {
        lockerViews: { numerator: 1, denominator: 1 },
        filmRoomOpens: { numerator: 0, denominator: 1 },
        photosOpens: { numerator: 0, denominator: 1 },
        mediaViews: { numerator: 0, denominator: 1 },
        profileEdits: { numerator: 0, denominator: 1 },
        careerCorrections: { numerator: 0, denominator: 1 },
        mediaUploads: { numerator: 0, denominator: 1 },
        shares: { numerator: 0, denominator: 1 },
        socialLinkClicks: { numerator: 0, denominator: 1 },
      },
    },
    recentFeedback: [],
  };
}

describe("Beta Intelligence aggregate query", () => {
  beforeEach(() => vi.clearAllMocks());

  it("authorizes admin access and returns the service-only RPC payload", async () => {
    const payload = livePayload();
    const rpc = vi.fn(async () => ({ data: payload, error: null }));
    createServiceClient.mockReturnValue({ rpc });
    const { getBetaIntelligenceDashboard } = await import("@/lib/beta-intelligence/query");

    await expect(getBetaIntelligenceDashboard({ cohort: "Cal alumni" })).resolves.toEqual(payload);
    expect(requireInternalAdmin).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("get_beta_intelligence_dashboard", {
      p_since: null, p_cohort: "Cal alumni", p_status: null, p_athlete_id: null,
    });
  });

  it("does not create the service client when authorization fails", async () => {
    requireInternalAdmin.mockRejectedValueOnce(new Error("Forbidden"));
    const { getBetaIntelligenceDashboard } = await import("@/lib/beta-intelligence/query");

    await expect(getBetaIntelligenceDashboard()).rejects.toThrow("Forbidden");
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it("forwards every aggregate filter to the RPC", async () => {
    const payload = livePayload();
    const rpc = vi.fn(async () => ({ data: payload, error: null }));
    createServiceClient.mockReturnValue({ rpc });
    const { getBetaIntelligenceDashboard } = await import("@/lib/beta-intelligence/query");

    await getBetaIntelligenceDashboard({
      since: "2026-08-01T00:00:00.000Z",
      cohort: "Cal alumni",
      status: "active",
      athleteId: "7d870531-2063-4e91-9a04-038d421d9757",
    });

    expect(rpc).toHaveBeenCalledWith("get_beta_intelligence_dashboard", {
      p_since: "2026-08-01T00:00:00.000Z",
      p_cohort: "Cal alumni",
      p_status: "active",
      p_athlete_id: "7d870531-2063-4e91-9a04-038d421d9757",
    });
  });

  it("fails closed when aggregate metrics do not reconcile to source athletes", async () => {
    const payload = livePayload();
    payload.summary.actionPercentages.lockerViews.numerator = 0;
    createServiceClient.mockReturnValue({ rpc: vi.fn(async () => ({ data: payload, error: null })) });
    const { getBetaIntelligenceDashboard } = await import("@/lib/beta-intelligence/query");

    await expect(getBetaIntelligenceDashboard()).rejects.toThrow(
      "beta_dashboard_query_reconciliation_failed",
    );
  });

  it("never accepts fixture payloads at the live boundary", async () => {
    const payload = { ...livePayload(), source: "fixture" };
    createServiceClient.mockReturnValue({ rpc: vi.fn(async () => ({ data: payload, error: null })) });
    const { getBetaIntelligenceDashboard } = await import("@/lib/beta-intelligence/query");

    await expect(getBetaIntelligenceDashboard()).rejects.toThrow(
      "beta_dashboard_query_invalid_payload",
    );
  });
});
