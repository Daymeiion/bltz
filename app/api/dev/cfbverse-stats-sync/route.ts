import { NextRequest, NextResponse } from "next/server";

import { syncCfbStats } from "@/lib/pipeline/cfbverse/sync_stats";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Manual trigger for populating `player_season_stats` with college season lines
 * from CollegeFootballData.com, for every BLTZ player whose name resolves to a
 * CFBD athlete on their school's roster.
 *
 * Query params:
 *  - `team`        — restrict to one school (cfb_teams.location/display_name).
 *  - `from`, `to`  — season range (inclusive). Defaults to each player's
 *                    roster span, clamped to CFBD's ~2004+ coverage.
 *
 * Auth: NODE_ENV !== "production" OR header `x-cfbverse-sync-token` matching
 * `CFBVERSE_SYNC_TOKEN`.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const params = req.nextUrl.searchParams;
  const team = params.get("team")?.trim() || undefined;
  const from = parseYear(params.get("from"));
  const to = parseYear(params.get("to"));

  const result = await syncCfbStats({ team, fromSeason: from, toSeason: to });
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
  return req.headers.get("x-cfbverse-sync-token") === expected;
}
