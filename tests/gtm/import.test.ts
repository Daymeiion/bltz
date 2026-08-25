import { describe, expect, it } from "vitest";
import { parseGtmCsv } from "@/lib/gtm/import";

describe("GTM CSV normalization", () => {
  it("detects common headers and creates stable, normalized identities", () => {
    const csv = Buffer.from([
      "First Name,Last Name,Email Address,Company,LinkedIn URL,Contact Type,Do Not Automate",
      "Jordan,Reed,JORDAN@example.com,North Coast,linkedin.com/in/jordan-reed,Athlete,yes",
    ].join("\n"));
    const result = parseGtmCsv(csv);

    expect(result.suggestedMapping).toMatchObject({ firstName: "First Name", lastName: "Last Name", email: "Email Address" });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      displayName: "Jordan Reed",
      email: "jordan@example.com",
      linkedinUrl: "https://www.linkedin.com/in/jordan-reed",
      contactType: "athlete",
      doNotAutomate: true,
    });
    expect(result.rows[0].sourceRecordId).toMatch(/^[0-9a-f]{64}$/);
  });

  it("supports explicit field mapping and rejects invalid rows before commit", () => {
    const csv = Buffer.from("Person,Profile,Mail\nTaylor Lane,not-a-linkedin-url,bad-email");
    const result = parseGtmCsv(csv, { displayName: "Person", linkedinUrl: "Profile", email: "Mail" });

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([{ rowNumber: 2, message: "Email address is not valid." }]);
  });

  it("deduplicates repeated source identities within one upload", () => {
    const csv = Buffer.from("Name,Email\nA Person,a@example.com\nA Person,a@example.com");
    const result = parseGtmCsv(csv);

    expect(result.rows).toHaveLength(1);
    expect(result.duplicateCount).toBe(1);
  });

  it("enforces the server-side row limit", () => {
    const body = ["Name", ...Array.from({ length: 2001 }, (_, index) => `Person ${index}`)].join("\n");
    expect(() => parseGtmCsv(Buffer.from(body))).toThrow("at most 2,000 rows");
  });
});
