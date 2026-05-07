import { NextRequest, NextResponse } from "next/server";

import { syncCfbTeams } from "@/lib/pipeline/cfbverse/sync";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Manual trigger for refreshing the `cfb_teams` reference table from the
 * public ESPN college football teams endpoint. Re-running is safe — rows
 * are upserted by `espn_id` and `last_synced_at` is bumped each time.
 *
 * Auth: requires either NODE_ENV !== "production" OR a header
 * `x-cfbverse-sync-token` matching `CFBVERSE_SYNC_TOKEN`. Production cron
 * (when wired) should send the token; local development can hit it freely.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await syncCfbTeams();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

// GET alias so cron services that only do GET can trigger it too.
export async function GET(req: NextRequest) {
  return POST(req);
}

function isAuthorized(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const expected = process.env.CFBVERSE_SYNC_TOKEN;
  if (!expected) return false;
  const provided = req.headers.get("x-cfbverse-sync-token");
  return provided === expected;
}
