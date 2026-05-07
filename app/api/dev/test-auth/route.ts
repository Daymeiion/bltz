import { NextRequest, NextResponse } from "next/server";
import { TEST_AUTH_COOKIE, isTestAuthEnabled } from "@/lib/onboarding/test-auth";

export async function GET(req: NextRequest) {
  if (!isTestAuthEnabled()) {
    return NextResponse.json({ error: "test_auth_disabled" }, { status: 404 });
  }

  const next = req.nextUrl.searchParams.get("next") || "/onboarding";
  const url = req.nextUrl.clone();
  url.pathname = next.startsWith("/") ? next : "/onboarding";
  url.search = "";

  const res = NextResponse.redirect(url);
  res.cookies.set(TEST_AUTH_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(TEST_AUTH_COOKIE);
  return res;
}
