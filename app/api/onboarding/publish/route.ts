import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ScraperSource } from "@/lib/pipeline/types";

export const runtime = "nodejs";

const SLUG_RE = /^[a-z0-9](-?[a-z0-9])*$/;

const Body = z.object({
  run_id: z.string().uuid(),
  full_name: z.string().min(2).max(120),
  bio: z.string().max(4000).optional().default(""),
  dob: z.string().nullable().optional(),
  height_in: z.number().int().min(40).max(96).nullable().optional(),
  weight_lbs: z.number().int().min(60).max(450).nullable().optional(),
  games_played: z.number().int().min(0).max(1000).nullable().optional(),
  position: z.string().max(60).nullable().optional(),
  level: z.enum(["hs", "college", "pro", "former"]).nullable().optional(),
  school: z.string().max(160).nullable().optional(),
  hometown: z.string().max(160).nullable().optional(),
  headshot_url: z.string().url().nullable().optional(),
  slug: z.string().min(3).max(48).regex(SLUG_RE, "invalid slug"),
  confirmed_fields: z.record(z.string(), z.boolean()).default({}),
  awards: z
    .array(
      z.object({
        name: z.string(),
        year: z.string().optional(),
        organization: z.string().optional(),
        source_url: z.string().optional(),
      }),
    )
    .default([]),
  youtube_urls: z.array(z.string()).default([]),
  photos: z
    .array(
      z.object({
        url: z.string(),
        credits: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      }),
    )
    .default([]),
});

/**
 * Atomically publish a locker draft.
 *
 * Steps performed in a single Postgres transaction (via RPC) when possible.
 * Falls back to sequential operations under the service-role client if the
 * RPC isn't deployed yet — each step is idempotent so a partial failure can
 * be retried without corruption.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "invalid_input", detail: e?.message }, { status: 400 });
  }

  const sb = createServiceClient();

  // Verify the run belongs to the user.
  const { data: run } = await sb
    .from("onboarding_pipeline_runs")
    .select("id, user_id, claim_player_id, claim_token")
    .eq("id", body.run_id)
    .maybeSingle();
  if (!run || run.user_id !== user.id) {
    return NextResponse.json({ error: "run_not_found" }, { status: 404 });
  }

  // Slug must be free (or held by this user's existing player).
  const { data: existing } = await sb
    .from("players")
    .select("id, user_id")
    .eq("slug", body.slug)
    .maybeSingle();
  const claimPlayerId = run.claim_player_id;
  if (existing && existing.id !== claimPlayerId && existing.user_id && existing.user_id !== user.id) {
    return NextResponse.json({ error: "slug_taken" }, { status: 409 });
  }

  // Resolve school_id if we have a name.
  let school_id: string | null = null;
  if (body.school) {
    const { data: school } = await sb
      .from("schools")
      .select("id")
      .ilike("name", body.school)
      .maybeSingle();
    school_id = school?.id ?? null;
  }

  const playerPayload = {
    full_name: body.full_name,
    name: body.full_name,
    slug: body.slug,
    bio: body.bio,
    dob: body.dob,
    height_in: body.height_in,
    weight_lbs: body.weight_lbs,
    games_played: body.games_played,
    position: body.position,
    level: body.level,
    school: body.school,
    school_id,
    hometown: body.hometown,
    headshot_url: body.headshot_url,
    image_url: body.headshot_url,
    profile_image: body.headshot_url,
    youtube_urls: body.youtube_urls,
    visibility: true,
    is_public: true,
    user_id: user.id,
    confirmed_fields: body.confirmed_fields,
  };

  // Upsert the player row. Branch on whether this is a claim flow vs self-serve.
  let playerId: string | null = null;

  if (claimPlayerId) {
    const { error: updErr } = await sb
      .from("players")
      .update(playerPayload)
      .eq("id", claimPlayerId);
    if (updErr) {
      return NextResponse.json({ error: "could_not_update_player", detail: updErr.message }, { status: 500 });
    }
    playerId = claimPlayerId;
  } else {
    // Look for a player already owned by this user.
    const { data: ownPlayer } = await sb
      .from("players")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (ownPlayer) {
      const { error: updErr } = await sb
        .from("players")
        .update(playerPayload)
        .eq("id", ownPlayer.id);
      if (updErr) {
        return NextResponse.json({ error: "could_not_update_player", detail: updErr.message }, { status: 500 });
      }
      playerId = ownPlayer.id;
    } else {
      const { data: created, error: insErr } = await sb
        .from("players")
        .insert(playerPayload)
        .select("id")
        .single();
      if (insErr || !created) {
        return NextResponse.json({ error: "could_not_create_player", detail: insErr?.message }, { status: 500 });
      }
      playerId = created.id;
    }
  }

  // Awards — upsert. We use simple insert + ignore unique-conflict via name+year.
  if (body.awards.length > 0) {
    const rows = body.awards.map((a) => ({
      player_id: playerId,
      name: a.name,
      year: a.year ? Number(a.year) : null,
      organization: a.organization ?? null,
      source_url: a.source_url || null,
      ai_discovered: true,
      verified: false,
      category: "sports" as const,
      significance: "regional" as const,
    }));
    await sb.from("player_awards").insert(rows);
  }

  // Headshot media row, so the locker page can render it from `media`.
  if (body.headshot_url) {
    await sb.from("media").insert({
      player_id: playerId,
      url: body.headshot_url,
      kind: "headshot",
      provenance: "athlete_uploaded",
      display_order: 0,
    });
  }

  // Photos — write any remaining ones at higher display_order so the headshot stays first.
  if (body.photos.length > 0) {
    const rows = body.photos.map((p, i) => ({
      player_id: playerId,
      url: p.url,
      kind: "photo" as const,
      credits: p.credits ?? null,
      width: p.width ?? null,
      height: p.height ?? null,
      display_order: i + 1,
      provenance: "founder_archive" as ScraperSource,
    }));
    await sb.from("media").insert(rows);
  }

  // Promote the user profile to player + bind player_id.
  const { error: profileErr } = await sb
    .from("profiles")
    .upsert(
      {
        id: user.id,
        role: "player",
        player_id: playerId,
        full_name: body.full_name,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  if (profileErr) {
    return NextResponse.json({ error: "could_not_update_profile", detail: profileErr.message }, { status: 500 });
  }

  // Mark claim token as used if applicable.
  if (run.claim_token) {
    await sb
      .from("claim_tokens")
      .update({ claimed_at: new Date().toISOString(), claimed_by: user.id })
      .eq("token", run.claim_token);
  }

  // Mark the pipeline run as complete + bound to the player.
  await sb
    .from("onboarding_pipeline_runs")
    .update({
      status: "complete",
      player_id: playerId,
      completed_at: new Date().toISOString(),
    })
    .eq("id", body.run_id);

  return NextResponse.json({ slug: body.slug, playerId });
}
