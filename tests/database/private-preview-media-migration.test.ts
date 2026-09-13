import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/20260908213000_private_preview_media_and_stats.sql", "utf8").toLowerCase().replace(/\s+/g, " ");

it("keeps uploaded preview media private and authorized through storage RLS", () => {
  expect(sql).toContain("'preview-locker-photos', 'preview-locker-photos', false, 10485760");
  expect(sql).toContain("'preview-locker-videos', 'preview-locker-videos', false, 262144000");
  expect(sql).toContain("create policy preview_media_admin_insert on storage.objects");
  expect(sql).toContain("create policy preview_media_authorized_select on storage.objects");
  expect(sql).toContain("private.can_read_preview_media(bucket_id,name)");
  expect(sql).toContain("item->>'storagepath' = p_object_name");
  expect(sql).not.toContain("create policy preview_media_public");
});

it("adds bounded explicit career statistics without a canonical athlete table", () => {
  expect(sql).toContain("add column career_stats jsonb not null default '[]'::jsonb");
  expect(sql).toContain("private.preview_stats_valid(career_stats)");
  expect(sql).not.toContain("create table public.athletes");
});
