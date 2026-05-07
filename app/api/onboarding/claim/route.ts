import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { PipelineDraft, PipelineEvent, ScraperSource } from "@/lib/pipeline/types";

export const runtime = "nodejs";

const Body = z.object({ token: z.string().min(8).max(120) });

/**
 * Redeem a claim token. Validates the token, builds a `PipelineDraft` from the
 * existing player + media rows, and inserts an `onboarding_pipeline_runs` row
 * already in `manual` status so the Review screen renders it directly. We do
 * NOT mark `claimed_at` until the athlete publishes.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "invalid_input", detail }, { status: 400 });
  }

  const sb = createServiceClient();
  const { data: tokenRow } = await sb
    .from("claim_tokens")
    .select("token, player_id, expires_at, claimed_at")
    .eq("token", body.token)
    .maybeSingle();
  if (!tokenRow) return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  if (tokenRow.claimed_at) return NextResponse.json({ error: "already_claimed" }, { status: 409 });
  if (new Date(tokenRow.expires_at).getTime() < Date.now())
    return NextResponse.json({ error: "expired" }, { status: 410 });

  const { data: activeRun } = await sb
    .from("onboarding_pipeline_runs")
    .select("id, user_id")
    .eq("claim_token", body.token)
    .is("completed_at", null)
    .maybeSingle();
  if (activeRun) {
    if (activeRun.user_id === user.id) {
      return NextResponse.json({ runId: activeRun.id, reused: true });
    }

    return NextResponse.json({ error: "claim_in_progress" }, { status: 409 });
  }

  const { data: player } = await sb
    .from("players")
    .select(
      "id, full_name, position, level, school_id, dob, height_in, weight_lbs, games_played, current_status, hometown, bio, slug",
    )
    .eq("id", tokenRow.player_id)
    .maybeSingle();
  if (!player) return NextResponse.json({ error: "player_missing" }, { status: 404 });

  const { data: school } = player.school_id
    ? await sb.from("schools").select("name").eq("id", player.school_id).maybeSingle()
    : { data: null as { name: string } | null };

  const { data: awards } = await sb
    .from("player_awards")
    .select("name, year, organization, source_url")
    .eq("player_id", player.id);

  const { data: media } = await sb
    .from("media")
    .select("kind, url, source_url, provenance, credits, width, height")
    .eq("player_id", player.id);

  const photos = (media ?? [])
    .filter((m) => m.kind === "photo" || m.kind === "headshot")
    .map((m) => ({
      url: m.url,
      credits: m.credits ?? undefined,
      width: m.width ?? undefined,
      height: m.height ?? undefined,
    }));

  const youtube_urls = (media ?? [])
    .filter((m) => m.kind === "video")
    .map((m) => m.url)
    .filter(Boolean);

  const sources = Array.from(
    new Map(
      (media ?? [])
        .filter((m) => m.source_url)
        .map((m) => [m.source_url, { source: (m.provenance ?? "founder_archive") as ScraperSource, url: m.source_url! }]),
    ).values(),
  );

  const draft: PipelineDraft = {
    full_name: player.full_name ?? "",
    bio: player.bio ?? "",
    dob: player.dob ?? null,
    height_in: player.height_in ?? null,
    weight_lbs: player.weight_lbs ?? null,
    games_played: player.games_played ?? null,
    position: player.position ?? null,
    level: (player.level ?? null) as PipelineDraft["level"],
    school: school?.name ?? null,
    hometown: player.hometown ?? null,
    awards: (awards ?? []).map((a) => ({
      name: a.name,
      year: a.year ? String(a.year) : undefined,
      organization: a.organization ?? undefined,
      source_url: a.source_url ?? "",
    })),
    youtube_urls,
    photos,
    confirmed: {},
    sources,
  };

  const event: PipelineEvent = {
    at: new Date().toISOString(),
    phase: "complete",
    message: "Loaded your existing locker draft.",
  };

  const { data: run, error: insertErr } = await sb
    .from("onboarding_pipeline_runs")
    .insert({
      user_id: user.id,
      identity: {
        full_name: player.full_name,
        school: school?.name,
        position: player.position,
        level: player.level,
      },
      status: "complete",
      events: [event],
      draft,
      claim_player_id: player.id,
      claim_token: body.token,
    })
    .select("id")
    .single();

  if (insertErr || !run) {
    if (insertErr?.code === "23505") {
      const { data: contestedRun } = await sb
        .from("onboarding_pipeline_runs")
        .select("id, user_id")
        .eq("claim_token", body.token)
        .is("completed_at", null)
        .maybeSingle();

      if (contestedRun?.user_id === user.id) {
        return NextResponse.json({ runId: contestedRun.id, reused: true });
      }

      return NextResponse.json({ error: "claim_in_progress" }, { status: 409 });
    }

    return NextResponse.json({ error: "could_not_seed", detail: insertErr?.message }, { status: 500 });
  }

  return NextResponse.json({ runId: run.id });
}
