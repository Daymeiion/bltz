// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { previewContent } from "@/lib/preview-lockers/validation";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), client: vi.fn(), service: vi.fn(), readEnrichment: vi.fn(),
  privateRow: vi.fn(), publicRow: vi.fn(), publication: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: mocks.service }));
vi.mock("@/lib/preview-lockers/enrichment", async original => ({
  ...await original<typeof import("@/lib/preview-lockers/enrichment")>(),
  readPreviewEnrichment: mocks.readEnrichment,
}));
vi.mock("@/lib/preview-lockers/school-branding", () => ({
  enrichPreviewSchoolBranding: async (_client: unknown, row: Record<string, unknown>) => ({ ...row, school: "Display school alias" }),
}));
import { readPrivatePreview } from "@/lib/preview-lockers/server";
import { previewIdentityKey } from "@/lib/preview-lockers/enrichment";

const content = previewContent.parse({
  slug: "fixture-player", full_name: "Fixture Player", school: "Original school",
  awards: [{ label: "Team honor", year: "2001" }],
});
const row = { ...content, id: "00000000-0000-4000-8000-000000000001", revision: 3, created_at: "", updated_at: "" };
function query(maybeSingle: ReturnType<typeof vi.fn>) {
  const value = { select: vi.fn(), eq: vi.fn(), maybeSingle };
  value.select.mockReturnValue(value); value.eq.mockReturnValue(value);
  return value;
}
const privateClient = { auth: { getUser: mocks.auth }, from: () => query(mocks.privateRow) };
const publicClient = { from: (table: string) => query(table === "preview_locker_short_links" ? mocks.publication : mocks.publicRow) };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.client.mockResolvedValue(privateClient); mocks.service.mockReturnValue(publicClient);
  mocks.auth.mockResolvedValue({ data: { user: { id: "viewer" } }, error: null });
  mocks.privateRow.mockResolvedValue({ data: row, error: null });
  mocks.publicRow.mockResolvedValue({ data: row, error: null });
  mocks.publication.mockResolvedValue({ data: { public_access_enabled: false }, error: null });
  mocks.readEnrichment.mockResolvedValue({ awards: [{ ...content.awards[0], evidenceStatus: "unverified" }], articles: [] });
});

it("reads supplemental data with the authorized RLS client and original saved identity", async () => {
  const result = await readPrivatePreview(row.slug);
  expect(result).toMatchObject({ publicLink: false, school: "Display school alias", enrichment_identity_key: previewIdentityKey(row) });
  expect(mocks.readEnrichment).toHaveBeenCalledWith(privateClient, row.id, expect.objectContaining(row), row.revision, previewIdentityKey(row));
  expect(mocks.service).not.toHaveBeenCalled();
});

it("reads enabled published-preview enrichment only after the existing link gate", async () => {
  mocks.auth.mockResolvedValue({ data: { user: null }, error: null });
  mocks.publication.mockResolvedValue({ data: { public_access_enabled: true }, error: null });
  expect(await readPrivatePreview(row.slug)).toMatchObject({ publicLink: true, enrichment: { articles: [] } });
  expect(mocks.publication.mock.invocationCallOrder[0]).toBeLessThan(mocks.readEnrichment.mock.invocationCallOrder[0]);
  expect(mocks.readEnrichment).toHaveBeenCalledWith(publicClient, row.id, expect.objectContaining(row), row.revision, previewIdentityKey(row));
});

it("does not read enrichment for an unassigned viewer or revoked published-preview link", async () => {
  mocks.privateRow.mockResolvedValue({ data: null, error: null });
  expect(await readPrivatePreview(row.slug)).toBeNull();
  expect(mocks.readEnrichment).not.toHaveBeenCalled();
});

it("rejects malformed preview slugs before client or enrichment access", async () => {
  expect(await readPrivatePreview("../another-preview")).toBeNull();
  expect(mocks.client).not.toHaveBeenCalled(); expect(mocks.service).not.toHaveBeenCalled();
  expect(mocks.readEnrichment).not.toHaveBeenCalled();
});

it("keeps authorized base content when optional enrichment transport is unavailable", async () => {
  mocks.readEnrichment.mockRejectedValue(new Error("private database diagnostic"));
  expect(await readPrivatePreview(row.slug)).toMatchObject({ publicLink: false, enrichment: { awards: content.awards, articles: [] } });
});
