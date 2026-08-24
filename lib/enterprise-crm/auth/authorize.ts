import "server-only";

import type {
  EnterpriseEnforcementSurface,
  ExecutivePermission,
} from "@/lib/enterprise-crm/auth/permissions";

export type EnterpriseScope =
  | { kind: "organization"; organizationId: string }
  | { kind: "team"; organizationId: string; teamId: string };

/**
 * This input must be built by a server adapter from canonical membership and
 * scope records. Request bodies, query parameters, cookies, JWT custom claims,
 * and client/UI state are not trusted grant sources.
 */
export interface ResolvedEnterpriseGrants {
  actorUserId: string;
  membershipId: string | null;
  source: "canonical_membership" | "trusted_internal_adapter";
  scope: EnterpriseScope;
  permissions: readonly ExecutivePermission[];
  authorizationVersion: string;
}

export interface EnterpriseAuthorizationRequest {
  organizationId: string;
  teamId?: string | null;
  permission: ExecutivePermission;
  surface: EnterpriseEnforcementSurface;
}

export type EnterpriseAuthorizationDecision =
  | { allowed: true; actorUserId: string; scope: EnterpriseScope }
  | {
      allowed: false;
      reason: "invalid_grants" | "organization_scope" | "team_scope" | "permission";
    };

function hasNonBlankValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function authorizeEnterpriseRequest(
  grants: ResolvedEnterpriseGrants,
  request: EnterpriseAuthorizationRequest,
): EnterpriseAuthorizationDecision {
  if (
    !hasNonBlankValue(grants.actorUserId) ||
    !hasNonBlankValue(grants.scope.organizationId) ||
    !hasNonBlankValue(grants.authorizationVersion) ||
    !hasNonBlankValue(request.organizationId) ||
    (grants.source === "canonical_membership" && !hasNonBlankValue(grants.membershipId))
  ) {
    return { allowed: false, reason: "invalid_grants" };
  }

  if (grants.scope.organizationId !== request.organizationId) {
    return { allowed: false, reason: "organization_scope" };
  }

  if (grants.scope.kind === "team") {
    if (!hasNonBlankValue(request.teamId) || request.teamId !== grants.scope.teamId) {
      return { allowed: false, reason: "team_scope" };
    }
  }

  if (!grants.permissions.includes(request.permission)) {
    return { allowed: false, reason: "permission" };
  }

  return {
    allowed: true,
    actorUserId: grants.actorUserId,
    scope: grants.scope,
  };
}

export class EnterpriseAuthorizationError extends Error {
  constructor(readonly reason: Exclude<EnterpriseAuthorizationDecision, { allowed: true }>["reason"]) {
    super("Enterprise request denied");
    this.name = "EnterpriseAuthorizationError";
  }
}

export function requireEnterpriseRequest(
  grants: ResolvedEnterpriseGrants,
  request: EnterpriseAuthorizationRequest,
): Extract<EnterpriseAuthorizationDecision, { allowed: true }> {
  const decision = authorizeEnterpriseRequest(grants, request);
  if (!decision.allowed) throw new EnterpriseAuthorizationError(decision.reason);
  return decision;
}
