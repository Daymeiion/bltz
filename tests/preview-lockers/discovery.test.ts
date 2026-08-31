// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ execute: vi.fn(), auth: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/pipeline/run", () => ({ executePipeline: mocks.execute }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.auth }, rpc: mocks.rpc }) }));
import { POST } from "@/app/api/preview-lockers/discovery/route";
import { readDiscovery } from "@/lib/preview-lockers/stream-client";
const req = (signal?: AbortSignal) => new Request("http://localhost/api/preview-lockers/discovery", { method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify({ full_name: "Synthetic Preview" }), signal });
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({ data: { user: { id: "admin" } }, error: null }); mocks.rpc.mockImplementation(async name => ({ data: name === "is_internal_admin" ? true : "request-id", error: null })); });
afterEach(() => vi.useRealTimers());
describe("request-owned preview discovery", () => {
  it("denies unauthenticated access before admission/provider calls", async () => {
    mocks.auth.mockResolvedValue({ data: { user: null } }); expect((await POST(req())).status).toBe(401); expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("denies non-admin and rate-limited access", async () => {
    mocks.rpc.mockResolvedValue({ data: false }); expect((await POST(req())).status).toBe(403);
    mocks.rpc.mockImplementation(async name => ({ data: name === "is_internal_admin" ? true : null })); expect((await POST(req())).status).toBe(429); expect(mocks.execute).not.toHaveBeenCalled();
  });
  it.each(["throw", "manual", "complete", "event-limit"])("completes exactly once for %s", async scenario => {
    mocks.execute.mockImplementation(async sink => {
      if (scenario === "throw") throw new Error("provider secret");
      if (scenario === "event-limit") { for (let i = 0; i < 41; i++) sink.emit({ phase: "scrape_hit", message: "provider secret" }); return; }
      sink.setStatus(scenario);
    });
    const response = await POST(req()); const body = await response.text();
    expect(body.match(/event: done/g)).toHaveLength(1); expect(body).not.toContain("provider secret"); expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("times out once, stops later sink work and clears timer", async () => {
    vi.useFakeTimers(); let sink!: { emit: (event: { phase: string }) => void }; let resolve!: () => void;
    mocks.execute.mockImplementation(async value => { sink = value; await new Promise<void>(r => { resolve = r; }); });
    const response = await POST(req()); const body = response.text(); await vi.advanceTimersByTimeAsync(90_000);
    expect((await body).match(/event: done/g)).toHaveLength(1); expect(() => sink.emit({ phase: "scrape_hit" })).toThrow("cancelled"); resolve(); await vi.runAllTimersAsync(); expect(vi.getTimerCount()).toBe(0);
  });
  it("request abort closes output and rejects later work", async () => {
    vi.useFakeTimers(); let sink!: { setStatus: (status: string) => void }; let resolve!: () => void; const abort = new AbortController();
    mocks.execute.mockImplementation(async value => { sink = value; await new Promise<void>(r => { resolve = r; }); });
    const response = await POST(req(abort.signal)); const body = response.text(); abort.abort(); expect(await body).toBe(""); expect(() => sink.setStatus("generating")).toThrow("cancelled"); resolve(); await vi.runAllTimersAsync(); expect(vi.getTimerCount()).toBe(0);
  });
  it("reader cancellation clears timer without enqueue/close errors", async () => {
    vi.useFakeTimers(); let sink!: { emit: (event: { phase: string }) => void }; let resolve!: () => void;
    mocks.execute.mockImplementation(async value => { sink = value; await new Promise<void>(r => { resolve = r; }); });
    const response = await POST(req()); const cancel = response.body!.cancel(); expect(() => sink.emit({ phase: "scrape_hit" })).toThrow(); resolve(); await cancel; await vi.runAllTimersAsync(); expect(vi.getTimerCount()).toBe(0);
  });
  it("client reports disconnect and accepts only validated drafts", async () => {
    await expect(readDiscovery(new Response("event: event\ndata: {}\n\n"), vi.fn())).rejects.toThrow("disconnected");
    const result = await readDiscovery(new Response('event: done\ndata: {"status":"manual","draft":{"raw_sources":"secret"}}\n\n'), vi.fn()); expect(result.draft).toBeUndefined();
  });
});
