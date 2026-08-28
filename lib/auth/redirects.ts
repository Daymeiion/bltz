const BLOCKED_AUTH_DESTINATIONS = ["/auth/login", "/auth/sign-up"];

export function getSafeInternalPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  if (BLOCKED_AUTH_DESTINATIONS.some((path) => next === path || next.startsWith(`${path}?`))) {
    return null;
  }

  return next;
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
