#!/usr/bin/env node
/**
 * Historical CFB players backfill wrapper.
 *
 * Drives scripts/backfill-cfb-players.mjs once per year so progress is
 * visible per-season and verification queries fit between runs. Tuned
 * for the pre-2010 era (2003..2009 by default) where the existing
 * 2010+ backfill leaves a hole — e.g. Traye Simmons (Minnesota,
 * 2003–2007) doesn't show up in cfbverse onboarding because his
 * roster years were never synced.
 *
 *  Usage:
 *    node scripts/backfill-cfb-players-historical.mjs
 *    node scripts/backfill-cfb-players-historical.mjs --from 2000 --to 2009
 *
 *  Each year takes ~3 minutes (265 D1 teams × 1 season ÷ 100 rpm).
 *  2003..2009 ≈ 21 minutes wall time, ~1,855 CFBD API calls.
 *
 *  Reads CFBD_API_KEY / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 *  from .env.local (same as the underlying script).
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNNER = join(__dirname, "backfill-cfb-players.mjs");

const args = process.argv.slice(2);
function arg(flag, def) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : def;
}
const FROM = parseInt(arg("--from", "2003"), 10);
const TO = parseInt(arg("--to", "2009"), 10);

if (Number.isNaN(FROM) || Number.isNaN(TO) || FROM > TO) {
  console.error(`Bad range: --from ${FROM} --to ${TO}`);
  process.exit(1);
}

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

async function countRowsAtOrBelow(maxSeason) {
  // PostgREST count via Prefer: count=exact.
  const url =
    `${SB_URL}/rest/v1/cfb_players?select=espn_id` +
    `&first_season=gte.2000&first_season=lte.${maxSeason}`;
  const res = await fetch(url, {
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
  });
  const range = res.headers.get("content-range") ?? "";
  const total = range.split("/")[1];
  return total ? parseInt(total, 10) : null;
}

function runYear(year) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    console.log(`\n=== Year ${year} starting at ${new Date().toISOString()} ===`);
    const child = spawn(
      process.execPath,
      [RUNNER, "--from", String(year), "--to", String(year)],
      { stdio: "inherit" },
    );
    child.on("error", reject);
    child.on("exit", (code) => {
      const dur = ((Date.now() - startedAt) / 1000).toFixed(1);
      if (code === 0) {
        console.log(`=== Year ${year} done in ${dur}s ===`);
        resolve();
      } else {
        reject(new Error(`year ${year} exited ${code}`));
      }
    });
  });
}

const overallStart = Date.now();
console.log(`Historical backfill: ${FROM}..${TO} (${TO - FROM + 1} year(s))`);
for (let y = FROM; y <= TO; y++) {
  await runYear(y);
  const count = await countRowsAtOrBelow(y);
  console.log(`Verify: rows with first_season in 2000..${y}: ${count}`);
}
const overallDur = ((Date.now() - overallStart) / 60_000).toFixed(1);
console.log(`\nAll done. Wall time: ${overallDur}m.`);
