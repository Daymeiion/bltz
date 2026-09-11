export class StatsError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
export function responseError(status: number) {
  const codes: Record<number, string> = {
    401: "provider_unauthorized", 403: "provider_access_denied",
    404: "provider_player_not_found", 429: "provider_quota_limited",
  };
  return new StatsError(codes[status] ?? (status >= 500 ? "provider_unavailable" : "provider_request_failed"), 502);
}
