/**
 * Synthesis layer.
 *
 * Two responsibilities:
 *   1. Compose the locker bio. Today this means: use the Wikipedia lede
 *      verbatim when available, fall back to a deterministic stat-driven
 *      stub when it isn't. No LLM rewrite — the founder prefers showing
 *      the athlete the encyclopedia's own prose over a paraphrase.
 *   2. Run the hallucination gate — match each numeric stat against the
 *      scraped value, null out anything that disagrees, and auto-confirm
 *      stats sourced from high-trust roster caches (nflverse, cfbverse).
 *
 * Kept on the synthesize() entry point name so the orchestrator's call
 * site doesn't need to know whether we're in pass-through or LLM-polish
 * mode at any given moment.
 */

import type { PipelineDraft, PlayerIdentityInput, ScraperResult, ScraperSource } from "./types";
import { canonicalizeTeams } from "./teams";

/**
 * Sources whose facts we treat as authoritative. Fields supplied by these
 * sources are auto-confirmed in the synthesis gate — the athlete doesn't
 * have to manually verify height/weight/DOB pulled from the official
 * NFL roster (nflverse) or D1 college roster cache (cfbverse).
 */
const HIGH_TRUST_SOURCES: ReadonlySet<ScraperSource> = new Set([
  "nflverse",
  "cfbverse",
]);

type FieldOrigin = Partial<Record<
  "dob" | "height_in" | "weight_lbs" | "games_played" | "position" | "school" | "hometown",
  ScraperSource
>>;

function pickFacts(
  identity: PlayerIdentityInput,
  results: ScraperResult[],
): Pick<
  PipelineDraft,
  "dob" | "height_in" | "weight_lbs" | "games_played" | "position" | "school" | "hometown" | "pro_teams" | "awards" | "youtube_urls" | "photos" | "gsis_id"
> & { _origin: FieldOrigin } {
  // First-non-null wins per field — high-trust structured sources (nflverse)
  // are registered first in SCRAPERS, so their values seed the facts before
  // prose scrapers fill gaps.
  let dob: string | undefined;
  let height_in: number | undefined;
  let weight_lbs: number | undefined;
  let games_played: number | undefined;
  let position: string | undefined = identity.position ?? undefined;
  let school: string | undefined = identity.school ?? undefined;
  let hometown: string | undefined;
  let pro_teams: string[] = [];
  let gsis_id: string | undefined;
  const awards: PipelineDraft["awards"] = [];
  const youtube_urls: string[] = [];
  const photos: PipelineDraft["photos"] = [];
  const origin: FieldOrigin = {};
  for (const r of results) {
    if (!r.ok || !r.facts) continue;
    if (r.facts.dob && !dob) { dob = r.facts.dob; origin.dob = r.source; }
    if (r.facts.height_in && !height_in) { height_in = r.facts.height_in; origin.height_in = r.source; }
    if (r.facts.weight_lbs && !weight_lbs) { weight_lbs = r.facts.weight_lbs; origin.weight_lbs = r.source; }
    if (r.facts.games_played && !games_played) { games_played = r.facts.games_played; origin.games_played = r.source; }
    if (r.facts.position && !position) { position = r.facts.position; origin.position = r.source; }
    if (r.facts.school && !school) { school = r.facts.school; origin.school = r.source; }
    if (r.facts.hometown && !hometown) { hometown = r.facts.hometown; origin.hometown = r.source; }
    // pro_teams ordering is intentionally Wikipedia-first so that
    // chronological career history wins. nflverse only reports
    // `latest_team` (the most recent stint), and processing it before
    // Wikipedia would pin that team to the front of the list after
    // dedupe — wrong order for a career timeline. Wikipedia's prose
    // extractor already returns teams in narrative/infobox order, which
    // matches the career chronology for football articles.
    if (r.facts.pro_teams) {
      if (r.source === "wikipedia") {
        pro_teams = [...r.facts.pro_teams, ...pro_teams];
      } else {
        pro_teams = [...pro_teams, ...r.facts.pro_teams];
      }
    }
    // First nflverse hit wins for gsis_id; only nflverse emits this today.
    if (r.facts.gsis_id && !gsis_id) gsis_id = r.facts.gsis_id;
    if (r.facts.awards) awards.push(...r.facts.awards);
    if (r.facts.youtube_urls) youtube_urls.push(...r.facts.youtube_urls);
    if (r.facts.photos) photos.push(...r.facts.photos);
  }
  return {
    dob: dob ?? null,
    height_in: height_in ?? null,
    weight_lbs: weight_lbs ?? null,
    games_played: games_played ?? null,
    position: position ?? null,
    school: school ?? null,
    hometown: hometown ?? null,
    // Canonicalize before dedupe — different scrapers report the same
    // team in different shapes (nflverse "SF" vs Wikipedia "San
    // Francisco 49ers"). canonicalizeTeams folds short codes into full
    // names and dedupes in one pass, preserving the first-seen order.
    pro_teams: canonicalizeTeams(pro_teams).slice(0, 8),
    awards: dedupeAwards(awards),
    youtube_urls: Array.from(new Set(youtube_urls)).slice(0, 8),
    photos: photos.slice(0, 12),
    gsis_id: gsis_id ?? null,
    _origin: origin,
  };
}

