import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  hasOrganizationRole,
  isOperationalOrganizationStatus,
  isOrganizationRole,
  type OrganizationContext,
  type OrganizationRole,
  type OrganizationSummary,
} from "@/lib/organization/types";
import type { Tables } from "@/types/database";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ActiveMembershipRecord = Pick<
  Tables<"organization_memberships">,
  "id" | "role"
>;

type OrganizationRecord = Pick<
  Tables<"organizations">,
  "id" | "name" | "organization_type" | "status" | "school_id"
>;

export interface OrganizationContextReader {
  getAuthenticatedUserId(): Promise<string | null>;
  getActiveMembership(args: {
    organizationId: string;
    userId: string;
  }): Promise<ActiveMembershipRecord | null>;
  getOrganization(organizationId: string): Promise<OrganizationRecord | null>;
  isInternalAdmin(): Promise<boolean>;
}

export type OrganizationContextFailureReason =
  | "invalid_organization_id"
  | "unauthenticated"
  | "forbidden";

export type OrganizationContextResult =
  | { ok: true; context: OrganizationContext }
  | { ok: false; reason: OrganizationContextFailureReason };

export class OrganizationContextAccessError extends Error {
  constructor(readonly reason: OrganizationContextFailureReason) {
    super(`Organization context denied: ${reason}`);
    this.name = "OrganizationContextAccessError";
  }
}

class OrganizationContextLookupError extends Error {
  constructor(stage: string) {
    super(`Organization context lookup failed during ${stage}`);
    this.name = "OrganizationContextLookupError";
  }
}

function normalizeOrganizationId(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function toOrganizationSummary(record: OrganizationRecord): OrganizationSummary | null {
  if (!isOperationalOrganizationStatus(record.status)) {
    return null;
  }

  return {
    id: record.id,
    name: record.name,
    organizationType: record.organization_type,
    status: record.status,
    schoolId: record.school_id,
  };
}

async function createSupabaseReader(): Promise<OrganizationContextReader> {
  const supabase = await createClient();

  return {
    async getAuthenticatedUserId() {
      const { data, error } = await supabase.auth.getUser();
      if (error) return null;
      return data.user?.id ?? null;
    },

    async getActiveMembership({ organizationId, userId }) {
      const { data, error } = await supabase
        .from("organization_memberships")
        .select("id, role")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw new OrganizationContextLookupError("membership");
      return data as ActiveMembershipRecord | null;
    },

    async getOrganization(organizationId) {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, organization_type, status, school_id")
        .eq("id", organizationId)
        .maybeSingle();

      if (error) throw new OrganizationContextLookupError("organization");
      return data as OrganizationRecord | null;
    },

    async isInternalAdmin() {
      const { data, error } = await supabase.rpc("is_internal_admin");
      if (error) throw new OrganizationContextLookupError("platform role");
      return data === true;
    },
  };
}

export async function resolveOrganizationContextWithReader(
  organizationId: string,
  reader: OrganizationContextReader,
): Promise<OrganizationContextResult> {
  const normalizedOrganizationId = normalizeOrganizationId(organizationId);
  if (!normalizedOrganizationId) {
    return { ok: false, reason: "invalid_organization_id" };
  }

  const userId = await reader.getAuthenticatedUserId();
  if (!userId) {
    return { ok: false, reason: "unauthenticated" };
  }

  const membership = await reader.getActiveMembership({
    organizationId: normalizedOrganizationId,
    userId,
  });

  if (membership && isOrganizationRole(membership.role)) {
    const organization = await reader.getOrganization(normalizedOrganizationId);
    const summary = organization ? toOrganizationSummary(organization) : null;
    if (!summary) return { ok: false, reason: "forbidden" };

    return {
      ok: true,
      context: {
        userId,
        organization: summary,
        access: {
          scope: "organization",
          membershipId: membership.id,
          role: membership.role,
        },
      },
    };
  }

  if (!(await reader.isInternalAdmin())) {
    return { ok: false, reason: "forbidden" };
  }

  const organization = await reader.getOrganization(normalizedOrganizationId);
  const summary = organization ? toOrganizationSummary(organization) : null;
  if (!summary) return { ok: false, reason: "forbidden" };

  return {
    ok: true,
    context: {
      userId,
      organization: summary,
      access: { scope: "platform", role: "super_admin" },
    },
  };
}

export const resolveOrganizationContext = cache(
  async (organizationId: string): Promise<OrganizationContextResult> => {
    const reader = await createSupabaseReader();
    return resolveOrganizationContextWithReader(organizationId, reader);
  },
);

export async function requireOrganizationContext(
  organizationId: string,
  allowedRoles?: readonly OrganizationRole[],
): Promise<OrganizationContext> {
  const result = await resolveOrganizationContext(organizationId);
  if (!result.ok) throw new OrganizationContextAccessError(result.reason);

  if (allowedRoles && !hasOrganizationRole(result.context, allowedRoles)) {
    throw new OrganizationContextAccessError("forbidden");
  }

  return result.context;
}
