import "server-only";

import type {
  EnterpriseScope,
  ResolvedEnterpriseGrants,
} from "@/lib/enterprise-crm/auth/authorize";
import {
  isExecutivePermission,
  type ExecutivePermission,
} from "@/lib/enterprise-crm/auth/permissions";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_VERSION_LENGTH = 160;

export interface TrustedMembershipEvidence {
  id: string;
  userId: string;
  organizationId: string;
  status: "active" | "suspended" | "removed";
  version: string;
}

export interface TrustedTeamEvidence {
  id: string;
  organizationId: string;
  version: string;
}

export interface TrustedTeamGrantEvidence {
  membershipId: string;
  organizationId: string;
  teamId: string;
  revokedAt: string | null;
  version: string;
}

export interface TrustedPermissionGrantEvidence {
  membershipId: string;
  organizationId: string;
  teamId: string | null;
  permission: string;
  revokedAt: string | null;
  version: string;
}

export interface TrustedEnterpriseAccessSnapshot {
  version: string;
  expiresAt: string;
  membership: TrustedMembershipEvidence;
  team: TrustedTeamEvidence | null;
  teamGrant: TrustedTeamGrantEvidence | null;
  permissionGrants: readonly TrustedPermissionGrantEvidence[];
}

/** Implementations must read an authoritative server-side persistence source. */
export interface TrustedEnterpriseAccessAdapter {
  loadAccessSnapshot(input: {
    actorUserId: string;
    organizationId: string;
    teamId: string | null;
  }): Promise<TrustedEnterpriseAccessSnapshot | null>;
}

export type TrustedEnterpriseResolution =
  | { ok: true; grants: ResolvedEnterpriseGrants }
  | { ok: false; reason: "denied" };

function validUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function validVersion(value: string): boolean {
  return value.length > 0 && value.length <= MAX_VERSION_LENGTH;
}

function sameScope(left: EnterpriseScope, right: EnterpriseScope): boolean {
  return left.kind === right.kind &&
    left.organizationId === right.organizationId &&
    (left.kind === "organization" ||
      (right.kind === "team" && left.teamId === right.teamId));
}

function permissionGrantMatches(
  grant: TrustedPermissionGrantEvidence,
  snapshot: TrustedEnterpriseAccessSnapshot,
  requestedScope: EnterpriseScope,
): grant is TrustedPermissionGrantEvidence & { permission: ExecutivePermission } {
  if (
    grant.membershipId !== snapshot.membership.id ||
    grant.organizationId !== requestedScope.organizationId ||
    grant.revokedAt !== null ||
    grant.version !== snapshot.version ||
    !isExecutivePermission(grant.permission)
  ) {
    return false;
  }

  return requestedScope.kind === "organization"
    ? grant.teamId === null
    : grant.teamId === null || grant.teamId === requestedScope.teamId;
}

function isInternallyConsistentSnapshot(
  snapshot: TrustedEnterpriseAccessSnapshot,
  actorUserId: string,
  requestedScope: EnterpriseScope,
  now: Date,
): boolean {
  if (
    !validVersion(snapshot.version) ||
    !validUuid(snapshot.membership.id) ||
    !validUuid(snapshot.membership.userId) ||
    !validUuid(snapshot.membership.organizationId) ||
    snapshot.membership.userId !== actorUserId ||
    snapshot.membership.organizationId !== requestedScope.organizationId ||
    snapshot.membership.status !== "active" ||
    snapshot.membership.version !== snapshot.version
  ) {
    return false;
  }

  const expiresAt = Date.parse(snapshot.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) return false;

  if (requestedScope.kind === "organization") {
    return snapshot.team === null && snapshot.teamGrant === null;
  }

  return Boolean(
    snapshot.team &&
      snapshot.teamGrant &&
      validUuid(snapshot.team.id) &&
      snapshot.team.id === requestedScope.teamId &&
      snapshot.team.organizationId === requestedScope.organizationId &&
      snapshot.team.version === snapshot.version &&
      snapshot.teamGrant.membershipId === snapshot.membership.id &&
      snapshot.teamGrant.organizationId === requestedScope.organizationId &&
      snapshot.teamGrant.teamId === requestedScope.teamId &&
      snapshot.teamGrant.revokedAt === null &&
      snapshot.teamGrant.version === snapshot.version,
  );
}

/**
 * Resolves grants only from one coherent trusted snapshot. All failures return
 * the same non-enumerating denial shape.
 */
export async function resolveTrustedEnterpriseGrants(input: {
  actorUserId: string;
  requestedScope: EnterpriseScope;
  adapter: TrustedEnterpriseAccessAdapter;
  now?: Date;
}): Promise<TrustedEnterpriseResolution> {
  const { actorUserId, requestedScope, adapter, now = new Date() } = input;
  if (
    !validUuid(actorUserId) ||
    !validUuid(requestedScope.organizationId) ||
    (requestedScope.kind === "team" && !validUuid(requestedScope.teamId))
  ) {
    return { ok: false, reason: "denied" };
  }

  const snapshot = await adapter.loadAccessSnapshot({
    actorUserId,
    organizationId: requestedScope.organizationId,
    teamId: requestedScope.kind === "team" ? requestedScope.teamId : null,
  });
  if (!snapshot || !isInternallyConsistentSnapshot(snapshot, actorUserId, requestedScope, now)) {
    return { ok: false, reason: "denied" };
  }

  if (!snapshot.permissionGrants.every((grant) =>
    permissionGrantMatches(grant, snapshot, requestedScope))) {
    return { ok: false, reason: "denied" };
  }

  const permissions = [...new Set(snapshot.permissionGrants.map((grant) => grant.permission))];
  if (permissions.length === 0) return { ok: false, reason: "denied" };

  const grants: ResolvedEnterpriseGrants = {
    actorUserId,
    membershipId: snapshot.membership.id,
    source: "trusted_internal_adapter",
    scope: requestedScope,
    permissions,
    authorizationVersion: snapshot.version,
  };

  if (!sameScope(grants.scope, requestedScope)) return { ok: false, reason: "denied" };
  return { ok: true, grants };
}
