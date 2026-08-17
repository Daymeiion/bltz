"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getDefaultAuthenticatedPath, getSafeInternalPath } from "@/lib/auth/redirects";
import { TEST_AUTH_COOKIE } from "@/lib/onboarding/test-auth";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error: string | null;
}

export async function login(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  // A real Supabase session must supersede the development-only test player.
  // Otherwise the test cookie wins in middleware/RBAC and masks the admin user.
  const cookieStore = await cookies();
  cookieStore.delete(TEST_AUTH_COOKIE);

  let destination = getSafeInternalPath(String(formData.get("next") ?? ""));
  if (!destination) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();
    destination = getDefaultAuthenticatedPath(profile?.role);
  }

  redirect(destination);
}
