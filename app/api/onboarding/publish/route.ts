import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getTestRun, getTestUser } from "@/lib/onboarding/test-auth";

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
  // Stable cross-source player ID. Currently only the nflverse scraper sets
  // this. Format: nflverse `gsis_id` (e.g. "00-0033873") or rare legacy
  // alpha-id ("ABB498348"). Validated as a non-empty string up to 32 chars.
  gsis_id: z.string().min(1).max(32).nullable().optional(),
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
 * The route validates auth, run ownership, and the request shape, then hands
 * the multi-table mutation to a Postgres RPC. Keeping the player/profile/token/
 * run/media/award writes inside one database function prevents partial publish
 * state and lets the database enforce idempotency for retried submissions.
 */
export async function POST(req: Request) {
  const testUser = await getTestUser();
  if (testUser) {
    let body: z.infer<typeof Body>;
    try {
      body = Body.parse(await req.json());
    } catch (e: unknown) {
      const detail = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: "invalid_input", detail }, { status: 400 });
    }

    if (!getTestRun(body.run_id)) {
      return NextResponse.json({ error: "run_not_found" }, { status: 404 });
    }

    return NextResponse.json({
      slug: body.slug,
      playerId: null,
      testMode: true,
      message: "Test mode: no Supabase player row was created.",
    });
  }

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
    gsis_id: body.gsis_id ?? null,
    visibility: true,
    is_public: true,
    user_id: user.id,
    confirmed_fields: body.confirmed_fields,
  };

  const { data: published, error: publishErr } = await sb.rpc("publish_onboarding_run", {
    p_run_id: body.run_id,
    p_user_id: user.id,
    p_player: playerPayload,
    p_awards: body.awards,
    p_headshot_url: body.headshot_url ?? null,
    p_photos: body.photos.map((photo, index) => ({ ...photo, display_order: index + 1 })),
    p_claim_player_id: claimPlayerId ?? null,
    p_claim_token: run.claim_token ?? null,
  });

  if (publishErr || !published) {
    const detail = publishErr?.message;
    const status =
      detail === "slug_taken" || detail === "claim_token_already_claimed"
        ? 409
        : detail === "run_not_found"
          ? 404
          : 500;
    const error =
      detail === "slug_taken"
        ? "slug_taken"
        : detail === "run_not_found"
          ? "run_not_found"
          : detail === "claim_token_already_claimed"
            ? "already_claimed"
            : "could_not_publish";
    return NextResponse.json({ error, detail }, { status });
  }

  return NextResponse.json(published);
}
