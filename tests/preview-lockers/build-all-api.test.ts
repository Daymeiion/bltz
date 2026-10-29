// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn(), enrich: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mock.auth }, rpc: mock.rpc, from: mock.from }) }));
vi.mock("@/lib/preview-lockers/enrichment", () => ({ tryEnrichSavedPreview: mock.enrich }));
import { PATCH } from "@/app/api/preview-lockers/[id]/route";
import { previewContent } from "@/lib/preview-lockers/validation";

const id = "00000000-0000-4000-8000-000000000001";
const content = previewContent.parse({ slug: "fixture-athlete", full_name: "Fixture Athlete" });
const request = (body: unknown) => new Request(`http://localhost/api/preview-lockers/${id}`, { method: "PATCH", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify(body) });
const params = { params: Promise.resolve({ id }) };
beforeEach(() => {
  vi.resetAllMocks();
  mock.auth.mockResolvedValue({ data: { user: { id: "admin" } } }); mock.rpc.mockResolvedValue({ data: true });
  for (const key of ["from", "update", "eq", "select"] as const) mock[key].mockReturnValue(mock);
  mock.maybeSingle.mockResolvedValue({ data: { id, ...content, revision: 5, created_at: "", updated_at: "" } });
  mock.enrich.mockResolvedValue({ status: "complete", errors: [] });
});

it("searches news in the same save only when asked, and returns that enrichment", async () => {
  const plain = await PATCH(request({ revision: 4, content }), params);
  expect(plain.status).toBe(200);
  expect(mock.enrich.mock.calls[0][4]).toBe(false);
  expect(await plain.json()).not.toHaveProperty("enrichment");
  const built = await PATCH(request({ revision: 4, content, refreshNews: true }), params);
  expect(built.status).toBe(200);
  expect(mock.enrich.mock.calls[1][4]).toBe(true);
  expect(await built.json()).toMatchObject({ revision: 5, enrichment: { status: "complete" } });
});

it("rejects any other refreshNews value", async () => {
  expect((await PATCH(request({ revision: 4, content, refreshNews: false }), params)).status).toBe(400);
  expect(mock.enrich).not.toHaveBeenCalled();
});
