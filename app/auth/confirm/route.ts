import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { getSafeInternalPath } from "@/lib/auth/redirects";
import { NextResponse, type NextRequest } from "next/server";

const EMAIL_TYPES = new Set<EmailOtpType>(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

function cleanRedirect(request: NextRequest, destination: string) {
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (!token_hash || !type || !EMAIL_TYPES.has(type)) {
    return cleanRedirect(request, "/auth/error?error=invalid_link");
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (error || !data.user || (type === "recovery" && !data.session)) {
      const unavailable = error?.status === 0 || (error?.status ?? 0) >= 500;
      return cleanRedirect(request, unavailable
        ? "/auth/error?error=verification_unavailable"
        : "/auth/error?error=invalid_link");
    }
    if (type === "recovery") return cleanRedirect(request, "/auth/update-password");

    const safe = getSafeInternalPath(searchParams.get("next"));
    // Confirmation redirects carry paths only, never callback queries/fragments.
    const path = safe ? new URL(safe, request.url).pathname : "/";
    return cleanRedirect(request, path === "/auth/confirm" ? "/" : path);
  } catch {
    return cleanRedirect(request, "/auth/error?error=verification_unavailable");
  }
}
