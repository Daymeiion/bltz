/**
 * Imports reviewable NFL game Moments (first recorded game, career firsts and
 * single-game career highs) from nflverse weekly player stats for every
 * preview-Locker athlete linked to a canonical player record.
 *
 * Everything is written as `candidate`: nothing produces a signal until an
 * admin approves the Moment in the Intelligence Lab.
 *
 *   node scripts/intelligence-nflverse-game-milestones.mjs                 # dry run, .env.local
 *   node scripts/intelligence-nflverse-game-milestones.mjs --env .env.staging.local
 *   node scripts/intelligence-nflverse-game-milestones.mjs --apply
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  NFLVERSE_NORMALIZER_VERSION, detectGameMilestones, milestoneSummary, momentTitle, parseCsv, scheduleFromCsv,
} from "../lib/intelligence/nflverse/game-milestones.ts";

const RELEASE = "https://github.com/nflverse/nflverse-data/releases/download";
const SOURCE_KEY = "nflverse-stats-player-week";
const LOCATOR = "https://github.com/nflverse/nflverse-data/releases/tag/stats_player";
const CONFIDENCE = 0.95;
const CACHE = path.join(os.tmpdir(), "bltz-nflverse");

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const envFile = args.includes("--env") ? args[args.indexOf("--env") + 1] : ".env.local";
const env = dotenv.parse(await fs.readFile(envFile, "utf8"));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function must(promise, label) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function cached(file, url) {
  await fs.mkdir(CACHE, { recursive: true });
  const target = path.join(CACHE, file);
  try { return await fs.readFile(target, "utf8"); } catch { /* download below */ }
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`download_failed ${response.status} ${url}`);
  const text = await response.text();
  await fs.writeFile(target, text);
  return text;
}

const previews = await must(db.from("preview_lockers").select("id,full_name,player_id"), "preview_lockers");
const links = await must(db.from("gtm_player_preview_lockers").select("preview_locker_id,gsis_id"), "gtm links");
const cohort = [];
for (const preview of previews) {
  const gsis = [...new Set(links.filter(link => link.preview_locker_id === preview.id).map(link => link.gsis_id))];
  if (gsis.length !== 1) { console.log(`skip ${preview.full_name}: ${gsis.length} NFL IDs on the prospect record`); continue; }
  // Dry runs preview unlinked athletes; writes need the canonical player record.
  if (!preview.player_id && apply) { console.log(`skip ${preview.full_name}: not linked to a player record`); continue; }
  const player = preview.player_id ? (await must(db.from("players").select("id,gsis_id").eq("id", preview.player_id), "players"))[0] : null;
  if (preview.player_id && player?.gsis_id !== gsis[0]) { console.log(`skip ${preview.full_name}: player record NFL ID does not match the prospect`); continue; }
  const master = (await must(db.from("nfl_players").select("gsis_id,display_name,rookie_season,last_season").eq("gsis_id", gsis[0]), "nfl_players"))[0];
  if (!master) { console.log(`skip ${preview.full_name}: no NFL master record`); continue; }
  cohort.push({ preview, playerId: player?.id ?? null, gsis: gsis[0], master });
}

const schedule = scheduleFromCsv(parseCsv(await cached("games.csv", `${RELEASE}/schedules/games.csv`)));
const seasons = [...new Set(cohort.flatMap(({ master }) => {
  const list = [];
  for (let season = Math.max(master.rookie_season ?? 0, 1999); season <= (master.last_season ?? 0); season++) list.push(season);
  return list;
}))].sort();
const weekly = new Map();
for (const season of seasons) {
  const rows = parseCsv(await cached(`stats_player_week_${season}.csv`, `${RELEASE}/stats_player/stats_player_week_${season}.csv`));
  weekly.set(season, rows);
}

let source = null;
if (apply) {
  source = (await must(db.from("intelligence_sources").select("id").eq("source_key", SOURCE_KEY), "source lookup"))[0]
    ?? (await must(db.from("intelligence_sources").insert({ source_key: SOURCE_KEY, name: "nflverse", provider: "nflverse" }).select("id"), "source insert"))[0];
}

