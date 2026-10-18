// @vitest-environment node
import { describe, expect, it } from "vitest";
import { extractWikipediaHighSchool } from "@/lib/pipeline/scrapers/wikipedia";
import { synthesize } from "@/lib/pipeline/claude";
import { discoveryDraft } from "@/lib/preview-lockers/discovery";
import { previewContent } from "@/lib/preview-lockers/validation";
import { mergeSuggestions } from "@/lib/preview-lockers/merge-suggestions";
import { previewLockerData } from "@/lib/preview-lockers/mapper";
import { highSchoolSchema } from "@/lib/player/bio-fields";

describe("reviewed athlete biography fields", () => {
  it.each([
    ["Edison High School (Stockton, California)", "Edison High School"],
    ["De La Salle High School (Concord, California)", "De La Salle High School"],
    ["St. Mary's Academy, Los Angeles, California", "St. Mary's Academy"],
    ["Lincoln High School · San Diego, CA", "Lincoln High School"],
    ["High School for the Performing Arts", "High School for the Performing Arts"],
    ["Los Alamitos High School", "Los Alamitos High School"],
  ])("keeps only the high-school name from %s through scraping and save/reload", (source, expected) => {
    const html = `<table class="infobox"><tr><th>High school</th><td><a title="${source}">${source}</a></td></tr></table>`;
    expect(extractWikipediaHighSchool(html)).toBe(expected);
    expect(highSchoolSchema.parse(source)).toBe(expected);
    const saved = previewContent.parse({ full_name: "Fixture Athlete", slug: "fixture-athlete", high_school: source });
    expect(previewContent.parse(JSON.parse(JSON.stringify(saved))).high_school).toBe(expected);
  });
  it("carries scraped birthday and hometown into a new preview without GTM or CSV prefills", async () => {
    const identity = { full_name: "Fixture Athlete", school: "Fixture College", level: "former" as const };
    const draft = await synthesize({ identity, results: [{ source: "wikipedia", ok: true, facts: { dob: "1986-07-12", hometown: "Stockton, California", high_school: "Edison High School (Stockton, California)" }, urls: ["https://en.wikipedia.org/wiki/Fixture_Athlete"] }] });
    const suggestion = discoveryDraft(identity, draft);
    expect(suggestion).toMatchObject({ dob: "1986-07-12", hometown: "Stockton, California", high_school: "Edison High School" });
    const merged = mergeSuggestions(previewContent.parse({ full_name: identity.full_name, slug: "fixture-athlete" }), suggestion);
    expect(previewContent.parse(JSON.parse(JSON.stringify(merged)))).toMatchObject({ dob: "1986-07-12", hometown: "Stockton, California", high_school: "Edison High School" });
  });
  it("extracts the athlete's infobox high school without copying another person's school", () => {
    const html = '<p>His father attended Other High School.</p><table class="infobox biography vcard"><tr><th>College</th><td>Arizona</td></tr><tr><th scope="row">High school</th><td><a title="Los Alamitos High School">Los Alamitos</a><br>(California)<sup>[1]</sup></td></tr></table>';
    expect(extractWikipediaHighSchool(html)).toBe("Los Alamitos High School");
    expect(extractWikipediaHighSchool('<p>His father attended Other High School.</p><table class="infobox"><tr><th>College</th><td>Arizona</td></tr></table>')).toBeUndefined();
    expect(extractWikipediaHighSchool('<table><tr><th>High school</th><td>Unrelated School</td></tr></table>')).toBeUndefined();
  });

  it("round-trips Cason's scraped facts through synthesis, review, save schema and Locker display", async () => {
    const identity = { full_name: "Antoine Cason", school: "Arizona", level: "former" as const };
    const scraped = await synthesize({ identity, results: [{ source: "wikipedia", ok: true, facts: { dob: "1986-07-09", high_school: "Los Alamitos High School" }, urls: ["https://en.wikipedia.org/wiki/Antoine_Cason"] }] });
    const suggestion = discoveryDraft(identity, scraped);
    expect(suggestion).toMatchObject({ dob: "1986-07-09", high_school: "Los Alamitos High School", school: "Arizona" });
    const saved = previewContent.parse(JSON.parse(JSON.stringify(suggestion)));
    const display = previewLockerData({ ...saved, id: "00000000-0000-4000-8000-000000000001", revision: 1, created_at: "", updated_at: "" });
    expect(display).toMatchObject({ dobDisplay: "07-09-1986", highSchool: "Los Alamitos High School" });
    const manual = { ...saved, dob: "1986-07-10", high_school: "Reviewed High School" };
    expect(mergeSuggestions(manual, suggestion)).toMatchObject({ dob: manual.dob, high_school: manual.high_school });
  });

  it("rejects impossible, future and malformed dates and never substitutes college for high school", () => {
    const content = previewContent.parse({ full_name: "Fixture Athlete", slug: "fixture-athlete", school: "College Only", level: "former" });
    const mapped = previewLockerData({ ...content, id: "00000000-0000-4000-8000-000000000001", revision: 1, created_at: "", updated_at: "" });
    expect(mapped.highSchool).toBe("");
    for (const dob of ["1986-02-30", "2999-01-01", "1986-7-9", "07/09/1986", "1800-01-01"]) expect(previewContent.safeParse({ ...content, dob }).success).toBe(false);
    expect(previewContent.safeParse({ ...content, high_school: "x".repeat(161) }).success).toBe(false);
    expect(previewContent.safeParse({ ...content, high_school: "School\nOther" }).success).toBe(false);
    expect(highSchoolSchema.safeParse("(California)").success).toBe(false);
    expect(discoveryDraft({full_name: "Fixture Athlete"}, {full_name: "Fixture Athlete",bio:"",dob:"1986-02-30",awards:[],photos:[],youtube_urls:[],confirmed:{},sources:[]}).dob).toBeNull();
  });
});
