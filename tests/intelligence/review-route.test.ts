// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authorize: vi.fn(), status: "candidate" as string, evidence: [] as Array<{ id: string; structured_data: Record<string, unknown> }>, updates: [] as Array<{ table: string; values: Record<string, unknown>; filters: Array<[string, unknown]> }>, audit: [] as unknown[] }));
vi.mock("@/lib/intelligence/lab-server", () => ({
  authorizeIntelligenceLab: mocks.authorize,
  IntelligenceAccessError: class extends Error { status = 403; },
}));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({ from(table: string) {
  const filters: Array<[string, unknown]> = [];
  let values: Record<string, unknown> | null = null;
  const query = {
    select() { return query; },
    eq(key: string, value: unknown) { filters.push([key, value]); return query; },
    update(next: Record<string, unknown>) { values = next; return query; },
    insert(row: unknown) { mocks.audit.push(row); return Promise.resolve({ error: null }); },
    maybeSingle() { return Promise.resolve({ data: { id: MOMENT, status: mocks.status }, error: null }); },
    then(resolve: (value: { data: unknown; error: null }) => unknown) {
      if (values) mocks.updates.push({ table, values, filters });
      const data = values ? [{ id: MOMENT }] : table === "intelligence_evidence" ? mocks.evidence : [];
      return Promise.resolve({ data, error: null }).then(resolve);
    },
  };
  return query;
} }) }));
import { POST } from "@/app/api/admin/intelligence/review/route";

const MOMENT = "00000000-0000-4000-8000-000000000031";
const request = (decision: string, origin = "http://lab.test") => new Request("http://lab.test/api/admin/intelligence/review", {
  method: "POST", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify({ momentId: MOMENT, decision }) });

beforeEach(() => {
  mocks.authorize.mockResolvedValue("admin-1");
  mocks.status = "candidate";
  mocks.evidence = [{ id: "e1", structured_data: { kind: "debut" } }];
  mocks.updates = []; mocks.audit = [];
});

describe("Moment review endpoint", () => {
  it("approves a candidate and stamps the evidence", async () => {
    const response = await POST(request("verified"));
    expect(await response.json()).toEqual({ state: "verified" });
    const evidence = mocks.updates.find(row => row.table === "intelligence_evidence")!;
    expect(evidence.values).toMatchObject({ status: "verified", structured_data: { kind: "debut", _review: { reviewerId: "admin-1" } } });
    expect(evidence.filters).toContainEqual(["status", "candidate"]);
    expect(mocks.updates.map(row => row.table)).toEqual(["intelligence_evidence", "moment_athletes", "moments"]);
  });

  it("removes an approved Moment as a status change and keeps the earlier review", async () => {
    mocks.status = "verified";
    mocks.evidence = [{ id: "e1", structured_data: { kind: "debut", _review: { reason: "approved" } } }];
    const response = await POST(request("rejected"));
    expect(await response.json()).toEqual({ state: "removed" });
    const evidence = mocks.updates.find(row => row.table === "intelligence_evidence")!;
    expect(evidence.values.structured_data).toMatchObject({ _review: { reason: expect.stringContaining("Removed") }, _reviewHistory: [{ reason: "approved" }] });
    expect(mocks.updates.every(row => row.filters.some(([key, value]) => key === "status" && value === "verified"))).toBe(true);
    expect(mocks.audit[0]).toMatchObject({ action: "intelligence.moment_remove", new_values: { from: "verified", decision: "rejected" } });
  });

  it.each([["verified", "verified"], ["rejected", "verified"], ["rejected", "rejected"]])("refuses %s → %s", async (from, decision) => {
    mocks.status = from;
    const response = await POST(request(decision));
    expect(response.status).toBe(409);
    expect(mocks.updates).toEqual([]);
  });

  it("refuses cross-origin requests and unauthorized callers before any write", async () => {
    expect((await POST(request("verified", "https://evil.test"))).status).toBe(403);
    mocks.authorize.mockRejectedValue(new Error("no"));
    expect((await POST(request("verified"))).status).toBe(403);
    expect(mocks.updates).toEqual([]);
  });
});