for (const { preview, playerId, gsis, master } of cohort) {
  const loaded = [...weekly.keys()].filter(season => season >= master.rookie_season && season <= master.last_season);
  const rows = loaded.flatMap(season => weekly.get(season).filter(row => row.player_id === gsis));
  const games = detectGameMilestones(rows, schedule, { rookieSeason: master.rookie_season, lastSeason: master.last_season, seasonsLoaded: loaded });
  const name = preview.full_name;
  console.log(`\n${name} (${gsis}, ${master.rookie_season}-${master.last_season}): ${games.length} game Moment${games.length === 1 ? "" : "s"}${playerId ? "" : " (link the player record before importing)"}`);
  if (!games.length && (master.rookie_season ?? 0) < 1999) console.log("  career starts before nflverse weekly coverage (1999); firsts and highs are not claimed");
  for (const game of games) console.log(`  ${game.gameday} ${game.team} ${game.home ? "vs" : "at"} ${game.opponent}: ${milestoneSummary(game.milestones)}`);
  if (!apply || !games.length) continue;

  const idempotencyKey = `nflverse-game-milestones:${gsis}:v1`;
  const existing = await must(db.from("intelligence_ingestions").select("id").eq("idempotency_key", idempotencyKey), "ingestion lookup");
  if (existing.length) { console.log("  already imported; skipped"); continue; }
  const fetchedAt = new Date().toISOString();
  const raw = rows.filter(row => games.some(game => game.gameId === row.game_id))
    .map(({ headshot_url: _headshot, ...row }) => row);
  const ingestion = (await must(db.from("intelligence_ingestions").insert({
    source_id: source.id, namespace: "football:nflverse-gsis", external_id: gsis, locator: LOCATOR, fetched_at: fetchedAt,
    normalizer_version: NFLVERSE_NORMALIZER_VERSION, idempotency_key: idempotencyKey, raw_payload: { rows: raw },
    normalized_candidate: { games }, normalization_status: "normalized",
  }).select("id"), "ingestion insert"))[0];

  for (const game of games) {
    const moment = (await must(db.from("moments").insert({
      title: momentTitle(name, game), occurred_on: game.gameday, occurred_year: Number(game.gameday.slice(0, 4)),
      date_precision: "day", sport: "football", status: "candidate", confidence: CONFIDENCE,
    }).select("id"), "moment insert"))[0];
    await must(db.from("moment_athletes").insert({ moment_id: moment.id, player_id: playerId, relationship_type: "featured", status: "candidate", confidence: CONFIDENCE }), "moment athlete insert");
    const where = `${game.team} ${game.home ? "vs." : "at"} ${game.opponent}, ${game.seasonType === "POST" ? "postseason" : `week ${game.week}`} of ${game.season}`;
    const lead = game.milestones[0];
    await must(db.from("intelligence_evidence").insert([
      { player_id: playerId, moment_id: moment.id, source_id: source.id, ingestion_id: ingestion.id, fact_type: "moment_occurrence", status: "candidate", confidence: CONFIDENCE,
        statement: `nflverse weekly stats record ${name} playing for ${game.team} on ${game.gameday} (${where}).`,
        structured_data: { occurredOn: game.gameday, dateBasis: "described_event", sport: "football", team: game.team, opponent: game.opponent, sourcePaths: [`stats_player_week_${game.season}.csv: player_id=${gsis}, game_id=${game.gameId}`, `schedules/games.csv: game_id=${game.gameId}`] } },
      { player_id: playerId, moment_id: moment.id, source_id: source.id, ingestion_id: ingestion.id, fact_type: "performance", status: "candidate", confidence: CONFIDENCE,
        statement: `${name}'s recorded line in ${where}, per nflverse play-by-play-derived stats.`, structured_data: { statistics: game.statistics } },
      { player_id: playerId, moment_id: moment.id, source_id: source.id, ingestion_id: ingestion.id, fact_type: "game_milestone", status: "candidate", confidence: CONFIDENCE,
        statement: `${name}'s ${milestoneSummary(game.milestones)}, across every season of the career covered by nflverse.`,
        structured_data: { kind: lead.kind, label: milestoneSummary(game.milestones), statistic: lead.statistic, value: lead.value, league: "nfl", milestones: game.milestones } },
    ]), "evidence insert");
    console.log(`  wrote candidate Moment ${moment.id}`);
  }
}
console.log(apply ? "\nDone. Approve each Moment in the Intelligence Lab." : "\nDry run only. Re-run with --apply to write candidate Moments.");
