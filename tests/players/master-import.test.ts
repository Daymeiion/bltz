import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  parsePlayerMasterCsv,
  PLAYER_MASTER_CSV_MAX_ROWS,
} from "@/lib/players/master-import";

describe("Player Master CSV import", () => {
  it("maps the supplied nflverse-style headers into the canonical nfl_players contract", () => {
    const csv = Buffer.from([
      "display_name,first_name,last_name,gsis_id,birth_date,college,position_group,position,height,weight,team_abbr,rookie_year,draft_club,draft_number,headshot,smart_id",
      "Taylor Lane,Taylor,Lane,00-1234567,1998-04-03,Cal,DB,CB,72,194,SF,2021,SF,42,https://example.com/headshot.jpg,smart-1",
    ].join("\n"));

    const result = parsePlayerMasterCsv(csv);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      gsis_id: "00-1234567",
      display_name: "Taylor Lane",
      college_name: "Cal",
      height_in: 72,
      weight_lbs: 194,
      latest_team: "SF",
      rookie_season: 2021,
      draft_team: "SF",
      draft_pick: 42,
      headshot_url: "https://example.com/headshot.jpg",
      smart_id: "smart-1",
    });
  });

  it("normalizes the Player Master M/D/YYYY birth-date format", () => {
    const result = parsePlayerMasterCsv(Buffer.from("display_name,gsis_id,birth_date\nTaylor Lane,00-1,4/3/1998"));
    expect(result.rows[0].birth_date).toBe("1998-04-03");
  });

  it("holds missing stable IDs for manual review instead of inventing Player identity", () => {
    const result = parsePlayerMasterCsv(Buffer.from("display_name,gsis_id\nTaylor Lane,"));

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([{ rowNumber: 2, message: "GSIS ID is required; the row needs manual review." }]);
  });

  it("deduplicates repeated GSIS IDs and never merges by player name", () => {
    const result = parsePlayerMasterCsv(Buffer.from([
      "display_name,gsis_id",
      "Alex Smith,00-1",
      "Alex Smith,00-2",
      "Different Name,00-1",
    ].join("\n")));

    expect(result.rows.map((row) => row.gsis_id)).toEqual(["00-1", "00-2"]);
    expect(result.duplicateCount).toBe(1);
  });

  it("accepts 25,000 player rows and rejects larger snapshots", () => {
    const accepted = ["display_name,gsis_id", ...Array.from({ length: PLAYER_MASTER_CSV_MAX_ROWS }, (_, index) => `Player ${index},id-${index}`)].join("\n");
    expect(parsePlayerMasterCsv(Buffer.from(accepted)).rows).toHaveLength(PLAYER_MASTER_CSV_MAX_ROWS);

    const rejected = `${accepted}\nPlayer overflow,id-overflow`;
    expect(() => parsePlayerMasterCsv(Buffer.from(rejected))).toThrow("at most 25,000 rows");
  });

  it("keeps the database commit atomic, admin-authorized, and isolated from GTM contacts and Player Lockers", () => {
    const migration = readFileSync("supabase/migrations/20260826142105_import_player_master.sql", "utf8").toLowerCase();
    expect(migration).toContain("create or replace function public.import_player_master");
    expect(migration).toContain("v_row_count := jsonb_array_length(p_rows)");
    expect(migration).toContain("v_row_count > 25000");
    expect(migration).toContain("public.is_internal_admin()");
    expect(migration).toContain("on conflict (gsis_id) do update");
    expect(migration).toContain("insert into public.nfl_players");
    expect(migration).not.toContain("insert into public.players");
    expect(migration).not.toContain("insert into public.gtm_contacts");
    expect(migration).toContain("revoke all on function public.import_player_master");
  });
});
