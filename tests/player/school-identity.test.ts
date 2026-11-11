import { describe, expect, it } from "vitest";
import { schoolAliases, schoolShortLabel, schoolsMatch, mentionsSchool } from "@/lib/player/school-identity";
import { matchSchoolBrand, directorySchoolAliases } from "@/lib/preview-lockers/branding";
import { footballPositionLabel } from "@/lib/player/locker-format";
import { articleRelevance, identityQueries } from "@/lib/enrichment/news";
const team = (name: string, abbr: string | null) => ({ display_name: name, abbreviation: abbr, primary_color: "003262", logo_url: null, logo_dark_url: null });
describe("school identity and badge labels", () => {
  it.each(["Cal", "California", "UC Berkeley", "University of California, Berkeley", "California Golden Bears"])("matches %s to Cal symmetrically", name => {
    expect(schoolsMatch(name, "CAL")).toBe(true);
    expect(schoolsMatch("CAL", name)).toBe(true);
    expect(matchSchoolBrand(name, [team("California Golden Bears", "CAL")])?.abbr).toBe("CAL");
    expect(schoolShortLabel(name)).toBe("CAL");
  });
  it.each([["University of Central Florida", "UCF"], ["Louisiana State University", "LSU"], ["University of California, Los Angeles", "UCLA"], ["Ohio State University", "Ohio State"]])("normalizes %s with a directory reference", (name, abbr) => {
    expect(matchSchoolBrand(name, [team(abbr, abbr)])?.name).toBe(abbr);
  });
  it("resolves each directory school location and expands only unique aliases", () => {
    const ohio = { ...team("Ohio State Buckeyes", "OSU"), location: "Ohio State", mascot: "Buckeyes" };
    const oregon = { ...team("Oregon State Beavers", "ORST"), location: "Oregon State", mascot: "Beavers" };
    expect(matchSchoolBrand("Ohio State University", [ohio, oregon])).toMatchObject({ name: "Ohio State", abbr: "OSU" });
    expect(directorySchoolAliases(["OSU"], [ohio, oregon])).toContain("Ohio State");
    expect(directorySchoolAliases(["OSU"], [ohio, { ...oregon, abbreviation: "OSU" }])).toEqual(["OSU"]);
    expect(matchSchoolBrand("California", [{ ...team("California Golden Bears", "CAL"), location: "California" }])?.name).toBe("California");
  });
  it("honors every directory abbreviation and keeps a compact fallback for unknown schools", () => {
    expect(schoolShortLabel("University of Example", "EXU")).toBe("EXU");
    expect(schoolShortLabel("Fixture College")).toBe("FC");
    expect(schoolShortLabel("Northwestern")).toBe("NOR");
    expect(schoolShortLabel("University of California, Los Angeles")).toBe("UCLA");
  });
  it("retains campuses and refuses ambiguous directory abbreviations", () => {
    expect(schoolsMatch("California", "Southern California")).toBe(false);
    expect(schoolsMatch("University of Miami", "Miami University")).toBe(false);
    expect(matchSchoolBrand("Miami", [team("University of Miami", "MIA"), team("Miami University", "M-OH")])).toBeNull();
    expect(matchSchoolBrand("OSU", [team("Ohio State", "OSU"), team("Oregon State", "OSU")])).toBeNull();
    expect(schoolAliases("OSU")).toEqual(["OSU"]);
    expect(schoolsMatch("UC Berkeley", "UC Los Angeles")).toBe(false);
  });
  it("matches publisher school aliases while refusing another California campus or partial words", () => {
    expect(mentionsSchool("Daymeion Hughes played football at California", "Cal")).toBe(true);
    expect(mentionsSchool("Daymeion Hughes played at Cal", "University of California, Berkeley")).toBe(true);
    expect(mentionsSchool("Daymeion Hughes played for Southern California", "Cal")).toBe(false);
    expect(mentionsSchool("Daymeion Hughes played for University of California, Los Angeles", "Cal")).toBe(false);
    expect(mentionsSchool("Daymeion Hughes played for Cal State", "Cal")).toBe(false);
    expect(mentionsSchool("A local story about calculations", "Cal")).toBe(false);
  });
  it("accepts alias evidence only together with the correct athlete name", () => {
    const article = { headline: "Daymeion Hughes returns to California", summary: "Football memories." } as Parameters<typeof articleRelevance>[0];
    const identity = { fullName: "Daymeion Hughes", sport: "football", schools: ["Cal"], teams: [] };
    expect(articleRelevance(article, identity)).toBeGreaterThanOrEqual(.8);
    expect(articleRelevance({ ...article, headline: "John Hughes returns to California" }, identity)).toBe(0);
    expect(articleRelevance({ ...article, headline: "Daymeion Hughes returns to Southern California" }, identity)).toBeLessThan(.8);
  });
});

it("keeps canonical school and team query context without duplicate case variants", () => {
  const queries = identityQueries({ fullName: "Daymeion Hughes", sport: "football", schools: ["Cal", "California", "CAL", "UC Berkeley"], teams: ["Chargers", "Colts"] });
  expect(queries).toHaveLength(4);
  expect(queries).toContain('"Daymeion Hughes" California news interview -stats -roster');
  expect(queries).toContain('"Daymeion Hughes" Chargers news interview -stats -roster');
  expect(queries.filter(query => / cal news/i.test(query))).toHaveLength(1);
});
it.each([["Cornerback", "CB"], ["Quarterback", "QB"], ["Outside Linebacker", "OLB"], ["cb", "CB"], ["EDGE", "EDGE"], ["Custom position", "CUSTOM POSITION"]])("formats compact position %s without changing the source", (name, code) => {
  expect(footballPositionLabel(name)).toBe(code);
});
