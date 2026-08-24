import "server-only";

import type { ResolvedEnterpriseGrants } from "@/lib/enterprise-crm/auth/authorize";
import type { ExecutivePermission } from "@/lib/enterprise-crm/auth/permissions";

export const SHELL_CAPABILITY_REQUIREMENTS = {
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
} as const satisfies Record<string, readonly ExecutivePermission[]>;

export type ShellCapabilityKey = keyof typeof SHELL_CAPABILITY_REQUIREMENTS;

export interface ShellCapabilityDecision {
  available: boolean;
  matchedPermissions: readonly ExecutivePermission[];
  blockedByMissingContract: boolean;
}

export interface ShellCapabilities {
  actorUserId: string;
  organizationId: string;
  scope: ResolvedEnterpriseGrants["scope"];
  authorizationVersion: string;
  capabilities: Record<ShellCapabilityKey, ShellCapabilityDecision>;
}

/** Presentation availability only; every protected operation re-authorizes. */
export function projectShellCapabilities(
  grants: ResolvedEnterpriseGrants,
): ShellCapabilities {
  const granted = new Set(grants.permissions);
  const capabilities = {} as Record<ShellCapabilityKey, ShellCapabilityDecision>;
  for (const key of Object.keys(SHELL_CAPABILITY_REQUIREMENTS) as ShellCapabilityKey[]) {
    const requirements: readonly ExecutivePermission[] = SHELL_CAPABILITY_REQUIREMENTS[key];
    const matchedPermissions = requirements.filter((permission) => granted.has(permission));
    capabilities[key] = {
      available: requirements.length > 0 && matchedPermissions.length > 0,
      matchedPermissions,
      blockedByMissingContract: requirements.length === 0,
    };
  }

  return {
    actorUserId: grants.actorUserId,
    organizationId: grants.scope.organizationId,
    scope: grants.scope,
    authorizationVersion: grants.authorizationVersion,
    capabilities,
  };
}
