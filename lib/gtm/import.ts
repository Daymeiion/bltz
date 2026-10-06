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
  connectedOn: ["connected on", "connection date", "connected_on", "connected date"],
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

function normalizeDate(value: string) {
  if (!value) return "";
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
      ? ""
      : value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function withoutLinkedInPreamble(buffer: Buffer) {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => {
    const normalized = line.toLowerCase();
    return normalized.includes("first name")
      && normalized.includes("last name")
      && (normalized.includes("url") || normalized.includes("linkedin"));
  });
  return headerIndex > 0 ? Buffer.from(lines.slice(headerIndex).join("\n")) : buffer;
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

function getIdentityValue(row: Record<string, unknown>, mapping: GtmFieldMapping, field: GtmImportField) {
  const header = mapping[field];
  return header ? String(row[header] ?? "").trim() : "";
}

function sourceIdentity(
  row: Omit<NormalizedGtmImportRow, "sourceRecordId">,
  explicitId: string,
  uploadRowIdentity: string,
) {
  const seed = explicitId || row.linkedinUrl || row.email
    || uploadRowIdentity;
  return createHash("sha256").update(seed).digest("hex");
}

interface ImportCandidate {
  row: NormalizedGtmImportRow;
  identityKeys: string[];
  signature: string;
  validationIssue?: GtmImportRowIssue;
}

/** Resolve all shared identities before keeping any row, including earlier rows. */
function resolveImportCandidates(candidates: ImportCandidate[]) {
  const parent = candidates.map((_, index) => index);
  const ranks = candidates.map(() => 0);
  const find = (index: number): number => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };
  const join = (left: number, right: number) => {
    let leftRoot = find(left);
    let rightRoot = find(right);
    if (leftRoot === rightRoot) return;
    if (ranks[leftRoot] < ranks[rightRoot]) [leftRoot, rightRoot] = [rightRoot, leftRoot];
    parent[rightRoot] = leftRoot;
    if (ranks[leftRoot] === ranks[rightRoot]) ranks[leftRoot] += 1;
  };
  const identityOwners = new Map<string, number>();
  candidates.forEach((candidate, index) => {
    for (const key of candidate.identityKeys) {
      const owner = identityOwners.get(key);
      if (owner !== undefined) join(index, owner);
      else identityOwners.set(key, index);
    }
  });

  const groups = new Map<number, ImportCandidate[]>();
  candidates.forEach((candidate, index) => {
    const root = find(index);
    const group = groups.get(root);
    if (group) group.push(candidate);
    else groups.set(root, [candidate]);
  });

  const rows: NormalizedGtmImportRow[] = [];
  const issues: GtmImportRowIssue[] = [];
  let duplicateCount = 0;
  for (const group of groups.values()) {
    const signatures = new Set(group.map((candidate) => candidate.signature));
    if (signatures.size > 1) {
      const keyCounts = new Map<string, number>();
      for (const candidate of group) {
        for (const key of candidate.identityKeys) keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
      }
      const identityKinds = [...new Set([...keyCounts].filter(([, count]) => count > 1)
        .map(([key]) => key.slice(0, key.indexOf(":")) as "linkedin" | "email" | "source"))];
      for (const candidate of group) {
        issues.push({
          rowNumber: candidate.row.rowNumber,
          message: "Shared contact identifiers have conflicting values. Every row in this group is held for review; no contact was selected or merged.",
          code: "identity_conflict",
          identityKinds,
          conflictGroupRowNumber: group[0].row.rowNumber,
          conflictGroupSize: group.length,
        });
      }
      continue;
    }
    if (group.some((candidate) => candidate.validationIssue)) {
      for (const candidate of group) {
        if (candidate.validationIssue) issues.push(candidate.validationIssue);
      }
      continue;
    }
    rows.push(group[0].row);
    duplicateCount += group.length - 1;
  }
  rows.sort((left, right) => left.rowNumber - right.rowNumber);
  issues.sort((left, right) => left.rowNumber - right.rowNumber);
  return { rows, issues, duplicateCount };
}

