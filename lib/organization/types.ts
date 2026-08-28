export const ORGANIZATION_ROLES = [
  "owner",
  "organization_admin",
  "media_manager",
  "rights_manager",
  "analyst",
  "viewer",
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const OPERATIONAL_ORGANIZATION_STATUSES = ["approved", "restricted"] as const;

export type OperationalOrganizationStatus =
  (typeof OPERATIONAL_ORGANIZATION_STATUSES)[number];

export interface OrganizationSummary {
  id: string;
  name: string;
  organizationType: string;
  status: OperationalOrganizationStatus;
  schoolId: string | null;
}

export type OrganizationAccess =
  | {
      scope: "organization";
      membershipId: string;
      role: OrganizationRole;
    }
  | {
      scope: "platform";
      role: "super_admin";
    };

export interface OrganizationContext {
  userId: string;
  organization: OrganizationSummary;
  access: OrganizationAccess;
}

export function isOrganizationRole(value: string): value is OrganizationRole {
  return ORGANIZATION_ROLES.some((role) => role === value);
}

export function isOperationalOrganizationStatus(
  value: string,
): value is OperationalOrganizationStatus {
  return OPERATIONAL_ORGANIZATION_STATUSES.some((status) => status === value);
}

export function hasOrganizationRole(
  context: OrganizationContext,
  allowedRoles: readonly OrganizationRole[],
): boolean {
  return (
    context.access.scope === "platform" || allowedRoles.includes(context.access.role)
  );
}
