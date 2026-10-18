import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { JerseyNumberRow } from "@/components/player/JerseyNumberRow";
import { chronologicalJerseys, corroborateJerseys, jerseyBadge, uniqueJerseys } from "@/lib/player/jersey-history";
import { extractPfrJerseys } from "@/lib/pipeline/scrapers/pfr-jerseys";
import { discoverWikipediaJerseys, extractJerseyHistory, extractRosterJerseys } from "@/lib/pipeline/scrapers/jersey-history";
import { discoveryDraft } from "@/lib/preview-lockers/discovery";
import { mergeSuggestions } from "@/lib/preview-lockers/merge-suggestions";
import { previewLockerData } from "@/lib/preview-lockers/mapper";
import { previewContent } from "@/lib/preview-lockers/validation";
import { evaluateSource } from "@/lib/source-policy/policy";
import { readFileSync } from "node:fs";
import { inspectPfrCsv, reviewPfrCsv } from "@/lib/preview-lockers/pfr-csv";

const wiki = "https://en.wikipedia.org/wiki/Antoine_Cason";
const pfr = "https://www.pro-football-reference.com/players/C/CasoAn99.htm";
const teams = ["San Diego Chargers", "Arizona Cardinals", "Carolina Panthers", "Baltimore Ravens"];
const referenceHtml = `<h1>Antoine Cason</h1>${["sdg", "crd", "car", "rav"].map((team, i) => `<a href="/players/uniform.cgi?team=${team}&amp;number=${i === 3 ? 23 : 20}"><svg><text>${i === 3 ? 23 : 20}</text></svg></a>`).join("")}`;
afterEach(() => vi.unstubAllGlobals());

