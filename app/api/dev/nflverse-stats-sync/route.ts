import { NextRequest, NextResponse } from "next/server";

import { syncNflverseStats } from "@/lib/pipeline/nflverse/sync_stats";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Manual trigger for populating `player_season_stats` with NFL season lines
 * from the nflverse `player_stats` release, for every BLTZ player that has a
 * `gsis_id`. Re-running is safe — rows upsert by (player, source, season, type).
 *
 * Auth: NODE_ENV !== "production" OR header `x-nflverse-sync-token` matching
 * `NFLVERSE_SYNC_TOKEN`.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await syncNflverseStats();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export async function GET(req: NextRequest) {
  return POST(req);
}

function isAuthorized(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const expected = process.env.NFLVERSE_SYNC_TOKEN;
  if (!expected) return false;
  return req.headers.get("x-nflverse-sync-token") === expected;
}
