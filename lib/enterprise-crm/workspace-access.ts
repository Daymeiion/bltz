import "server-only";

import { cache } from "react";
import { authorizeEnterpriseRequest, type ResolvedEnterpriseGrants } from "@/lib/enterprise-crm/auth/authorize";
import {
  EXECUTIVE_PERMISSION_KEYS,
  FINANCIAL_PERMISSIONS,
  type ExecutivePermission,
} from "@/lib/enterprise-crm/auth/permissions";
import {
  projectShellCapabilities,
  SHELL_CAPABILITY_REQUIREMENTS,
  type ShellCapabilityKey,
} from "@/lib/enterprise-crm/auth/shell-capabilities";
import { createSupabaseAccessAdapter } from "@/lib/enterprise-crm/auth/supabase-adapter";
import {
  resolveTrustedEnterpriseGrants,
  type TrustedEnterpriseAccessAdapter,
} from "@/lib/enterprise-crm/auth/trusted-resolver";
import { createSupabaseSchoolThemeAdapter } from "@/lib/enterprise-crm/theme/supabase-adapter";
import {
  resolveEnterpriseSchoolTheme,
  type ExactSchoolThemeAdapter,
} from "@/lib/enterprise-crm/theme/resolver";
import { resolveOrganizationContext } from "@/lib/organization/context";
import type { OrganizationContext } from "@/lib/organization/types";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * BLTZ internal admins support and demo every pilot workspace. They see all
 * non-financial capabilities; school financial data still needs an explicit grant.
 */
export const PLATFORM_SUPPORT_PERMISSIONS: readonly ExecutivePermission[] =
  EXECUTIVE_PERMISSION_KEYS.filter(
    (permission) => !(FINANCIAL_PERMISSIONS as readonly string[]).includes(permission),
  );

/** Serializable shell projection. Presentation only; pages re-authorize. */
export interface WorkspaceAccess {
  capabilities: Record<ShellCapabilityKey, boolean>;
  /** Plan activations and record their reach. */
  canManageActivations: boolean;
  theme: {
    mode: "bltz" | "school";
    accent: string;
    highlight: string;
    logoUrl: string | null;
  };
}

function noCapabilities(): Record<ShellCapabilityKey, boolean> {
  return Object.fromEntries(
    Object.keys(SHELL_CAPABILITY_REQUIREMENTS).map((key) => [key, false]),
  ) as Record<ShellCapabilityKey, boolean>;
}

export async function resolveWorkspaceGrants(
  context: OrganizationContext,
  adapter: TrustedEnterpriseAccessAdapter,
): Promise<ResolvedEnterpriseGrants | null> {
  const scope = { kind: "organization", organizationId: context.organization.id } as const;

  if (context.access.scope === "platform") {
    return {
      actorUserId: context.userId,
      membershipId: null,
      source: "trusted_internal_adapter",
      scope,
      permissions: PLATFORM_SUPPORT_PERMISSIONS,
      authorizationVersion: "platform-support",
    };
  }

  const result = await resolveTrustedEnterpriseGrants({
    actorUserId: context.userId,
    requestedScope: scope,
    adapter,
  });
  return result.ok ? result.grants : null;
}

export async function resolveWorkspaceAccessWith(
  context: OrganizationContext,
  adapters: { access: TrustedEnterpriseAccessAdapter; theme: ExactSchoolThemeAdapter },
): Promise<WorkspaceAccess> {
  const [grants, theme] = await Promise.all([
    resolveWorkspaceGrants(context, adapters.access),
    resolveEnterpriseSchoolTheme({ schoolId: context.organization.schoolId, adapter: adapters.theme }),
  ]);

  const capabilities = noCapabilities();
  if (grants) {
    const projection = projectShellCapabilities(grants);
    for (const key of Object.keys(capabilities) as ShellCapabilityKey[]) {
      capabilities[key] = projection.capabilities[key].available;
    }
  }

  return {
    capabilities,
    canManageActivations: Boolean(grants?.permissions.includes("activation.manage")),
    theme: {
      mode: theme.mode,
      accent: theme.accent,
      highlight: theme.highlight,
      logoUrl: theme.logoUrl,
    },
  };
}

export const resolveWorkspaceAccess = cache(
  async (context: OrganizationContext): Promise<WorkspaceAccess> => {
    const client = createServiceClient();
    return resolveWorkspaceAccessWith(context, {
      access: createSupabaseAccessAdapter(client),
      theme: createSupabaseSchoolThemeAdapter(client),
    });
  },
);

export type WorkspaceAuthorization =
  | { ok: true; context: OrganizationContext; grants: ResolvedEnterpriseGrants }
  | { ok: false; status: 401 | 403 | 404 };

/** Server-side gate for workspace APIs: membership, then one explicit permission. */
export async function authorizeWorkspaceRequest(
  organizationId: string,
  permission: ExecutivePermission,
): Promise<WorkspaceAuthorization> {
  const result = await resolveOrganizationContext(organizationId);
  if (!result.ok) return { ok: false, status: result.reason === "unauthenticated" ? 401 : 404 };
  const grants = await resolveWorkspaceGrants(result.context, createSupabaseAccessAdapter(createServiceClient()));
  if (!grants) return { ok: false, status: 403 };
  const decision = authorizeEnterpriseRequest(grants, { organizationId: result.context.organization.id, permission, surface: "mutation" });
  return decision.allowed ? { ok: true, context: result.context, grants } : { ok: false, status: 403 };
}
