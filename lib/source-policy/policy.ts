/** Application policy, not a statement that public access grants a license. */
export const POLICY_VERSION = "2026-09-29.1";
export type SourceType = "licensed_provider" | "official_league" | "official_team" | "official_school" | "official_athlete" | "reference_database" | "encyclopedic" | "news_publisher" | "social_platform" | "media_asset_provider" | "unknown";
export const ACTIONS = ["DISCOVERY", "VERIFY", "EXTRACT_METADATA", "EXTRACT_FACTS", "CRAWL", "BULK_INGEST", "PERSIST_METADATA", "PERSIST_FACTS", "ASSET_REFERENCE", "ASSET_DOWNLOAD"] as const;
export type SourceAction = typeof ACTIONS[number];
export interface SourceDecision {
  domain: string; source_type: SourceType; decision: "ALLOW" | "RESTRICT" | "REFERENCE_ONLY" | "DENY";
  discovery_allowed: boolean; extract_allowed: "none" | "limited_verification" | "metadata_only" | "single_player_facts";
  crawl_allowed: boolean; bulk_ingestion_allowed: boolean; persistent_storage_allowed: "none" | "limited_metadata" | "single_player_facts";
  asset_download_allowed: boolean; attribution_required: boolean;
  // Null means no verified source-specific technical limit, never unlimited permission.
  rate_limit: { requests: number; window_ms: number } | null;
  allowed_actions: SourceAction[]; blocked_actions: SourceAction[];
  reason: string; usage_notes: string; policy_status: "active" | "review_required";
  policy_id: string; policy_version: string; updated_at: string;
}
export interface SourceProvenance {
  source_url: string; source_domain: string; source_type: SourceType; discovery_provider: string;
  retrieved_at: string; attribution_required: boolean; policy_decision: SourceDecision["decision"];
  policy_id: string; policy_version: string; confidence: number | null;
}
const SPORTS_REFERENCE = ["pro-football-reference.com", "basketball-reference.com", "baseball-reference.com", "hockey-reference.com", "fbref.com", "sports-reference.com"];
export const domainMatches = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);
const metadata: SourceAction[] = ["DISCOVERY", "VERIFY", "EXTRACT_METADATA", "PERSIST_METADATA", "ASSET_REFERENCE"];
const facts: SourceAction[] = [...metadata, "EXTRACT_FACTS", "PERSIST_FACTS"];
/** Pure evaluation: callers cannot supply or override permissions. Exact family boundaries matter. */
export function evaluateSource(input: string): SourceDecision {
  let url: URL | undefined;
  try { url = new URL(input); } catch { /* invalid is denied below */ }
  const host = url?.hostname.toLowerCase().replace(/\.$/, "") ?? "";
  let type: SourceType = "unknown", id = "unknown-metadata", decision: SourceDecision["decision"] = "RESTRICT";
  let allowed = metadata, status: SourceDecision["policy_status"] = "review_required";
  let reason = "Unclassified source: metadata and remote references only; review required for broader use.";
  if (!url || url.protocol !== "https:" || url.username || url.password || url.port || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)
    || /(^|\.)(localhost|local|internal|test|invalid)$/.test(host) || /[\\\s\u0000-\u001f]/.test(input)) {
    id = "invalid-source"; decision = "DENY"; allowed = []; reason = "A public HTTPS source URL is required.";
  } else if (SPORTS_REFERENCE.some(domain => domainMatches(host, domain))) {
    type = "reference_database"; id = "sports-reference-family"; decision = "REFERENCE_ONLY";
    allowed = ["DISCOVERY", "VERIFY", "PERSIST_METADATA"]; status = "active";
    reason = "Reference links only. No automated extraction, crawl, bulk population or asset copying; specific-page verification requires a separately approved adapter.";
  } else if (domainMatches(host, "wikipedia.org")) {
    type = "encyclopedic"; id = "wikipedia-player"; allowed = facts; status = "active";
    reason = "Existing bounded single-player biography and award adapter; retain attribution. No site crawl or assets.";
  } else if (host === "api.sportradar.com") {
    type = "licensed_provider"; id = "sportradar-adapter"; allowed = facts;
    reason = "Existing authenticated stats adapter only; entitlement and redistribution rights depend on the configured agreement.";
  } else if (host === "github.com" && /^\/nflverse\/nflverse-data(?:\/|$)/.test(url.pathname)
    || domainMatches(host, "collegefootballdata.com")) {
    type = "reference_database"; id = "existing-roster-cache"; allowed = facts;
    reason = "Preserve existing roster cache provenance and bounded athlete lookup; no new bulk ingestion permission.";
  } else if (domainMatches(host, "espn.com")) {
    type = "news_publisher"; id = "espn-player-metadata";
    if ((host === "site.web.api.espn.com" && url.pathname === "/apis/search/v2")
      || (host === "sports.core.api.espn.com" && /^\/v2\/sports\/football\/leagues\/(nfl|college-football)\/athletes\/\d+\/?$/.test(url.pathname))) allowed = facts;
    reason = "Metadata only, except the existing fixed football search/profile adapter; no bulk or asset download rights inferred.";
  } else if (domainMatches(host, "youtube.com") || host === "youtu.be") {
    type = "social_platform"; id = "youtube-links";
    // The legacy adapter projects matching watch URLs only, never video bytes.
    if (url.pathname === "/results") allowed = facts;
    reason = "Existing bounded watch-link discovery and remote references only; no media download or recursive crawling.";
  } else if (domainMatches(host, "nfl.com") || domainMatches(host, "chargers.com") || domainMatches(host, "calbears.com") || domainMatches(host, "berkeley.edu")) {
    type = domainMatches(host, "nfl.com") ? "official_league" : domainMatches(host, "chargers.com") ? "official_team" : "official_school";
    id = "official-metadata"; status = "active";
    reason = "Configured official source: bounded metadata only. Official status does not grant bulk or asset rights.";
  }
  const single = allowed.includes("EXTRACT_FACTS");
  return { domain: host, source_type: type, decision, discovery_allowed: allowed.includes("DISCOVERY"),
    extract_allowed: single ? "single_player_facts" : decision === "REFERENCE_ONLY" ? "limited_verification" : allowed.includes("EXTRACT_METADATA") ? "metadata_only" : "none",
    crawl_allowed: false, bulk_ingestion_allowed: false, persistent_storage_allowed: single ? "single_player_facts" : allowed.includes("PERSIST_METADATA") ? "limited_metadata" : "none",
    asset_download_allowed: false, attribution_required: true, rate_limit: null,
    allowed_actions: [...allowed], blocked_actions: ACTIONS.filter(action => !allowed.includes(action)),
    reason, usage_notes: reason, policy_status: status, policy_id: id, policy_version: POLICY_VERSION, updated_at: "2026-09-29" };
}
export class SourcePolicyError extends Error {
  constructor(readonly policy: SourceDecision, readonly action: SourceAction) { super(`source_policy_blocked:${action}:${policy.policy_id}`); }
}
export function requireSourceAction(url: string, action: SourceAction): SourceDecision {
  const policy = evaluateSource(url);
  if (!policy.allowed_actions.includes(action)) throw new SourcePolicyError(policy, action);
  return policy;
}
export function sourceProvenance(url: string, provider: string, confidence: number | null = null): SourceProvenance {
  const p = evaluateSource(url);
  return { source_url: url, source_domain: p.domain, source_type: p.source_type, discovery_provider: provider,
    retrieved_at: new Date().toISOString(), attribution_required: p.attribution_required, policy_decision: p.decision,
    policy_id: p.policy_id, policy_version: p.policy_version, confidence };
}
export function remoteAssetReference(url: string | null | undefined): string | null {
  return url && evaluateSource(url).allowed_actions.includes("ASSET_REFERENCE") ? url : null;
}
export interface PolicyDiagnostics { discovered: number; allowed: number; reference_only: number; rejected: number; reasons: string[] }
export function policyDiagnostics(urls: string[], action: SourceAction): PolicyDiagnostics {
  const policies = [...new Set(urls)].map(evaluateSource);
  return { discovered: policies.length, allowed: policies.filter(p => p.allowed_actions.includes(action)).length,
    reference_only: policies.filter(p => p.decision === "REFERENCE_ONLY").length,
    rejected: policies.filter(p => !p.allowed_actions.includes(action)).length,
    reasons: [...new Set(policies.map(p => `${p.policy_id}: ${p.reason}`))].slice(0, 8) };
}
