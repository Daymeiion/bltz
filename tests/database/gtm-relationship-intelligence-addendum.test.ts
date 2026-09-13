import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(
  "supabase/migrations/20260826191933_extend_gtm_relationship_intelligence.sql",
), "utf8");
const types = readFileSync(resolve("types/database.generated.ts"), "utf8");
const actions = readFileSync(resolve("app/admin/gtm/actions.ts"), "utf8");
const server = readFileSync(resolve("lib/gtm/server.ts"), "utf8");
const drawer = readFileSync(resolve("components/admin/gtm/GtmContactDrawer.tsx"), "utf8");
const intake = readFileSync(resolve("components/admin/gtm/GtmContactIntake.tsx"), "utf8");
const workspace = readFileSync(resolve("components/admin/gtm/GtmContactsWorkspace.tsx"), "utf8");

describe("GTM relationship intelligence addendum", () => {
  it("adds only nullable contact metadata and preserves legacy contact types", () => {
    for (const column of [
      "contact_type_other text",
      "potential_roles text[]",
      "relationship_objective text",
      "relationship_priority text",
      "relationship_context text",
    ]) expect(migration).toContain(`add column if not exists ${column}`);

    for (const legacyType of ["enterprise", "multiplier", "unclassified"]) {
      expect(migration).toContain(`'${legacyType}'`);
    }
    expect(migration).not.toMatch(/add column if not exists (contact_type_other|potential_roles|relationship_objective|relationship_priority|relationship_context) text[^,;]*not null/);
  });

  it("keeps identity, roles, objective, outcome, and trigger as separate fields", () => {
    expect(migration).toContain("contact_type_other");
    expect(migration).toContain("potential_roles");
    expect(migration).toContain("relationship_objective");
    expect(migration).toContain("relationship_priority");
    expect(migration).toContain("relationship_context");
    expect(migration).not.toContain("alter table public.gtm_interactions");
    expect(migration).not.toContain("drop column");
  });

  it("versions authorized create and edit functions without weakening RLS", () => {
    expect(migration).toContain("create_gtm_contact_v3");
    expect(migration).toContain("update_gtm_contact_v2");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("public.is_internal_admin()");
    expect(migration).toContain("revoke all on function public.create_gtm_contact_v3");
    expect(migration).toContain("revoke all on function public.update_gtm_contact_v2");
    expect(actions).toContain('rpc("create_gtm_contact_v3"');
    expect(actions).toContain('rpc("update_gtm_contact_v2"');
    expect(actions).toContain("setGtmRelationshipIntelligence");
  });

  it("exposes the metadata through generated types and the canonical GTM read model", () => {
    for (const field of [
      "contact_type_other",
      "potential_roles",
      "relationship_objective",
      "relationship_priority",
      "relationship_context",
    ]) expect(types).toContain(`${field}:`);
    expect(server).toContain("potentialRoles");
    expect(server).toContain("relationshipObjective");
    expect(server).toContain("relationshipPriority");
    expect(server).toContain("relationshipContext");
  });

  it("supports create, compact drawer editing, chips, and relationship filters", () => {
    for (const field of [
      "potentialRoles",
      "relationshipObjective",
      "relationshipPriority",
      "relationshipContext",
    ]) {
      expect(intake).toContain(`name=\"${field}\"`);
      expect(drawer).toContain(`name=\"${field}\"`);
    }
    expect(drawer).toContain("Relationship Intelligence");
    expect(workspace).toContain("All potential roles");
    expect(workspace).toContain("All relationship objectives");
    expect(workspace).toContain("All relationship priorities");
  });
});

