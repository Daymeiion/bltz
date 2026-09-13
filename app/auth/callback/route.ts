import { getSafeInternalPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

function cleanRedirect(request: NextRequest, destination: string) {
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const flowId = requestUrl.searchParams.get("sb_flow_id");
  const next = getSafeInternalPath(requestUrl.searchParams.get("next")) ?? "/";

  if (!code) {
    return cleanRedirect(request, "/auth/error?error=invalid_link");
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    if (error || !data.user || !data.session) {
      const unavailable = error?.status === 0 || (error?.status ?? 0) >= 500;
      return cleanRedirect(request, unavailable
        ? "/auth/error?error=verification_unavailable"
        : "/auth/error?error=invalid_link");
    }
    // Preserve ordinary OAuth/app query destinations, never auth credentials.
    const destination = new URL(next, request.url);
    destination.hash = "";
    for (const key of ["code", "token_hash", "access_token", "refresh_token", "error", "error_code", "error_description", "sb_flow_id"]) {
      destination.searchParams.delete(key);
    }
    return cleanRedirect(request, ["/auth/callback", "/auth/confirm"].includes(destination.pathname)
      ? "/" : destination.pathname + destination.search);
  } catch {
    return cleanRedirect(request, "/auth/error?error=verification_unavailable");
  }
}

