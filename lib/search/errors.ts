/** Safe diagnostic codes only: never carry provider bodies, credentials or URLs. */
export const searchErrorMessages = {
  search_not_configured: "News search is not configured. Set the server-only Tavily API key.",
  search_auth_failed: "Tavily rejected the credential or access. Check the server configuration.",
  search_rate_limited: "Tavily is rate limited. Try again later.",
  search_quota_exceeded: "Tavily's usage limit was reached. Check the provider account limit.",
  search_timeout: "News search timed out. Try again later.",
  search_aborted: "News search was interrupted. Try again.",
  search_unavailable: "Tavily is temporarily unavailable. Try again later.",
  search_invalid_response: "Tavily returned an invalid response. Try again later.",
  search_invalid_request: "The news search request was rejected. Check the integration configuration.",
  search_failed: "News search is unavailable. Try again later.",
} as const;

export type SearchErrorCode = keyof typeof searchErrorMessages;
export class SearchProviderError extends Error {
  constructor(readonly code: SearchErrorCode) {
    super(code);
    this.name = "SearchProviderError";
  }
}

export function searchErrorMessage(code: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(searchErrorMessages, code)
    ? searchErrorMessages[code as SearchErrorCode] : undefined;
}
