const SAFE_SOURCE_PATTERN = /^[a-z][a-z0-9_.-]*$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_SOURCE_LENGTH = 80;

/**
 * Explicit application schema for the existing audit_logs.request_metadata
 * object. Actor, organization, target, action, reason, risk, correlation, and
 * before/after values already have dedicated audit_logs columns and must not be
 * duplicated here.
 */
export interface SafeAuditMetadata {
  readonly source?: string;
  readonly teamId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function safeSource(value: unknown): string | undefined {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_SOURCE_LENGTH ||
    !SAFE_SOURCE_PATTERN.test(value)
  ) {
    return undefined;
  }
  return value;
}

function safeTeamId(value: unknown): string | undefined {
  return typeof value === "string" && UUID_PATTERN.test(value)
    ? value.toLowerCase()
    : undefined;
}

/**
 * Keeps only explicitly approved scalar request metadata. Unknown, sensitive,
 * nested, and invalid values are omitted rather than copied or coerced.
 */
export function sanitizeExistingAuditMetadata(value: unknown): SafeAuditMetadata {
  if (!isRecord(value)) return {};

  const source = safeSource(value.source);
  const teamId = safeTeamId(value.teamId);

  return {
    ...(source ? { source } : {}),
    ...(teamId ? { teamId } : {}),
  };
}