describe("team-specific jersey history", () => {
  it("orders Cason's badges by imported career seasons, including Carolina before Baltimore in 2014", () => {
    const table = inspectPfrCsv(readFileSync("tests/preview-lockers/antoine-cason-defense.csv", "utf8"), "defense");
    const imported = reviewPfrCsv(table, table.mapping, "defense", pfr).imported;
    const content = previewContent.parse({ full_name: "Antoine Cason", slug: "antoine-cason", pfr_stats: [imported],
      pro_teams: [teams[3], teams[0], teams[1], teams[2]].map((label, i) => ({ label, color: "#152238", jerseyNumbers: [i === 0 ? "23" : "20"] })) });
    const before = JSON.stringify(content);
    const mapped = previewLockerData({ ...content, id: "00000000-0000-4000-8000-000000000001", revision: 1, created_at: "", updated_at: "" });
    expect(mapped.jerseyHistory?.map(item => item.team)).toEqual(teams);
    expect(mapped.jerseyHistory?.map(item => item.number)).toEqual(["20", "20", "20", "23"]);
    expect(JSON.stringify(content)).toBe(before);
  });

  it("uses first seasons for college teams and preserves unknown history and number-change order", () => {
    const badges = [{ team: "Unknown", number: "9" }, { team: "Second College", number: "7" }, { team: "First College", number: "1" }, { team: "First College", number: "2" }, { team: "Other Unknown", number: "0" }];
    expect(chronologicalJerseys(badges, [{ year: 2010, team: "Second College" }, { year: 2007, team: "First College" }, { year: 2011, team: "First College" }]).map(item => item.number)).toEqual(["1", "2", "7", "9", "0"]);
    expect(chronologicalJerseys(badges, [])).toEqual(badges);
  });
  it("reads the actual visible PFR SVG badge colors and confirms independent roster matches", () => {
    const fragment = readFileSync("tests/pipeline/antoine-cason-jersey-badges.html", "utf8");
    const result = extractPfrJerseys(fragment, "Antoine Cason", teams, pfr);
    expect(result.map(item => [item.team, item.number, item.color, item.borderColor])).toEqual([
      [teams[0], "20", "#000080", "#FFD700"], [teams[1], "20", "#8B0000", "#000000"],
      [teams[2], "20", "#1C86EE", "#000000"], [teams[3], "23", "#000000", "#800080"],
    ]);
    expect(corroborateJerseys(result, [{ team: teams[0], number: "20", sourceUrl: wiki }, { team: teams[1], number: "20", sourceUrl: wiki }, { team: teams[3], number: "23", sourceUrl: wiki }]).map(item => item.status)).toEqual(["corroborated", "corroborated", "single_source", "corroborated"]);
  });
  it("extracts each PFR badge separately, gated to the correct name and known teams", () => {
    expect(extractPfrJerseys(referenceHtml, "Antoine Cason", teams, pfr).map(item => [item.team, item.number])).toEqual(teams.map((team, index) => [team, index === 3 ? "23" : "20"]));
    expect(extractPfrJerseys(referenceHtml, "Other Cason", teams, pfr)).toEqual([]);
    expect(extractPfrJerseys(referenceHtml, "Antoine Cason", ["Baltimore Ravens"], pfr)).toHaveLength(1);
    expect(evaluateSource(pfr).allowed_actions).toContain("EXTRACT_JERSEY_HISTORY");
    expect(evaluateSource(pfr).allowed_actions).not.toContain("EXTRACT_FACTS");
    expect(evaluateSource("https://www.pro-football-reference.com/players/uniform.cgi?team=rav").allowed_actions).not.toContain("EXTRACT_JERSEY_HISTORY");
  });

  it("uses only this athlete's roster entry inside the roster section", () => {
    const html = `<h2>Game summaries</h2><li>99 <a href="/wiki/Antoine_Cason">Antoine Cason</a></li><h2>Final roster</h2><li>20 <a href="/wiki/Antoine_Cason_(basketball)">Antoine Cason</a></li><li>23 <a href="./Antoine_Cason">Antoine Cason</a> CB</li><h2>Statistics</h2><li>88 <a href="/wiki/Antoine_Cason">Antoine Cason</a></li>`;
    expect(extractRosterJerseys(html, teams[3], wiki, "https://en.wikipedia.org/wiki/2014_Baltimore_Ravens_season")).toEqual([{ team: teams[3], number: "23", sourceUrl: "https://en.wikipedia.org/wiki/2014_Baltimore_Ravens_season", sourceUrls: ["https://en.wikipedia.org/wiki/2014_Baltimore_Ravens_season"] }]);
  });

  it("fetches only team seasons established by career history and tolerates source failures", async () => {
    const fetcher = vi.fn(async (input: string) => input.includes("Arizona_Cardinals") ? new Response("blocked", { status: 403 }) : new Response(`<h2>Roster</h2><li>20 <a href="/wiki/Antoine_Cason">Antoine Cason</a></li>`));
    vi.stubGlobal("fetch", fetcher);
    const result = await discoverWikipediaJerseys(`<th>Career history</th><td><ul><li>San Diego Chargers (2008–2012)</li><li>Arizona Cardinals (2013)</li></ul></td>`, teams, wiki);
    expect(result.map(item => [item.team, item.number])).toEqual([[teams[0], "20"]]);
    expect(fetcher).toHaveBeenCalledTimes(6);
    expect(fetcher.mock.calls.every(([url]) => /^https:\/\/en.wikipedia.org\/wiki\/(?:200[89]|201[0123])_(?:San_Diego_Chargers|Arizona_Cardinals)_season$/.test(url))).toBe(true);
  });

  it("does not assign a general number list, an opponent's number or a retired number to a team", () => {
    const html = `<div>No. 20, 23</div><h3>Baltimore Ravens</h3><p>Cason decided to wear #23, instead of his usual #20, as a mark of respect to Ed Reed.</p><p>Reed wore #20.</p><h3>Awards</h3><p>Arizona retired number 5.</p>`;
    expect(extractJerseyHistory(html, "Antoine Cason", teams, wiki).map(item => [item.team, item.number])).toEqual([[teams[3], "23"]]);
  });

  it("corroborates exact pairs, preserves multi-team duplicates and flags disagreement", () => {
    const reference = extractPfrJerseys(referenceHtml, "Antoine Cason", teams, pfr);
    const roster = teams.map((team, index) => ({ team, number: index === 3 ? "23" : "20", sourceUrl: `${wiki}#roster` }));
    expect(corroborateJerseys(reference, roster).map(item => item.status)).toEqual(Array(4).fill("corroborated"));
    expect(corroborateJerseys(reference, []).every(item => item.status === "single_source")).toBe(true);
    const conflict = corroborateJerseys([reference[3]], [{ ...roster[3], number: "24" }]);
    expect(conflict.map(item => item.status)).toEqual(["conflict", "conflict"]);
    expect(uniqueJerseys([{ team: "BAL", number: "0" }, { team: teams[3], number: "0" }, { team: teams[0], number: "0" }, { team: "BAL", number: "100" }])).toHaveLength(2);
  });

  it("persists team pairs through discovery, manual review, merging and Locker mapping", () => {
    const evidence = corroborateJerseys(extractPfrJerseys(referenceHtml, "Antoine Cason", teams, pfr), teams.map((team, i) => ({ team, number: i === 3 ? "23" : "20", sourceUrl: wiki })));
    const suggestion = discoveryDraft({ full_name: "Antoine Cason" }, { full_name: "Antoine Cason", bio: "", pro_teams: teams, jersey_history: evidence, awards: [], photos: [], youtube_urls: [], confirmed: {}, sources: [] });
    const roundTrip = previewContent.parse(JSON.parse(JSON.stringify(suggestion)));
    expect(roundTrip.pro_teams.map(team => team.jerseyStatus)).toEqual(Array(4).fill("corroborated"));
    const current = { ...roundTrip, pro_teams: roundTrip.pro_teams.map(team => ({ ...team, jerseyNumbers: ["21"], jerseyStatus: "reviewed" as const })) };
    expect(mergeSuggestions(current, suggestion).pro_teams[0].jerseyNumbers).toEqual(["21"]);
    const mapped = previewLockerData({ ...roundTrip, id: "00000000-0000-4000-8000-000000000001", revision: 1, created_at: "", updated_at: "" });
    expect(mapped.jerseyHistory).toHaveLength(4);
    const html = renderToStaticMarkup(<JerseyNumberRow history={mapped.jerseyHistory} fallback="Unknown" />);
    for (const [index, team] of teams.entries()) expect(html).toContain(`${team} #${index === 3 ? "23" : "20"}`);
    expect(jerseyBadge(evidence[0]).color).toBe("#002A5E");
    expect(jerseyBadge(evidence[1]).color).not.toBe(jerseyBadge(evidence[2]).color);
    const conflicted = { ...roundTrip, pro_teams: roundTrip.pro_teams.map(team => ({ ...team, jerseyStatus: "conflict" as const })) };
    expect(previewLockerData({ ...conflicted, id: "00000000-0000-4000-8000-000000000001", revision: 1, created_at: "", updated_at: "" }).jerseyHistory).toEqual([]);
  });
});