function dedupeAwards(awards: PipelineDraft["awards"]): PipelineDraft["awards"] {
  const seen = new Set<string>();
  const out: PipelineDraft["awards"] = [];
  for (const a of awards) {
    const k = `${a.name.toLowerCase()}|${a.year ?? ""}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(a);
    }
  }
  return out.slice(0, 12);
}

function deterministicBio(
  identity: PlayerIdentityInput,
  facts: ReturnType<typeof pickFacts>,
): string {
  const bits: string[] = [];
  bits.push(`${identity.full_name}`);
  if (facts.position && facts.school) {
    bits.push(`is a ${facts.position} from ${facts.school}.`);
  } else if (facts.school) {
    bits.push(`played at ${facts.school}.`);
  } else {
    bits.push(`is an athlete.`);
  }
  if (facts.height_in && facts.weight_lbs) {
    const ft = Math.floor(facts.height_in / 12);
    const inch = facts.height_in % 12;
    bits.push(`Listed at ${ft}'${inch}", ${facts.weight_lbs} lbs.`);
  }
  if (facts.games_played) bits.push(`Career games: ${facts.games_played}.`);
  if (facts.hometown) bits.push(`Hometown: ${facts.hometown}.`);
  const proTeams = facts.pro_teams ?? [];
  if (proTeams.length) bits.push(`Pro teams include ${proTeams.slice(0, 3).join(", ")}.`);
  if (facts.awards.length) {
    bits.push(
      `Recognized as ${facts.awards
        .slice(0, 3)
        .map((a) => a.name)
        .join(", ")}.`,
    );
  }
  return bits.join(" ");
}

/**
 * Numeric-stat gate. Every numeric stat in the draft must either be
 * absent or match the pickFacts() value exactly. Mismatches get nulled
 * out and the field is marked unconfirmed so the Review screen badges
 * it. Survives a future LLM-polish step too — same contract.
 */
function gate(
  draft: PipelineDraft,
  factual: ReturnType<typeof pickFacts>,
): PipelineDraft {
  const confirmed: Partial<Record<string, boolean>> = { ...draft.confirmed };
  const fields = [
    "dob",
    "height_in",
    "weight_lbs",
    "games_played",
  ] as const;
  for (const f of fields) {
    const fromTrusted =
      factual._origin[f] !== undefined &&
      HIGH_TRUST_SOURCES.has(factual._origin[f]!);

    if (factual[f] && draft[f]) {
      const a = String(factual[f]);
      const b = String(draft[f]);
      if (a !== b) {
        // Disagreement — keep the scraped value, mark unconfirmed.
        if (f === "dob") draft.dob = factual.dob;
        if (f === "height_in") draft.height_in = factual.height_in;
        if (f === "weight_lbs") draft.weight_lbs = factual.weight_lbs;
        if (f === "games_played") draft.games_played = factual.games_played;
        confirmed[f] = false;
      } else {
        // Match — auto-confirm if the scraped value came from a high-trust
        // source (e.g. nflverse master roster). Otherwise still requires
        // the athlete to confirm during Review.
        confirmed[f] = fromTrusted;
      }
    } else if (draft[f]) {
      // LLM invented a number. Drop it.
      draft[f] = null;
      confirmed[f] = false;
    }
  }
  draft.confirmed = confirmed;
  return draft;
}

export interface SynthesizeOptions {
  identity: PlayerIdentityInput;
  results: ScraperResult[];
}

export async function synthesize(opts: SynthesizeOptions): Promise<PipelineDraft> {
  const { identity, results } = opts;
  const factual = pickFacts(identity, results);

  // Bio source preference (founder call): use the Wikipedia lede VERBATIM
  // when available — that is the short biography at the top of every
  // player's Wikipedia page (e.g. "Desmond Lamont Bishop (born July 24,
  // 1984) is an American former professional football player who was a
  // linebacker in the National Football League…"). It already reads like
  // human prose, doesn't invent stats, and shows up auto-confirmed.
  //
  // Only fall back to the deterministic stat template when Wikipedia
  // didn't return — that case shows the athlete a stub they can rewrite
  // on the Review screen rather than a blank field.
  const wikiBio = results.find((r) => r.source === "wikipedia" && r.ok)
    ?.facts?.bio_text?.trim();
  const bio = wikiBio || deterministicBio(identity, factual);

  const draft: PipelineDraft = {
    full_name: identity.full_name,
    bio,
    dob: factual.dob,
    height_in: factual.height_in,
    weight_lbs: factual.weight_lbs,
    games_played: factual.games_played,
    position: factual.position,
    level: identity.level ?? null,
    school: factual.school,
    hometown: factual.hometown,
    pro_teams: factual.pro_teams,
    awards: factual.awards,
    youtube_urls: factual.youtube_urls,
    photos: factual.photos,
    gsis_id: factual.gsis_id,
    // cfb_team_id flows from the IdentityForm autocomplete, not from any
    // scraper. Carry it forward unchanged so it lands on the players row.
    cfb_team_id: identity.cfb_team_id ?? null,
    // bio is auto-confirmed when it came straight from Wikipedia — the
    // text is authoritative, not synthesized — so the Review screen
    // doesn't pester the athlete to re-confirm a paragraph they didn't
    // write. Numeric stats still default to unconfirmed; the gate() pass
    // below promotes them to confirmed only for high-trust scrapers.
    confirmed: { bio: Boolean(wikiBio), dob: false, height_in: false, weight_lbs: false, games_played: false },
    sources: results
      .filter((r) => r.ok && r.urls?.length)
      .flatMap((r) => r.urls!.map((u) => ({ url: u, source: r.source }))),
  };

  return gate(draft, factual);
}
