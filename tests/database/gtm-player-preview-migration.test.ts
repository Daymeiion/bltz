import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260908182448_link_gtm_prospects_to_private_previews.sql",
  "utf8",
).toLowerCase();
const normalized = migration.replace(/\s+/g, " ");

describe("GTM Player Master private preview relationship migration", () => {
  it("keeps the relationship private, normalized, and outside canonical identity", () => {
    expect(normalized).toContain("create table public.gtm_player_preview_lockers");
    expect(normalized).toContain("references public.gtm_player_prospects(gsis_id)");
    expect(normalized).toContain("references public.preview_lockers(id)");
    expect(normalized).toContain("completed_revision is not null and completed_revision > 0 and completed_by is not null and completed_at is not null");
    expect(normalized).toContain("enable row level security");
    expect(normalized).toContain("using ((select public.is_internal_admin()))");
    expect(normalized).not.toContain("insert into public.players");
    expect(normalized).not.toContain("insert into public.player_claims");
    expect(normalized).not.toContain("insert into public.preview_locker_viewer_grants");
  });

  it("serializes create-or-open and prefills only the private preview from typed Player Master fields", () => {
    expect(normalized).toContain("from public.gtm_player_prospects prospect");
    expect(normalized).toContain("for update");
    expect(normalized).toContain("from public.nfl_players player");
    expect(normalized).toContain("master.display_name");
    expect(normalized).toContain("left(master.jersey_number::text, 10)");
    expect(normalized).toContain("master.height_in between 40 and 96");
    expect(normalized).toContain("master.weight_lbs between 60 and 450");
    expect(normalized).toContain("rtrim(left(");
    expect(normalized).toContain("coalesce(existing_link.completed_revision = preview_revision, false)");
  });

  it("binds explicit completion to revisions and distinguishes no-op from content updates", () => {
    expect(normalized).toContain("where locker.id = p_preview_locker_id for update");
    expect(normalized).toContain("where relationship.preview_locker_id = p_preview_locker_id for update");
    expect(normalized).toContain("if completed = old.revision then update public.gtm_player_preview_lockers set completed_revision = new.revision");
    expect(normalized).toContain("set completed_revision = null, completed_by = null, completed_at = null");
    expect(normalized).toContain("'preview.completed'");
    expect(normalized).toContain("'preview.completion.invalidated'");
  });
});
