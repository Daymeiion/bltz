import type { GtmContactType } from "@/lib/gtm/types";

export const GTM_CSV_MAX_BYTES = 2_000_000;
export const GTM_CSV_MAX_ROWS = 10_000;

export const GTM_IMPORT_FIELDS = [
  "displayName", "firstName", "lastName", "email", "linkedinUrl",
  "currentCompany", "currentTitle", "connectedOn", "contactType", "sport",
  "leagueLevel", "doNotAutomate", "sourceRecordId",
] as const;

export type GtmImportField = (typeof GTM_IMPORT_FIELDS)[number];
export type GtmFieldMapping = Partial<Record<GtmImportField, string>>;

export interface NormalizedGtmImportRow {
  rowNumber: number;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  linkedinUrl: string;
  currentCompany: string;
  currentTitle: string;
  connectedOn: string;
  contactType: GtmContactType;
  sport: string;
  leagueLevel: string;
  doNotAutomate: boolean;
  sourceRecordId: string;
}

export interface GtmImportRowIssue {
  rowNumber: number;
  message: string;
}

export interface ParsedGtmImport {
  headers: string[];
  suggestedMapping: GtmFieldMapping;
  rows: NormalizedGtmImportRow[];
  issues: GtmImportRowIssue[];
  duplicateCount: number;
  contentSha256: string;
}
