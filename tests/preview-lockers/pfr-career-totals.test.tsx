import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StructuredStats } from "@/components/player/StructuredStats";
import { inspectPfrCsv, reviewPfrCsv, pfrImport, combinePfrImports } from "@/lib/preview-lockers/pfr-csv";
import { careerTotals } from "@/lib/sportradar/types";
import { previewContent } from "@/lib/preview-lockers/validation";
import type { CfbCategory } from "@/lib/preview-lockers/cfb-csv";

const source = "https://www.pro-football-reference.com/players/C/CasoAn99.htm";
const casonCsv = readFileSync("tests/preview-lockers/antoine-cason-defense.csv", "utf8");
function parse(csv = casonCsv, category: CfbCategory = "defense") {
  const table = inspectPfrCsv(csv, category);
  return reviewPfrCsv(table, table.mapping, category, source);
}
function render(csv: string) {
  const record = combinePfrImports([parse(csv).imported])[0];
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(<StructuredStats records={[record]} />);
  return host;
}

describe("PFR source-provided career summaries", () => {
  it("retains Cason's reported totals without filling missing BAL season cells", () => {
    const { imported, warnings } = parse();
    expect(imported.careerTotals).toMatchObject({ seasonCount: 7, gamesPlayed: 110, gamesStarted: 60, statistics: { tackles: 381, soloTackles: 318, assists: 63, passesDefended: 63, tacklesForLoss: 7, quarterbackHits: 0 } });
    expect(imported.seasons).toHaveLength(8);
    expect(imported.seasons.find(row => row.team === "BAL")?.statistics.tackles).toBeUndefined();
    expect(careerTotals(combinePfrImports([imported])[0].seasons).tackles).toBeUndefined();
    expect(warnings).toHaveLength(10);
    expect(warnings.some(warning => warning.includes("7 Yrs"))).toBe(false);
    const content = previewContent.parse({ slug: "cason", full_name: "Cason", pfr_stats: [imported] });
    expect(previewContent.parse(JSON.parse(JSON.stringify(content))).pfr_stats[0].careerTotals).toEqual(imported.careerTotals);
  });

  it.each(["Career", "Total", "Totals", "2 Yrs", "2 Yr"])("recognizes %s as one separate summary", label => {
    const { imported } = parse(`Season,Team,G,GS,Sk,PD\n2023,AAA,16,4,2.5,2\n2024,AAA,17,5,3,3\n${label},,,9,5.5,5`);
    expect(imported.careerTotals).toMatchObject({ gamesPlayed: null, gamesStarted: 9, statistics: { sacks: 5.5, passesDefended: 5 } });
    expect(imported.seasons.map(row => row.year)).toEqual([2023, 2024]);
  });

  it("shows source-only fields while leaving unreported source totals unknown", () => {
    const host = render("Season,Team,G,Sk,PD,FF\n2024,AAA,17,2,,3\nCareer,,17,2,8,");
    const headings = [...host.querySelectorAll("thead tr:last-child th")];
    const rows = host.querySelectorAll("tfoot tr");
    const pd = headings.findIndex(cell => cell.getAttribute("aria-label") === "Passes defended");
    const ff = headings.findIndex(cell => cell.getAttribute("aria-label") === "Forced fumbles");
    expect(pd).toBeGreaterThanOrEqual(3);
    expect(ff).toBeGreaterThanOrEqual(3);
    expect(rows[0].children[pd].textContent).toBe("8");
    expect(rows[1].children[pd].textContent).toBe("—");
    expect(rows[0].children[ff].textContent).toBe("—");
    expect(rows[1].children[ff].textContent).toBe("3");
    expect(host.textContent).not.toContain("missing season values remain unknown");
  });

  it("does not add average rows or team summaries to career values", () => {
    const { imported } = parse("Season,Team,G,Sk\n2024,2TM,17,4.5\n2024,AAA,10,2.5\n2024,BBB,7,2\nCareer,,17,4.5\n17 Game Avg,,17,4.5\nAAA (1 Yr),,10,2.5\nBBB (1 Yr),,7,2");
    const [record] = combinePfrImports([imported]);
    expect(record.seasons).toHaveLength(2);
    expect(record.reportedCareerTotals).toEqual({ gamesPlayed: 17, gamesStarted: null, statistics: { sacks: 4.5 } });
    expect(careerTotals(record.seasons).sacks).toBe(4.5);
  });

  it("rejects contradictory, duplicate, truncated, or formula-bearing summaries", () => {
    const basic = "Season,Team,G,Sk\n2024,AAA,17,2.5\nCareer,,17,2.5";
    expect(() => parse(basic + "\nCareer,,17,2.5")).toThrow("one career summary");
    expect(() => parse(basic.replace("Career,,17,2.5", "Career,,17,=1+1"))).toThrow();
    expect(() => parse(basic.replace("Career,,17,2.5", "Career,,17"))).toThrow();
    const imported = parse().imported;
    for (const mutate of [
      (item: typeof imported) => { item.careerTotals!.statistics.interceptions = 17; },
      (item: typeof imported) => { item.careerTotals!.statistics.passesDefended = 60; },
      (item: typeof imported) => { item.careerTotals!.statistics.longestInterceptionReturn = 79; },
      (item: typeof imported) => { item.careerTotals!.statistics.sacks = 2.3; },
      (item: typeof imported) => { item.careerTotals!.statistics.tackles = -1; },
      (item: typeof imported) => { item.careerTotals!.statistics.unknownStat = 1; },
      (item: typeof imported) => { item.careerTotals!.gamesPlayed = 111; },
      (item: typeof imported) => { item.careerTotals!.gamesStarted = 112; },
      (item: typeof imported) => { item.careerTotals!.seasonCount = 6; },
    ]) {
      const changed = structuredClone(imported); mutate(changed);
      expect(pfrImport.safeParse(changed).success).toBe(false);
      expect(previewContent.safeParse({ slug: "cason", full_name: "Cason", pfr_stats: [changed] }).success).toBe(false);
    }
  });

  it("uses reported career rates without summing or recomputing them", () => {
    const { imported } = parse("Season,Team,G,Att,Yds,Rate\n2023,AAA,16,100,1000,90.5\n2024,AAA,17,200,2000,100.5\nCareer,,33,300,3000,97.2", "passing");
    const [record] = combinePfrImports([imported]);
    expect(record.reportedCareerTotals?.statistics.passerRating).toBe(97.2);
    expect(careerTotals(record.seasons).passerRating).toBeUndefined();
  });

  it("merges category summaries without summing overlapping values or game counts", () => {
    const defense = parse("Season,Team,G,Sk\n2024,AAA,17,2.5\nCareer,,17,2.5").imported;
    const returns = parse("Season,Team,G,KR\n2023,AAA,16,5\nCareer,,16,5", "returns").imported;
    defense.careerTotals!.statistics.passesDefended = 4;
    returns.careerTotals!.statistics.passesDefended = 4;
    const [record] = combinePfrImports([defense, returns]);
    expect(record.reportedCareerTotals).toEqual({ gamesPlayed: null, gamesStarted: null, statistics: { sacks: 2.5, kickReturns: 5, passesDefended: 4 } });
    returns.careerTotals!.statistics.passesDefended = 5;
    expect(() => combinePfrImports([defense, returns])).toThrow("Conflicting reported career");
    expect(previewContent.safeParse({ slug: "cason", full_name: "Cason", pfr_stats: [defense, returns] }).success).toBe(false);
  });

  it("preserves legacy imports without summaries and keeps career values out of postseason", () => {
    const imported = parse("Season,Team,G,Sk\n2024,AAA,17,2.5").imported;
    expect(imported).not.toHaveProperty("careerTotals");
    const [record] = combinePfrImports([imported]);
    expect(record).not.toHaveProperty("reportedCareerTotals");
    const [cason] = combinePfrImports([parse().imported]);
    const host = document.createElement("div");
    host.innerHTML = renderToStaticMarkup(<StructuredStats records={[{ ...cason, seasons: [...cason.seasons, { ...cason.seasons[0], seasonType: "PST", statistics: { tackles: 3 } }] }]} />);
    expect(host.querySelectorAll('th[aria-label="Career totals reported by Pro Football Reference"]')).toHaveLength(1);
  });
});
