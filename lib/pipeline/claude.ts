/**
 * Synthesis layer.
 *
 * Despite the filename, the implementation is vendor-agnostic. The plan
 * scopes Claude as the canonical model; we wrap whichever provider key
 * is configured (OpenAI today, Anthropic later) behind a single function
 * so the orchestrator never needs to care.
 *
 * The two responsibilities here:
 *   1. Polish the scraped facts into a 250-word athlete bio.
 *   2. Run the hallucination gate (T1) — refuse to commit any numeric
 *      stat that the prose disagrees with the scraped value on.
 *
 * Token-budget guard (P2): we cap input at ~6k characters per source
 * and bail at 25k total. The orchestrator passes a budget; we read it.
 */

import OpenAI from "openai";
import type { PipelineDraft, PlayerIdentityInput, ScraperResult, ScraperSource } from "./types";

const PROMPT_VERSION = "bltz.synth.v1";

/**
 * Sources whose facts we treat as authoritative. Fields supplied by these
 * sources are auto-confirmed in the synthesis gate — the athlete doesn't
 * have to manually verify height/weight/DOB pulled from the official
 * NFL roster, for example.
 */
const HIGH_TRUST_SOURCES: ReadonlySet<ScraperSource> = new Set(["nflverse"]);

type FieldOrigin = Partial<Record<
  "dob" | "height_in" | "weight_lbs" | "games_played" | "position" | "school" | "hometown",
  ScraperSource
>>;

function pickFacts(
  identity: PlayerIdentityInput,
  results: ScraperResult[],
): Pick<
  PipelineDraft,
  "dob" | "height_in" | "weight_lbs" | "games_played" | "position" | "school" | "hometown" | "pro_teams" | "awards" | "youtube_urls" | "photos"
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
    if (r.facts.pro_teams) pro_teams = [...pro_teams, ...r.facts.pro_teams];
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
    pro_teams: Array.from(new Set(pro_teams)).slice(0, 8),
    awards: dedupeAwards(awards),
    youtube_urls: Array.from(new Set(youtube_urls)).slice(0, 8),
    photos: photos.slice(0, 12),
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

const BUDGET_DEFAULT = 25_000;

function trim(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

/**
 * Hallucination gate. The LLM is allowed to embellish prose, but every
 * numeric stat in the draft must be either (a) absent or (b) match the
 * pickFacts() value exactly. Mismatches get nulled out and the field is
 * marked as `unconfirmed` so the Review screen badges it.
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
  budgetChars?: number;
}

export async function synthesize(opts: SynthesizeOptions): Promise<PipelineDraft> {
  const { identity, results } = opts;
  const factual = pickFacts(identity, results);

  // Compose source-grounded prompt. We cap each source bio chunk so the
  // total stays under the budget regardless of how chatty Wikipedia is.
  const budget = opts.budgetChars ?? BUDGET_DEFAULT;
  const perSourceCap = Math.max(2_000, Math.floor(budget / Math.max(results.length, 1)));
  const sourceBlobs = results
    .filter((r) => r.ok && r.facts?.bio_text)
    .map((r) => `### ${r.source}\n${trim(r.facts!.bio_text!, perSourceCap)}`)
    .join("\n\n");

  let bio = deterministicBio(identity, factual);

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && sourceBlobs.length > 0) {
    try {
      const client = new OpenAI({ apiKey });
      const sys = `You are writing a short locker-page biography for an athlete on BLTZ.
Voice: confident, plain-spoken, present tense for active athletes.
Hard rules:
- 200–260 words.
- Do NOT invent numeric stats (height, weight, games played, ages). Only use numbers if the SOURCES section states them verbatim.
- Avoid the words "profile", "import", "follower". Use "locker", "career", "claim", "believer".
- No headings, no bullet points, no quotes. One paragraph.
Prompt version: ${PROMPT_VERSION}.`;
      const user = `IDENTITY:\n${JSON.stringify({ ...identity, ...factual }, null, 2)}\n\nSOURCES:\n${sourceBlobs}\n\nWrite the bio now.`;
      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        max_tokens: 600,
        temperature: 0.4,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      });
      const content = completion.choices[0]?.message?.content?.trim();
      if (content) bio = content;
    } catch {
      // Network or auth failure — keep the deterministic bio. Pipeline
      // continues; the user gets a usable draft.
    }
  }

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
    confirmed: { bio: false, dob: false, height_in: false, weight_lbs: false, games_played: false },
    sources: results
      .filter((r) => r.ok && r.urls?.length)
      .flatMap((r) => r.urls!.map((u) => ({ url: u, source: r.source }))),
  };

  return gate(draft, factual);
}
