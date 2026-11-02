import { describe, expect, it } from "vitest";
import {
  projectShellCapabilities,
  SHELL_CAPABILITY_REQUIREMENTS,
} from "@/lib/enterprise-crm/auth/shell-capabilities";
import { EXECUTIVE_AUTHORIZATION_FIXTURES } from "@/lib/enterprise-crm/fixtures/executive-test-fixtures";

describe("permission-driven shell capabilities", () => {
  it("maps every shell surface to explicit permission evidence or a missing-contract block", () => {
    expect(SHELL_CAPABILITY_REQUIREMENTS).toEqual({
      "navigation.home": ["executive.overview.read"],
      "navigation.athletes": ["athlete.read"],
      "navigation.media": ["rights.read"],
      "navigation.opportunities": ["opportunity.read"],
      "navigation.activations": ["activation.read"],
      "navigation.intelligence": ["intelligence.read"],
      "navigation.analytics": [],
      "navigation.organization": ["member.read"],
      "utility.global_search": [
        "athlete.read",
        "opportunity.read",
        "activation.read",
        "rights.read",
        "intelligence.read",
      ],
      "utility.create": ["opportunity.manage", "activation.manage", "assignment.create"],
      "utility.notifications": [],
      "utility.theme_admin": ["theme.administer"],
      "surface.financial": ["financial.summary.read", "financial.exception.read"],
    });
  });

  it("never derives a capability from a role label", () => {
    const projected = projectShellCapabilities(
      EXECUTIVE_AUTHORIZATION_FIXTURES.organizationAdmin,
    );
    expect(projected.capabilities["utility.theme_admin"]).toMatchObject({
      available: true,
      matchedPermissions: ["theme.administer"],
    });
    expect(projected.capabilities["navigation.home"].available).toBe(false);
    expect(projected.capabilities["surface.financial"].available).toBe(false);
  });

  it("keeps analytics and notifications unavailable until permission contracts exist", () => {
    const projected = projectShellCapabilities(
      EXECUTIVE_AUTHORIZATION_FIXTURES.organizationExecutive,
    );
    expect(projected.capabilities["navigation.analytics"]).toEqual({
      available: false,
      matchedPermissions: [],
      blockedByMissingContract: true,
    });
    expect(projected.capabilities["utility.notifications"]).toEqual({
      available: false,
      matchedPermissions: [],
      blockedByMissingContract: true,
    });
  });

  it("changes projection identity on grant version and permission revocation", () => {
    const base = EXECUTIVE_AUTHORIZATION_FIXTURES.organizationExecutive;
    const current = projectShellCapabilities(base);
    const changed = projectShellCapabilities({
      ...base,
      authorizationVersion: "fixture-v2",
      permissions: base.permissions.filter((permission) => permission !== "athlete.read"),
    });
    expect(changed).not.toEqual(current);
    expect(changed.capabilities["navigation.athletes"].available).toBe(false);
  });

  it("binds capability output to actor, organization, and effective team scope", () => {
    const base = EXECUTIVE_AUTHORIZATION_FIXTURES.organizationExecutive;
    const current = projectShellCapabilities(base);
    for (const changed of [
      { ...base, actorUserId: EXECUTIVE_AUTHORIZATION_FIXTURES.teamOperator.actorUserId },
      {
        ...base,
        scope: {
          kind: "organization" as const,
          organizationId: EXECUTIVE_AUTHORIZATION_FIXTURES.outOfScopeMember.scope.organizationId,
        },
      },
      {
        ...base,
        scope: {
          kind: "team" as const,
          organizationId: base.scope.organizationId,
          teamId: EXECUTIVE_AUTHORIZATION_FIXTURES.teamOperator.scope.teamId,
        },
      },
    ]) {
      expect(projectShellCapabilities(changed)).not.toEqual(current);
    }
  });
});
