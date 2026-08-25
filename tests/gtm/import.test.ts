import { describe, expect, it } from "vitest";
import { parseGtmCsv } from "@/lib/gtm/import";

describe("GTM CSV normalization", () => {
  it("detects common headers and creates stable, normalized identities", () => {
    const csv = Buffer.from([
      "First Name,Last Name,Email Address,Company,LinkedIn URL,Connected On,Contact Type,Do Not Automate",
      "Jordan,Reed,JORDAN@example.com,North Coast,linkedin.com/in/jordan-reed,2025-08-14,Athlete,yes",
    ].join("\n"));
    const result = parseGtmCsv(csv);

    expect(result.suggestedMapping).toMatchObject({ firstName: "First Name", lastName: "Last Name", email: "Email Address" });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      displayName: "Jordan Reed",
      email: "jordan@example.com",
      linkedinUrl: "https://www.linkedin.com/in/jordan-reed",
      connectedOn: "2025-08-14",
      contactType: "athlete",
      doNotAutomate: true,
    });
    expect(result.rows[0].sourceRecordId).toMatch(/^[0-9a-f]{64}$/);
  });

  it("parses a LinkedIn connections export preamble and maps its date column", () => {
    const csv = Buffer.from([
      "Notes:",
      "When exporting your connection data, some email addresses may be missing.",
      "First Name,Last Name,URL,Email Address,Company,Position,Connected On",
      "Taylor,Lane,https://www.linkedin.com/in/taylor-lane,taylor@example.com,Acme,VP Partnerships,17 Aug 2024",
    ].join("\n"));

    const result = parseGtmCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.suggestedMapping.connectedOn).toBe("Connected On");
    expect(result.rows[0]).toMatchObject({ displayName: "Taylor Lane", connectedOn: "2024-08-17" });
  });

  it("rejects invalid connection dates instead of silently inventing one", () => {
    const result = parseGtmCsv(Buffer.from("Name,Connected On\nTaylor Lane,not-a-date"));
    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([{ rowNumber: 2, message: "LinkedIn connection date is not valid." }]);
  });

  it("rejects an Excel workbook disguised with a CSV extension", () => {
    expect(() => parseGtmCsv(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toThrow("not an Excel workbook");
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

  it("deduplicates repeated emails even when source record IDs differ", () => {
    const csv = Buffer.from("Name,Email,Record ID\nA Person,a@example.com,one\nA Person,a@example.com,two");
    const result = parseGtmCsv(csv, { displayName: "Name", email: "Email", sourceRecordId: "Record ID" });

    expect(result.rows).toHaveLength(1);
    expect(result.duplicateCount).toBe(1);
  });

  it("checks email duplication even when both rows have different LinkedIn URLs", () => {
    const csv = Buffer.from("Name,Email,LinkedIn,Record ID\nA Person,a@example.com,https://linkedin.com/in/a-one,one\nA Person,a@example.com,https://linkedin.com/in/a-two,two");
    const result = parseGtmCsv(csv, { displayName: "Name", email: "Email", linkedinUrl: "LinkedIn", sourceRecordId: "Record ID" });

    expect(result.rows).toHaveLength(1);
    expect(result.duplicateCount).toBe(1);
  });

  it("does not collapse name-only rows into one contact identity", () => {
    const result = parseGtmCsv(Buffer.from("Name,Company,Title\nAlex Smith,Acme,Director\nAlex Smith,Acme,Director"));

    expect(result.rows).toHaveLength(2);
    expect(result.duplicateCount).toBe(0);
    expect(result.rows[0].sourceRecordId).not.toBe(result.rows[1].sourceRecordId);
  });

  it("enforces the server-side row limit", () => {
    const body = ["Name", ...Array.from({ length: 2001 }, (_, index) => `Person ${index}`)].join("\n");
    expect(() => parseGtmCsv(Buffer.from(body))).toThrow("at most 2,000 rows");
  });
});
