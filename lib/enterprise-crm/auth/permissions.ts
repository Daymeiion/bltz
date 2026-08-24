export const EXECUTIVE_PERMISSION_KEYS = [
  "executive.overview.read",
  "athlete.read",
  "opportunity.read",
  "opportunity.manage",
  "opportunity.approve",
  "activation.read",
  "activation.manage",
  "rights.read",
  "rights.review",
  "assignment.create",
  "assignment.manage",
  "workload.read",
  "financial.summary.read",
  "financial.exception.read",
  "intelligence.read",
  "member.read",
  "theme.administer",
] as const;

export type ExecutivePermission = (typeof EXECUTIVE_PERMISSION_KEYS)[number];

const executivePermissionSet = new Set<string>(EXECUTIVE_PERMISSION_KEYS);

export function isExecutivePermission(value: string): value is ExecutivePermission {
  return executivePermissionSet.has(value);
}

export const FINANCIAL_PERMISSIONS = [
  "financial.summary.read",
  "financial.exception.read",
] as const satisfies readonly ExecutivePermission[];

export type EnterpriseEnforcementSurface =
  | "read"
  | "count"
  | "aggregate"
  | "search"
  | "export"
  | "mutation"
  | "notification";