export function parseGtmCsv(buffer: Buffer, mappingOverride?: GtmFieldMapping): ParsedGtmImport {
  if (buffer.byteLength === 0) throw new Error("Choose a non-empty CSV file.");
  if (buffer.byteLength > GTM_CSV_MAX_BYTES) throw new Error("CSV files must be smaller than 2 MB.");
  const isZipWorkbook = buffer[0] === 0x50 && buffer[1] === 0x4b;
  const isLegacyWorkbook = buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  if (isZipWorkbook || isLegacyWorkbook) throw new Error("Choose a CSV file, not an Excel workbook.");
  const contentSha256 = createHash("sha256").update(buffer).digest("hex");

  // CSV identity/date fields must remain textual. SheetJS otherwise coerces
  // ISO dates through the machine timezone and can shift Connected On by a day.
  const workbook = XLSX.read(withoutLinkedInPreamble(buffer), { type: "buffer", raw: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("The CSV does not contain a worksheet.");
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "", raw: false });
  if (rawRows.length === 0) throw new Error("The CSV does not contain any contact rows.");
  if (rawRows.length > GTM_CSV_MAX_ROWS) throw new Error(`CSV files may contain at most ${GTM_CSV_MAX_ROWS.toLocaleString()} rows.`);

  const headers = Object.keys(rawRows[0]);
  const suggestedMapping = suggestMapping(headers);
  const mapping = { ...suggestedMapping, ...mappingOverride };
  const candidates: ImportCandidate[] = [];

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2;
    const firstName = getValue(raw, mapping, "firstName", 120);
    const lastName = getValue(raw, mapping, "lastName", 120);
    const displayName = getValue(raw, mapping, "displayName", 240) || [firstName, lastName].filter(Boolean).join(" ");
    // Stable identifiers must be rejected at their limits, never truncated into
    // a different identifier that could collide with another person's record.
    const rawLinkedIn = getIdentityValue(raw, mapping, "linkedinUrl");
    const linkedinUrl = rawLinkedIn.length <= 500 ? normalizeLinkedIn(rawLinkedIn) : "";
    const email = getIdentityValue(raw, mapping, "email").toLowerCase();
    const explicitId = getIdentityValue(raw, mapping, "sourceRecordId");
    const rawConnectedOn = getValue(raw, mapping, "connectedOn", 80);
    const connectedOn = normalizeDate(rawConnectedOn);
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
      connectedOn,
      contactType,
      sport: getValue(raw, mapping, "sport", 80),
      leagueLevel: getValue(raw, mapping, "leagueLevel", 80),
      doNotAutomate: truthy(getValue(raw, mapping, "doNotAutomate", 40)),
    };

    const validationMessage = !displayName ? "A display name or first and last name is required."
      : email.length > 320 ? "Email address exceeds the supported length."
        : email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Email address is not valid."
          : rawLinkedIn.length > 500 ? "LinkedIn URL exceeds the supported length."
            : rawLinkedIn && !linkedinUrl ? "LinkedIn URL is not valid."
              : explicitId.length > 255 ? "Source record ID exceeds the supported length."
                : rawConnectedOn && !connectedOn ? "LinkedIn connection date is not valid."
                  : null;
    const sourceRecordId = sourceIdentity(
      base,
      explicitId,
      `${contentSha256}:${rowNumber}`,
    );
    const identityKeys = [
      `source:${sourceRecordId}`,
      linkedinUrl && `linkedin:${linkedinUrl}`,
      email && `email:${email}`,
    ].filter(Boolean) as string[];
    // Row number identifies an occurrence, not contact content. Explicit source
    // IDs are included so different IDs cannot be collapsed via a shared email.
    candidates.push({
      row: { ...base, sourceRecordId },
      identityKeys,
      signature: JSON.stringify({
        ...base,
        rowNumber: undefined,
        explicitId,
        ...(validationMessage ? { rawLinkedIn, rawConnectedOn } : {}),
      }),
      ...(validationMessage ? { validationIssue: { rowNumber, message: validationMessage } } : {}),
    });
  });

  const { rows, issues, duplicateCount } = resolveImportCandidates(candidates);

  return {
    headers,
    suggestedMapping,
    rows,
    issues,
    duplicateCount,
    contentSha256,
  };
}
