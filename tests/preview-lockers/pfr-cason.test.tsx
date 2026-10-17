import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StructuredStats } from "@/components/player/StructuredStats";
import { combinePfrImports, inspectPfrCsv, pfrImport, reviewPfrCsv } from "@/lib/preview-lockers/pfr-csv";
import { careerTotals, type SeasonStats } from "@/lib/sportradar/types";
import { previewContent } from "@/lib/preview-lockers/validation";

const csv = readFileSync("tests/preview-lockers/antoine-cason-defense.csv", "utf8");
const source = "https://www.pro-football-reference.com/players/C/CasoAn99.htm";
function review(input = csv) {
  const table = inspectPfrCsv(input, "defense");
  return reviewPfrCsv(table, table.mapping, "defense", source);
}

describe("Antoine Cason's pasted defense CSV", () => {
  it("maps every numeric performance column, distinguishing the two Yds fields", () => {
    const table = inspectPfrCsv(csv, "defense");
    expect(table.headers.filter((_, index) => !table.mapping[index])).toEqual(["Age", "Lg", "Pos", "Tackles: Awards"]);
    const { imported, warnings } = review();
    expect(imported.seasons).toHaveLength(8);
    expect(imported.seasons[0].statistics).toMatchObject({
      interceptionReturnYards: 69, interceptionReturnTouchdowns: 1, longestInterceptionReturn: 59,
      fumbles: 1, fumbleReturnYards: 0, fumbleReturnTouchdowns: 0,
      quarterbackHits: 0, safeties: 0, approximateValue: 3,
    });
    expect(imported.seasons.find(row => row.team === "ARI")?.statistics.fumbleReturnYards).toBe(59);
    expect(imported.seasons.some(row => row.team === "2TM")).toBe(false);
    expect(warnings.filter(warning => warning.startsWith("Skipped column:"))).toHaveLength(4);
    expect(previewContent.parse({ slug: "cason-fixture", full_name: "Antoine Cason", pfr_stats: [imported] }).pfr_stats[0].seasons).toEqual(imported.seasons);
  });

  it("sums counts, takes the longest return, and keeps incomplete tackle totals unknown", () => {
    const [record] = combinePfrImports([review().imported]);
    expect(careerTotals(record.seasons)).toMatchObject({
      interceptions: 16, interceptionReturnYards: 362, interceptionReturnTouchdowns: 2, longestInterceptionReturn: 80,
      forcedFumbles: 8, fumbles: 1, fumbleRecoveries: 5, fumbleReturnYards: 59, fumbleReturnTouchdowns: 0,
      safeties: 0, approximateValue: 30,
    });
    expect(careerTotals(record.seasons).tackles).toBeUndefined();
    expect(careerTotals(record.seasons).passesDefended).toBeUndefined();
    expect(careerTotals(record.seasons).quarterbackHits).toBeUndefined();
    expect(careerTotals([...record.seasons, { ...record.seasons[0], statistics: {} }]).longestInterceptionReturn).toBeUndefined();
    expect(() => review(",,,Def Interceptions,Def Interceptions\nSeason,Team,G,Int,Lng\n2014,2TM,14,2,90\n2014,CAR,12,2,80\n2014,BAL,2,0,0")).toThrow("maximum");
  });

  it("shows categories and games totals, with linked PFR attribution after the table", () => {
    const [record] = combinePfrImports([review().imported]);
    const host = document.createElement("div");
    host.innerHTML = renderToStaticMarkup(<StructuredStats records={[record]} />);
    const table = host.querySelector("table")!;
    expect([...table.querySelectorAll('th[scope="colgroup"]')].map(cell => cell.textContent)).toEqual(["INT / PD", "FUM", "TKL / SK", "AV"]);
    expect([...table.querySelectorAll('th[scope="colgroup"]')].map(cell => cell.getAttribute("aria-label"))).toEqual(["Interceptions", "Fumbles", "Tackles & pressure", "PFR metric"]);
    expect(table.querySelector('th[aria-label="Longest interception return"]')?.textContent).toBe("Lng");
    expect(table.querySelector('th[aria-label="Interception return yards"]')?.getAttribute("title")).toBe("Interception return yards");
    const totals = table.querySelector("tfoot tr")!;
    expect([...totals.children].slice(0, 3).map(cell => cell.textContent)).toEqual(["PFR career", "110", "60"]);
    expect(totals.firstElementChild?.getAttribute("aria-label")).toBe("Career totals reported by Pro Football Reference");
    const seasonTotals = table.querySelectorAll("tfoot tr")[1];
    expect(seasonTotals.firstElementChild?.textContent).toBe("Season sum");
    const headings = [...table.querySelectorAll("thead tr:last-child th")];
    for (const [label, reported] of [["Combined tackles", "381"], ["Passes defended", "63"]]) {
      const index = 3 + headings.findIndex(cell => cell.getAttribute("aria-label") === label);
      expect(totals.children[index].textContent).toBe(reported);
      expect(seasonTotals.children[index].textContent).toBe("—");
    }
    const sourceLink = host.querySelector<HTMLAnchorElement>(`a[href="${source}"]`)!;
    expect(sourceLink.textContent).toBe("Pro-Football-Reference.com");
    expect(sourceLink.parentElement?.textContent).toContain("Statistics courtesy of");
    expect(table.compareDocumentPosition(sourceLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(host.textContent).toContain("Longest returns use the maximum");
    expect(host.textContent).toContain("Approximate Value (AV)");
  });

  it("does not invent provider attribution, games totals, or negative non-yard counts", () => {
    const imported = review().imported;
    for (const key of ["interceptionReturnTouchdowns", "fumbles", "quarterbackHits", "safeties", "approximateValue"]) {
      const invalid = structuredClone(imported);
      invalid.seasons[0].statistics[key] = -1;
      expect(pfrImport.safeParse(invalid).success).toBe(false);
    }
    const season: SeasonStats = { year: 2024, seasonType: "REG", team: "AAA", providerTeamId: "AAA", position: null, gamesPlayed: null, gamesStarted: null, statistics: { sacks: 2 } };
    const host = document.createElement("div");
    host.innerHTML = renderToStaticMarkup(<StructuredStats records={[{ league: "nfl", source: "Sportradar", syncedAt: "2026-10-16", seasons: [season] }]} />);
    expect(host.textContent).not.toContain("courtesy of");
    expect([...host.querySelector("tfoot tr")!.children].slice(1, 3).map(cell => cell.textContent)).toEqual(["—", "—"]);
  });
});
