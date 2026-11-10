import { NextResponse, type NextRequest } from "next/server";
import { INVITE_COOKIE, INVITE_DAYS, startInvite } from "@/lib/enterprise-crm/pilot/invites";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * The player pressed "Claim your Locker". Remembers the invite (so the school is linked
 * when they finish) and sends them into onboarding. Dead links go back to the invite page.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.redirect(new URL(`/join/${token}`, request.url), 303);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const destination = await startInvite(token, Boolean(data.user));
  const response = NextResponse.redirect(new URL(destination ?? `/join/${token}`, request.url), 303);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  if (destination) {
    response.cookies.set(INVITE_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:", path: "/", maxAge: INVITE_DAYS * 86_400 });
  }
  return response;
}
