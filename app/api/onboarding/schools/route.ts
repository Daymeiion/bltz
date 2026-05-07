import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * School search for the onboarding identity form.
 *
 * Merges two sources, in priority order:
 *
 *  1. `cfb_teams` — the ESPN reference table populated by
 *     `lib/pipeline/cfbverse/sync.ts`. Returns the school's display name,
 *     ESPN team ID (which we persist as `players.cfb_team_id` so the
 *     locker page can render team colors and logo), and the logo URL.
 *
 *  2. `schools` — BLTZ's internal table for high-school and non-D1
 *     programs that aren't in the ESPN dataset. Returned without a logo.
 *
 * Results are deduped by lowercased name (cfb_teams wins on collision so
 * users see the version with the logo). The shape returned to the client
 * is intentionally narrow so the autocomplete component can render
 * uniformly.
 */

interface SchoolSuggestion {
  /** BLTZ schools.id when the row was sourced from `schools`. */
  id?: string;
  /** ESPN team ID; set whenever the cfb_teams row matched. */
  cfb_team_id?: string;
  /** What we render as the option label. */
  name: string;
  /** ESPN CDN URL. Null for non-D1 schools. */
  logo_url?: string | null;
  /** Short qualifier shown beside the name (e.g. "Big Ten" or location). */
  hint?: string | null;
}

const LIMIT = 8;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const supabase = await createClient();

  const [cfbResults, schoolResults] = await Promise.all([
    fetchCfbMatches(supabase, q),
    fetchSchoolMatches(supabase, q),
  ]);

  const seen = new Set<string>();
  const out: SchoolSuggestion[] = [];

  for (const row of cfbResults) {
    const key = row.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
    if (out.length >= LIMIT) break;
  }
  for (const row of schoolResults) {
    if (out.length >= LIMIT) break;
    const key = row.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }

  return NextResponse.json({ schools: out });
}

async function fetchCfbMatches(
  supabase: Awaited<ReturnType<typeof createClient>>,
  q: string,
): Promise<SchoolSuggestion[]> {
  let query = supabase
    .from("cfb_teams")
    .select("espn_id, display_name, location, mascot, logo_url")
    .order("display_name", { ascending: true })
    .limit(LIMIT);

  if (q) {
    // Match either the ESPN display_name ("Alabama Crimson Tide") or the
    // location ("Alabama") so a typed "Alab" finds both the school and
    // its mascot variant.
    query = query.or(`display_name.ilike.%${q}%,location.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => ({
    cfb_team_id: row.espn_id,
    name: row.display_name,
    logo_url: row.logo_url ?? null,
    hint: row.mascot ?? row.location ?? null,
  }));
}

async function fetchSchoolMatches(
  supabase: Awaited<ReturnType<typeof createClient>>,
  q: string,
): Promise<SchoolSuggestion[]> {
  const query = supabase
    .from("schools")
    .select("id, name")
    .order("name", { ascending: true })
    .limit(LIMIT);

  const { data, error } = q
    ? await query.ilike("name", `%${q}%`)
    : await query;

  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    logo_url: null,
    hint: null,
  }));
}
