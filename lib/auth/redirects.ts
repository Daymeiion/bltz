const BLOCKED_AUTH_DESTINATIONS = ["/auth/login", "/auth/sign-up"];

export function getSafeInternalPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  // Reject browser URL normalization tricks and nested encoded separators.
  if (/[\s\\]/.test(next) || /%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f|25)/i.test(next)) return null;
  const url = new URL(next, "https://bltz.invalid");
  if (url.origin !== "https://bltz.invalid" || url.pathname.startsWith("//")) return null;
  if (BLOCKED_AUTH_DESTINATIONS.some((path) => url.pathname === path)) {
    return null;
  }

  return url.pathname + url.search + url.hash;
}
export function getSafeInternalNext(search: string): string | null {
  return getSafeInternalPath(new URLSearchParams(search).get("next"));
}

export function getDefaultAuthenticatedPath(role: string | null | undefined) {
  if (role === "admin") return "/admin/beta";
  if (role === "player") return "/dashboard";
  return "/";
}

export function getPasswordRecoveryRedirectUrl(origin: string): string {
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", "/auth/update-password");
  return callbackUrl.toString();
}
