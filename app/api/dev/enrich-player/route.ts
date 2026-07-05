// TEMP DEV ROUTE — runs the real onboarding scrapers against an EXISTING player
// and writes the result back onto that player (identity fields, awards, youtube).
// Non-production only. Safe to delete after use.
//
//   POST /api/dev/enrich-player?slug=cameron-jordan
//
// Reuses lib/pipeline (the same scrapers the onboarding flow uses) so the data
// is identical to what a fresh onboard would produce, but applied in-place to a
// player that already exists in the DB.

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { executePipeline, type PipelineSink } from "@/lib/pipeline/run";
import type {
  PipelineDraft,
  PipelineEvent,
  PlayerIdentityInput,
} from "@/lib/pipeline/types";

export const runtime = "nodejs";
export const maxDuration = 120;

function classifyLevel(name: string, org?: string): "HS" | "College" | "Pro" {
  const s = `${name} ${org ?? ""}`.toLowerCase();
  if (
    /(all-american|heisman|sec|pac-?12|pac-?10|big ten|big 12|\bacc\b|college|freshman|maxwell|bednarik|nagurski|outland|walter camp|lombardi|consensus)/.test(
      s,
    )
  )
    return "College";
  return "Pro";
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled in production" }, { status: 403 });
  }

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug query param required" }, { status: 400 });
  }

  const sb = createServiceClient();
  const { data: player, error: playerErr } = await sb
    .from("players")
    .select("id, full_name, name, position, level, cfb_team_id")
    .eq("slug", slug)
    .maybeSingle();

  if (playerErr || !player) {
    return NextResponse.json(
      { error: playerErr?.message ?? "player not found" },
      { status: 404 },
    );
  }

  const fullName = (player.full_name || player.name || "").trim();
  const identity: PlayerIdentityInput = {
    full_name: fullName,
    school: null,
    position: player.position ?? null,
    level: (player.level as PlayerIdentityInput["level"]) ?? null,
    cfb_team_id: player.cfb_team_id ?? null,
  };

  // Capturing sink — drive the real pipeline but keep the result in memory
  // instead of writing to onboarding_pipeline_runs.
  const events: PipelineEvent[] = [];
  let draft: PipelineDraft | null = null;
  let runError: string | null = null;
  const sink: PipelineSink = {
    emit(event) {
      events.push(event);
    },
    setStatus(status, patch = {}) {
      if (patch.draft) draft = patch.draft;
      if (status === "error" || status === "manual") {
        runError = patch.error ?? status;
      }
    },
  };

  await executePipeline(sink, identity);

  if (!draft) {
    return NextResponse.json(
      { error: "pipeline produced no draft", runError, events },
      { status: 502 },
    );
  }

  const d: PipelineDraft = draft;

  // --- Apply identity fields (only overwrite when the scrape found something) ---
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (d.bio) patch.bio = d.bio;
  if (d.dob) patch.dob = d.dob;
  if (d.hometown) patch.hometown = d.hometown;
  if (typeof d.height_in === "number") patch.height_in = d.height_in;
  if (typeof d.weight_lbs === "number") patch.weight_lbs = d.weight_lbs;
  if (typeof d.games_played === "number") patch.games_played = d.games_played;
  if (Array.isArray(d.youtube_urls) && d.youtube_urls.length)
    patch.youtube_urls = d.youtube_urls;

  await sb.from("players").update(patch).eq("id", player.id);

  // --- Insert scraped photos into media (so collegeImage + photo band resolve) ---
  let photosInserted = 0;
  if (Array.isArray(d.photos) && d.photos.length) {
    // Clear prior scraped photos for a clean re-run (only the ones we own).
    await sb
      .from("media")
      .delete()
      .eq("player_id", player.id)
      .eq("kind", "photo")
      .eq("provenance", "founder_archive");
    const rows = d.photos.map((ph, i) => ({
      player_id: player.id,
      url: ph.url,
      kind: "photo",
      provenance: "founder_archive",
      credits: ph.credits ?? null,
      width: ph.width ?? null,
      height: ph.height ?? null,
      display_order: i,
      source_url: ph.url,
    }));
    const { error: phErr, count } = await sb
      .from("media")
      .insert(rows, { count: "exact" });
    if (!phErr) photosInserted = count ?? rows.length;
  }

  // --- Replace awards (the `awards` table the locker reads) ---
  let awardsInserted = 0;
  if (Array.isArray(d.awards) && d.awards.length) {
    await sb.from("awards").delete().eq("player_id", String(player.id));
    const rows = d.awards.map((a) => ({
      player_id: String(player.id),
      player_name: fullName,
      award_name: a.name,
      award_short_desc: a.organization || a.evidence_quote || a.name,
      year: a.year ?? "",
      level: classifyLevel(a.name, a.organization),
      team_or_school: a.organization ?? null,
      source_site: hostOf(a.source_url),
      source_url: a.source_url,
      evidence_quote: a.evidence_quote ?? null,
    }));
    const { error: awErr, count } = await sb
      .from("awards")
      .insert(rows, { count: "exact" });
    if (!awErr) awardsInserted = count ?? rows.length;
  }

  return NextResponse.json({
    ok: true,
    slug,
    applied: Object.keys(patch).filter((k) => k !== "updated_at"),
    awardsInserted,
    photosInserted,
    photoUrls: d.photos?.map((p) => p.url) ?? [],
    draft: {
      bio_chars: d.bio?.length ?? 0,
      dob: d.dob ?? null,
      hometown: d.hometown ?? null,
      height_in: d.height_in ?? null,
      weight_lbs: d.weight_lbs ?? null,
      pro_teams: d.pro_teams ?? [],
      awards: d.awards?.map((a) => ({ name: a.name, year: a.year, org: a.organization })) ?? [],
      youtube_count: d.youtube_urls?.length ?? 0,
      photo_count: d.photos?.length ?? 0,
    },
    runError,
    events: events.map((e) => ({ phase: e.phase, source: e.source, message: e.message })),
  });
}

export const GET = POST;
