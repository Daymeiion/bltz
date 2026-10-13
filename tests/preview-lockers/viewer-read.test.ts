// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() }));
const publicDb = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.auth }, rpc: mocks.rpc, from: mocks.from }) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => publicDb }));
import { previewAccess, readPrivatePreview } from "@/lib/preview-lockers/server";
import { previewContent } from "@/lib/preview-lockers/validation";

const row = { ...previewContent.parse({ slug: "assigned-preview", full_name: "Assigned Preview" }), id: "00000000-0000-4000-8000-000000000001", revision: 1, created_at: "", updated_at: "" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ data: { user: { id: "assigned-viewer" } }, error: null });
  mocks.rpc.mockResolvedValue({ data: false, error: null });
  publicDb.rpc.mockResolvedValue({ data: { state: "unavailable", remaining_seconds: 0 }, error: null });
  for (const key of ["from", "select", "eq"] as const) mocks[key].mockReturnValue(mocks);
  publicDb.from.mockImplementation((table: string) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({
    data: table === "preview_lockers" ? row : { public_access_enabled: false }, error: null,
  }) }) }) }));
});

it("lets RLS decide an authenticated assigned viewer read without an admin gate", async () => {
  mocks.maybeSingle.mockResolvedValue({ data: row, error: null });
  await expect(readPrivatePreview("assigned-preview")).resolves.toMatchObject({ id: row.id, slug: row.slug });
  expect(mocks.rpc).toHaveBeenCalledWith("is_internal_admin");
  expect(mocks.select).toHaveBeenCalled();
});

it("returns no preview for anonymous or RLS-denied viewers when link access is disabled", async () => {
  mocks.auth.mockResolvedValueOnce({ data: { user: null }, error: null });
  await expect(readPrivatePreview("assigned-preview")).resolves.toBeNull();
  expect(mocks.from).not.toHaveBeenCalled();
  expect(publicDb.from).toHaveBeenCalledWith("preview_lockers");
  mocks.auth.mockResolvedValue({ data: { user: { id: "other" } }, error: null });
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  await expect(readPrivatePreview("assigned-preview")).resolves.toBeNull();
});

it("allows an anonymous reader only when that preview's link access is enabled", async () => {
  mocks.auth.mockResolvedValue({ data: { user: null }, error: null });
  publicDb.rpc.mockResolvedValue({ data: { state: "active", remaining_seconds: 500 }, error: null });
  publicDb.from.mockImplementation((table: string) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({
    data: table === "preview_lockers" ? row : { public_access_enabled: true }, error: null,
  }) }) }) }));
  await expect(readPrivatePreview("assigned-preview")).resolves.toMatchObject({ id: row.id });
  expect(publicDb.rpc).toHaveBeenCalledWith("preview_public_link_status", { p_preview: row.id });
});

it.each(["pending", "expired"])("does not serialize content or sign media for %s public windows", async (state) => {
  publicDb.rpc.mockResolvedValue({ data: { state, remaining_seconds: 0 }, error: null });
  await expect(readPrivatePreview("assigned-preview")).resolves.toBeNull();
  expect(mocks.select).not.toHaveBeenCalled();
  expect(publicDb.from).toHaveBeenCalledTimes(1);
});

it("reveals admin navigation state without granting it to an assigned viewer", async () => {
  mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
  await expect(previewAccess()).resolves.toMatchObject({ isAdmin: false });
  mocks.rpc.mockResolvedValueOnce({ data: true, error: null });
  await expect(previewAccess()).resolves.toMatchObject({ isAdmin: true });
});
