/** Metadata-only trial verification. No images, graph promotion, or publication. */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDiscoveryProbe } from "./intelligence-sportradar-discovery.mjs";

export const KEITH_PLAYER_ID = "c5dae871-a277-4256-9a0c-17a40940ad3f";
export const KEITH_PROFILE_ID = "d2c5d2fa-dd75-444e-b8e0-63c31a3791be";
export const GETTY_CONTROL = "/nba-images-t3/getty/headshots/players/2025/manifest.json";
export const KEITH_GAME_MANIFEST = "/nfl-images-t3/getty/actionshots/events/game/eb3bb333-6ae5-417c-b9e3-1d3dfdb8673e/manifest.json";
const MANIFEST_ORIGIN = "https://prod-cms-resources-srag-us-east-1.s3.us-east-1.amazonaws.com";
const MANIFEST_PATHS = new Map([
  [GETTY_CONTROL, "/cms_assets/getty/public/NBA/headshots/players/2025/manifest.json"],
  [KEITH_GAME_MANIFEST, "/cms_assets/getty/public/NFL/actionshots/events/game/eb3bb333-6ae5-417c-b9e3-1d3dfdb8673e/manifest.json"],
]);
const SIGNED_QUERY_KEYS = new Set(["AWSAccessKeyId", "Signature", "Expires", "x-amz-security-token",
  "X-Amz-Algorithm", "X-Amz-Credential", "X-Amz-Date", "X-Amz-Expires", "X-Amz-SignedHeaders", "X-Amz-Signature", "X-Amz-Security-Token",
  "X-Amz-Content-Sha256", "x-amz-checksum-mode", "x-id"]);

/** Image subscriptions have their own credential; never silently use the stats key.
 * @param {Record<string, string | undefined>} env
 */
export function imagesApiKey(env = process.env) {
  const key = env.SPORTRADAR_IMAGES_API_KEY?.trim();
  if (!key) throw new Error("images_api_key_missing");
  return key;
}

/** Reuses the same master-key SQL budget, spacing, cooldown, and completion log. */
export function createImagesProbe(options) {
  const budget = options.budget ?? 20;
  if (!Number.isInteger(budget) || budget < 1 || budget > 20) throw new Error("invalid_images_budget");
  const fetchImpl = options.fetchImpl ?? fetch;
  const redirects = [];
  const manifestFetch = async (url, init) => {
    const gateway = await fetchImpl(url, init);
    if (![301, 302, 307, 308].includes(gateway.status)) return gateway;
    const endpoint = new URL(url).pathname;
    let target;
    try { target = new URL(gateway.headers.get("location")); } catch { throw new Error("invalid_manifest_redirect"); }
    const queryKeys = [...target.searchParams.keys()];
    const approved = target.origin === MANIFEST_ORIGIN && target.pathname === MANIFEST_PATHS.get(endpoint)
      && !target.username && !target.password && !target.hash && queryKeys.every(key => SIGNED_QUERY_KEYS.has(key))
      && queryKeys.length === new Set(queryKeys).size
      && (!target.searchParams.has("x-id") || target.searchParams.get("x-id") === "GetObject");
    // Signed archive capabilities stay in memory; neither their values nor full URL are persisted.
    redirects.push({ endpoint, gatewayStatus: gateway.status,
      manifestLocator: approved ? target.origin + target.pathname : "unapproved_destination",
      queryKeys: queryKeys.map(key => SIGNED_QUERY_KEYS.has(key) ? key : "unapproved_parameter"), approved });
    if (!approved) throw new Error("untrusted_manifest_redirect");
    // Only JSON manifests, never image bytes. Master key stays on api.sportradar.com.
    await gateway.body?.cancel();
    return fetchImpl(target.href, { headers: { Accept: "application/json" }, credentials: "omit",
      redirect: "error", cache: "no-store", signal: init.signal });
  };
  const probe = createDiscoveryProbe({ ...options, fetchImpl: manifestFetch, budget, callCap: 2, redirectMode: "manual",
    allowedEndpoints: new Set([GETTY_CONTROL, KEITH_GAME_MANIFEST]) });
  return { ...probe, redirects };
}

async function main() {
  if (!process.argv.includes("--run")) {
    process.stdout.write("Use --run for at most two reserved metadata calls: Getty NBA authentication control, then Keith's known NFL game. No image downloads or canonical writes.\n");
    return;
  }
  dotenv.config({ path: ".env.local", quiet: true });
  const apiKey = imagesApiKey();
  if ((process.env.SPORTRADAR_ACCESS_LEVEL ?? "trial") !== "trial") throw new Error("trial_access_required");
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } });
  const mapping = await db.from("player_external_ids").select("provider_player_id")
    .eq("player_id", KEITH_PLAYER_ID).eq("provider", "sportradar").eq("league", "nfl").eq("status", "VERIFIED").maybeSingle();
  if (mapping.error || mapping.data?.provider_player_id !== KEITH_PROFILE_ID) throw new Error("verified_keith_mapping_required");
  const directory = path.resolve("output/sportradar-validation/images", new Date().toISOString().replace(/[:.]/g, "-"));
  await fs.mkdir(directory, { recursive: true });
  const probe = createImagesProbe({ db, apiKey, playerId: KEITH_PLAYER_ID,
    providerId: KEITH_PROFILE_ID, budget: Number(process.env.SPORTRADAR_REQUEST_BUDGET ?? 20) });
  const report = { testedAt: new Date().toISOString(), canonicalAthleteId: KEITH_PLAYER_ID,
    authentication: "SPORTRADAR_IMAGES_API_KEY_header", metadataOnly: true, callCap: 2,
    controlAthleteAssociation: "none", imagesTrialExpiry: "2026-10-30", nflStatsDeadline: "2026-10-10",
    observations: probe.observations, redirects: probe.redirects, results: {}, stopReason: null, outputDirectory: directory };
  try {
    for (const [name, endpoint] of [["getty-nba-control", GETTY_CONTROL], ["keith-2014-nfl", KEITH_GAME_MANIFEST]]) {
      const payload = await probe.request(endpoint);
      await fs.writeFile(path.join(directory, `${name}.json`), JSON.stringify(payload, null, 2), { flag: "wx" });
      report.results[name] = { provider: payload.provider ?? null, league: payload.league ?? null,
        type: payload.type ?? null, assetCount: Array.isArray(payload.assetlist) ? payload.assetlist.length : null,
        normalizationStatus: "raw_observation", associationStatus: "not_established", rightsStatus: "unknown" };
    }
  } catch (error) {
    report.stopReason = error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : "images_probe_failed";
  }
  await fs.writeFile(path.join(directory, "images-report.json"), JSON.stringify(report, null, 2), { flag: "wx" });
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (report.stopReason) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { process.stderr.write("images_configuration_or_storage_unavailable; no credentials displayed.\n"); process.exitCode = 1; });
}
