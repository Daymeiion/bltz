import { NextRequest, NextResponse } from "next/server";

import { syncCfbPlayers } from "@/lib/pipeline/cfbverse/sync_players";

export const runtime = "nodejs";
// Roster sync iterates team × season; with throttling enabled this can
// run for many minutes. Bumping to the maximum so a scoped backfill
// (single team, full history) completes in a single request.
export const maxDuration = 300;

/**
 * Manual trigger for refreshing the `cfb_players` reference table from
 * the CollegeFootballData.com /roster endpoint.
 *
 * Query params:
 *  - `team`        — restrict the sync to a single school. Matches our
 *                    cfb_teams.location or display_name. Useful for
 *                    seeding one program's history during dev.
 *  - `from`, `to`  — season range (inclusive). Defaults to 2010..now.
 *
 * Auth: requires either NODE_ENV !== "production" OR a header
 * `x-cfbverse-sync-token` matching `CFBVERSE_SYNC_TOKEN`.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const team = params.get("team")?.trim() || undefined;
  const from = parseYear(params.get("from"));
  const to = parseYear(params.get("to"));

  const result = await syncCfbPlayers({ team, fromSeason: from, toSeason: to });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export async function GET(req: NextRequest) {
  return POST(req);
}

function parseYear(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1900 || n > 2100) return undefined;
  return Math.trunc(n);
}

function isAuthorized(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const expected = process.env.CFBVERSE_SYNC_TOKEN;
  if (!expected) return false;
  const provided = req.headers.get("x-cfbverse-sync-token");
  return provided === expected;
}
