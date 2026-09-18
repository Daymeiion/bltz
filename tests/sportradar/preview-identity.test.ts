import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolvePreviewAthlete } from "@/lib/sportradar/preview-identity";

function database(results: { data: unknown; error?: unknown }[]) {
  const filters: unknown[] = [];
  const from = vi.fn((table: string) => {
    const result = results.shift();
    const query = {
      select: () => query, limit: () => query, ilike: () => query,
      eq: (key: string, value: unknown) => { filters.push([table, key, value]); return query; },
      maybeSingle: () => Promise.resolve(result),
      single: () => Promise.resolve(result),
      then: (resolve: (value: unknown) => void) => Promise.resolve(result).then(resolve),
    };
    return query;
  });
  return { db: { from } as unknown as SupabaseClient, from, filters };
}
it("uses the saved canonical identity without searching names or master records", async () => {
  const { db, from, filters } = database([{ data: { player_id: "athlete" } }, { data: { id: "athlete" } }, { data: [{ league: "nfl", provider_player_id: "provider" }] }]);
  expect(await resolvePreviewAthlete(db, "preview")).toMatchObject({ linked: true, player: { id: "athlete" }, mappings: [{ provider_player_id: "provider" }] });
  expect(from.mock.calls.map(call => call[0])).not.toContain("gtm_player_preview_lockers");
  expect(filters).toContainEqual(["players", "id", "athlete"]);
});
it("resolves the master preview through GSIS instead of matching names", async () => {
  const { db, filters } = database([{ data: { player_id: null } }, { data: { gsis_id: "GSIS" } }, { data: [{ id: "athlete" }] }, { data: { id: "athlete" } }, { data: [] }]);
  expect(await resolvePreviewAthlete(db, "preview")).toMatchObject({ player: { id: "athlete" }, linked: true });
  expect(filters).toContainEqual(["players", "gsis_id", "GSIS"]);
});
it.each([{ matches: [{ id: "one" }, { id: "two" }] }])("does not guess or create an identity for ambiguous canonical matches", async ({ matches }) => {
  const { db } = database([{ data: { player_id: null } }, { data: { gsis_id: "GSIS" } }, { data: matches }]);
  expect(await resolvePreviewAthlete(db, "preview")).toMatchObject({ player: null, linked: true, message: expect.any(String) });
});
it("offers a review of the saved master and existing candidates when canonical identity is missing", async () => {
  const master = { gsis_id: "GSIS", display_name: "Fixture Athlete" };
  const { db } = database([{ data: { player_id: null } }, { data: { gsis_id: "GSIS" } }, { data: [] }, { data: master }, { data: [{ id: "candidate" }] }]);
  expect(await resolvePreviewAthlete(db, "preview")).toMatchObject({ linked: true, player: null, master, candidates: [{ id: "candidate" }] });
});
it("allows manual selection only for an unlinked preview", async () => {
  const { db } = database([{ data: { player_id: null } }, { data: null }]);
  expect(await resolvePreviewAthlete(db, "preview")).toEqual({ player: null, linked: false, message: null });
});
it("reports database failures instead of treating them as an unlinked preview", async () => {
  const { db } = database([{ data: null, error: { code: "error" } }]);
  await expect(resolvePreviewAthlete(db, "preview")).rejects.toThrow("preview_identity_unavailable");
});
