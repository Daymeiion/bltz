// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { GET, POST } from "@/app/api/admin/intelligence/workflows/route";
import { NextRequest } from "next/server";

const deps = vi.hoisted(() => ({ createClient: vi.fn(), createServiceClient: vi.fn(), getUser: vi.fn(), permission: vi.fn(), persistence: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: deps.createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: deps.createServiceClient }));
const actor = "00000000-0000-4000-8000-000000000001";
const player = "00000000-0000-4000-8000-000000000002";
const evidence = "00000000-0000-4000-8000-000000000003";
function input() {
  return { action: "register_opportunity", commandId: randomUUID(), reason: "Reviewed evidence", opportunityKey: "anniversary:example",
    playerId: player, momentId: null, runId: null, ruleVersion: "v1", signalKeys: ["anniversary:example"], evidenceIds: [evidence],
    title: "Review anniversary", explanation: "Source-backed review", inputSnapshot: { evidenceIds: [evidence] } };
}
function request(body: unknown, extra: HeadersInit = {}) {
  return new NextRequest("http://localhost/api/admin/intelligence/workflows", {
    method: "POST", headers: { "content-type": "application/json", origin: "http://localhost", ...extra }, body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("BLTZ_INTELLIGENCE_WORKFLOWS_ENABLED", "true");
  vi.stubEnv("BLTZ_INTELLIGENCE_WORKFLOWS_ENVIRONMENT", "development");
  vi.stubEnv("BLTZ_INTELLIGENCE_WORKFLOWS_PRODUCTION_ENABLED", "false");
  vi.stubEnv("VERCEL_ENV", "preview");
  deps.getUser.mockResolvedValue({ data: { user: { id: actor } }, error: null });
  deps.permission.mockResolvedValue({ data: true, error: null });
  deps.createClient.mockResolvedValue({ auth: { getUser: deps.getUser }, rpc: deps.permission });
  deps.persistence.mockResolvedValue({ data: { record: { id: player, revision: 1, state: "candidate", input_snapshot: { private: "do not expose" }, request_hash: "private" }, duplicate: false }, error: null });
  deps.createServiceClient.mockReturnValue({ rpc: deps.persistence });
});
afterEach(() => { vi.unstubAllEnvs(); });

describe("internal development workflow API authorization", () => {
  it("keeps production disabled without its own opt-in and never accepts browser scope selection", async () => {
    vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("BLTZ_INTELLIGENCE_WORKFLOWS_ENVIRONMENT", "production");
    expect((await POST(request(input()))).status).toBe(503);
    expect(deps.createServiceClient).not.toHaveBeenCalled();
    vi.stubEnv("BLTZ_INTELLIGENCE_WORKFLOWS_PRODUCTION_ENABLED", "true");
    expect((await POST(request({ ...input(), environment: "development" }))).status).toBe(400);
    expect(deps.createServiceClient).not.toHaveBeenCalled();
  });
  it("uses trusted admin authorization and explicit production RPC arguments when all server gates permit", async () => {
    vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("BLTZ_INTELLIGENCE_WORKFLOWS_ENVIRONMENT", "production"); vi.stubEnv("BLTZ_INTELLIGENCE_WORKFLOWS_PRODUCTION_ENABLED", "true");
    deps.persistence.mockResolvedValue({ data: { record: { id: player, revision: 1, state: "candidate", environment: "production" }, duplicate: false }, error: null });
    expect((await POST(request(input()))).status).toBe(200);
    expect(deps.persistence).toHaveBeenCalledWith("mutate_intelligence_workflow_in_environment", expect.objectContaining({ p_actor_id: actor, p_environment: "production" }));
    deps.persistence.mockResolvedValue({ data: { opportunities: [], activations: [], momentAssetLinks: [], history: [] }, error: null });
    const response = await GET(new Request(`http://localhost/api/admin/intelligence/workflows?playerId=${player}`));
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ environment: "production", measurementState: "unavailable", publishingState: "blocked_adapter_unavailable" });
    expect(deps.persistence).toHaveBeenLastCalledWith("read_intelligence_workflows_in_environment", { p_player_id: player, p_environment: "production" });
    deps.permission.mockResolvedValue({ data: false, error: null }); deps.createServiceClient.mockClear();
    expect((await POST(request(input()))).status).toBe(403);
    expect(deps.createServiceClient).not.toHaveBeenCalled();
  });
  it("withholds mismatched and unscoped production mutation acknowledgments and history", async () => {
    vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("BLTZ_INTELLIGENCE_WORKFLOWS_ENVIRONMENT", "production"); vi.stubEnv("BLTZ_INTELLIGENCE_WORKFLOWS_PRODUCTION_ENABLED", "true");
    for (const environment of [undefined, "development"]) {
      deps.persistence.mockResolvedValue({ data: { record: { id: player, revision: 1, state: "candidate", environment }, duplicate: false }, error: null });
      expect((await POST(request(input()))).status).toBe(503);
      deps.persistence.mockResolvedValue({ data: { opportunities: [], activations: [], momentAssetLinks: [], history: [{ id: evidence, environment, opportunity_id: player, activation_id: null, moment_asset_link_id: null, actor_id: actor, action: "register_opportunity", reason: "Reviewed evidence", revision: 1, created_at: "2026-10-05T12:00:00Z" }] }, error: null });
      expect((await GET(new Request(`http://localhost/api/admin/intelligence/workflows?playerId=${player}`))).status).toBe(503);
    }
  });
  it("requires authentication before constructing a service client", async () => {
    deps.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await POST(request(input()))).status).toBe(401);
    expect(deps.createServiceClient).not.toHaveBeenCalled();
  });
  it("rejects unauthorized viewers before service access", async () => {
    deps.permission.mockResolvedValue({ data: false, error: null });
    expect((await GET(new Request(`http://localhost/api/admin/intelligence/workflows?playerId=${player}`))).status).toBe(403);
    expect(deps.createServiceClient).not.toHaveBeenCalled();
  });
  it("fails closed when the shared permission lookup is unavailable", async () => {
    deps.permission.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    expect((await POST(request(input()))).status).toBe(503);
    expect(deps.createServiceClient).not.toHaveBeenCalled();
  });
  it("blocks production and disabled development flags without service reads/writes", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect((await POST(request(input()))).status).toBe(503);
    vi.stubEnv("VERCEL_ENV", "preview"); vi.stubEnv("BLTZ_INTELLIGENCE_WORKFLOWS_ENABLED", "false");
    expect((await POST(request(input()))).status).toBe(503);
    expect(deps.createServiceClient).not.toHaveBeenCalled();
  });
  it("derives the mutation actor from the authenticated session", async () => {
    const response = await POST(request(input()));
    expect(response.status).toBe(200);
    expect(deps.persistence).toHaveBeenCalledWith("mutate_intelligence_workflow", expect.objectContaining({ p_actor_id: actor }));
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({ record: { id: player, revision: 1, state: "candidate" }, duplicate: false });
  });
  it("rejects browser-supplied actors, synthetic metrics and partnership claims", async () => {
    expect((await POST(request({ ...input(), actorId: "attacker" }))).status).toBe(400);
    expect((await POST(request({ action: "create_activation", commandId: randomUUID(), reason: "Draft", opportunityId: player,
      title: "Draft", description: "Review", intendedUse: "internal_review", metrics: { reach: 9000 } }))).status).toBe(400);
    expect((await POST(request({ action: "create_activation", commandId: randomUUID(), reason: "Draft", opportunityId: player,
      title: "Draft", description: "Review", intendedUse: "internal_review", proposedBrands: [{ name: "Brand", status: "confirmed" }] }))).status).toBe(400);
    expect(deps.createServiceClient).not.toHaveBeenCalled();
  });
  it("rejects cross-site mutations before persistence", async () => {
    expect((await POST(request(input(), { origin: "https://untrusted.example" }))).status).toBe(403);
    expect(deps.createServiceClient).not.toHaveBeenCalled();
  });

  it("bounds declared and streamed bodies before JSON parsing or service access", async () => {
    expect((await POST(request(input(), { "content-length": "65537" }))).status).toBe(413);
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(" ".repeat(65536)));
        controller.enqueue(new TextEncoder().encode("x"));
      },
      cancel() { cancelled = true; },
    });
    const streamedRequest = new Request("http://localhost/api/admin/intelligence/workflows", {
      method: "POST", headers: { origin: "http://localhost", "content-type": "application/json", "content-length": "1" }, body: stream, duplex: "half",
    } as RequestInit & { duplex: string });
    expect((await POST(streamedRequest)).status).toBe(413);
    expect(cancelled).toBe(true);
    expect(deps.createServiceClient).not.toHaveBeenCalled();
  });
  it("returns a reviewable conflict for stale revisions without exposing raw DB diagnostics", async () => {
    deps.persistence.mockResolvedValue({ data: null, error: { message: "revision_conflict in private database context", code: "40001" } });
    const response = await POST(request({ action: "review_opportunity", commandId: randomUUID(), reason: "Review", id: player, expectedRevision: 1, state: "accepted" }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "revision_conflict" });
  });
  it("keeps empty workflow reads honest and refuses malformed persisted DTOs", async () => {
    deps.persistence.mockResolvedValue({ data: { opportunities: [], activations: [], momentAssetLinks: [], history: [] }, error: null });
    const response = await GET(new Request(`http://localhost/api/admin/intelligence/workflows?playerId=${player}`));
    expect(await response.json()).toMatchObject({ opportunities: [], activations: [], measurementState: "unavailable", publishingState: "blocked_adapter_unavailable", truncated: false });
    deps.persistence.mockResolvedValue({ data: { opportunities: [], activations: [{ metrics: { reach: 9999 } }], momentAssetLinks: [], history: [] }, error: null });
    expect((await GET(new Request(`http://localhost/api/admin/intelligence/workflows?playerId=${player}`))).status).toBe(503);
  });
});
