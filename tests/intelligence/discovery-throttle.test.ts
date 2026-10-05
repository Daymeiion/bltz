// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { ledgerPacing, redactProviderText, retryAfterMs } from "@/scripts/intelligence-sportradar-throttle.mjs";

describe("Sportradar rate diagnostics", () => {
  it("handles seconds, HTTP dates and malformed Retry-After safely", () => {
    const now = Date.parse("2026-10-01T00:00:00Z");
    expect(retryAfterMs("2.5", now)).toBe(2500);
    expect(retryAfterMs("Thu, 01 Oct 2026 00:00:05 GMT", now)).toBe(5000);
    expect(retryAfterMs("Thu, 01 Oct 2026 00:00:00 GMT", now)).toBe(0);
    expect(retryAfterMs("invalid", now)).toBeNull(); expect(retryAfterMs(null, now)).toBeNull();
  });
  it("redacts URLs, header tokens and known credentials from error bodies", () => {
    expect(redactProviderText('https://host.test?api_key=secret Authorization: Bearer another api_key=known-key', "known-key"))
      .not.toMatch(/host\.test|another|known-key/);
  });
  it("reads latest provider-wide request and429 independently; recent traffic includes other players", async () => {
    const now = Date.parse("2026-10-01T00:00:00Z");
    const answers = [
      { data: { requested_at: "2026-09-30T23:59:59.000Z" }, error: null },
      { data: { requested_at: "2026-09-30T23:30:00.000Z" }, error: null },
    ];
    const chain = () => { const q = { select: vi.fn(() => q), eq: vi.fn(() => q), order: vi.fn(() => q), limit: vi.fn(() => q), maybeSingle: vi.fn(async () => answers.shift()) }; return q; };
    const db = { from: vi.fn(chain) };
    expect(await ledgerPacing(db, now)).toEqual({ waitMs: 1500, cooldownUntil: "2026-10-01T00:30:00.000Z" });
    expect(db.from).toHaveBeenCalledTimes(2);
  });
  it("fails closed when the shared ledger cannot be read", async () => {
    const q = { select: () => q, eq: () => q, order: () => q, limit: () => q, maybeSingle: async () => ({ error: { code: "unavailable" } }) };
    await expect(ledgerPacing({ from: () => q })).rejects.toThrow("request_ledger_unavailable");
  });
});
