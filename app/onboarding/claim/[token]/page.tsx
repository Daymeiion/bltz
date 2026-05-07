import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { ClaimRecap } from "@/components/onboarding/ClaimRecap";
import { BroadcastPanel } from "@/components/onboarding/BroadcastShell";

export const dynamic = "force-dynamic";

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?next=/onboarding/claim/${encodeURIComponent(token)}`);
  }

  const sb = createServiceClient();
  const { data: tokenRow } = await sb
    .from("claim_tokens")
    .select("token, player_id, expires_at, claimed_at")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow || tokenRow.claimed_at) {
    return <ClaimError reason="invalid" />;
  }
  if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return <ClaimError reason="expired" />;
  }

  const { data: player } = await sb
    .from("players")
    .select("id, full_name, position, level, school_id, schools:schools(name)")
    .eq("id", tokenRow.player_id)
    .maybeSingle();

  if (!player) return <ClaimError reason="missing_player" />;

  const [{ count: awards_count }, { count: videos_count }, { count: photos_count }] = await Promise.all([
    sb.from("player_awards").select("id", { count: "exact", head: true }).eq("player_id", player.id),
    sb
      .from("media")
      .select("id", { count: "exact", head: true })
      .eq("player_id", player.id)
      .eq("kind", "video"),
    sb
      .from("media")
      .select("id", { count: "exact", head: true })
      .eq("player_id", player.id)
      .eq("kind", "photo"),
  ]);

  const { data: sourceRows } = await sb
    .from("media")
    .select("provenance, source_url")
    .eq("player_id", player.id)
    .limit(20);

  const sources = (sourceRows ?? []).map((r) => ({
    source: r.provenance ?? "founder_archive",
    url: r.source_url ?? null,
  }));

  return (
    <div className="space-y-10">
      <StepIndicator current={3} />
      <ClaimRecap
        token={token}
        player={{
          id: player.id,
          full_name: player.full_name,
          position: player.position,
          level: player.level,
          school: getSchoolName(player.schools),
          awards_count: awards_count ?? 0,
          videos_count: videos_count ?? 0,
          photos_count: photos_count ?? 0,
        }}
        sources={sources}
      />
    </div>
  );
}

function ClaimError({ reason }: { reason: "invalid" | "expired" | "missing_player" }) {
  const map = {
    invalid: "This claim link doesn't match anything on file. It may already be used.",
    expired: "This claim link has expired. Reach out to the BLTZ team for a new one.",
    missing_player: "We couldn't find the locker tied to this link.",
  } as const;
  return (
    <BroadcastPanel className="mx-auto max-w-xl space-y-4 border-yellow-500/30 bg-yellow-500/5 p-6 text-center">
      <h1 className="font-oswald text-3xl font-bold uppercase text-white">Claim link issue</h1>
      <p className="text-white/80">{map[reason]}</p>
      <a
        href="/onboarding"
        className="inline-flex min-h-11 items-center justify-center rounded bg-[#2952FF] px-5 py-2 font-bold text-white hover:bg-[#1f43d8]"
      >
        Start fresh
      </a>
    </BroadcastPanel>
  );
}

function getSchoolName(schools: unknown): string | null {
  if (!schools || typeof schools !== "object") return null;
  if (Array.isArray(schools)) {
    const first = schools[0];
    return first && typeof first === "object" && "name" in first && typeof first.name === "string"
      ? first.name
      : null;
  }
  return "name" in schools && typeof schools.name === "string" ? schools.name : null;
}
