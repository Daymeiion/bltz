import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseGtmCsv } from "@/lib/gtm/import";
import { GTM_CSV_MAX_BYTES } from "@/lib/gtm/import-contract";

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

  it("recognizes investor contacts without requiring investor-only fields in CSV", () => {
    const result = parseGtmCsv(Buffer.from("Name,Contact Type,LinkedIn\nTaylor Lane,Investor,https://linkedin.com/in/taylor-lane"));

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].contactType).toBe("investor");
  });

  it("enforces the server-side row limit", () => {
    const body = ["Name", ...Array.from({ length: 10_001 }, (_, index) => `Person ${index}`)].join("\n");
    expect(() => parseGtmCsv(Buffer.from(body))).toThrow("at most 10,000 rows");
  });

  it("accepts the maximum supported large import", () => {
    const body = ["Name", ...Array.from({ length: 10_000 }, (_, index) => `Person ${index}`)].join("\n");
    expect(parseGtmCsv(Buffer.from(body)).rows).toHaveLength(10_000);
  });

  it("accepts CSV payloads above the former framework limit and enforces the application cap", () => {
    const nextConfig = readFileSync("next.config.ts", "utf8");
    expect(nextConfig).toContain('bodySizeLimit: "3mb"');

    const accepted = Buffer.from(`Name,Context\nTaylor Lane,${"x".repeat(1_100_000)}`);
    expect(parseGtmCsv(accepted).rows).toHaveLength(1);

    const rejected = Buffer.alloc(GTM_CSV_MAX_BYTES + 1, 0x61);
    expect(() => parseGtmCsv(rejected)).toThrow("smaller than 2 MB");
  });

  it("allows unexpected headers to be mapped explicitly", () => {
    const result = parseGtmCsv(Buffer.from("Human,Network Profile\nTaylor Lane,https://linkedin.com/in/taylor-lane"), {
      displayName: "Human",
      linkedinUrl: "Network Profile",
    });
    expect(result.headers).toEqual(["Human", "Network Profile"]);
    expect(result.rows[0]).toMatchObject({ displayName: "Taylor Lane", linkedinUrl: "https://www.linkedin.com/in/taylor-lane" });
  });

  it("reports a row missing every supported name field", () => {
    const result = parseGtmCsv(Buffer.from("Email,Company\nno-name@example.com,North Coast"));
    expect(result.rows).toEqual([]);
    expect(result.issues[0]).toEqual({ rowNumber: 2, message: "A display name or first and last name is required." });
  });
});
