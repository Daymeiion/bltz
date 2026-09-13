// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.auth }, rpc: mocks.rpc, from: mocks.from }) }));
import { previewAccess, readPrivatePreview } from "@/lib/preview-lockers/server";
import { previewContent } from "@/lib/preview-lockers/validation";

const row = { ...previewContent.parse({ slug: "assigned-preview", full_name: "Assigned Preview" }), id: "00000000-0000-4000-8000-000000000001", revision: 1, created_at: "", updated_at: "" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ data: { user: { id: "assigned-viewer" } }, error: null });
  for (const key of ["from", "select", "eq"] as const) mocks[key].mockReturnValue(mocks);
});

it("lets RLS decide an authenticated assigned viewer read without an admin gate", async () => {
  mocks.maybeSingle.mockResolvedValue({ data: row, error: null });
  await expect(readPrivatePreview("assigned-preview")).resolves.toMatchObject({ id: row.id, slug: row.slug });
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(mocks.select).toHaveBeenCalled();
});

it("returns no preview for anonymous or RLS-denied viewers", async () => {
  mocks.auth.mockResolvedValueOnce({ data: { user: null }, error: null });
  await expect(readPrivatePreview("assigned-preview")).resolves.toBeNull();
  expect(mocks.from).not.toHaveBeenCalled();
  mocks.auth.mockResolvedValue({ data: { user: { id: "other" } }, error: null });
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  await expect(readPrivatePreview("assigned-preview")).resolves.toBeNull();
});

it("reveals admin navigation state without granting it to an assigned viewer", async () => {
  mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
  await expect(previewAccess()).resolves.toMatchObject({ isAdmin: false });
  mocks.rpc.mockResolvedValueOnce({ data: true, error: null });
  await expect(previewAccess()).resolves.toMatchObject({ isAdmin: true });
});
