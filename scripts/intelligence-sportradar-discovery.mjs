/** Bounded research CLI. Never imports stats, creates athletes, or updates previews. */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ledgerPacing, LEGACY_429_COOLDOWN_MS, MIN_REQUEST_SPACING_MS, redactProviderText, reservationErrorCode, retryAfterMs, safeProviderHeaders } from "./intelligence-sportradar-throttle.mjs";

const ROOT = "/nfl/official/trial/v7/en";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowed = new RegExp(`^${ROOT}/(?:league/seasons\\.json|games/\\d{4}/(?:REG|PST)/schedule\\.json|games/[0-9a-f-]{36}/(?:statistics|pbp)\\.json)$`);

export function createDiscoveryProbe({ db, apiKey, playerId, providerId, budget = 20, callCap = 4, allowedEndpoints = undefined, redirectMode = "error", fetchImpl = fetch, wait = ms => new Promise(resolve => setTimeout(resolve, ms)), now = () => Date.now(), readLedger = () => ledgerPacing(db, now()) }) {
  if (!UUID.test(playerId) || !UUID.test(providerId) || !apiKey || !Number.isInteger(budget) || budget < 1 || budget > 1000) throw new Error("invalid_discovery_configuration");
  if (!Number.isInteger(callCap) || callCap < 1 || callCap > 8) throw new Error("invalid_discovery_call_cap");
  if (!["error", "manual"].includes(redirectMode)) throw new Error("invalid_discovery_redirect_mode");
  if (allowedEndpoints !== undefined && (!(allowedEndpoints instanceof Set) || !allowedEndpoints.size || [...allowedEndpoints].some(value => typeof value !== "string" || !/^\/[a-z0-9/_.-]+\.json$/.test(value)))) throw new Error("invalid_discovery_endpoint_allowlist");
  const endpoints = allowedEndpoints === undefined ? null : new Set(allowedEndpoints);
  let calls = 0;
  let stopped = false;
  let busy = false;
  const observations = [];
  return {
    observations,
    async request(endpoint) {
      if (!(endpoints ? endpoints.has(endpoint) : allowed.test(endpoint))) throw new Error("endpoint_not_allowlisted");
      if (stopped || calls >= callCap) throw new Error("discovery_stopped_or_call_cap");
      if (busy) throw new Error("discovery_request_in_progress");
      busy = true;
      try {
      const pacing = await readLedger();
      if (pacing.cooldownUntil) { stopped = true; observations.push({ endpoint, error: "provider_cooldown", nextEligibleAt: pacing.cooldownUntil, providerCall: false }); throw new Error("provider_cooldown"); }
      if (calls || pacing.waitMs > 0) await wait(Math.max(calls ? MIN_REQUEST_SPACING_MS : 0, pacing.waitMs));
      let reservation;
      // Only retry a reservation lost to global concurrent traffic, never an HTTP failure.
      for (let attempt = 0; attempt < 3; attempt++) {
        reservation = await db.rpc("reserve_sportradar_request", { p_player_id: playerId, p_provider_id: providerId, p_endpoint: endpoint, p_access: "trial", p_budget: budget });
        if (!reservation.error && typeof reservation.data === "string") break;
        const code = reservationErrorCode(reservation.error);
        if (code !== "request_throttled" || attempt === 2) {
          stopped = true; observations.push({ endpoint, error: code, providerCall: false }); throw new Error(code);
        }
        await wait(MIN_REQUEST_SPACING_MS * (attempt + 1));
      }
      calls++;
      const started = now();
      const observed = { endpoint, fetchedAt: new Date(started).toISOString(), status: 0, error: null, bytes: 0, headers: {}, retryAfterMs: null, nextEligibleAt: null, errorBody: null };
      let payload;
      try {
        const response = await fetchImpl(`https://api.sportradar.com${endpoint}`, { headers: { "x-api-key": apiKey, Accept: "application/json" }, redirect: redirectMode, cache: "no-store", signal: AbortSignal.timeout(12000) });
        observed.status = response.status;
        observed.headers = safeProviderHeaders(response.headers, apiKey);
        if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
          try { const target = new URL(response.headers.get("location"), "https://api.sportradar.com");
            observed.redirectTarget = { origin: target.origin, pathname: target.pathname.split(apiKey).join("[REDACTED]") };
          } catch { observed.redirectTarget = null; }
        }
        observed.retryAfterMs = retryAfterMs(response.headers.get("retry-after"), now());
        if (response.status === 429) observed.nextEligibleAt = new Date(started + Math.max(LEGACY_429_COOLDOWN_MS, observed.retryAfterMs ?? 0)).toISOString();
        const reader = response.body?.getReader();
        if (!reader) throw new Error("empty_provider_body");
        const chunks = [];
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            observed.bytes += value.byteLength;
            if (observed.bytes > 5_000_000) { await reader.cancel(); throw new Error("response_too_large"); }
            chunks.push(value);
          }
        } finally { reader.releaseLock(); }
        const bytes = new Uint8Array(observed.bytes);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
        const body = new TextDecoder("utf-8", { fatal: true }).decode(bytes).split(apiKey).join("[REDACTED]");
        if (!response.ok) {
          observed.errorBody = redactProviderText(body, apiKey).slice(0, 1200);
          throw new Error(response.status === 429 ? "provider_rate_limited" : "provider_access_or_response_failure");
        }
        payload = JSON.parse(body);
      } catch (error) {
        observed.transportError = { name: error?.name === "TimeoutError" ? "TimeoutError" : "provider_transport_error",
          code: typeof error?.cause?.code === "string" && /^[A-Z0-9_]{1,80}$/.test(error.cause.code) ? error.cause.code : null,
          detail: redactProviderText(error?.cause?.message ?? error?.message ?? "", apiKey).slice(0, 200) };
        observed.error = observed.status === 429 ? "provider_rate_limited" : observed.status && observed.status !== 200 ? "provider_access_or_response_failure" : "provider_transport_or_payload_failure";
        stopped = true;
      }
      observed.completedAt = new Date(now()).toISOString();
      observed.durationMs = Math.max(0, now() - started);
      observations.push(observed);
      const logged = await db.from("provider_request_logs").update({ response_status: observed.status, error_code: observed.error, duration_ms: observed.durationMs, completed_at: observed.completedAt }).eq("id", reservation.data);
      if (logged.error) { stopped = true; throw new Error("request_completion_failed"); }
      if (observed.error) throw new Error(observed.error);
      return payload;
      } finally { busy = false; }
    },
  };
}

