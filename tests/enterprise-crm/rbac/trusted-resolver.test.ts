import { describe, expect, it, vi } from "vitest";
import { parseRequestedEnterpriseScope } from "@/lib/enterprise-crm/auth/requested-scope";
import {
  resolveTrustedEnterpriseGrants,
  type TrustedEnterpriseAccessAdapter,
  type TrustedEnterpriseAccessSnapshot,
} from "@/lib/enterprise-crm/auth/trusted-resolver";
import { EXECUTIVE_TEST_IDS } from "@/lib/enterprise-crm/fixtures/executive-test-fixtures";

const MEMBERSHIP_ID = "40000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-08-24T20:00:00.000Z");

function snapshot(input: {
  team?: boolean;
  permission?: string;
} = {}): TrustedEnterpriseAccessSnapshot {
  const team = input.team ?? false;
  return {
    version: "snapshot-v1",
    expiresAt: "2026-08-24T20:05:00.000Z",
    membership: {
      id: MEMBERSHIP_ID,
      userId: EXECUTIVE_TEST_IDS.executive,
      organizationId: EXECUTIVE_TEST_IDS.organization,
      status: "active",
      version: "snapshot-v1",
    },
    team: team
      ? {
          id: EXECUTIVE_TEST_IDS.team,
          organizationId: EXECUTIVE_TEST_IDS.organization,
          version: "snapshot-v1",
        }
      : null,
    teamGrant: team
      ? {
          membershipId: MEMBERSHIP_ID,
          organizationId: EXECUTIVE_TEST_IDS.organization,
          teamId: EXECUTIVE_TEST_IDS.team,
          revokedAt: null,
          version: "snapshot-v1",
        }
      : null,
    permissionGrants: [
      {
        membershipId: MEMBERSHIP_ID,
        organizationId: EXECUTIVE_TEST_IDS.organization,
        teamId: team ? EXECUTIVE_TEST_IDS.team : null,
        permission: input.permission ?? "executive.overview.read",
        revokedAt: null,
        version: "snapshot-v1",
      },
    ],
  };
}

function adapter(value: TrustedEnterpriseAccessSnapshot | null): TrustedEnterpriseAccessAdapter {
  return { loadAccessSnapshot: vi.fn().mockResolvedValue(value) };
}

describe("requested Enterprise scope parsing", () => {
  it("normalizes valid UUIDs but treats them only as a requested scope", () => {
    expect(
      parseRequestedEnterpriseScope({
        organizationId: EXECUTIVE_TEST_IDS.organization.toUpperCase(),
        teamId: EXECUTIVE_TEST_IDS.team.toUpperCase(),
      }),
    ).toEqual({
      ok: true,
      requestedScope: {
        kind: "team",
        organizationId: EXECUTIVE_TEST_IDS.organization,
        teamId: EXECUTIVE_TEST_IDS.team,
      },
    });
  });

  it.each([
    { organizationId: "not-an-id" },
    { organizationId: EXECUTIVE_TEST_IDS.organization, teamId: "" },
    { organizationId: EXECUTIVE_TEST_IDS.organization, teamId: [EXECUTIVE_TEST_IDS.team] },
    { organizationId: ` ${EXECUTIVE_TEST_IDS.organization}` },
  ])("strictly rejects malformed or ambiguous request input", (input) => {
    expect(parseRequestedEnterpriseScope(input)).toEqual({
      ok: false,
      reason: "invalid_scope",
    });
  });
});

