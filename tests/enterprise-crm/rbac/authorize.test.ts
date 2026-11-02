import { describe, expect, it } from "vitest";
import {
  authorizeEnterpriseRequest,
  EnterpriseAuthorizationError,
  requireEnterpriseRequest,
} from "@/lib/enterprise-crm/auth/authorize";
import { EXECUTIVE_PERMISSION_KEYS } from "@/lib/enterprise-crm/auth/permissions";
import {
  EXECUTIVE_AUTHORIZATION_FIXTURES,
  EXECUTIVE_TEST_IDS,
} from "@/lib/enterprise-crm/fixtures/executive-test-fixtures";

describe("Executive permission registry", () => {
  it("contains unique explicit capabilities without role bundles", () => {
    expect(new Set(EXECUTIVE_PERMISSION_KEYS).size).toBe(EXECUTIVE_PERMISSION_KEYS.length);
    expect(EXECUTIVE_PERMISSION_KEYS).toContain("financial.summary.read");
    expect(EXECUTIVE_PERMISSION_KEYS).toContain("financial.exception.read");
    expect(EXECUTIVE_PERMISSION_KEYS).toContain("assignment.create");
  });
});

describe("fail-closed Enterprise authorization", () => {
  const organizationExecutive = EXECUTIVE_AUTHORIZATION_FIXTURES.organizationExecutive;

  it.each(["read", "count", "aggregate", "search", "export", "mutation", "notification"] as const)(
    "enforces explicit permission at the %s surface",
    (surface) => {
      expect(
        authorizeEnterpriseRequest(organizationExecutive, {
          organizationId: EXECUTIVE_TEST_IDS.organization,
          permission: "executive.overview.read",
          surface,
        }),
      ).toMatchObject({ allowed: true });

      expect(
        authorizeEnterpriseRequest(organizationExecutive, {
          organizationId: EXECUTIVE_TEST_IDS.organization,
          permission: "financial.summary.read",
          surface,
        }),
      ).toEqual({ allowed: false, reason: "permission" });
    },
  );

  it("rejects cross-organization access before checking capability", () => {
    expect(
      authorizeEnterpriseRequest(organizationExecutive, {
        organizationId: EXECUTIVE_TEST_IDS.otherOrganization,
        permission: "executive.overview.read",
        surface: "read",
      }),
    ).toEqual({ allowed: false, reason: "organization_scope" });
  });

  it("requires the exact team for a team-limited subject", () => {
    const grants = EXECUTIVE_AUTHORIZATION_FIXTURES.teamOperator;

    expect(
      authorizeEnterpriseRequest(grants, {
        organizationId: EXECUTIVE_TEST_IDS.organization,
        teamId: EXECUTIVE_TEST_IDS.team,
        permission: "athlete.read",
        surface: "count",
      }),
    ).toMatchObject({ allowed: true });

    for (const teamId of [undefined, EXECUTIVE_TEST_IDS.otherTeam]) {
      expect(
        authorizeEnterpriseRequest(grants, {
          organizationId: EXECUTIVE_TEST_IDS.organization,
          teamId,
          permission: "athlete.read",
          surface: "count",
        }),
      ).toEqual({ allowed: false, reason: "team_scope" });
    }
  });

  it("fails closed for malformed canonical grants", () => {
    expect(
      authorizeEnterpriseRequest(
        { ...organizationExecutive, membershipId: null },
        {
          organizationId: EXECUTIVE_TEST_IDS.organization,
          permission: "executive.overview.read",
          surface: "read",
        },
      ),
    ).toEqual({ allowed: false, reason: "invalid_grants" });
  });

  it("throws a non-enumerating error from the required boundary", () => {
    const runDeniedRequest = () =>
      requireEnterpriseRequest(organizationExecutive, {
        organizationId: EXECUTIVE_TEST_IDS.organization,
        permission: "financial.exception.read",
        surface: "read",
      });

    expect(runDeniedRequest).toThrowError(EnterpriseAuthorizationError);
    expect(runDeniedRequest).toThrow("Enterprise request denied");
  });
});