function collect(value, predicate, result = []) {
  if (Array.isArray(value)) for (const item of value) collect(item, predicate, result);
  else if (value && typeof value === "object") { if (predicate(value)) result.push(value); for (const item of Object.values(value)) collect(item, predicate, result); }
  return result;
}

function collectLocated(value, predicate, pointer = "", result = []) {
  if (Array.isArray(value)) value.forEach((item, index) => collectLocated(item, predicate, `${pointer}/${index}`, result));
  else if (value && typeof value === "object") {
    if (predicate(value)) result.push({ pointer, value });
    for (const [key, item] of Object.entries(value)) collectLocated(item, predicate, `${pointer}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`, result);
  }
  return result;
}

/** Source observations only. No canonical promotion, importance score or ownership inferred. */
export function extractAthleteGameEvidence({ playerId, providerId, statistics, pbp, statisticsSource, playSource }) {
  if (statistics.id !== pbp.id || !UUID.test(statistics.id ?? "")) throw new Error("game_evidence_identity_conflict");
  const performances = collectLocated(statistics, item => item.id === providerId && typeof item.name === "string")
    .filter(item => item.pointer.startsWith("/statistics/"));
  if (!performances.length) throw new Error("explicit_athlete_performance_required");
  const actions = collectLocated(pbp, item => item.player?.id === providerId && typeof item.stat_type === "string");
  const plays = collectLocated(pbp, item => item.type === "play" && UUID.test(item.id ?? "") && Array.isArray(item.statistics)
    && item.statistics.some(stat => stat.player?.id === providerId));
  return {
    version: 1, reviewStatus: "candidate", canonicalAthleteId: playerId,
    externalAthleteIdentity: { provider: "sportradar", sport: "football", league: "nfl", namespace: "league-profile", externalId: providerId },
    externalEventIdentity: { provider: "sportradar", sport: "football", league: "nfl", namespace: "game", externalId: statistics.id },
    event: { status: statistics.status, scheduled: statistics.scheduled, actualCompletionTime: null,
      home: statistics.summary?.home, away: statistics.summary?.away, season: statistics.summary?.season,
      dateEvidence: { source: statisticsSource, pointer: "/scheduled", value: statistics.scheduled } },
    participation: { type: "participant", confidence: null, basis: "Explicit athlete ID in game performance and play statistics; no identity created or merged." },
    performances: performances.map(item => ({ pointer: item.pointer, source: statisticsSource,
      numericMetrics: Object.fromEntries(Object.entries(item.value).filter(([, value]) => typeof value === "number" && Number.isFinite(value))) })),
    playActionCount: actions.length, uniquePlayCount: new Set(plays.map(play => play.value.id)).size,
    plays: plays.map(item => ({ pointer: item.pointer, source: playSource, externalPlayId: item.value.id,
      type: item.value.play_type, clock: item.value.clock, wallClock: item.value.wall_clock ?? null,
      actions: actions.filter(action => action.pointer.startsWith(`${item.pointer}/statistics/`)).map(action => ({
        pointer: action.pointer, statType: action.value.stat_type,
        numericMetrics: Object.fromEntries(Object.entries(action.value).filter(([, value]) => typeof value === "number" && Number.isFinite(value))),
      })) })),
    significance: "not_evaluated", rights: "not_established", economicParticipation: "not_established",
  };
}

