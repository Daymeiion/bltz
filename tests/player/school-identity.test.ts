import { describe, expect, it, vi } from "vitest";
import { schoolAliases, schoolShortLabel, schoolsMatch, mentionsSchool } from "@/lib/player/school-identity";
import { matchSchoolBrand, directorySchoolAliases, previewTeamBranding, shortTeamLabel } from "@/lib/preview-lockers/branding";
import { enrichPreviewSchoolBranding } from "@/lib/preview-lockers/school-branding";
import type { SupabaseClient } from "@supabase/supabase-js";

const team = (name: string, abbr: string | null) => ({ display_name: name, abbreviation: abbr, primary_color: "003262", logo_url: null, logo_dark_url: null });

describe("campus-safe school aliases", () => {
  it.each(["Cal", "California", "UC Berkeley", "University of California, Berkeley", "California Golden Bears"])("matches %s to Cal symmetrically", name => {
    expect(schoolsMatch(name, "CAL")).toBe(true);
    expect(schoolsMatch("CAL", name)).toBe(true);
    expect(matchSchoolBrand(name, [team("California Golden Bears", "CAL")])?.abbr).toBe("CAL");
    expect(schoolShortLabel(name)).toBe("CAL");
  });

  it.each([["University of Central Florida", "UCF"], ["Louisiana State University", "LSU"], ["University of California, Los Angeles", "UCLA"], ["Ohio State University", "Ohio State"]])("normalizes %s with a directory reference", (name, abbr) => {
    expect(matchSchoolBrand(name, [team(abbr, abbr)])?.name).toBe(abbr);
  });

  it("uses locations and expands only unambiguous directory aliases", () => {
    const ohio = { ...team("Ohio State Buckeyes", "OSU"), location: "Ohio State", mascot: "Buckeyes" };
    const oregon = { ...team("Oregon State Beavers", "ORST"), location: "Oregon State", mascot: "Beavers" };
    expect(matchSchoolBrand("Ohio State University", [ohio, oregon])).toMatchObject({ name: "Ohio State", abbr: "OSU" });
    expect(directorySchoolAliases(["OSU"], [ohio, oregon])).toContain("Ohio State");
    expect(directorySchoolAliases(["OSU"], [ohio, { ...oregon, abbreviation: "OSU" }])).toEqual(["OSU"]);
    expect(matchSchoolBrand("California", [{ ...team("California Golden Bears", "CAL"), location: "California" }])?.name).toBe("California");
  });

  it("honors directory abbreviations without changing existing unknown-school presentation", () => {
    expect(schoolShortLabel("University of Example", "EXU")).toBe("EXU");
    expect(shortTeamLabel("Fixture College")).toBe("FC");
    expect(shortTeamLabel("Northwestern")).toBe("N");
    expect(shortTeamLabel("University of California, Los Angeles")).toBe("UCLA");
  });

  it("retains campus distinctions and refuses ambiguous directory abbreviations", () => {
    expect(schoolsMatch("California", "Southern California")).toBe(false);
    expect(schoolsMatch("California", "University of California")).toBe(false);
    expect(schoolsMatch("University of Miami", "Miami University")).toBe(false);
    expect(matchSchoolBrand("Miami", [team("University of Miami", "MIA"), team("Miami University", "M-OH")])).toBeNull();
    expect(matchSchoolBrand("OSU", [team("Ohio State", "OSU"), team("Oregon State", "OSU")])).toBeNull();
    expect(schoolAliases("OSU")).toEqual(["OSU"]);
    expect(schoolsMatch("UC Berkeley", "UC Los Angeles")).toBe(false);
    expect(schoolsMatch("??", "!!")).toBe(false);
    expect(schoolsMatch("", "")).toBe(false);
  });

  it("matches school phrases without accepting another California campus or partial words", () => {
    expect(mentionsSchool("Daymeion Hughes played football at California", "Cal")).toBe(true);
    expect(mentionsSchool("Daymeion Hughes played at Cal", "University of California, Berkeley")).toBe(true);
    expect(mentionsSchool("Daymeion Hughes played for Southern California", "Cal")).toBe(false);
    expect(mentionsSchool("Daymeion Hughes played for University of California, Los Angeles", "Cal")).toBe(false);
    expect(mentionsSchool("Daymeion Hughes played for Cal State", "Cal")).toBe(false);
    expect(mentionsSchool("A local story about calculations", "Cal")).toBe(false);
  });

  it("reads school locations while retaining saved fields and current team-history names", async () => {
    const directory = [{ ...team("Central Florida Knights", "UCF"), location: "Central Florida", mascot: "Knights", logo_url: "/ucf.png" }];
    const select = vi.fn(() => ({ limit: async () => ({ data: directory, error: null }) }));
    const client = { from: () => ({ select }) } as unknown as SupabaseClient;
    const row = { school: "University of Central Florida", bio: "Saved career history", schools: [{ label: "UCF", name: "University of Central Florida", color: "#152238", logo: null }], pro_teams: [{ label: "San Diego Chargers", color: "#152238", logo: null }] };
    const enriched = await enrichPreviewSchoolBranding(client, row);
    expect(select).toHaveBeenCalledWith("display_name, location, abbreviation, mascot, primary_color, logo_url, logo_dark_url");
    expect(enriched.school).toBe(row.school);
    expect(enriched.bio).toBe(row.bio);
    expect(enriched.pro_teams).toBe(row.pro_teams);
    expect(row.schools[0].name).toBe("University of Central Florida");
    expect(previewTeamBranding(enriched).schools[0]).toEqual({ label: "UCF", name: "Central Florida", color: "#003262", logo: "/ucf.png" });
    expect(previewTeamBranding(enriched).proTeams[0].label).toBe("SD");
  });

  it("keeps ambiguous saved affiliations without inventing school branding", async () => {
    const directory = [team("Ohio State", "OSU"), team("Oregon State", "OSU")];
    const client = { from: () => ({ select: () => ({ limit: async () => ({ data: directory, error: null }) }) }) } as unknown as SupabaseClient;
    const row = { school: "OSU", schools: [{ label: "OSU", name: "OSU", color: "#152238", logo: null }] };
    const enriched = await enrichPreviewSchoolBranding(client, row);
    expect(enriched.school).toBe("OSU");
    expect(Reflect.get(enriched, "school_info")).toBeUndefined();
    expect(enriched.schools).toEqual(row.schools);
  });
});
