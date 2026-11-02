import "server-only";

import type { EnterpriseScope } from "@/lib/enterprise-crm/auth/authorize";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RequestedEnterpriseScopeResult =
  | { ok: true; requestedScope: EnterpriseScope }
  | { ok: false; reason: "invalid_scope" };

function strictUuid(value: unknown): string | null {
  if (typeof value !== "string" || value !== value.trim()) return null;
  return UUID_PATTERN.test(value) ? value.toLowerCase() : null;
}

/**
 * Parses route/query input as a request only. A successful result is never
 * evidence that the actor may use the requested scope.
 */
export function parseRequestedEnterpriseScope(input: {
  organizationId: unknown;
  teamId?: unknown;
}): RequestedEnterpriseScopeResult {
  const organizationId = strictUuid(input.organizationId);
  if (!organizationId) return { ok: false, reason: "invalid_scope" };

  if (input.teamId === undefined || input.teamId === null) {
    return {
      ok: true,
      requestedScope: { kind: "organization", organizationId },
    };
  }

  const teamId = strictUuid(input.teamId);
  if (!teamId) return { ok: false, reason: "invalid_scope" };

  return {
    ok: true,
    requestedScope: { kind: "team", organizationId, teamId },
  };
}
