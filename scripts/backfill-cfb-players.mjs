#!/usr/bin/env node
/**
 * Standalone CFB players historical backfill.
 *
 * Reads cfb_teams from Supabase, iterates each team across a season
 * range, pulls every CFBD roster, aggregates per-player rows, and
 * upserts into cfb_players. Runs independently of the Next.js dev
 * server so it's safe to keep editing app code in another window
 * (or another Claude agent) while this churns.
 *
 *  Usage:
 *    node scripts/backfill-cfb-players.mjs              # full backfill (754 × 16 seasons)
 *    node scripts/backfill-cfb-players.mjs --from 2015  # narrow the season range
 *    node scripts/backfill-cfb-players.mjs --resume     # skip teams already synced today
 *    node scripts/backfill-cfb-players.mjs --team Cal   # single-team override
 *    node scripts/backfill-cfb-players.mjs --limit 5    # first N teams only (testing)
 *
 *  Requires .env.local with CFBD_API_KEY, NEXT_PUBLIC_SUPABASE_URL,
 *  SUPABASE_SERVICE_ROLE_KEY. Uses curl --ssl-no-revoke under the hood
 *  to dodge the Windows Node-fetch TLS issue (same workaround as our
 *  nflverse runner).
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// .env.local has NODE_TLS_REJECT_UNAUTHORIZED=0 (the Windows Node cert
// chain workaround we set up earlier). Node fetch reads it at TLS
// handshake time, so we can use the native fetch end-to-end and avoid
// spawning a curl process per request — which is what was exhausting
// Windows network sockets and silently failing past ~6.5k calls.

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CFBD_KEY = process.env.CFBD_API_KEY;
if (!SB_URL || !SB_KEY || !CFBD_KEY) {
  console.error("Missing env: need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CFBD_API_KEY in .env.local");
  process.exit(1);
}

// CLI args
const args = process.argv.slice(2);
function arg(flag, def) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : def;
}
const FROM_SEASON = parseInt(arg("--from", "2010"), 10);
const TO_SEASON = parseInt(arg("--to", String(new Date().getFullYear())), 10);
const TEAM_FILTER = arg("--team", null);
const LIMIT = arg("--limit", null) ? parseInt(arg("--limit", "999"), 10) : null;
const RESUME = args.includes("--resume");
const REQUESTS_PER_MIN = parseInt(arg("--rpm", "100"), 10);
const REQUEST_INTERVAL_MS = Math.ceil(60_000 / REQUESTS_PER_MIN);

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  return res.json();
}

async function postJson(url, headers, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${url} -> ${res.status} ${text.slice(0, 200)}`);
  }
}

// --- Build D1 (FBS + FCS) allow-list -----------------------------------------
// CFBD only indexes FBS + FCS programs. Our cfb_teams table holds 754
// entries including D2 / D3 NCAA programs ESPN ships in their public teams
// API. Iterating those wastes API calls on guaranteed 0 responses (the
// broken first run did exactly that). Build a fast allow-list up front
// by calling CFBD's /teams once and filtering to classification fbs/fcs.
// One call returns the full universe (~1,900 rows) with classification
// labels; client-side filter to ~265 D1 programs.
console.log("Loading FBS + FCS allow-list from CFBD…");
const allCfbdTeams = await fetchJson(
  `https://api.collegefootballdata.com/teams`,
  { Authorization: `Bearer ${CFBD_KEY}` },
);
const d1Teams = allCfbdTeams.filter(
  (t) => t.classification === "fbs" || t.classification === "fcs",
);
const d1Names = new Set(
  d1Teams.map((t) => (t.school ?? "").trim()).filter(Boolean),
);
const fbsCount = d1Teams.filter((t) => t.classification === "fbs").length;
const fcsCount = d1Teams.filter((t) => t.classification === "fcs").length;
console.log(`D1 allow-list: ${d1Names.size} programs (${fbsCount} FBS + ${fcsCount} FCS)`);

console.log("Loading cfb_teams from Supabase…");
let teamUrl =
  `${SB_URL}/rest/v1/cfb_teams?select=espn_id,location,display_name` +
  `&location=not.is.null&order=display_name.asc`;
if (TEAM_FILTER) {
  teamUrl += `&or=(location.ilike.%25${encodeURIComponent(TEAM_FILTER)}%25,display_name.ilike.%25${encodeURIComponent(TEAM_FILTER)}%25)`;
}
const allTeams = await fetchJson(teamUrl, {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
});
let teams = [];
let skippedNonD1 = 0;
const seen = new Set();
for (const t of allTeams) {
  const name = (t.location ?? "").trim();
  if (!name || seen.has(name)) continue;
  seen.add(name);
  // Skip non-D1 teams. CFBD won't have roster data for them — iterating
  // them was wasting API calls.
  if (!d1Names.has(name)) {
    skippedNonD1++;
    continue;
  }
  teams.push({ name, cfb_team_id: t.espn_id, display: t.display_name });
}
if (LIMIT) teams = teams.slice(0, LIMIT);
console.log(`Teams to process: ${teams.length} (skipped ${skippedNonD1} non-D1)`);
console.log(`Seasons: ${FROM_SEASON}..${TO_SEASON} (${TO_SEASON - FROM_SEASON + 1} per team)`);

// --- Resume: skip teams whose rows were synced today -------------------------
if (RESUME) {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const checkUrl =
    `${SB_URL}/rest/v1/cfb_players?select=team&last_synced_at=gte.${since}` +
    `&team=not.is.null`;
  const synced = await fetchJson(checkUrl, {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
  });
  const syncedTeams = new Set(synced.map((r) => r.team));
  const before = teams.length;
  teams = teams.filter((t) => !syncedTeams.has(t.name));
  console.log(`Resume mode: skipping ${before - teams.length} teams synced in last 24h. Remaining: ${teams.length}`);
}

// --- Per-team backfill -------------------------------------------------------
const seasons = [];
for (let y = FROM_SEASON; y <= TO_SEASON; y++) seasons.push(y);

const startedAt = Date.now();
let totalCalls = 0;
let totalPlayers = 0;
let teamIdx = 0;
let lastReqAt = 0;

async function throttle() {
  const elapsed = Date.now() - lastReqAt;
  if (elapsed < REQUEST_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, REQUEST_INTERVAL_MS - elapsed));
  }
  lastReqAt = Date.now();
}

for (const team of teams) {
  teamIdx++;
  const aggregate = new Map();
  for (const season of seasons) {
    await throttle();
    totalCalls++;
    let rows = [];
    try {
      rows = await fetchJson(
        `https://api.collegefootballdata.com/roster?team=${encodeURIComponent(team.name)}&year=${season}`,
        { Authorization: `Bearer ${CFBD_KEY}` },
      );
      if (!Array.isArray(rows)) rows = [];
    } catch (e) {
      console.warn(`  WARN ${team.name} ${season}: ${e?.message ?? e}`);
      rows = [];
    }
    for (const r of rows) {
      const espn = String(r.id ?? "").trim();
      if (!espn) continue;
      const first = (r.firstName ?? "").trim();
      const last = (r.lastName ?? "").trim();
      const display = [first, last].filter(Boolean).join(" ");
      if (!display) continue;
      const ex = aggregate.get(espn);
      if (!ex) {
        aggregate.set(espn, {
          espn_id: espn,
          first_name: first || null,
          last_name: last || null,
          display_name: display,
          jersey: r.jersey ?? null,
          position: r.position ?? null,
          height_in: r.height ?? null,
          weight_lbs: r.weight ?? null,
          home_city: r.homeCity ?? null,
          home_state: r.homeState ?? null,
          home_country: r.homeCountry ?? null,
          team: r.team ?? null,
          cfb_team_id: team.cfb_team_id,
          first_season: r.year ?? null,
          last_season: r.year ?? null,
          recruit_ids: r.recruitIds ?? null,
          last_synced_at: new Date().toISOString(),
        });
        continue;
      }
      // Aggregate fields.
      if (ex.jersey === null && r.jersey !== null) ex.jersey = r.jersey;
      if (!ex.position && r.position) ex.position = r.position;
      if (ex.height_in === null && r.height !== null) ex.height_in = r.height;
      if (ex.weight_lbs === null && r.weight !== null) ex.weight_lbs = r.weight;
      if (!ex.home_city && r.homeCity) ex.home_city = r.homeCity;
      if (!ex.home_state && r.homeState) ex.home_state = r.homeState;
      if (!ex.home_country && r.homeCountry) ex.home_country = r.homeCountry;
      if (r.year !== null) {
        if (ex.first_season === null || r.year < ex.first_season) ex.first_season = r.year;
        if (ex.last_season === null || r.year > ex.last_season) ex.last_season = r.year;
      }
      ex.last_synced_at = new Date().toISOString();
    }
  }
  const rows = Array.from(aggregate.values());
  totalPlayers += rows.length;

  // Batch-upsert.
  if (rows.length > 0) {
    const endpoint = `${SB_URL}/rest/v1/cfb_players?on_conflict=espn_id`;
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      try {
        await postJson(
          endpoint,
          {
            apikey: SB_KEY,
            Authorization: `Bearer ${SB_KEY}`,
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          JSON.stringify(batch),
        );
      } catch (e) {
        console.error(`  ERR upsert ${team.name}: ${e?.message?.slice(0, 200) ?? e}`);
      }
    }
  }

  const eta = ((Date.now() - startedAt) / teamIdx) * (teams.length - teamIdx);
  const etaMin = Math.round(eta / 60_000);
  process.stdout.write(
    `\r[${teamIdx}/${teams.length}] ${team.name.padEnd(30)} | players: ${rows.length.toString().padStart(4)} | total: ${totalPlayers} | calls: ${totalCalls} | ETA: ~${etaMin}m   `,
  );
}

const dur = Date.now() - startedAt;
console.log(`\nDONE. ${totalPlayers} player upserts across ${teams.length} teams (${totalCalls} API calls) in ${(dur / 60_000).toFixed(1)}m.`);
