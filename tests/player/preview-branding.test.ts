import { describe, expect, it } from "vitest";
import { nflLogo, nflTeamCode, nflTeamColor } from "@/lib/player/locker-format";
import { brandColor, matchSchoolBrand, previewTeamBranding } from "@/lib/preview-lockers/branding";
import type { PreviewLockerRow } from "@/lib/preview-lockers/types";
import { enrichPreviewSchoolBranding } from "@/lib/preview-lockers/school-branding";
import type { SupabaseClient } from "@supabase/supabase-js";

const cal = { display_name: "California Golden Bears", abbreviation: "CAL", primary_color: "003262", logo_url: "/cal.png", logo_dark_url: null };

describe("preview team branding", () => {
  it("resolves full NFL names and historical codes without invalid CDN paths", () => {
    expect(nflTeamCode(" Indianapolis Colts ")).toBe("IND");
    expect(nflTeamCode("San Diego Chargers")).toBe("SD");
    expect(nflTeamColor("San Diego Chargers")).toBe(nflTeamColor("LAC"));
    expect(nflLogo("Indianapolis Colts")).toMatch(/\/ind.png$/);
    expect(nflLogo("SD")).toMatch(/\/lac.png$/);
    expect(nflLogo("Unknown Club")).toBeNull();
  });

  it("normalizes school colors without allowing invalid CSS values", () => {
    expect(brandColor("003262")).toBe("#003262");
    expect(brandColor("#fff")).toBe("#fff");
    expect(brandColor("garbage")).toBe("#1A3DCC");
  });

  it("uses directory branding only for an unambiguous school match", () => {
    expect(matchSchoolBrand("University of California, Berkeley", [cal])?.abbr).toBe("CAL");
    expect(matchSchoolBrand("California", [cal, cal])).toBeNull();
    expect(matchSchoolBrand("Southern California", [cal])).toBeNull();
  });

  it("repairs existing preview labels, school fallback and duplicate teams", () => {
    const row = { school: "University of California, Berkeley", school_info: matchSchoolBrand("CAL", [cal]), schools: [], pro_teams: [
      { label: "Indianapolis Colts", color: "#1A3DCC", logo: "https://a.espncdn.com/indianapolis colts.png" },
      { label: "IND", color: "#1A3DCC", logo: null },
    ] } as unknown as PreviewLockerRow;
    const result = previewTeamBranding(row);
    expect(result.schools).toEqual([{ label: "CAL", color: "#003262", logo: "/cal.png" }]);
    expect(result.proTeams).toEqual([{ label: "IND", color: "#002C5F", logo: nflLogo("IND") }]);
  });

  it("keeps saved data intact when directory access is denied", async () => {
    const row = { school: "CAL" } as unknown as PreviewLockerRow;
    const client = { from: () => ({ select: () => ({ limit: async () => ({ data: null, error: { message: "denied" } }) }) }) } as unknown as SupabaseClient;
    expect(await enrichPreviewSchoolBranding(client, row)).toBe(row);
  });

  it("repairs the saved Keith Rivers preview shape using the school directory", async () => {
    const usc = { display_name: "USC Trojans", abbreviation: "USC", primary_color: "#9d2235", logo_url: "https://a.espncdn.com/i/teamlogos/ncaa/500/30.png", logo_dark_url: null };
    const row = { school: "USC", schools: [], pro_teams: ["Cincinnati Bengals", "New York Giants", "Buffalo Bills", "Dallas Cowboys"].map(label => ({ label, color: "#152238", logo: null })) } as unknown as PreviewLockerRow;
    const client = { from: () => ({ select: () => ({ limit: async () => ({ data: [usc], error: null }) }) }) } as unknown as SupabaseClient;
    const result = previewTeamBranding(await enrichPreviewSchoolBranding(client, row));
    expect(result.schools[0]).toEqual({ label: "USC", color: "#9d2235", logo: usc.logo_url });
    expect(result.proTeams.map(team => team.label)).toEqual(["CIN", "NYG", "BUF", "DAL"]);
    expect(result.proTeams.every(team => team.logo && team.color !== "#152238")).toBe(true);
    expect(row.schools).toEqual([]);
  });
});

