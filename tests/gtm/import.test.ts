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

  it("rejects a legacy binary Excel workbook before the CSV parser handles it", () => {
    const workbook = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]);
    expect(() => parseGtmCsv(workbook)).toThrow("not an Excel workbook");
  });

  it("preserves quoted commas, escaped quotes and textual leading zeroes", () => {
    const csv = Buffer.from([
      'Name,Company,Title,Record ID',
      '"Taylor, Lane","North ""Coast""",00123,00042',
    ].join("\r\n"));
    const result = parseGtmCsv(csv);

    expect(result.rows[0]).toMatchObject({
      displayName: "Taylor, Lane",
      currentCompany: 'North "Coast"',
      currentTitle: "00123",
    });
    expect(result.rows[0].sourceRecordId).toBe(parseGtmCsv(Buffer.from("Name,Record ID\nTaylor Lane,00042")).rows[0].sourceRecordId);
  });

  it("treats prototype-like column names as inert CSV data", () => {
    const objectPrototype = Object.getPrototypeOf({});
    const result = parseGtmCsv(Buffer.from("Name,__proto__,constructor\nTaylor Lane,polluted,not-a-function"));

    expect(result.rows[0].displayName).toBe("Taylor Lane");
    expect(Object.getPrototypeOf({})).toBe(objectPrototype);
    expect(Object.hasOwn(Object.prototype, "polluted")).toBe(false);
    expect({}.constructor).toBe(Object);
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

  it("holds every row when a shared email has different source record IDs", () => {
    const csv = Buffer.from("Name,Email,Record ID\nA Person,a@example.com,one\nA Person,a@example.com,two");
    const result = parseGtmCsv(csv, { displayName: "Name", email: "Email", sourceRecordId: "Record ID" });

    expect(result.rows).toEqual([]);
    expect(result.duplicateCount).toBe(0);
    expect(result.issues.map((issue) => issue.rowNumber)).toEqual([2, 3]);
    expect(result.issues.every((issue) => issue.code === "identity_conflict")).toBe(true);
  });

  it("does not select a contact when a shared email has different LinkedIn URLs", () => {
    const csv = Buffer.from("Name,Email,LinkedIn,Record ID\nA Person,a@example.com,https://linkedin.com/in/a-one,one\nA Person,a@example.com,https://linkedin.com/in/a-two,two");
    const result = parseGtmCsv(csv, { displayName: "Name", email: "Email", linkedinUrl: "LinkedIn", sourceRecordId: "Record ID" });

    expect(result.rows).toEqual([]);
    expect(result.duplicateCount).toBe(0);
    expect(result.issues.map((issue) => issue.rowNumber)).toEqual([2, 3]);
  });

  it("skips harmless duplicates after identity and date normalization", () => {
    const csv = Buffer.from([
      "Name,Email,LinkedIn,Connected On,Record ID",
      "A Person,A@example.com,linkedin.com/in/a-person?trk=test,17 Aug 2024,00042",
      "A Person,a@example.com,https://www.linkedin.com/in/a-person,2024-08-17,00042",
    ].join("\n"));
    const result = parseGtmCsv(csv);

    expect(result.rows).toHaveLength(1);
    expect(result.duplicateCount).toBe(1);
    expect(result.issues).toEqual([]);
  });

  it.each([
    ["Email", "a@example.com"],
    ["LinkedIn", "https://linkedin.com/in/a-person"],
    ["Record ID", "00042"],
  ])("quarantines different fields for the same %s, including the earlier row", (header, identity) => {
    const csv = Buffer.from(`Name,Company,${header}\nA Person,First Company,${identity}\nA Person,Changed Company,${identity}`);
    const result = parseGtmCsv(csv);

    expect(result.rows).toEqual([]);
    expect(result.duplicateCount).toBe(0);
    expect(result.issues).toHaveLength(2);
    expect(result.issues[0]).toMatchObject({ code: "identity_conflict", rowNumber: 2, conflictGroupRowNumber: 2, conflictGroupSize: 2 });
    expect(result.issues[1]).toMatchObject({ code: "identity_conflict", rowNumber: 3, conflictGroupRowNumber: 2, conflictGroupSize: 2 });
  });

  it("quarantines a transitive email, profile and source-ID conflict without merging any row", () => {
    const csv = Buffer.from([
      "Name,Email,LinkedIn,Record ID",
      "First Person,first@example.com,https://linkedin.com/in/first,first",
      "Second Person,first@example.com,https://linkedin.com/in/second,second",
      "Third Person,third@example.com,https://linkedin.com/in/second,third",
      "Fourth Person,fourth@example.com,https://linkedin.com/in/fourth,third",
      "Unrelated Person,unrelated@example.com,https://linkedin.com/in/unrelated,unrelated",
    ].join("\n"));
    const result = parseGtmCsv(csv);

    expect(result.rows.map((row) => row.displayName)).toEqual(["Unrelated Person"]);
    expect(result.duplicateCount).toBe(0);
    expect(result.issues.map((issue) => issue.rowNumber)).toEqual([2, 3, 4, 5]);
    expect(result.issues.every((issue) => issue.conflictGroupSize === 4 && issue.conflictGroupRowNumber === 2)).toBe(true);
    expect(result.issues[0].identityKinds).toEqual(expect.arrayContaining(["email", "linkedin", "source"]));
    const publicIssues = JSON.stringify(result.issues);
    expect(publicIssues).not.toContain("first@example.com");
    expect(publicIssues).not.toContain("linkedin.com/in/second");
    expect(publicIssues).not.toContain("First Person");
  });

  it("keeps earlier identical repeats in the exception group if a later row conflicts", () => {
    const result = parseGtmCsv(Buffer.from("Name,Email\nA Person,a@example.com\nA Person,a@example.com\nDifferent Person,a@example.com"));

    expect(result.rows).toEqual([]);
    expect(result.duplicateCount).toBe(0);
    expect(result.issues.map((issue) => issue.rowNumber)).toEqual([2, 3, 4]);
    expect(result.issues.every((issue) => issue.conflictGroupSize === 3)).toBe(true);
  });

  it("does not let an invalid row silently select a conflicting valid identity", () => {
    const result = parseGtmCsv(Buffer.from("Name,Email,Connected On\nA Person,a@example.com,2024-08-17\nDifferent Person,a@example.com,not-a-date"));

    expect(result.rows).toEqual([]);
    expect(result.duplicateCount).toBe(0);
    expect(result.issues.map((issue) => issue.rowNumber)).toEqual([2, 3]);
    expect(result.issues.every((issue) => issue.code === "identity_conflict")).toBe(true);
  });

  it("preserves leading-zero source IDs as distinct identities despite matching names", () => {
    const result = parseGtmCsv(Buffer.from("Name,Record ID\nAlex Smith,00042\nAlex Smith,42"));

    expect(result.rows).toHaveLength(2);
    expect(result.duplicateCount).toBe(0);
    expect(result.issues).toEqual([]);
    expect(result.rows[0].sourceRecordId).not.toBe(result.rows[1].sourceRecordId);
  });

  it.each([
    ["Record ID", "x".repeat(255), "Source record ID"],
    ["Email", `${"x".repeat(320)}@example.com`, "Email address"],
    ["LinkedIn", `https://linkedin.com/in/${"x".repeat(500)}`, "LinkedIn URL"],
  ])("rejects overlength %s values instead of collapsing their prefixes", (header, prefix, label) => {
    const result = parseGtmCsv(Buffer.from(`Name,${header}\nA Person,${prefix}a\nA Person,${prefix}b`));

    expect(result.rows).toEqual([]);
    expect(result.duplicateCount).toBe(0);
    expect(result.issues.map((issue) => issue.rowNumber)).toEqual([2, 3]);
    expect(result.issues.every((issue) => issue.message === `${label} exceeds the supported length.`)).toBe(true);
  });

  it("keeps same-name contacts with different stable profiles and emails", () => {
    const result = parseGtmCsv(Buffer.from("Name,Email,LinkedIn\nAlex Smith,first@example.com,https://linkedin.com/in/first\nAlex Smith,second@example.com,https://linkedin.com/in/second"));

    expect(result.rows).toHaveLength(2);
    expect(result.duplicateCount).toBe(0);
    expect(result.issues).toEqual([]);
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
