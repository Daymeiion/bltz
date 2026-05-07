import { createServiceClient } from "@/lib/supabase/service";

const TEAMS_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?limit=1000";

const FETCH_TIMEOUT_MS = 30_000;
const UPSERT_BATCH_SIZE = 200;

export interface CfbverseSyncResult {
  ok: boolean;
  rows_total: number;
  rows_upserted: number;
  rows_skipped: number;
  duration_ms: number;
  error?: string;
}

/**
 * Pulls the public ESPN college football teams endpoint, normalizes each
 * team into the cfb_teams schema, and upserts. Idempotent — re-running the
 * job touches every row's `last_synced_at`. Includes all 750+ NCAA programs
 * ESPN tracks (FBS + FCS + smaller divisions); we keep them all because
 * BLTZ athletes can come from any program.
 */
export async function syncCfbTeams(): Promise<CfbverseSyncResult> {
  const start = Date.now();
  try {
    const teams = await fetchTeams();
    const rows = teams.map(normalize).filter((r): r is CfbTeamRow => r !== null);
    const sb = createServiceClient();

    let upserted = 0;
    const skipped = teams.length - rows.length;

    for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
      const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
      const { error } = await sb
        .from("cfb_teams")
        .upsert(batch, { onConflict: "espn_id" });
      if (error) {
        return {
          ok: false,
          rows_total: teams.length,
          rows_upserted: upserted,
          rows_skipped: skipped,
          duration_ms: Date.now() - start,
          error: `supabase upsert failed: ${error.message}`,
        };
      }
      upserted += batch.length;
    }

    return {
      ok: true,
      rows_total: teams.length,
      rows_upserted: upserted,
      rows_skipped: skipped,
      duration_ms: Date.now() - start,
    };
  } catch (e) {
    return {
      ok: false,
      rows_total: 0,
      rows_upserted: 0,
      rows_skipped: 0,
      duration_ms: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

interface EspnTeam {
  id: string;
  abbreviation?: string;
  displayName?: string;
  location?: string;
  name?: string; // mascot
  slug?: string;
  color?: string;
  alternateColor?: string;
  isActive?: boolean;
  logos?: { href: string; rel?: string[] }[];
}

async function fetchTeams(): Promise<EspnTeam[]> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(TEAMS_URL, {
      signal: ctl.signal,
      headers: { "User-Agent": "BLTZ-OnboardBot/1.0" },
    });
    if (!res.ok) throw new Error(`espn teams fetch ${res.status}`);
    const json = (await res.json()) as {
      sports?: { leagues?: { teams?: { team: EspnTeam }[] }[] }[];
    };
    const teams = json.sports?.[0]?.leagues?.[0]?.teams ?? [];
    return teams.map((t) => t.team).filter((t) => Boolean(t?.id));
  } finally {
    clearTimeout(timer);
  }
}

interface CfbTeamRow {
  espn_id: string;
  abbreviation: string | null;
  display_name: string;
  location: string | null;
  mascot: string | null;
  slug: string | null;
  primary_color: string | null;
  alt_color: string | null;
  logo_url: string | null;
  logo_dark_url: string | null;
  is_active: boolean;
  last_synced_at: string;
}

function normalize(t: EspnTeam): CfbTeamRow | null {
  if (!t.id || !t.displayName) return null;

  // ESPN ships logos as an array. The first entry is typically the standard
  // logo; entries with rel: ["dark"] are the dark-mode variant. Pick both
  // if present, fall back gracefully if not.
  const logos = t.logos ?? [];
  const stdLogo = logos.find((l) => !l.rel?.includes("dark")) ?? logos[0];
  const darkLogo = logos.find((l) => l.rel?.includes("dark")) ?? null;

  return {
    espn_id: t.id,
    abbreviation: nullable(t.abbreviation),
    display_name: t.displayName,
    location: nullable(t.location),
    mascot: nullable(t.name),
    slug: nullable(t.slug),
    primary_color: normalizeHex(t.color),
    alt_color: normalizeHex(t.alternateColor),
    logo_url: stdLogo?.href ?? null,
    logo_dark_url: darkLogo?.href ?? null,
    is_active: t.isActive ?? true,
    last_synced_at: new Date().toISOString(),
  };
}

function nullable(v: string | undefined): string | null {
  if (v === undefined) return null;
  const s = v.trim();
  return s === "" ? null : s;
}

/**
 * ESPN ships colors as bare hex (no leading "#"). Normalize to lowercase
 * with a leading "#" so consumers can drop the value straight into a
 * style attribute or Tailwind `bg-[#xxxxxx]` expression.
 */
function normalizeHex(v: string | undefined): string | null {
  const s = nullable(v);
  if (s === null) return null;
  const clean = s.replace(/^#/, "").toLowerCase();
  if (!/^[0-9a-f]{3,8}$/.test(clean)) return null;
  return `#${clean}`;
}
