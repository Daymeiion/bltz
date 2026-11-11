import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
import { PLAYER_MASTER_CSV_MAX_BYTES, PLAYER_MASTER_CSV_MAX_ROWS } from "@/lib/players/master-import-contract";

export { PLAYER_MASTER_CSV_MAX_BYTES, PLAYER_MASTER_CSV_MAX_ROWS } from "@/lib/players/master-import-contract";

export interface PlayerMasterRow {
  gsis_id: string;
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
}

export interface PlayerMasterIssue {
  rowNumber: number;
  message: string;
}

export interface ParsedPlayerMaster {
  contentSha256: string;
  headers: string[];
  rowsFound: number;
  rows: PlayerMasterRow[];
  issues: PlayerMasterIssue[];
  duplicateCount: number;
  fieldMapping: Record<string, string>;
}

const headerAliases: Record<keyof PlayerMasterRow, string[]> = {
  gsis_id: ["gsis_id"],
  display_name: ["display_name", "display name", "name"],
  first_name: ["first_name", "first name"],
  last_name: ["last_name", "last name"],
  birth_date: ["birth_date", "birth date"],
  position: ["position"],
  position_group: ["position_group", "position group"],
  height_in: ["height_in", "height"],
  weight_lbs: ["weight_lbs", "weight"],
  headshot_url: ["headshot_url", "headshot"],
  college_name: ["college_name", "college"],
  college_conference: ["college_conference", "college conference"],
  jersey_number: ["jersey_number", "uniform_number", "jersey number"],
  rookie_season: ["rookie_season", "rookie_year", "rookie season"],
  last_season: ["last_season", "last season"],
  latest_team: ["latest_team", "team_abbr", "latest team"],
  status: ["status"],
  years_of_experience: ["years_of_experience", "years of experience"],
  draft_year: ["draft_year", "draft year"],
  draft_round: ["draft_round", "draft round"],
  draft_pick: ["draft_pick", "draft_number", "draft pick"],
  draft_team: ["draft_team", "draft_club", "draft team"],
  espn_id: ["espn_id"],
  pfr_id: ["pfr_id"],
  nfl_id: ["nfl_id"],
  pff_id: ["pff_id"],
  smart_id: ["smart_id"],
};

function normalizedHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function clean(value: unknown, maxLength = 500) {
  const result = String(value ?? "").trim();
  return result ? result.slice(0, maxLength) : null;
}

function findFieldMapping(headers: string[]) {
  const normalized = new Map(headers.map((header) => [normalizedHeader(header), header]));
  return Object.fromEntries(Object.entries(headerAliases).flatMap(([field, aliases]) => {
    const match = aliases.map((alias) => normalized.get(normalizedHeader(alias))).find(Boolean);
    return match ? [[field, match]] : [];
  }));
}

function mappedValue(row: Record<string, unknown>, mapping: Record<string, string>, field: keyof PlayerMasterRow) {
  const header = mapping[field];
  return header ? row[header] : undefined;
}

function optionalInteger(value: unknown, label: string) {
  const text = clean(value, 40);
  if (text === null) return { value: null, error: null };
  const number = Number(text);
  if (!Number.isInteger(number) || number < -32_768 || number > 32_767) {
    return { value: null, error: `${label} must be a whole number.` };
  }
  return { value: number, error: null };
}

function optionalDate(value: unknown) {
  const text = clean(value, 40);
  if (text === null) return { value: null, error: null };
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const usMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!isoMatch && !usMatch) return { value: null, error: "Birth date must use YYYY-MM-DD or M/D/YYYY." };
  const iso = isoMatch
    ? text
    : `${usMatch![3]}-${usMatch![1].padStart(2, "0")}-${usMatch![2].padStart(2, "0")}`;
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso) {
    return { value: null, error: "Birth date is not valid." };
  }
  return { value: iso, error: null };
}

