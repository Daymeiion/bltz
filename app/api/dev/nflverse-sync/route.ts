import { NextRequest, NextResponse } from "next/server";

import { syncNflversePlayers } from "@/lib/pipeline/nflverse/sync";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Manual trigger for refreshing the `nfl_players` reference table from the
 * nflverse `players` GitHub release. Re-running is safe — rows are upserted
 * by `gsis_id` and `last_synced_at` is bumped each time.
 *
 * Auth: requires either NODE_ENV !== "production" OR a header
 * `x-nflverse-sync-token` matching `NFLVERSE_SYNC_TOKEN`. Production cron
 * (when wired) should send the token; local development can hit it freely.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await syncNflversePlayers();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

// GET alias so cron services that only do GET can trigger it too.
export async function GET(req: NextRequest) {
  return POST(req);
}

function isAuthorized(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const expected = process.env.NFLVERSE_SYNC_TOKEN;
  if (!expected) return false;
  const provided = req.headers.get("x-nflverse-sync-token");
  return provided === expected;
}
