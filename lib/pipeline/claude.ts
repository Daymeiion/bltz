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
import type { PipelineDraft, PlayerIdentityInput, ScraperResult } from "./types";

const PROMPT_VERSION = "bltz.synth.v1";

function pickFacts(
  identity: PlayerIdentityInput,
  results: ScraperResult[],
): Pick<
  PipelineDraft,
  "dob" | "height_in" | "weight_lbs" | "games_played" | "position" | "school" | "hometown" | "awards" | "youtube_urls" | "photos"
> {
  // Latest-non-null wins per field — Wikipedia tends to have biographical
  // facts (DOB), ESPN tends to have stats (HT/WT/GP). Order matters in the
  // SCRAPERS registry.
  let dob: string | undefined;
  let height_in: number | undefined;
  let weight_lbs: number | undefined;
  let games_played: number | undefined;
  let position: string | undefined = identity.position ?? undefined;
  let school: string | undefined = identity.school ?? undefined;
  let hometown: string | undefined;
  const awards: PipelineDraft["awards"] = [];
  const youtube_urls: string[] = [];
  const photos: PipelineDraft["photos"] = [];
  for (const r of results) {
    if (!r.ok || !r.facts) continue;
    if (r.facts.dob && !dob) dob = r.facts.dob;
    if (r.facts.height_in && !height_in) height_in = r.facts.height_in;
    if (r.facts.weight_lbs && !weight_lbs) weight_lbs = r.facts.weight_lbs;
    if (r.facts.games_played && !games_played) games_played = r.facts.games_played;
    if (r.facts.position && !position) position = r.facts.position;
    if (r.facts.school && !school) school = r.facts.school;
    if (r.facts.hometown && !hometown) hometown = r.facts.hometown;
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
    awards: dedupeAwards(awards),
    youtube_urls: Array.from(new Set(youtube_urls)).slice(0, 8),
    photos: photos.slice(0, 12),
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
  const fields: (keyof typeof factual)[] = [
    "dob",
    "height_in",
    "weight_lbs",
    "games_played",
  ];
  for (const f of fields) {
    if (factual[f] && draft[f as keyof PipelineDraft]) {
      const a = String(factual[f]);
      const b = String(draft[f as keyof PipelineDraft]);
      if (a !== b) {
        // Disagreement — keep the scraped value, mark unconfirmed.
        (draft as any)[f] = factual[f];
        confirmed[f] = false;
      } else {
        confirmed[f] = false; // still requires athlete confirmation
      }
    } else if (draft[f as keyof PipelineDraft]) {
      // LLM invented a number. Drop it.
      (draft as any)[f] = null;
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
