/** Shared-ledger-aware research pacing. Provider quota and QPS are separate limits. */
export const MIN_REQUEST_SPACING_MS = 2500;
export const LEGACY_429_COOLDOWN_MS = 60 * 60 * 1000;

export function retryAfterMs(value, now = Date.now()) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : null;
}

export function redactProviderText(value, apiKey) {
  return String(value).split(apiKey).join("[REDACTED]")
    .replace(/https?:\/\/[^\s"<>]+/gi, "[REDACTED_URL]")
    .replace(/\bBearer\s+[^\s"<>,]+/gi, "Bearer [REDACTED]")
    .replace(/((?:api[_-]?key|authorization|token|secret|password)["']?\s*[:=]\s*["']?)[^\s"'<>,}]+/gi, "$1[REDACTED]");
}

export function safeProviderHeaders(headers, apiKey) {
  const safe = {};
  for (const [key, value] of headers.entries()) {
    if (/^(?:retry-after|date|content-type|server|via|cache-control|x-cache|x-request-id|(?:x-)?rate-?limit(?:-[a-z-]+)?)$/i.test(key)) {
      safe[key] = redactProviderText(value, apiKey).slice(0, 300);
    }
  }
  return safe;
}

export function reservationErrorCode(error) {
  return ["trial_budget_exhausted", "provider_cooldown", "request_throttled", "request_in_progress", "invalid_budget"]
    .find(code => typeof error?.message === "string" && error.message.includes(code)) ?? "request_reservation_failed";
}

export async function ledgerPacing(db, now = Date.now()) {
  const [recent, rateLimit] = await Promise.all([
    db.from("provider_request_logs").select("requested_at").eq("provider", "sportradar").eq("cache_hit", false)
      .order("requested_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("provider_request_logs").select("requested_at").eq("provider", "sportradar").eq("cache_hit", false).eq("response_status", 429)
      .order("requested_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (recent.error || rateLimit.error) throw new Error("request_ledger_unavailable");
  const last = Date.parse(recent.data?.requested_at ?? "");
  const limited = Date.parse(rateLimit.data?.requested_at ?? "");
  const cooldownUntil = Number.isFinite(limited) ? limited + LEGACY_429_COOLDOWN_MS : null;
  return { waitMs: Number.isFinite(last) ? Math.max(0, last + MIN_REQUEST_SPACING_MS - now) : 0,
    cooldownUntil: cooldownUntil !== null && cooldownUntil > now ? new Date(cooldownUntil).toISOString() : null };
}
