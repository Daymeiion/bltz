const SENSITIVE_KEY_PATTERN =
  /(?:email|phone|address|comment|note|amount|value|revenue|compensation|token|secret|password)/i;
const MAX_DEPTH = 4;
const MAX_KEYS = 32;
const MAX_STRING_LENGTH = 256;

type SafeAuditValue =
  | string
  | number
  | boolean
  | null
  | SafeAuditMetadata
  | readonly SafeAuditValue[];

export interface SafeAuditMetadata {
  readonly [key: string]: SafeAuditValue;
}

function isSafeAuditMetadata(
  value: SafeAuditValue | undefined,
): value is SafeAuditMetadata {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sanitizeValue(value: unknown, depth: number): SafeAuditValue | undefined {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") return value.slice(0, MAX_STRING_LENGTH);
  if (depth >= MAX_DEPTH) return undefined;
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_KEYS)
      .map((item) => sanitizeValue(item, depth + 1))
      .filter((item): item is SafeAuditValue => item !== undefined);
  }
  if (typeof value !== "object") return undefined;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key))
      .slice(0, MAX_KEYS)
      .flatMap(([key, item]) => {
        const sanitized = sanitizeValue(item, depth + 1);
        return sanitized === undefined ? [] : [[key, sanitized]];
      }),
  );
}

/** Sanitizes metadata for the existing public.audit_logs JSON fields only. */
export function sanitizeExistingAuditMetadata(value: unknown): SafeAuditMetadata {
  const sanitized = sanitizeValue(value, 0);
  return isSafeAuditMetadata(sanitized) ? sanitized : {};
}
