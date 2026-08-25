import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
import { GTM_CONTACT_TYPES, type GtmContactType } from "@/lib/gtm/types";
import {
  GTM_CSV_MAX_BYTES,
  GTM_CSV_MAX_ROWS,
  GTM_IMPORT_FIELDS,
  type GtmFieldMapping,
  type GtmImportField,
  type GtmImportRowIssue,
  type NormalizedGtmImportRow,
  type ParsedGtmImport,
} from "@/lib/gtm/import-contract";

export type { GtmFieldMapping, NormalizedGtmImportRow, ParsedGtmImport } from "@/lib/gtm/import-contract";

const headerAliases: Record<GtmImportField, string[]> = {
  displayName: ["display name", "full name", "name"],
  firstName: ["first name", "firstname", "first_name", "given name"],
  lastName: ["last name", "lastname", "last_name", "surname", "family name"],
  email: ["email", "email address", "e-mail"],
  linkedinUrl: ["linkedin", "linkedin url", "linkedin profile", "profile url", "url"],
  currentCompany: ["company", "current company", "organization", "organisation"],
  currentTitle: ["title", "position", "job title", "role"],
  contactType: ["contact type", "type", "category"],
  sport: ["sport"],
  leagueLevel: ["league", "league level", "level"],
  doNotAutomate: ["do not automate", "do_not_automate", "no automation"],
  sourceRecordId: ["source id", "record id", "connection id", "id"],
};

function clean(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizedHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function normalizeLinkedIn(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    if (!/(^|\.)linkedin\.com$/i.test(url.hostname)) return "";
    url.protocol = "https:";
    url.hostname = "www.linkedin.com";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return "";
  }
}

function truthy(value: string) {
  return ["1", "true", "yes", "y", "do not automate"].includes(value.trim().toLowerCase());
}

function suggestMapping(headers: string[]): GtmFieldMapping {
  const normalized = new Map(headers.map((header) => [normalizedHeader(header), header]));
  const result: GtmFieldMapping = {};
  for (const field of GTM_IMPORT_FIELDS) {
    const match = headerAliases[field].map((alias) => normalized.get(alias)).find(Boolean);
    if (match) result[field] = match;
  }
  return result;
}

function getValue(row: Record<string, unknown>, mapping: GtmFieldMapping, field: GtmImportField, maxLength: number) {
  const header = mapping[field];
  return header ? clean(row[header], maxLength) : "";
}

function sourceIdentity(row: Omit<NormalizedGtmImportRow, "sourceRecordId">, explicitId: string) {
  const seed = explicitId || row.linkedinUrl || row.email
    || [row.displayName, row.currentCompany, row.currentTitle].map((value) => value.toLowerCase()).join("|");
  return createHash("sha256").update(seed).digest("hex");
}

export function parseGtmCsv(buffer: Buffer, mappingOverride?: GtmFieldMapping): ParsedGtmImport {
  if (buffer.byteLength === 0) throw new Error("Choose a non-empty CSV file.");
  if (buffer.byteLength > GTM_CSV_MAX_BYTES) throw new Error("CSV files must be smaller than 750 KB.");

  const workbook = XLSX.read(buffer, { type: "buffer", raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("The CSV does not contain a worksheet.");
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "", raw: false });
  if (rawRows.length === 0) throw new Error("The CSV does not contain any contact rows.");
  if (rawRows.length > GTM_CSV_MAX_ROWS) throw new Error(`CSV files may contain at most ${GTM_CSV_MAX_ROWS.toLocaleString()} rows.`);

  const headers = Object.keys(rawRows[0]);
  const suggestedMapping = suggestMapping(headers);
  const mapping = { ...suggestedMapping, ...mappingOverride };
  const rows: NormalizedGtmImportRow[] = [];
  const issues: GtmImportRowIssue[] = [];
  const seen = new Set<string>();
  const seenIdentities = new Set<string>();
  let duplicateCount = 0;

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2;
    const firstName = getValue(raw, mapping, "firstName", 120);
    const lastName = getValue(raw, mapping, "lastName", 120);
    const displayName = getValue(raw, mapping, "displayName", 240) || [firstName, lastName].filter(Boolean).join(" ");
    const rawLinkedIn = getValue(raw, mapping, "linkedinUrl", 500);
    const linkedinUrl = normalizeLinkedIn(rawLinkedIn);
    const email = getValue(raw, mapping, "email", 320).toLowerCase();
    const rawType = getValue(raw, mapping, "contactType", 40).toLowerCase().replace(/\s+/g, "_");
    const contactType = (GTM_CONTACT_TYPES as readonly string[]).includes(rawType) ? rawType as GtmContactType : "unclassified";
    const base = {
      rowNumber,
      displayName,
      firstName,
      lastName,
      email,
      linkedinUrl,
      currentCompany: getValue(raw, mapping, "currentCompany", 200),
      currentTitle: getValue(raw, mapping, "currentTitle", 200),
      contactType,
      sport: getValue(raw, mapping, "sport", 80),
      leagueLevel: getValue(raw, mapping, "leagueLevel", 80),
      doNotAutomate: truthy(getValue(raw, mapping, "doNotAutomate", 40)),
    };

    if (!displayName) {
      issues.push({ rowNumber, message: "A display name or first and last name is required." });
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      issues.push({ rowNumber, message: "Email address is not valid." });
      return;
    }
    if (rawLinkedIn && !linkedinUrl) {
      issues.push({ rowNumber, message: "LinkedIn URL is not valid." });
      return;
    }

    const sourceRecordId = sourceIdentity(base, getValue(raw, mapping, "sourceRecordId", 255));
    const identityKeys = [linkedinUrl && `linkedin:${linkedinUrl}`, email && `email:${email}`].filter(Boolean) as string[];
    if (seen.has(sourceRecordId) || identityKeys.some((key) => seenIdentities.has(key))) {
      duplicateCount += 1;
      return;
    }
    seen.add(sourceRecordId);
    identityKeys.forEach((key) => seenIdentities.add(key));
    rows.push({ ...base, sourceRecordId });
  });

  return {
    headers,
    suggestedMapping,
    rows,
    issues,
    duplicateCount,
    contentSha256: createHash("sha256").update(buffer).digest("hex"),
  };
}
