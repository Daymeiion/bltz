import { createClient as createSb } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Server-side only.
 *
 * Used by the onboarding pipeline (writes events into
 * `onboarding_pipeline_runs` from a background job that has no user
 * session) and by the admin claim-tokens endpoint (creates tokens
 * scoped to a particular player without going through RLS).
 *
 * NEVER import this from client code. The build will not statically
 * detect it; the runtime just lacks the env var.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "createServiceClient(): missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createSb(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
