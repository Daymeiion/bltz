import { getSafeInternalPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

function redirectToRecoveryError(request: NextRequest, message: string) {
  const errorUrl = new URL("/auth/error", request.url);
  errorUrl.searchParams.set("error", message);
  return NextResponse.redirect(errorUrl);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const flowId = requestUrl.searchParams.get("sb_flow_id");
  const next = getSafeInternalPath(requestUrl.searchParams.get("next")) ?? "/";

  if (!code) {
    return redirectToRecoveryError(request, "The password reset link is missing its recovery code.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined,
  );

  if (error) {
    return redirectToRecoveryError(
      request,
      "The password reset link is invalid or has expired. Request a new link and try again.",
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}

