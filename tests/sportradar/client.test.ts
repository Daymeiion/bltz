import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchProfile, profileEndpoint, responseError } from "@/lib/sportradar/client";
const id = "3069db07-aa43-4503-ab11-2ae5c0002721";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("server provider boundary", () => {
  it("blocks NCAA calls before authentication or network access", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(fetchProfile(profileEndpoint("ncaafb", id))).rejects.toThrow("ncaa_calls_disabled_for_cohort");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("constructs only the two allowed v7 profile endpoints", () => {
    expect(profileEndpoint("nfl", id)).toBe(`/nfl/official/trial/v7/en/players/${id}/profile.json`);
    vi.stubEnv("SPORTRADAR_ACCESS_LEVEL", "production");
    expect(profileEndpoint("ncaafb", id)).toBe(`/ncaafb/production/v7/en/players/${id}/profile.json`);
    expect(() => profileEndpoint("nfl", "../../bad")).toThrow();
  });
  it("uses header authentication, blocks redirects and redacts echoed secrets", async () => {
    vi.stubEnv("SPORTRADAR_API_KEY", "fixture-secret");
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ name: "fixture-secret" })));
    vi.stubGlobal("fetch", fetch);
    expect((await fetchProfile(profileEndpoint("nfl", id))).raw).toEqual({ name: "[REDACTED]" });
    expect(fetch.mock.calls[0][0]).not.toContain("fixture-secret");
    expect(fetch.mock.calls[0][1]).toMatchObject({ cache: "no-store", redirect: "error", headers: { "x-api-key": "fixture-secret" } });
  });
  it.each([401, 403, 404, 429, 500, 503])("does not expose error bodies (%s)", async status => {
    vi.stubEnv("SPORTRADAR_API_KEY", "fixture-secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("secret error details", { status })));
    expect(await fetchProfile(profileEndpoint("nfl", id))).toEqual({ raw: null, status });
    expect(responseError(status).message).not.toContain("secret");
  });
  it("handles network/timeout and malformed JSON safely", async () => {
    vi.stubEnv("SPORTRADAR_API_KEY", "fixture-secret");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("secret", "TimeoutError")));
    await expect(fetchProfile(profileEndpoint("nfl", id))).rejects.toThrow("provider_timeout");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json")));
    await expect(fetchProfile(profileEndpoint("nfl", id))).rejects.toThrow("malformed_profile");
  });
  it("makes no request without configuration", async () => {
    vi.stubEnv("SPORTRADAR_API_KEY", ""); const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(fetchProfile(profileEndpoint("nfl", id))).rejects.toThrow("provider_key_not_configured");
    expect(fetch).not.toHaveBeenCalled();
  });
});