export function parsePlayerMasterCsv(buffer: Buffer): ParsedPlayerMaster {
  if (buffer.byteLength === 0) throw new Error("Choose a non-empty Player Master CSV file.");
  if (buffer.byteLength > PLAYER_MASTER_CSV_MAX_BYTES) throw new Error("Player Master CSV files must be 5 MB or smaller.");
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) throw new Error("Choose a CSV file, not an Excel workbook.");

  const workbook = XLSX.read(buffer, { type: "buffer", raw: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("The Player Master CSV does not contain a worksheet.");
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "", raw: false });
  if (rawRows.length === 0) throw new Error("The Player Master CSV does not contain any player rows.");
  if (rawRows.length > PLAYER_MASTER_CSV_MAX_ROWS) {
    throw new Error(`Player Master CSV files may contain at most ${PLAYER_MASTER_CSV_MAX_ROWS.toLocaleString()} rows.`);
  }

  const headers = Object.keys(rawRows[0]);
  const fieldMapping = findFieldMapping(headers);
  if (!fieldMapping.gsis_id || !fieldMapping.display_name) {
    throw new Error("Player Master requires gsis_id and display_name columns.");
  }

  const rows: PlayerMasterRow[] = [];
  const issues: PlayerMasterIssue[] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2;
    const gsisId = clean(mappedValue(raw, fieldMapping, "gsis_id"), 120);
    const displayName = clean(mappedValue(raw, fieldMapping, "display_name"), 240);
    if (!gsisId) {
      issues.push({ rowNumber, message: "GSIS ID is required; the row needs manual review." });
      return;
    }
    if (!displayName) {
      issues.push({ rowNumber, message: "Display name is required." });
      return;
    }
    const normalizedId = gsisId.toLowerCase();
    if (seen.has(normalizedId)) {
      duplicateCount += 1;
      return;
    }

    const birthDate = optionalDate(mappedValue(raw, fieldMapping, "birth_date"));
    const integerFields = {
      height_in: optionalInteger(mappedValue(raw, fieldMapping, "height_in"), "Height"),
      weight_lbs: optionalInteger(mappedValue(raw, fieldMapping, "weight_lbs"), "Weight"),
      jersey_number: optionalInteger(mappedValue(raw, fieldMapping, "jersey_number"), "Jersey number"),
      rookie_season: optionalInteger(mappedValue(raw, fieldMapping, "rookie_season"), "Rookie season"),
      last_season: optionalInteger(mappedValue(raw, fieldMapping, "last_season"), "Last season"),
      years_of_experience: optionalInteger(mappedValue(raw, fieldMapping, "years_of_experience"), "Years of experience"),
      draft_year: optionalInteger(mappedValue(raw, fieldMapping, "draft_year"), "Draft year"),
      draft_round: optionalInteger(mappedValue(raw, fieldMapping, "draft_round"), "Draft round"),
      draft_pick: optionalInteger(mappedValue(raw, fieldMapping, "draft_pick"), "Draft pick"),
    };
    const rowError = birthDate.error ?? Object.values(integerFields).map((item) => item.error).find(Boolean);
    if (rowError) {
      issues.push({ rowNumber, message: rowError });
      return;
    }

    seen.add(normalizedId);
    rows.push({
      gsis_id: gsisId,
      display_name: displayName,
      first_name: clean(mappedValue(raw, fieldMapping, "first_name"), 120),
      last_name: clean(mappedValue(raw, fieldMapping, "last_name"), 120),
      birth_date: birthDate.value,
      position: clean(mappedValue(raw, fieldMapping, "position"), 40),
      position_group: clean(mappedValue(raw, fieldMapping, "position_group"), 40),
      height_in: integerFields.height_in.value,
      weight_lbs: integerFields.weight_lbs.value,
      headshot_url: clean(mappedValue(raw, fieldMapping, "headshot_url"), 2_000),
      college_name: clean(mappedValue(raw, fieldMapping, "college_name"), 240),
      college_conference: clean(mappedValue(raw, fieldMapping, "college_conference"), 120),
      jersey_number: integerFields.jersey_number.value,
      rookie_season: integerFields.rookie_season.value,
      last_season: integerFields.last_season.value,
      latest_team: clean(mappedValue(raw, fieldMapping, "latest_team"), 40),
      status: clean(mappedValue(raw, fieldMapping, "status"), 40),
      years_of_experience: integerFields.years_of_experience.value,
      draft_year: integerFields.draft_year.value,
      draft_round: integerFields.draft_round.value,
      draft_pick: integerFields.draft_pick.value,
      draft_team: clean(mappedValue(raw, fieldMapping, "draft_team"), 40),
      espn_id: clean(mappedValue(raw, fieldMapping, "espn_id"), 120),
      pfr_id: clean(mappedValue(raw, fieldMapping, "pfr_id"), 120),
      nfl_id: clean(mappedValue(raw, fieldMapping, "nfl_id"), 120),
      pff_id: clean(mappedValue(raw, fieldMapping, "pff_id"), 120),
      smart_id: clean(mappedValue(raw, fieldMapping, "smart_id"), 255),
    });
  });

  return {
    contentSha256: createHash("sha256").update(buffer).digest("hex"),
    headers,
    rowsFound: rawRows.length,
    rows,
    issues,
    duplicateCount,
    fieldMapping,
  };
}
