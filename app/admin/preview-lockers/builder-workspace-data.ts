import type { SupabaseClient } from "@supabase/supabase-js";

export type BuilderAthlete = { id: string; full_name: string; school: string | null; position: string | null; level: string | null; slug: string };
export type BuilderClaim = { preview_id: string; state: string; email: string | null; dashboard_interest: boolean; updates_permission: boolean; feature_requests: string | null; decline_reason: string | null; created_at: string };
export type BuilderReferral = { id: string; referrer_preview_id: string; full_name: string; email: string | null; phone: string | null };
export type BuilderContext = { athletes: BuilderAthlete[]; rosterUnavailable: boolean; claim: BuilderClaim | null; referrals: BuilderReferral[]; feedbackUnavailable: boolean };

// Call only after previewAdmin(). The authenticated client retains Admin RLS;
// claim/contact information never uses the public Locker projection.
export async function readBuilderContext(client: SupabaseClient, selectedId?: string): Promise<BuilderContext> {
  const roster = async () => {
    const athletes: BuilderAthlete[] = [];
    for (let offset = 0; ; offset += 1000) {
      const result = await client.from("preview_lockers").select("id,full_name,school,position,level,slug").order("full_name").order("id").range(offset, offset + 999);
      if (result.error) return { athletes: [], rosterUnavailable: true };
      const rows = (result.data ?? []) as BuilderAthlete[];
      athletes.push(...rows);
      if (rows.length < 1000) return { athletes, rosterUnavailable: false };
    }
  };
  const feedback = async () => {
    if (!selectedId) return { claim: null, referrals: [], feedbackUnavailable: false };
    const [response, candidates] = await Promise.all([
      client.from("preview_conversion_responses").select("preview_id,state,email,dashboard_interest,updates_permission,feature_requests,decline_reason,created_at").eq("preview_id", selectedId).maybeSingle(),
      client.from("preview_locker_candidates").select("id,referrer_preview_id,full_name,email,phone").eq("referrer_preview_id", selectedId).order("created_at"),
    ]);
    if (response.error || candidates.error) return { claim: null, referrals: [], feedbackUnavailable: true };
    // Also scope at the presentation boundary; a response can never bleed
    // into another athlete's panel when changing routes.
    return {
      claim: response.data?.preview_id === selectedId ? response.data as BuilderClaim : null,
      referrals: ((candidates.data ?? []) as BuilderReferral[]).filter(row => row.referrer_preview_id === selectedId),
      feedbackUnavailable: false,
    };
  };
  const [athletes, claim] = await Promise.all([roster(), feedback()]);
  return { ...athletes, ...claim };
}
