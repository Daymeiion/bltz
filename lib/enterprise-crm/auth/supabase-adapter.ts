import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  TrustedEnterpriseAccessAdapter,
  TrustedEnterpriseAccessSnapshot,
} from "@/lib/enterprise-crm/auth/trusted-resolver";

/** Snapshots are short-lived; every request re-reads grants. */
export const ACCESS_SNAPSHOT_TTL_MS = 60_000;

const MEMBERSHIP_STATUSES = new Set(["active", "suspended", "removed"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Converts the `enterprise_access_snapshot` RPC row into the trusted snapshot
 * contract. Pilot grants are organization-wide only, so team evidence is null.
 * Anything malformed returns null, which the resolver treats as a denial.
 */
export function parseAccessSnapshot(
  raw: unknown,
  now: Date,
): TrustedEnterpriseAccessSnapshot | null {
  if (!isRecord(raw)) return null;
  const {
    membership_id: membershipId,
    user_id: userId,
    organization_id: organizationId,
    status,
    authorization_version: authorizationVersion,
    permissions,
  } = raw;

  if (
    typeof membershipId !== "string" ||
    typeof userId !== "string" ||
    typeof organizationId !== "string" ||
    typeof status !== "string" ||
    !MEMBERSHIP_STATUSES.has(status) ||
    typeof authorizationVersion !== "number" ||
    !Number.isSafeInteger(authorizationVersion) ||
    !Array.isArray(permissions) ||
    !permissions.every((permission) => typeof permission === "string")
  ) {
    return null;
  }

  const version = `membership-v${authorizationVersion}`;
  return {
    version,
    expiresAt: new Date(now.getTime() + ACCESS_SNAPSHOT_TTL_MS).toISOString(),
    membership: {
      id: membershipId,
      userId,
      organizationId,
      status: status as TrustedEnterpriseAccessSnapshot["membership"]["status"],
      version,
    },
    team: null,
    teamGrant: null,
    permissionGrants: (permissions as string[]).map((permission) => ({
      membershipId,
      organizationId,
      teamId: null,
      permission,
      revokedAt: null,
      version,
    })),
  };
}

/** Reads grants through the service-only snapshot RPC (one consistent statement). */
export function createSupabaseAccessAdapter(
  client: SupabaseClient,
  now: () => Date = () => new Date(),
): TrustedEnterpriseAccessAdapter {
  return {
    async loadAccessSnapshot({ actorUserId, organizationId, teamId }) {
      // Team-scoped grants are not part of the pilot model.
      if (teamId !== null) return null;
      const { data, error } = await client.rpc("enterprise_access_snapshot", {
        p_user_id: actorUserId,
        p_organization_id: organizationId,
      });
      if (error) return null;
      return parseAccessSnapshot(data, now());
    },
  };
}
