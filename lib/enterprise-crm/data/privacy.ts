import type { ExecutivePermission } from "@/lib/enterprise-crm/auth/permissions";

export type PermissionSet = ReadonlySet<ExecutivePermission> | readonly ExecutivePermission[];

function hasPermission(
  permissions: PermissionSet,
  permission: ExecutivePermission,
): boolean {
  return "has" in permissions
    ? permissions.has(permission)
    : permissions.includes(permission);
}

/**
 * Financial data is composed only after authorization. Callers do not fetch it
 * and then redact it from a payload that has already crossed the boundary.
 */
export function composeAuthorizedFinancialSection<TPublic extends object, TFinancial>(
  publicPayload: TPublic,
  permission: "financial.summary.read" | "financial.exception.read",
  permissions: PermissionSet,
  loadFinancial: () => TFinancial,
): TPublic | (TPublic & { financial: TFinancial }) {
  if (!hasPermission(permissions, permission)) return publicPayload;
  return { ...publicPayload, financial: loadFinancial() };
}