async function main() {
  if (!process.argv.includes("--run")) { process.stdout.write("Use --run for a bounded NFL probe (default four calls; --call-cap=1..8). Every call is durably reserved; only request logs and local research output are written.\n"); return; }
  dotenv.config({ path: ".env.local", quiet: true });
  const playerId = process.argv.find(arg => arg.startsWith("--player="))?.slice(9);
  const boundary = Number(process.argv.find(arg => arg.startsWith("--boundary="))?.slice(11) ?? 0);
  const callCap = Number(process.argv.find(arg => arg.startsWith("--call-cap="))?.slice(11) ?? 4);
  if (boundary && (!Number.isInteger(boundary) || boundary < 2000 || boundary > 2025)) throw new Error("invalid_boundary_year");
  if (!playerId || !UUID.test(playerId) || (process.env.SPORTRADAR_ACCESS_LEVEL ?? "trial") !== "trial") throw new Error("verified_canonical_player_and_trial_required");
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
  const mapping = await db.from("player_external_ids").select("player_id,provider_player_id").eq("player_id", playerId).eq("provider", "sportradar").eq("league", "nfl").eq("status", "VERIFIED").maybeSingle();
  if (mapping.error || !mapping.data || !UUID.test(mapping.data.provider_player_id)) throw new Error("verified_mapping_required");
  const snapshot = await db.from("player_stat_ingestions").select("raw_profile,fetched_at").eq("player_id", playerId).eq("provider_player_id", mapping.data.provider_player_id).order("fetched_at", { ascending: false }).limit(1).maybeSingle();
  if (snapshot.error || !snapshot.data) throw new Error("existing_profile_snapshot_required");
  const profile = snapshot.data.raw_profile;
  const seasonCandidates = collect(profile, item => Number.isInteger(item.year) && item.year >= 2000 && item.type === "REG")
    .flatMap(item => (Array.isArray(item.teams) ? item.teams : [item.team]).filter(team => UUID.test(team?.id ?? "")).map(team => ({ ...item, team })));
  const season = seasonCandidates.sort((a, b) => b.year - a.year)[0];
  if (!season) throw new Error("reviewable_team_season_context_required");
  const directory = path.resolve("output/intelligence-research", new Date().toISOString().replace(/[:.]/g, "-"));
  await fs.mkdir(directory, { recursive: true });
  const probe = createDiscoveryProbe({ db, apiKey: process.env.SPORTRADAR_API_KEY, playerId, providerId: mapping.data.provider_player_id, budget: Number(process.env.SPORTRADAR_REQUEST_BUDGET ?? 20), callCap });
  const report = { playerId, providerId: mapping.data.provider_player_id, testedAt: new Date().toISOString(), trialExpiry: "unknown", founderReportedDeadline: "2026-10-10", callCap, outputDirectory: directory, observations: probe.observations, results: {}, stopReason: null };
  async function fetchAndSave(name, endpoint) { const payload = await probe.request(endpoint); await fs.writeFile(path.join(directory, `${name}.json`), JSON.stringify(payload, null, 2)); return payload; }
  try {
    // Reuse a dated, already successful catalog rather than spend the trial on it again.
    let catalog;
    try {
      const previous = JSON.parse(await fs.readFile(path.resolve("output/intelligence-research/discovery-report.json"), "utf8"));
      const success = previous.observations.find(item => item.endpoint === `${ROOT}/league/seasons.json` && item.status === 200);
      if (success) {
        catalog = JSON.parse(await fs.readFile(path.resolve("output/intelligence-research/seasons.json"), "utf8"));
        report.results.catalogProvenance = { cached: true, fetchedAt: success.fetchedAt, locator: success.endpoint };
      }
    } catch { /* Missing/corrupt cache falls back to a reserved provider call. */ }
    catalog ??= await fetchAndSave("seasons", `${ROOT}/league/seasons.json`);
    const years = collect(catalog, item => Number.isInteger(item.year)).map(item => item.year);
    report.results.catalog = { years: [...new Set(years)].sort((a, b) => a - b), catalogMinimumYear: years.length ? Math.min(...years) : null };
    const schedule = await fetchAndSave("schedule", `${ROOT}/games/${season.year}/REG/schedule.json`);
    const games = collect(schedule, item => UUID.test(item.id ?? "") && typeof item.scheduled === "string" && item.home && item.away);
    const game = games.filter(item => [item.home.id, item.away.id].includes(season.team.id) && item.status === "closed").sort((a, b) => a.scheduled.localeCompare(b.scheduled))[0];
    report.results.schedule = { year: season.year, gameCount: games.length, teamId: season.team.id, sampledGameId: game?.id ?? null, scheduled: game?.scheduled ?? null };
    if (!game) throw new Error("no_completed_team_game_found");
    const stats = await fetchAndSave("game-statistics", `${ROOT}/games/${game.id}/statistics.json`);
    const athleteRows = collect(stats, item => item.id === mapping.data.provider_player_id);
    report.results.statistics = { gameId: game.id, athletePresent: athleteRows.length > 0, matchedObjects: athleteRows.length, matchedFields: [...new Set(athleteRows.flatMap(item => Object.keys(item)))].sort() };
    if (!athleteRows.length) throw new Error("sampled_game_has_no_explicit_athlete_statistics");
    const pbp = await fetchAndSave("play-by-play", `${ROOT}/games/${game.id}/pbp.json`);
    const actions = collect(pbp, item => item.player?.id === mapping.data.provider_player_id || item.player_id === mapping.data.provider_player_id || item.id === mapping.data.provider_player_id);
    report.results.playByPlay = { gameId: game.id, athleteReferenceCount: actions.length, referenceFields: [...new Set(actions.flatMap(item => Object.keys(item)))].sort() };
    const evidence = extractAthleteGameEvidence({ playerId, providerId: mapping.data.provider_player_id, statistics: stats, pbp,
      statisticsSource: { provider: "sportradar", locator: `${ROOT}/games/${game.id}/statistics.json`, fetchedAt: probe.observations.find(item => item.endpoint === `${ROOT}/games/${game.id}/statistics.json`)?.fetchedAt },
      playSource: { provider: "sportradar", locator: `${ROOT}/games/${game.id}/pbp.json`, fetchedAt: probe.observations.find(item => item.endpoint === `${ROOT}/games/${game.id}/pbp.json`)?.fetchedAt } });
    await fs.writeFile(path.join(directory, "athlete-event-candidate.json"), JSON.stringify(evidence, null, 2));
    report.results.playByPlay.uniquePlayCount = evidence.uniquePlayCount;
    report.results.playByPlay.athleteActionCount = evidence.playActionCount;
    if (boundary) {
      const earlySchedule = await fetchAndSave(`schedule-${boundary}`, `${ROOT}/games/${boundary}/REG/schedule.json`);
      const earlyGames = collect(earlySchedule, item => UUID.test(item.id ?? "") && typeof item.scheduled === "string" && item.home && item.away);
      const early = earlyGames.filter(item => item.status === "closed").sort((a, b) => a.scheduled.localeCompare(b.scheduled))[0];
      report.results.boundarySchedule = { year: boundary, gameCount: earlyGames.length, sampledGameId: early?.id ?? null, scheduled: early?.scheduled ?? null, athleteAssociation: "not_established" };
      if (early) {
        const earlyStats = await fetchAndSave(`game-statistics-${boundary}`, `${ROOT}/games/${early.id}/statistics.json`);
        report.results.boundaryStatistics = { year: boundary, gameId: early.id, keys: Object.keys(earlyStats), athleteAssociation: "not_established" };
      }
    }
  } catch (error) { report.stopReason = error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : "discovery_failed"; }
  await fs.writeFile(path.join(directory, "discovery-report.json"), JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (report.stopReason) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { const code = error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : "discovery_configuration_or_storage_unavailable"; process.stderr.write(`${code}; no credentials displayed.\n`); process.exitCode = 1; });
}
