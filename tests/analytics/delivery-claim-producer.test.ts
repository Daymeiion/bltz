import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ createService: vi.fn(), record: vi.fn(), createSession: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: mocks.createService }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createSession }));
vi.mock("@/lib/analytics/server", () => ({ recordTrustedAnalyticsEvent: mocks.record, analyticsEventIdFromParts: () => "00000000-0000-4000-8000-000000000001" }));
import { recordImmutableClaimAnalyticsEvent } from "@/lib/analytics/claim-events";
import { POST as claim } from "@/app/api/onboarding/claim/route";

const playerId = "10000000-0000-4000-8000-000000000001";
const userId = "20000000-0000-4000-8000-000000000001";
const originalSession = "30000000-0000-4000-8000-000000000001";
const retrySession = "30000000-0000-4000-8000-000000000002";
const event = { eventName: "claim_completed" as const, clientEventId: "00000000-0000-4000-8000-000000000001", source: "onboarding" as const,
  page: "/onboarding/claim/[token]", userId, athleteId: playerId, sessionId: retrySession, properties: { entry_point: "claim_recap" } };
const stored = { id: "40000000-0000-4000-8000-000000000001", event_name: "claim_completed", user_id: userId, athlete_id: playerId,
  session_id: originalSession, source: "onboarding", page: event.page, occurred_at: "2026-10-04T11:00:00Z", properties: { reused: false } };
function database(results: unknown[]) {
  const read = vi.fn(); for (const data of results) read.mockResolvedValueOnce({ data, error: null });
  const builder = { select: vi.fn(), eq: vi.fn(), abortSignal: vi.fn(), maybeSingle: read };
  builder.select.mockReturnValue(builder); builder.eq.mockReturnValue(builder); builder.abortSignal.mockReturnValue(builder);
  mocks.createService.mockReturnValue({ from: vi.fn(() => builder) }); return read;
}
beforeEach(() => { vi.clearAllMocks(); mocks.record.mockResolvedValue({ eventId: stored.id, duplicate: true }); });

describe("immutable server claim analytics producer", () => {
  it("preserves the original occurrence, session and properties across repeated requests", async () => {
    database([stored]);
    expect(await recordImmutableClaimAnalyticsEvent(event)).toEqual({ eventId: stored.id, duplicate: true });
    expect(mocks.record).toHaveBeenCalledWith({ ...event, occurredAt: stored.occurred_at, sessionId: originalSession, properties: stored.properties });
  });
  it("uses the existing writer for the first occurrence", async () => {
    const read = database([null]); mocks.record.mockResolvedValueOnce({ eventId: stored.id, duplicate: false });
    expect(await recordImmutableClaimAnalyticsEvent(event)).toMatchObject({ duplicate: false });
    expect(read).toHaveBeenCalledTimes(1); expect(mocks.record).toHaveBeenCalledWith(event);
  });
  it("re-reads at most once after a concurrent first writer and never invents a second occurrence", async () => {
    const read = database([null, stored]); mocks.record.mockRejectedValueOnce(new Error("first writer race"));
    expect(await recordImmutableClaimAnalyticsEvent(event)).toMatchObject({ duplicate: true });
    expect(read).toHaveBeenCalledTimes(2); expect(mocks.record).toHaveBeenNthCalledWith(2, { ...event, occurredAt: stored.occurred_at, sessionId: originalSession, properties: stored.properties });
  });
  it("rejects an ID reused for another actor or canonical athlete before persistence", async () => {
    for (const change of [{ user_id: playerId }, { athlete_id: userId }, { event_name: "claim_link_validated" }]) {
      database([{ ...stored, ...change }]); await expect(recordImmutableClaimAnalyticsEvent(event)).rejects.toThrow("identity_collision");
    }
    expect(mocks.record).not.toHaveBeenCalled();
  });
  it("fails closed on persistence failure without an unbounded retry loop", async () => {
    const read = database([null, null]); mocks.record.mockRejectedValueOnce(new Error("durable journal unavailable"));
    await expect(recordImmutableClaimAnalyticsEvent(event)).rejects.toThrow("journal unavailable");
    expect(read).toHaveBeenCalledTimes(2); expect(mocks.record).toHaveBeenCalledTimes(1);
  });
  it("never constructs a privileged analytics client before claim-route authentication", async () => {
    mocks.createSession.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) } });
    expect((await claim(new Request("https://example.com/api/onboarding/claim", { method: "POST", body: JSON.stringify({ token: "synthetic-claim-token" }) }))).status).toBe(401);
    expect(mocks.createService).not.toHaveBeenCalled(); expect(mocks.record).not.toHaveBeenCalled();
  });
});