describe("trusted Enterprise grant resolution", () => {
  it("resolves organization grants only from a coherent trusted snapshot", async () => {
    const trustedAdapter = adapter(snapshot());
    const result = await resolveTrustedEnterpriseGrants({
      actorUserId: EXECUTIVE_TEST_IDS.executive,
      requestedScope: {
        kind: "organization",
        organizationId: EXECUTIVE_TEST_IDS.organization,
      },
      adapter: trustedAdapter,
      now: NOW,
    });

    expect(result).toEqual({
      ok: true,
      grants: {
        actorUserId: EXECUTIVE_TEST_IDS.executive,
        membershipId: MEMBERSHIP_ID,
        source: "trusted_internal_adapter",
        scope: {
          kind: "organization",
          organizationId: EXECUTIVE_TEST_IDS.organization,
        },
        permissions: ["executive.overview.read"],
        authorizationVersion: "snapshot-v1",
      },
    });
  });

  it("requires canonical team ownership and an exact active team grant", async () => {
    const requestedScope = {
      kind: "team" as const,
      organizationId: EXECUTIVE_TEST_IDS.organization,
      teamId: EXECUTIVE_TEST_IDS.team,
    };
    await expect(
      resolveTrustedEnterpriseGrants({
        actorUserId: EXECUTIVE_TEST_IDS.executive,
        requestedScope,
        adapter: adapter(snapshot({ team: true })),
        now: NOW,
      }),
    ).resolves.toMatchObject({ ok: true });

    const crossTenant = snapshot({ team: true });
    crossTenant.team = { ...crossTenant.team!, organizationId: EXECUTIVE_TEST_IDS.otherOrganization };
    const revoked = snapshot({ team: true });
    revoked.teamGrant = { ...revoked.teamGrant!, revokedAt: "2026-08-24T19:00:00.000Z" };
    const missing = snapshot({ team: true });
    missing.teamGrant = null;

    for (const unsafe of [crossTenant, revoked, missing]) {
      await expect(
        resolveTrustedEnterpriseGrants({
          actorUserId: EXECUTIVE_TEST_IDS.executive,
          requestedScope,
          adapter: adapter(unsafe),
          now: NOW,
        }),
      ).resolves.toEqual({ ok: false, reason: "denied" });
    }
  });

  it("denies missing, expired, revoked, unknown, cross-tenant, or version-mixed permissions", async () => {
    const requestedScope = {
      kind: "organization" as const,
      organizationId: EXECUTIVE_TEST_IDS.organization,
    };
    const missing = snapshot();
    missing.permissionGrants = [];
    const expired = snapshot();
    expired.expiresAt = "2026-08-24T19:59:59.000Z";
    const revoked = snapshot();
    revoked.permissionGrants = [{ ...revoked.permissionGrants[0], revokedAt: "2026-08-24T19:00:00.000Z" }];
    const unknown = snapshot({ permission: "role.implied.permission" });
    const crossTenant = snapshot();
    crossTenant.permissionGrants = [{
      ...crossTenant.permissionGrants[0],
      organizationId: EXECUTIVE_TEST_IDS.otherOrganization,
    }];
    const mixedVersion = snapshot();
    mixedVersion.permissionGrants = [{ ...mixedVersion.permissionGrants[0], version: "old" }];

    for (const unsafe of [missing, expired, revoked, unknown, crossTenant, mixedVersion]) {
      await expect(
        resolveTrustedEnterpriseGrants({
          actorUserId: EXECUTIVE_TEST_IDS.executive,
          requestedScope,
          adapter: adapter(unsafe),
          now: NOW,
        }),
      ).resolves.toEqual({ ok: false, reason: "denied" });
    }
  });

  it("proves query scope alone never grants or enumerates access", async () => {
    const requested = parseRequestedEnterpriseScope({
      organizationId: EXECUTIVE_TEST_IDS.organization,
      teamId: EXECUTIVE_TEST_IDS.team,
    });
    expect(requested.ok).toBe(true);
    if (!requested.ok) return;

    await expect(
      resolveTrustedEnterpriseGrants({
        actorUserId: EXECUTIVE_TEST_IDS.unauthorized,
        requestedScope: requested.requestedScope,
        adapter: adapter(null),
        now: NOW,
      }),
    ).resolves.toEqual({ ok: false, reason: "denied" });
  });
});
