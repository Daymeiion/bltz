import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  type AccessibleOrganization,
  hasOrganizationRole,
  isOperationalOrganizationStatus,
  isOrganizationRole,
  type OrganizationContext,
  type OrganizationRole,
  type OrganizationSeasonOption,
  type OrganizationSummary,
  type OrganizationTeamOption,
  type OrganizationWorkspaceOptions,
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

type MembershipDirectoryRecord = Pick<
  Tables<"organization_memberships">,
  "id" | "organization_id" | "role"
>;

type TeamOptionRecord = Pick<Tables<"teams">, "id" | "name" | "sport">;

type SeasonOptionRecord = Pick<
  Tables<"seasons">,
  "id" | "season_code" | "sport" | "status"
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

export interface OrganizationDirectoryReader {
  getAuthenticatedUserId(): Promise<string | null>;
  getActiveMemberships(userId: string): Promise<MembershipDirectoryRecord[]>;
  getOperationalOrganizations(organizationIds?: readonly string[]): Promise<OrganizationRecord[]>;
  isInternalAdmin(): Promise<boolean>;
}

export type OrganizationContextFailureReason =
  | "invalid_organization_id"
  | "unauthenticated"
  | "forbidden";

export type OrganizationContextResult =
  | { ok: true; context: OrganizationContext }
  | { ok: false; reason: OrganizationContextFailureReason };

export type AccessibleOrganizationsResult =
  | { ok: true; userId: string; organizations: AccessibleOrganization[] }
  | { ok: false; reason: "unauthenticated" };

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

function compareOrganizations(
  left: AccessibleOrganization,
  right: AccessibleOrganization,
): number {
  return left.organization.name.localeCompare(right.organization.name, undefined, {
    sensitivity: "base",
  });
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

async function createSupabaseDirectoryReader(): Promise<OrganizationDirectoryReader> {
  const supabase = await createClient();

  return {
    async getAuthenticatedUserId() {
      const { data, error } = await supabase.auth.getUser();
      if (error) return null;
      return data.user?.id ?? null;
    },

    async getActiveMemberships(userId) {
      const { data, error } = await supabase
        .from("organization_memberships")
        .select("id, organization_id, role")
        .eq("user_id", userId)
        .eq("status", "active");

      if (error) throw new OrganizationContextLookupError("organization directory memberships");
      return (data ?? []) as MembershipDirectoryRecord[];
    },

    async getOperationalOrganizations(organizationIds) {
      if (organizationIds && organizationIds.length === 0) return [];

      let query = supabase
        .from("organizations")
        .select("id, name, organization_type, status, school_id")
        .in("status", ["approved", "restricted"]);

      if (organizationIds) query = query.in("id", [...organizationIds]);

      const { data, error } = await query.order("name", { ascending: true });
      if (error) throw new OrganizationContextLookupError("organization directory");
      return (data ?? []) as OrganizationRecord[];
    },

    async isInternalAdmin() {
      const { data, error } = await supabase.rpc("is_internal_admin");
      if (error) throw new OrganizationContextLookupError("platform role");
      return data === true;
    },
  };
}

export async function listAccessibleOrganizationsWithReader(
  reader: OrganizationDirectoryReader,
): Promise<AccessibleOrganizationsResult> {
  const userId = await reader.getAuthenticatedUserId();
  if (!userId) return { ok: false, reason: "unauthenticated" };

  const [memberships, isInternalAdmin] = await Promise.all([
    reader.getActiveMemberships(userId),
    reader.isInternalAdmin(),
  ]);
  const membershipByOrganization = new Map(
    memberships
      .filter((membership) => isOrganizationRole(membership.role))
      .map((membership) => [membership.organization_id, membership] as const),
  );
  const organizationIds = [...membershipByOrganization.keys()];
  const records = await reader.getOperationalOrganizations(
    isInternalAdmin ? undefined : organizationIds,
  );

  const organizations = records.flatMap<AccessibleOrganization>((record) => {
    const organization = toOrganizationSummary(record);
    if (!organization) return [];

    const membership = membershipByOrganization.get(organization.id);
    if (membership && isOrganizationRole(membership.role)) {
      return [{
        organization,
        access: {
          scope: "organization",
          membershipId: membership.id,
          role: membership.role,
        },
      }];
    }

    return isInternalAdmin
      ? [{ organization, access: { scope: "platform", role: "super_admin" } }]
      : [];
  });

  return {
    ok: true,
    userId,
    organizations: organizations.sort(compareOrganizations),
  };
}

export const listAccessibleOrganizations = cache(
  async (): Promise<AccessibleOrganizationsResult> => {
    const reader = await createSupabaseDirectoryReader();
    return listAccessibleOrganizationsWithReader(reader);
  },
);

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

export const listOrganizationWorkspaceOptions = cache(
  async (organizationId: string): Promise<OrganizationWorkspaceOptions> => {
    const contextResult = await resolveOrganizationContext(organizationId);
    if (!contextResult.ok) throw new OrganizationContextAccessError(contextResult.reason);

    const supabase = await createClient();
    const [teamsResult, seasonsResult] = await Promise.all([
      supabase
        .from("teams")
        .select("id, name, sport")
        .eq("organization_id", contextResult.context.organization.id)
        .order("name", { ascending: true }),
      supabase
        .from("seasons")
        .select("id, season_code, sport, status")
        .eq("organization_id", contextResult.context.organization.id)
        .order("starts_on", { ascending: false }),
    ]);

    if (teamsResult.error) throw new OrganizationContextLookupError("team filters");
    if (seasonsResult.error) throw new OrganizationContextLookupError("season filters");

    const teams = ((teamsResult.data ?? []) as TeamOptionRecord[]).map<OrganizationTeamOption>(
      (team) => ({ id: team.id, name: team.name, sport: team.sport }),
    );
    const seasons = ((seasonsResult.data ?? []) as SeasonOptionRecord[]).map<OrganizationSeasonOption>(
      (season) => ({
        id: season.id,
        seasonCode: season.season_code,
        sport: season.sport,
        status: season.status,
      }),
    );

    return { teams, seasons };
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
