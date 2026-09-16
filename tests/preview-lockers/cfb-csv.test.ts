import { describe, expect, it } from "vitest";
import { cfbImport, combineCfbImports, csvRows, inspectCsv, reviewCsv } from "@/lib/preview-lockers/cfb-csv";
import { previewContent } from "@/lib/preview-lockers/validation";
import { previewLockerData } from "@/lib/preview-lockers/mapper";
const url = "https://www.sports-reference.com/cfb/players/fixture-player-1.html";
const csv = 'Year,School,G,Solo,Ast,Tot,Sk\n2006,"Fixture, State",12,20,10,30,2.5\n2007,"Fixture, State",11,,12,32,3\nCareer,,23,40,22,62,5.5';
const parse = (text = csv) => { const table = inspectCsv(text, "defense"); return reviewCsv(table, table.mapping, "defense", url); };
describe("private college CSV", () => {
  it("handles the current Sports Reference grouped defense export and bowl markers", () => {
    const text = '--- When using SR data, please cite us\n\n,,,,,,Tackles,Tackles,Tackles,Tackles,Tackles,Def Interceptions,Def Interceptions,Def Interceptions,Def Interceptions,Def Interceptions,Fumbles,Fumbles,Fumbles,Fumbles,\nSeason,Team,Conf,Class,Pos,G,Solo,Ast,Comb,TFL,Sk,Int,Yds,Avg,IntTD,PD,FR,Yds,FRTD,FF,Awards\n2007*,Fixture,Conference,SR,LB,12,43,35,78,5.0,0.0,0,0,,0,4,0,0,0,1,\nCareer,Career,Career,Career,,12,43,35,78,5.0,0.0,0,0,,0,4,0,0,0,1,';
    const result = parse(text);
    expect(result.imported.seasons[0]).toMatchObject({ year: 2007, sourceNote: "Includes bowl statistics", statistics: { soloTackles: 43, assists: 35, tackles: 78, tacklesForLoss: 5, sacks: 0, passesDefended: 4, forcedFumbles: 1 } });
  });
  it("parses quoted fields, BOM, CRLF, blanks, half sacks, and skips career totals", () => {
    const { imported, warnings } = parse("\uFEFF" + csv.replaceAll("\n", "\r\n"));
    expect(imported.seasons).toHaveLength(2);
    expect(imported.seasons[0]).toMatchObject({ year: 2006, team: "Fixture, State", statistics: { sacks: 2.5, tackles: 30 } });
    expect(imported.seasons[1].statistics.soloTackles).toBeUndefined();
    expect(warnings).toContain("Skipped summary/header row: Career");
  });
  it("distinguishes multi-row passing/rushing headers", () => {
    const table = inspectCsv(",,Passing,,,Rushing,,\nYear,School,Att,Yds,TD,Att,Yds,TD\n2007,Fixture,200,2500,20,50,100,2", "passing");
    expect(reviewCsv(table, table.mapping, "passing", url).imported.seasons[0].statistics).toEqual({ passingAttempts: 200, passingYards: 2500, passingTouchdowns: 20, rushingAttempts: 50, rushingYards: 100, rushingTouchdowns: 2 });
  });
  it("requires explicit mapping for ambiguous repeated columns", () => {
    const table = inspectCsv("Year,School,Yds,Yds\n2007,Fixture,100,200", "rushing");
    expect(table.mapping).toEqual(["year", "team", "", ""]);
    expect(() => reviewCsv(table, table.mapping, "rushing", url)).toThrow();
    expect(reviewCsv(table, ["year", "team", "rushingYards", "receivingYards"], "rushing", url).imported.seasons[0].statistics).toEqual({ rushingYards: 100, receivingYards: 200 });
  });
  it("rejects malformed, oversized, duplicate, formula and game-log input", () => {
    expect(() => csvRows('"unfinished')).toThrow();
    expect(() => csvRows("a".repeat(100001))).toThrow();
    expect(() => parse(csv + '\n2006,"Fixture, State",12,20,10,30,2.5')).toThrow();
    expect(() => parse(csv.replace("2.5", "=1+1"))).toThrow();
    expect(() => inspectCsv("Date,Opponent,Yds\n2007-09-01,Other,10", "rushing")).toThrow();
    expect(() => parse(csv.replace("2006", "2006-07"))).toThrow();
  });
  it("merges categories without overwriting conflicting values", () => {
    const defense = parse().imported;
    const table = inspectCsv('Year,School,G,Rec,Yds,TD\n2006,"Fixture, State",12,2,20,0', "receiving");
    const receiving = reviewCsv(table, table.mapping, "receiving", url).imported;
    expect(combineCfbImports([defense, receiving])[0].seasons[0].statistics).toMatchObject({ sacks: 2.5, receptions: 2 });
    receiving.seasons[0].statistics.sacks = 9;
    expect(() => combineCfbImports([defense, receiving])).toThrow("Conflicting Sacks");
    expect(previewContent.safeParse({ slug: "fixture", full_name: "Fixture", cfb_stats: [defense, receiving] }).success).toBe(false);
  });
  it("validates source references and renders only via private preview data", () => {
    const imported = parse().imported;
    expect(cfbImport.safeParse({ ...imported, sourceUrl: "javascript:alert(1)" }).success).toBe(false);
    const content = previewContent.parse({ slug: "fixture", full_name: "Fixture", cfb_stats: [imported] });
    const mapped = previewLockerData({ ...content, id: "00000000-0000-4000-8000-000000000001", revision: 1, created_at: "", updated_at: "" });
    expect(mapped.athleteId).toBeNull();
    expect(mapped.structuredStats?.[0].source).toContain("private preview");
    expect(mapped.structuredStats?.[0].seasons).toHaveLength(2);
  });
});
