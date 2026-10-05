// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createImagesProbe, imagesApiKey, GETTY_CONTROL, KEITH_GAME_MANIFEST } from "@/scripts/intelligence-images-discovery.mjs";
const ID = "00000000-0000-4000-8000-000000000001";
function setup() {
  const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
  const db = { rpc: vi.fn().mockResolvedValue({ data: ID, error: null }), from: vi.fn(() => ({ update })) };
  const fetchImpl = vi.fn().mockImplementation(async () => new Response('{"assetlist":[]}', { status: 200 }));
  const wait = vi.fn().mockResolvedValue(undefined);
  const readLedger = vi.fn().mockResolvedValue({ waitMs: 0, cooldownUntil: null });
  const probe = createImagesProbe({ db, apiKey: "private-test-key", playerId: ID, providerId: ID, fetchImpl, wait, readLedger });
  return { db, fetchImpl, wait, readLedger, probe, update };
}
describe("Getty metadata-only transport", () => {
  it("requires the dedicated image key and never falls back to the stats credential", () => {
    expect(imagesApiKey({ SPORTRADAR_IMAGES_API_KEY: " image-key ", SPORTRADAR_API_KEY: "stats-key" })).toBe("image-key");
    expect(() => imagesApiKey({ SPORTRADAR_API_KEY: "stats-key" })).toThrow("images_api_key_missing");
    expect(() => imagesApiKey({ SPORTRADAR_IMAGES_API_KEY: "  " })).toThrow("images_api_key_missing");
  });
  it("only allows the two documented manifest probes, without downloads or licensing", async () => {
    const { probe, db } = setup();
    for (const endpoint of ["https://api.gettyimages.com/v3/search/images", GETTY_CONTROL + "?api_key=secret",
      GETTY_CONTROL.replace("-t3", "-p3"), GETTY_CONTROL.replace("manifest.json", "original.jpg"),
      "/nfl/official/trial/v7/en/league/seasons.json"]) await expect(probe.request(endpoint)).rejects.toThrow("endpoint_not_allowlisted");
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("reserves through the global ledger, uses header auth, spaces calls and caps the run", async () => {
    const { probe, db, fetchImpl, wait } = setup();
    await probe.request(GETTY_CONTROL); await probe.request(KEITH_GAME_MANIFEST);
    await expect(probe.request(GETTY_CONTROL)).rejects.toThrow("discovery_stopped_or_call_cap");
    expect(db.rpc.mock.calls[0][0]).toBe("reserve_sportradar_request");
    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.sportradar.com" + GETTY_CONTROL);
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ redirect: "manual", headers: { "x-api-key": "private-test-key" } });
    expect(JSON.stringify(probe.observations)).not.toContain("private-test-key");
    expect(wait).toHaveBeenCalledWith(2500);
  });
  it("fails closed on the shared cooldown before consuming Getty quota", async () => {
    const { probe, readLedger, db, fetchImpl } = setup();
    readLedger.mockResolvedValue({ waitMs: 0, cooldownUntil: "2026-10-02T00:00:00Z" });
    await expect(probe.request(GETTY_CONTROL)).rejects.toThrow("provider_cooldown");
    expect(db.rpc).not.toHaveBeenCalled(); expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("stops at a429 and records a longer Retry-After without HTTP retries", async () => {
    const { probe, fetchImpl } = setup();
    fetchImpl.mockImplementation(async () => new Response("api_key=private-test-key", { status: 429, headers: { "Retry-After": "7200" } }));
    await expect(probe.request(GETTY_CONTROL)).rejects.toThrow("provider_rate_limited");
    expect(Date.parse(probe.observations[0].nextEligibleAt!) - Date.parse(probe.observations[0].fetchedAt)).toBe(7200000);
    await expect(probe.request(KEITH_GAME_MANIFEST)).rejects.toThrow("discovery_stopped_or_call_cap");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("cannot raise the existing internal request budget", () => {
    expect(() => createImagesProbe({ budget: 21 })).toThrow("invalid_images_budget");
  });
  it("follows only the known hosted JSON manifest and never forwards the master key", async () => {
    const { probe, fetchImpl, db } = setup();
    const target = "https://prod-cms-resources-srag-us-east-1.s3.us-east-1.amazonaws.com/cms_assets/getty/public/NBA/headshots/players/2025/manifest.json";
    fetchImpl.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: target } }));
    await probe.request(GETTY_CONTROL);
    expect(db.rpc).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1]).toEqual([target, expect.objectContaining({ headers: { Accept: "application/json" }, credentials: "omit", redirect: "error" })]);
    expect(probe.redirects).toEqual([{ endpoint: GETTY_CONTROL, gatewayStatus: 302, manifestLocator: target, queryKeys: [], approved: true }]);
  });
  it("keeps archive signatures in memory while fetching an approved manifest", async () => {
    const { probe, fetchImpl } = setup();
    const target = "https://prod-cms-resources-srag-us-east-1.s3.us-east-1.amazonaws.com/cms_assets/getty/public/NBA/headshots/players/2025/manifest.json?AWSAccessKeyId=archive-access&Signature=archive-signature&Expires=1800000000";
    fetchImpl.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: target } }));
    await probe.request(GETTY_CONTROL);
    expect(fetchImpl.mock.calls[1][0]).toBe(target);
    expect(JSON.stringify(probe.redirects)).not.toMatch(/archive-access|archive-signature|1800000000/);
  });
  it("blocks credential-bearing, cross-host, image, and unrelated-manifest redirects", async () => {
    const base = "https://prod-cms-resources-srag-us-east-1.s3.us-east-1.amazonaws.com/cms_assets/getty/public/NBA/headshots/players/2025/manifest.json";
    for (const target of ["https://evil.test/manifest.json", base + "?api_key=private-test-key", base.replace("manifest.json", "original.jpg"), base.replace("2025", "2024"), base.replace("https://", "http://")]) {
      const { probe, fetchImpl } = setup();
      fetchImpl.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: target } }));
      await expect(probe.request(GETTY_CONTROL)).rejects.toThrow("provider_transport_or_payload_failure");
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(probe.observations)).not.toContain("private-test-key");
      expect(JSON.stringify(probe.redirects)).not.toContain("private-test-key");
    }
  });
});
