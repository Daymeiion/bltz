import { describe, expect, it } from "vitest";
import { inspectPfrCsv, reviewPfrCsv, combinePfrImports, pfrImport, pfrSourcePage } from "@/lib/preview-lockers/pfr-csv";
import { careerTotals } from "@/lib/sportradar/types";
import { previewContent } from "@/lib/preview-lockers/validation";
import { previewLockerData } from "@/lib/preview-lockers/mapper";
import type { CfbCategory } from "@/lib/preview-lockers/cfb-csv";

const source = "https://www.pro-football-reference.com/players/F/FixtPl00.htm";
const parse = (csv: string, category: CfbCategory = "defense") => {
  const table = inspectPfrCsv(csv, category);
  return reviewPfrCsv(table, table.mapping, category, source);
};

describe("preview NFL CSV", () => {
  it("accepts dotted PFR player IDs through review and saved-content validation", () => {
    const sourceUrl = "https://www.pro-football-reference.com/players/A/ArriJ.00.htm";
    expect(pfrSourcePage.safeParse(sourceUrl).success).toBe(true);
    expect(pfrSourcePage.safeParse(sourceUrl.replace("www.", "")).success).toBe(true);
    const table = inspectPfrCsv("Season,Team,G,GS,Att,Yds,TD\n2005,ARI,15,5,112,370,2", "rushing");
    const { imported } = reviewPfrCsv(table, table.mapping, "rushing", sourceUrl);
    expect(imported.sourceUrl).toBe(sourceUrl);
    expect(imported.seasons[0].statistics.rushingYards).toBe(370);
    expect(previewContent.parse({ slug: "j-j-arrington", full_name: "J.J. Arrington", pfr_stats: [imported] }).pfr_stats[0].sourceUrl).toBe(sourceUrl);
    for (const path of ["ArriJ..00.htm", ".htm", "...htm", "ArriJ.00/gamelog/2005/"]) {
      expect(pfrSourcePage.safeParse(`https://www.pro-football-reference.com/players/A/${path}`).success).toBe(false);
    }
  });
  it("maps grouped defense, legacy Tm, award markers, and skips PFR summaries", () => {
    const result = parse('--- Cite Pro Football Reference\n,,,,,,,Def Interceptions,,,,,Fumbles,,,,,,Tackles,,,,,,\nSeason,Age,Team,Lg,Pos,G,GS,Int,Yds,IntTD,Lng,PD,FF,Fmb,FR,Yds,FRTD,Sk,Comb,Solo,Ast,TFL,QBHits,Sfty,AV,Awards\n2023*,23,GNB,NFL,DL,16,10,1,12,0,12,4,2,0,1,0,0,2.5,30,20,10,3,4,0,5,\n2024+,24,GNB,NFL,DL,17,12,0,0,0,0,5,1,0,0,0,0,3.0,40,25,15,4,6,0,6,\n2 Yrs,,,NFL,,33,22,1,12,0,12,9,3,0,1,0,0,5.5,70,45,25,7,10,0,11,\n17 Game Avg,,,NFL,,17,11,0,6,0,6,5,2,0,1,0,0,2.8,36,23,13,4,5,0,,\nGNB (2 Yrs),,,NFL,,33,22,1,12,0,12,9,3,0,1,0,0,5.5,70,45,25,7,10,0,11,');
    expect(result.imported.seasons).toHaveLength(2);
    expect(result.imported.seasons[0]).toMatchObject({ year: 2023, team: "GNB", statistics: { interceptions: 1, passesDefended: 4, forcedFumbles: 2, fumbleRecoveries: 1, sacks: 2.5, tackles: 30 } });
    expect(result.imported.seasons[0]).not.toHaveProperty("sourceNote");
    expect(careerTotals(combinePfrImports([result.imported])[0].seasons).sacks).toBe(5.5);
    expect(parse("Year,Tm,G,Sk\n2000,NWE,1,0").imported.seasons[0].team).toBe("NWE");
  });
  it("keeps split team seasons without double counting aggregate rows", () => {
    const { imported, warnings } = parse("Season,Team,G,GS,Sk,Comb\n2024,2TM,17,12,4.5,30\n,AAA,10,7,2.5,20\n,BBB,7,5,2,10");
    const record = combinePfrImports([imported])[0];
    expect(record.seasons.map(row => row.team)).toEqual(["AAA", "BBB"]);
    expect(careerTotals(record.seasons)).toEqual({ sacks: 4.5, tackles: 30 });
    expect(warnings.some(warning => warning.includes("avoid double counting"))).toBe(true);
    expect(() => parse("Season,Team,G,Sk\n2024,2TM,17,4.5\n2024,AAA,10,2.5")).toThrow("do not match");
  });
  it("supports passing, grouped rushing/receiving, kicking, punting, and returns", () => {
    expect(parse("Season,Team,G,Cmp,Att,Yds,TD,Int,Rate\n2024,AAA,17,200,300,3000,25,8,102.5", "passing").imported.seasons[0].statistics).toMatchObject({ passingYards: 3000, passingAttempts: 300, passingInterceptions: 8, passerRating: 102.5 });
    expect(parse(",,Rushing,,,Receiving,,\nSeason,Team,Att,Yds,TD,Rec,Yds,TD\n2024,AAA,80,300,2,20,100,1", "rushing").imported.seasons[0].statistics).toMatchObject({ rushingYards: 300, receptions: 20, receivingYards: 100 });
    expect(parse("Season,Team,FGM,FGA,XPM,XPA\n2024,AAA,20,22,30,31", "kicking").imported.seasons[0].statistics.fieldGoalsMade).toBe(20);
    expect(parse("Season,Team,Punts,Yds\n2024,AAA,60,3000", "punting").imported.seasons[0].statistics.puntYards).toBe(3000);
    expect(parse(",,Kick Ret,,,Punt Ret,,\nSeason,Team,Ret,Yds,TD,Ret,Yds,TD\n2024,AAA,20,500,1,10,100,0", "returns").imported.seasons[0].statistics).toMatchObject({ kickReturns: 20, kickReturnYards: 500, puntReturnYards: 100 });
  });
  it("requires explicit mapping and rejects invalid data and sources", () => {
    const table = inspectPfrCsv("Year,Tm,Yds,Yds\n2024,AAA,100,200", "rushing");
    expect(table.mapping).toEqual(["year", "team", "", ""]);
    expect(() => reviewPfrCsv(table, table.mapping, "rushing", source)).toThrow();
    expect(() => parse("Year,Tm,G,Sk\n2024,AAA,17,=1+1")).toThrow();
    expect(() => parse("Year,Tm,G,Sk\n2024,AAA,17,2.3")).toThrow();
    expect(() => parse("Date,Team,Sk\n2024-01-01,AAA,1")).toThrow();
    const imported = parse("Season,Team,G,Sk\n2024,AAA,17,2.5").imported;
    for (const sourceUrl of ["not a URL", "javascript:alert(1)", "http://www.pro-football-reference.com/players/F/FixtPl00.htm", "https://user:password@www.pro-football-reference.com/players/F/FixtPl00.htm", "https://www.pro-football-reference.com:444/players/F/FixtPl00.htm", "https://www.pro-football-reference.com.evil.example/players/F/FixtPl00.htm", "https://www.pro-football-reference.com/years/2024/", "https://www.pro-football-reference.com/players/F/FixtPl00/gamelog/2024/", "https://www.sports-reference.com/cfb/players/fixture.html"]) {
      expect(pfrImport.safeParse({ ...imported, sourceUrl }).success).toBe(false);
      expect(previewContent.safeParse({ slug: "fixture", full_name: "Fixture", pfr_stats: [{ ...imported, sourceUrl }] }).success).toBe(false);
    }
    expect(() => parse("Season,Team,G,Sk\n2024,AAA,17,2.5\n2024,AAA,17,2.5")).toThrow("Duplicate");
  });
  it("merges categories, rejects conflicts and mixed identities, and preserves blanks", () => {
    const defense = parse("Season,Team,G,Sk,Comb\n2024,AAA,17,2.5,30\n2025,AAA,17,,40").imported;
    const receiving = parse("Season,Team,G,Rec,Yds,TD\n2024,AAA,17,2,20,0", "receiving").imported;
    expect(combinePfrImports([defense, receiving])[0].seasons[0].statistics).toMatchObject({ sacks: 2.5, receptions: 2 });
    expect(careerTotals(combinePfrImports([defense])[0].seasons).sacks).toBeUndefined();
    const changed = structuredClone(receiving); changed.seasons[0].statistics.sacks = 9;
    expect(() => combinePfrImports([defense, changed])).toThrow("Conflicting");
    expect(previewContent.safeParse({ slug: "fixture", full_name: "Fixture", pfr_stats: [defense, changed] }).success).toBe(false);
    expect(() => combinePfrImports([defense, { ...receiving, sourceUrl: source.replace("FixtPl00", "OtherPl00") }])).toThrow("same player");
    const aggregate = parse("Season,Team,G,Rec,Yds,TD\n2024,2TM,17,2,20,0", "receiving").imported;
    expect(() => combinePfrImports([defense, aggregate])).toThrow("mix a multi-team total");
  });
  it("preserves provenance and maps NFL imports into preview data", () => {
    const imported = parse("Season,Team,G,Sk\n2024,AAA,17,2.5").imported;
    const content = previewContent.parse({ slug: "fixture", full_name: "Fixture", pfr_stats: [imported] });
    const mapped = previewLockerData({ ...content, id: "00000000-0000-4000-8000-000000000001", revision: 1, created_at: "", updated_at: "" });
    expect(mapped.athleteId).toBeNull();
    expect(mapped.structuredStats?.[0]).toMatchObject({ league: "nfl", sourceUrls: [source] });
  });
});
