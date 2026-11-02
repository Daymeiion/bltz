import type { ResolvedEnterpriseGrants } from "@/lib/enterprise-crm/auth/authorize";

type CacheFilterValue = string | number | boolean | null | readonly CacheFilterValue[];

export type EnterpriseCacheFilters = Readonly<Record<string, CacheFilterValue>>;

function normalizeFilterValue(value: CacheFilterValue): CacheFilterValue {
  if (Array.isArray(value)) return value.map(normalizeFilterValue);
  return value;
}

function stableFilters(filters: EnterpriseCacheFilters): EnterpriseCacheFilters {
  return Object.fromEntries(
    Object.entries(filters)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, normalizeFilterValue(value)]),
  );
}

export function enterprisePermissionFingerprint(
  permissions: ResolvedEnterpriseGrants["permissions"],
): string {
  return [...new Set(permissions)].sort().join(",");
}

/**
 * Actor, tenant, effective scope, permission set, and filters are all part of
 * cache identity. A broad response therefore cannot be reused after a scope or
 * permission change.
 */
export function createEnterpriseCacheKey(
  namespace: string,
  grants: ResolvedEnterpriseGrants,
  filters: EnterpriseCacheFilters = {},
): string {
  const scope =
    grants.scope.kind === "organization"
      ? "organization"
      : `team:${grants.scope.teamId}`;

  return JSON.stringify({
    namespace,
    actorUserId: grants.actorUserId,
    organizationId: grants.scope.organizationId,
    scope,
    authorizationVersion: grants.authorizationVersion,
    permissions: enterprisePermissionFingerprint(grants.permissions),
    filters: stableFilters(filters),
  });
}
