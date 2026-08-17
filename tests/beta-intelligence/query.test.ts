import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.fn();
const createServiceClient = vi.fn();
vi.mock("@/lib/rbac", () => ({ requireRole }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient }));

describe("Beta Intelligence aggregate query", () => {
  beforeEach(() => vi.clearAllMocks());

  it("authorizes admin access and returns the service-only RPC payload", async () => {
    const payload = { source: "live", generatedAt: new Date().toISOString(), athletes: [] };
    const rpc = vi.fn(async () => ({ data: payload, error: null }));
    createServiceClient.mockReturnValue({ rpc });
    const { getBetaIntelligenceDashboard } = await import("@/lib/beta-intelligence/query");

    await expect(getBetaIntelligenceDashboard({ cohort: "Cal alumni" })).resolves.toEqual(payload);
    expect(requireRole).toHaveBeenCalledWith("admin");
    expect(rpc).toHaveBeenCalledWith("get_beta_intelligence_dashboard", {
      p_since: null, p_cohort: "Cal alumni", p_status: null, p_athlete_id: null,
    });
  });
});
