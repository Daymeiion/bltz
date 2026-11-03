import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHOOL_IDENTITY_SOURCE_AUDIT } from "@/lib/enterprise-crm/theme/source-audit";

const generatedTypes = readFileSync(resolve("types/database.generated.ts"), "utf8");
const baseline = readFileSync(
  resolve("supabase/migrations/20260701000000_production_schema_baseline.sql"),
  "utf8",
);
const tenantFoundation = readFileSync(
  resolve("supabase/migrations/20260818000001_phase2_tenant_authorization_foundation.sql"),
  "utf8",
);

describe("school identity source audit", () => {
  it("documents candidate typed color sources and the absence of an approved exact link", () => {
    expect(SCHOOL_IDENTITY_SOURCE_AUDIT.schools).toMatchObject({
      typedColors: false,
      exactDirectoryLink: false,
    });
    expect(SCHOOL_IDENTITY_SOURCE_AUDIT.colleges).toMatchObject({
      typedColors: true,
      exactSchoolLink: false,
    });
    expect(SCHOOL_IDENTITY_SOURCE_AUDIT.cfbTeams).toMatchObject({
      typedColors: true,
      exactSchoolLink: false,
    });
    expect(SCHOOL_IDENTITY_SOURCE_AUDIT.repositoryCoverage.rowLevelExportPresent).toBe(false);
  });

  it("anchors the audit in the generated schema and migration contracts", () => {
    expect(generatedTypes).toContain("primary_color_hex: string | null");
    expect(generatedTypes).toContain("secondary_color_hex: string | null");
    expect(generatedTypes).toContain("primary_color: string | null");
    expect(generatedTypes).toContain("alt_color: string | null");
    expect(generatedTypes).toContain("meta: Json | null");
    expect(baseline).toContain('CREATE TABLE IF NOT EXISTS "public"."Colleges"');
    expect(baseline).toContain('CREATE TABLE IF NOT EXISTS "public"."schools"');
    expect(baseline).toContain('CREATE TABLE IF NOT EXISTS "public"."cfb_teams"');
    expect(tenantFoundation).toContain(
      "school_id uuid references public.schools(id) on delete set null",
    );
  });

  it("finds no typed schools-to-directory foreign key in the current schema", () => {
    const schoolRelationships = generatedTypes.slice(
      generatedTypes.indexOf("      schools: {"),
      generatedTypes.indexOf("      seasons: {"),
    );
    expect(schoolRelationships).toContain("Relationships: []");
    expect(schoolRelationships).not.toContain("Colleges");
    expect(schoolRelationships).not.toContain("cfb_teams");
  });
});
