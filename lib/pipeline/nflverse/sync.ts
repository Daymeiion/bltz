import { gunzipSync } from "node:zlib";

import { createServiceClient } from "@/lib/supabase/service";

const PLAYERS_CSV_GZ_URL =
  "https://github.com/nflverse/nflverse-data/releases/download/players/players.csv.gz";
const TIMESTAMP_URL =
  "https://github.com/nflverse/nflverse-data/releases/download/players/timestamp.json";

const FETCH_TIMEOUT_MS = 60_000;
const UPSERT_BATCH_SIZE = 500;

export interface NflverseSyncResult {
  ok: boolean;
  rows_total: number;
  rows_upserted: number;
  rows_skipped: number;
  source_timestamp?: string;
  duration_ms: number;
  error?: string;
}

/**
 * Pulls the latest nflverse players release, parses the CSV, and upserts each
 * row into `nfl_players`. Idempotent — re-running the job touches every row's
 * `last_synced_at`. Rows with empty `gsis_id` (a few legacy entries) are
 * skipped because the column is the table's primary key.
 */
export async function syncNflversePlayers(): Promise<NflverseSyncResult> {
  const start = Date.now();
  try {
    const [csvText, sourceTimestamp] = await Promise.all([
      fetchPlayersCsv(),
      fetchSourceTimestamp().catch(() => undefined),
    ]);

    const rows = parsePlayersCsv(csvText);
    const sb = createServiceClient();

    let upserted = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
      const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
      const valid = batch.filter((r) => r.gsis_id);
      skipped += batch.length - valid.length;
      if (valid.length === 0) continue;

      const { error } = await sb
        .from("nfl_players")
        .upsert(valid, { onConflict: "gsis_id" });
      if (error) {
        return {
          ok: false,
          rows_total: rows.length,
          rows_upserted: upserted,
          rows_skipped: skipped,
          source_timestamp: sourceTimestamp,
          duration_ms: Date.now() - start,
          error: `supabase upsert failed: ${error.message}`,
        };
      }
      upserted += valid.length;
    }

    return {
      ok: true,
      rows_total: rows.length,
      rows_upserted: upserted,
      rows_skipped: skipped,
      source_timestamp: sourceTimestamp,
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

async function fetchPlayersCsv(): Promise<string> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(PLAYERS_CSV_GZ_URL, { signal: ctl.signal });
    if (!res.ok) throw new Error(`nflverse fetch ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return gunzipSync(buf).toString("utf-8");
  } finally {
    clearTimeout(t);
  }
}

async function fetchSourceTimestamp(): Promise<string | undefined> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 10_000);
  try {
    const res = await fetch(TIMESTAMP_URL, { signal: ctl.signal });
    if (!res.ok) return undefined;
    const json = (await res.json()) as { last_updated?: string };
    return json.last_updated;
  } finally {
    clearTimeout(t);
  }
}

interface NflPlayerRow {
  gsis_id: string | null;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  position: string | null;
  position_group: string | null;
  height_in: number | null;
  weight_lbs: number | null;
  headshot_url: string | null;
  college_name: string | null;
  college_conference: string | null;
  jersey_number: number | null;
  rookie_season: number | null;
  last_season: number | null;
  latest_team: string | null;
  status: string | null;
  years_of_experience: number | null;
  draft_year: number | null;
  draft_round: number | null;
  draft_pick: number | null;
  draft_team: string | null;
  espn_id: string | null;
  pfr_id: string | null;
  nfl_id: string | null;
  pff_id: string | null;
  smart_id: string | null;
  last_synced_at: string;
}

export function parsePlayersCsv(csv: string): NflPlayerRow[] {
  const records = parseCsv(csv);
  if (records.length === 0) return [];
  const [header, ...rows] = records;
  const idx = (name: string) => header.indexOf(name);

  const cols = {
    gsis_id: idx("gsis_id"),
    display_name: idx("display_name"),
    first_name: idx("first_name"),
    last_name: idx("last_name"),
    birth_date: idx("birth_date"),
    position: idx("position"),
    position_group: idx("position_group"),
    height: idx("height"),
    weight: idx("weight"),
    headshot: idx("headshot"),
    college_name: idx("college_name"),
    college_conference: idx("college_conference"),
    jersey_number: idx("jersey_number"),
    rookie_season: idx("rookie_season"),
    last_season: idx("last_season"),
    latest_team: idx("latest_team"),
    status: idx("status"),
    years_of_experience: idx("years_of_experience"),
    draft_year: idx("draft_year"),
    draft_round: idx("draft_round"),
    draft_pick: idx("draft_pick"),
    draft_team: idx("draft_team"),
    espn_id: idx("espn_id"),
    pfr_id: idx("pfr_id"),
    nfl_id: idx("nfl_id"),
    pff_id: idx("pff_id"),
    smart_id: idx("smart_id"),
  };

  const now = new Date().toISOString();
  const out: NflPlayerRow[] = [];

  for (const r of rows) {
    if (r.length === 1 && r[0] === "") continue; // trailing empty line
    const gsis = r[cols.gsis_id]?.trim() || null;
    const name = r[cols.display_name]?.trim() || "";
    if (!gsis || !name) continue;

    out.push({
      gsis_id: gsis,
      display_name: name,
      first_name: nullable(r[cols.first_name]),
      last_name: nullable(r[cols.last_name]),
      birth_date: nullable(r[cols.birth_date]),
      position: nullable(r[cols.position]),
      position_group: nullable(r[cols.position_group]),
      height_in: toInt(r[cols.height]),
      weight_lbs: toInt(r[cols.weight]),
      headshot_url: nullable(r[cols.headshot]),
      college_name: nullable(r[cols.college_name]),
      college_conference: nullable(r[cols.college_conference]),
      jersey_number: toInt(r[cols.jersey_number]),
      rookie_season: toInt(r[cols.rookie_season]),
      last_season: toInt(r[cols.last_season]),
      latest_team: nullable(r[cols.latest_team]),
      status: nullable(r[cols.status]),
      years_of_experience: toInt(r[cols.years_of_experience]),
      draft_year: toInt(r[cols.draft_year]),
      draft_round: toInt(r[cols.draft_round]),
      draft_pick: toInt(r[cols.draft_pick]),
      draft_team: nullable(r[cols.draft_team]),
      espn_id: nullable(r[cols.espn_id]),
      pfr_id: nullable(r[cols.pfr_id]),
      nfl_id: nullable(r[cols.nfl_id]),
      pff_id: nullable(r[cols.pff_id]),
      smart_id: nullable(r[cols.smart_id]),
      last_synced_at: now,
    });
  }

  return out;
}

function nullable(v: string | undefined): string | null {
  if (v === undefined) return null;
  const s = v.trim();
  return s === "" ? null : s;
}

function toInt(v: string | undefined): number | null {
  const s = nullable(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/**
 * Minimal RFC-4180 CSV parser. Handles quoted fields, escaped quotes (`""`),
 * embedded commas, and CRLF or LF line endings. Sufficient for the nflverse
 * release format; not intended as a general-purpose CSV library.
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = input.length;

  while (i < n) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < n && input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\n" || c === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      // swallow CRLF as one line break
      if (c === "\r" && i + 1 < n && input[i + 1] === "\n") i += 2;
      else i++;
      continue;
    }
    field += c;
    i++;
  }

  // last field / row (no trailing newline)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
