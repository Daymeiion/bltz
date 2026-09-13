import type { NextRequest, NextResponse } from "next/server";
import { TEST_AUTH_COOKIE } from "@/lib/onboarding/test-auth";

/** Clear only this project's auth cookies, including stale chunked sessions. */
export function expireAdminSessionCookies(
  request: NextRequest,
  response: NextResponse,
  staged: NextResponse,
) {
  // Same default storage key as the unchanged Supabase clients. No custom key
  // is configured in this app. Never expire another project's cookies.
  const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  const storageKey = `sb-${projectRef}-auth-token`;
  const names = new Set(staged.cookies.getAll().map(({ name }) => name));
  for (const { name } of request.cookies.getAll()) {
    if ([storageKey, `${storageKey}-code-verifier`].some(key =>
      name === key || (name.startsWith(`${key}.`) && /^\d+$/.test(name.slice(key.length + 1))),
    )) names.add(name);
  }
  for (const name of names) response.cookies.set(name, "", { path: "/", maxAge: 0 });
  response.cookies.delete(TEST_AUTH_COOKIE);
}
