import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { recordTrustedAnalyticsEvent } from "@/lib/analytics/server";

const { rpc, from, createServiceClient } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), createServiceClient: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient }));
const event = {
  eventName: "locker_viewed" as const, clientEventId: "38da024a-a024-4ec2-bd72-c040de153260",
  athleteId: "8047df5b-87da-47bd-8468-7bb4181c2743", sessionId: "132d3879-5f82-4d42-b132-e5c23a77d4ec",
  source: "public_locker" as const,
};
beforeEach(() => {
  vi.resetAllMocks();
  createServiceClient.mockReturnValue({ rpc, from });
  rpc.mockResolvedValue({ data: { event_id: event.clientEventId, duplicate: false }, error: null });
  vi.stubEnv("BLTZ_ANALYTICS_PIPELINE_ENABLED", "true");
  vi.stubEnv("BLTZ_ANALYTICS_ENVIRONMENT", "production");
  vi.stubEnv("BLTZ_ANALYTICS_PRODUCTION_ENABLED", "true");
  vi.stubEnv("VERCEL_ENV", "production");
});
afterEach(() => vi.unstubAllEnvs());
it("writes a server-derived production envelope through atomic acceptance", async () => {
  await expect(recordTrustedAnalyticsEvent(event)).resolves.toEqual({ eventId: event.clientEventId, duplicate: false });
  expect(rpc).toHaveBeenCalledWith("accept_analytics_delivery_event", expect.objectContaining({
    p_envelope: expect.objectContaining({ environment: "production", event_id: event.clientEventId }),
  }));
  expect(from).not.toHaveBeenCalled();
});
it.each([
  ["VERCEL_ENV", "preview"], ["BLTZ_ANALYTICS_PRODUCTION_ENABLED", "false"],
  ["BLTZ_ANALYTICS_ENVIRONMENT", "development"],
])("fails closed before storage when an enabled production deployment mismatches %s", async (name, value) => {
  vi.stubEnv(name, value);
  await expect(recordTrustedAnalyticsEvent(event)).rejects.toThrow("analytics_environment_not_authorized");
  expect(createServiceClient).not.toHaveBeenCalled();
});
it("preserves legacy collection with the delivery flag disabled", async () => {
  vi.stubEnv("BLTZ_ANALYTICS_PIPELINE_ENABLED", "false");
  const single = vi.fn().mockResolvedValue({ data: { id: event.clientEventId }, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  from.mockReturnValue({ insert });
  await expect(recordTrustedAnalyticsEvent(event)).resolves.toEqual({ eventId: event.clientEventId, duplicate: false });
  expect(from).toHaveBeenCalledWith("analytics_events");
  expect(rpc).not.toHaveBeenCalled();
});
