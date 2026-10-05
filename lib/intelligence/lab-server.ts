import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { GraphEvidence, GraphMoment } from "./contracts";
import type { AthleteSummary, LabAthlete, LabResult, LabSection } from "./lab-types";
import { safeSourceUrl } from "./lab-format";
import { isSafeSourceLocator } from "./ingestion/contracts";
import { evaluateGraphIntelligence } from "./signals";
import { projectGraphEvidenceData } from "./evidence-projection";

export class IntelligenceAccessError extends Error {
  constructor(public status: 401 | 403 | 503) { super("Intelligence access unavailable"); }
}

/** Authenticate before any service-role construction or graph read. */
export async function authorizeIntelligenceLab() {
  const session = await createClient();
  const { data, error } = await session.auth.getUser();
  if (error || !data.user) throw new IntelligenceAccessError(401);
  const permission = await session.rpc("is_internal_admin");
  if (permission.error) throw new IntelligenceAccessError(503);
  if (permission.data !== true) throw new IntelligenceAccessError(403);
}

const id = z.string().uuid();
const text = z.string();
const nullable = text.nullable();
const confidence = z.number().min(0).max(1).nullable();
const status = z.enum(["candidate", "verified", "rejected"]);
const athleteSchema = z.object({ id, name: text, full_name: nullable, slug: text, school: nullable, position: nullable, team: nullable, is_verified: z.boolean().nullable() });
const sourceSchema = z.object({ id, name: text, provider: text });
const ingestionSchema = z.object({ id, locator: nullable, fetched_at: text });
const evidenceSchema = z.object({ id, player_id: id, moment_id: id.nullable(), source_id: id, ingestion_id: id.nullable(), fact_type: text, statement: text, structured_data: z.record(text, z.unknown()), status, confidence });
const momentSchema = z.object({ id, title: text, occurred_on: nullable, occurred_year: z.number().nullable(), date_precision: z.enum(["day", "year", "unknown"]), sport: nullable, event_id: id.nullable(), status, confidence });
const joinSchema = z.object({ id, moment_id: id, player_id: id, relationship_type: text, status, confidence });
const rosterSchema = z.object({ id, team_season_id: id, organization_id: id, starts_on: text, ends_on: nullable, roster_status: text });
const teamSeasonSchema = z.object({ id, team_id: id, season_id: id });
const labelSchema = z.object({ id, name: text });
const seasonSchema = z.object({ id, season_code: text });
const statSchema = z.object({ id: z.number(), season: z.number(), season_type: text, team: nullable, source: text, stats: z.record(text, z.unknown()) });
const rosterStatSchema = z.object({ id, athlete_team_season_id: id, source: text, season_phase: text, stats: z.record(text, z.unknown()) });
const mediaSchema = z.object({ id, title: nullable, kind: text, provenance: text });
const videoSchema = z.object({ id, title: nullable });
const externalSchema = z.object({ id, provider: text, provider_player_id: text, sport: text, league: text, match_method: text, match_confidence: confidence, verified_at: text });

type QueryResult = { data: unknown; error: unknown };
async function read<T>(request: PromiseLike<QueryResult>, schema: z.ZodType<T>, cap = 100): Promise<LabSection<T>> {
  try {
    const result = await request;
    if (result.error) return { state: "unavailable", rows: [], truncated: false };
    const parsed = z.array(schema).safeParse(result.data);
    if (!parsed.success) return { state: "unavailable", rows: [], truncated: false };
    return { state: "ready", rows: parsed.data.slice(0, cap), truncated: parsed.data.length > cap };
  } catch { return { state: "unavailable", rows: [], truncated: false }; }
}
function mapped<T, U>(section: LabSection<T>, map: (row: T) => U): LabSection<U> { return { ...section, rows: section.rows.map(map) }; }
function empty<T>(): LabSection<T> { return { state: "ready", rows: [], truncated: false }; }
function summary(row: z.infer<typeof athleteSchema>): AthleteSummary { return { id: row.id, name: row.full_name || row.name, slug: row.slug, school: row.school, position: row.position }; }

export async function loadIntelligenceLab(params: { q?: string; athlete?: string; asOf?: string }): Promise<LabResult> {
  await authorizeIntelligenceLab();
  const query = (params.q ?? "").trim().slice(0, 120);
  const now = new Date().toISOString();
  const candidateDate = params.asOf ?? now.slice(0, 10);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(candidateDate) && Number.isFinite(Date.parse(candidateDate)) && new Date(candidateDate).toISOString().slice(0, 10) === candidateDate;
  const asOf = validDate ? candidateDate : now.slice(0, 10);
  // Historical selections use the day end; today's observations stop at the actual clock.
  const evaluatedAt = new Date(Math.min(Date.parse(`${asOf}T23:59:59.999Z`), Date.parse(now))).toISOString();
  const db = createServiceClient();
  const columns = "id,name,full_name,slug,school,position,team,is_verified";
  let request = db.from("players").select(columns).order("name").order("id").limit(26);
  if (query) request = request.ilike("name", `%${query.replace(/[\\%_]/g, "\\$&")}%`);
  const search = mapped(await read(request, athleteSchema, 25), summary);
  const result: LabResult = { query, asOf, evaluatedAt, search, selected: null, selectionState: "none" };
  if (!params.athlete) return result;
  if (!id.safeParse(params.athlete).success) return { ...result, selectionState: "invalid" };
  const selected = await db.from("players").select(columns).eq("id", params.athlete).maybeSingle();
  if (selected.error) throw new IntelligenceAccessError(503);
  if (!selected.data) return { ...result, selectionState: "not_found" };
  const player = athleteSchema.parse(selected.data);
  const playerId = player.id;
  const [rosters, stats, media, videos, identities, joins, evidence] = await Promise.all([
    read(db.from("athlete_team_seasons").select("id,team_season_id,organization_id,starts_on,ends_on,roster_status").eq("player_id", playerId).order("starts_on").limit(101), rosterSchema),
    read(db.from("player_season_stats").select("id,season,season_type,team,source,stats").eq("player_id", playerId).order("season").limit(101), statSchema),
    read(db.from("media").select("id,title,kind,provenance").eq("player_id", playerId).order("id").limit(101), mediaSchema),
    read(db.from("videos").select("id,title").eq("player_id", playerId).order("id").limit(101), videoSchema),
    read(db.from("player_external_ids").select("id,provider,provider_player_id,sport,league,match_method,match_confidence,verified_at").eq("player_id", playerId).eq("status", "VERIFIED").order("id").limit(101), externalSchema),
    read(db.from("moment_athletes").select("id,moment_id,player_id,relationship_type,status,confidence").eq("player_id", playerId).order("id").limit(101), joinSchema),
    read(db.from("intelligence_evidence").select("id,player_id,moment_id,source_id,ingestion_id,fact_type,statement,structured_data,status,confidence").eq("player_id", playerId).order("id").limit(201), evidenceSchema, 200),
  ]);
  const sourceIds = [...new Set(evidence.rows.map(row => row.source_id))];
  const ingestionIds = [...new Set(evidence.rows.flatMap(row => row.ingestion_id ? [row.ingestion_id] : []))];
  const momentIds = [...new Set(joins.rows.map(row => row.moment_id))];
  const teamSeasonIds = [...new Set(rosters.rows.map(row => row.team_season_id))];
  const [sources, ingestions, momentRows, teamSeasons, rosterStats] = await Promise.all([
    sourceIds.length ? read(db.from("intelligence_sources").select("id,name,provider").in("id", sourceIds).order("id").limit(201), sourceSchema, 200) : empty<z.infer<typeof sourceSchema>>(),
    ingestionIds.length ? read(db.from("intelligence_ingestions").select("id,locator,fetched_at").in("id", ingestionIds).order("id").limit(201), ingestionSchema, 200) : empty<z.infer<typeof ingestionSchema>>(),
    momentIds.length ? read(db.from("moments").select("id,title,occurred_on,occurred_year,date_precision,sport,event_id,status,confidence").in("id", momentIds).order("occurred_on").order("id").limit(101), momentSchema) : empty<z.infer<typeof momentSchema>>(),
    teamSeasonIds.length ? read(db.from("team_seasons").select("id,team_id,season_id").in("id", teamSeasonIds).order("id").limit(101), teamSeasonSchema) : empty<z.infer<typeof teamSeasonSchema>>(),
    rosters.rows.length ? read(db.from("athlete_season_stats").select("id,athlete_team_season_id,source,season_phase,stats").in("athlete_team_season_id", rosters.rows.map(row => row.id)).order("id").limit(101), rosterStatSchema) : empty<z.infer<typeof rosterStatSchema>>(),
  ]);
  const teamIds = [...new Set(teamSeasons.rows.map(row => row.team_id))];
  const seasonIds = [...new Set(teamSeasons.rows.map(row => row.season_id))];
  const orgIds = [...new Set(rosters.rows.map(row => row.organization_id))];
  const [teams, seasons, organizations] = await Promise.all([
    teamIds.length ? read(db.from("teams").select("id,name").in("id", teamIds).order("id").limit(101), labelSchema) : empty<z.infer<typeof labelSchema>>(),
    seasonIds.length ? read(db.from("seasons").select("id,season_code").in("id", seasonIds).order("id").limit(101), seasonSchema) : empty<z.infer<typeof seasonSchema>>(),
    orgIds.length ? read(db.from("organizations").select("id,name").in("id", orgIds).order("id").limit(101), labelSchema) : empty<z.infer<typeof labelSchema>>(),
  ]);
  const graphEvidence = mapped(evidence, (row): GraphEvidence => {
    const source = sources.rows.find(item => item.id === row.source_id);
    const ingestion = ingestions.rows.find(item => item.id === row.ingestion_id);
    return { id: row.id, athleteId: row.player_id, momentId: row.moment_id, factType: row.fact_type, statement: row.statement, data: projectGraphEvidenceData(row.fact_type, row.structured_data), status: row.status, confidence: row.confidence,
      ingestionId: row.ingestion_id, source: { id: source?.id ?? null, name: source?.name ?? "Source unavailable", provider: source?.provider ?? "unknown", locator: ingestion?.locator && isSafeSourceLocator(ingestion.locator) ? ingestion.locator : safeSourceUrl(ingestion?.locator), fetchedAt: ingestion?.fetched_at ?? null } };
  });
  if (sources.state !== "ready" || ingestions.state !== "ready") graphEvidence.state = "unavailable";
  graphEvidence.truncated ||= sources.truncated || ingestions.truncated;
  const graphMoments = mapped(momentRows, (row) => {
    const memberships = joins.rows.filter(join => join.moment_id === row.id);
    const verifiedMembership = memberships.find(join => join.status === "verified");
    const membership = verifiedMembership ?? memberships[0];
    const moment: GraphMoment = { id: row.id, title: row.title, occurredOn: row.occurred_on, occurredYear: row.occurred_year, datePrecision: row.date_precision, sport: row.sport, eventId: row.event_id, status: row.status, confidence: row.confidence,
      athletes: memberships.map(join => ({ athleteId: join.player_id, relationshipType: join.relationship_type, status: join.status, confidence: join.confidence })), evidence: graphEvidence.rows.filter(item => item.momentId === row.id) };
    return { ...moment, relationship: membership?.relationship_type ?? "unknown", relationshipStatus: membership?.status ?? "candidate", relationshipConfidence: membership?.confidence ?? null };
  });
  if (joins.state !== "ready" || graphEvidence.state !== "ready") graphMoments.state = "unavailable";
  graphMoments.truncated ||= joins.truncated || graphEvidence.truncated;
  const completeGraph = [joins, evidence, sources, ingestions, momentRows].every(section => section.state === "ready" && !section.truncated);
  const intelligence = evaluateGraphIntelligence(completeGraph ? graphMoments.rows : [], playerId, { asOf: evaluatedAt });
  const relationships = mapped(rosters, row => {
    const ts = teamSeasons.rows.find(item => item.id === row.team_season_id);
    return { id: row.id, team: teams.rows.find(item => item.id === ts?.team_id)?.name ?? "Team unavailable", season: seasons.rows.find(item => item.id === ts?.season_id)?.season_code ?? "Season unavailable", organization: organizations.rows.find(item => item.id === row.organization_id)?.name ?? "Organization unavailable", startsOn: row.starts_on, endsOn: row.ends_on, status: row.roster_status };
  });
  relationships.truncated ||= [teamSeasons, teams, seasons, organizations].some(section => section.truncated);
  if ([teamSeasons, teams, seasons, organizations].some(section => section.state !== "ready")) relationships.state = "unavailable";
  const statistics: LabAthlete["statistics"] = { state: stats.state === "ready" && rosterStats.state === "ready" ? "ready" : "unavailable", truncated: stats.truncated || rosterStats.truncated, rows: [
    ...stats.rows.map(row => ({ id: `legacy-${row.id}`, season: String(row.season), phase: row.season_type, team: row.team, source: row.source, stats: row.stats, model: "legacy" as const })),
    ...rosterStats.rows.map(row => { const stint = relationships.rows.find(item => item.id === row.athlete_team_season_id); return { id: row.id, season: stint?.season ?? "Season unavailable", phase: row.season_phase, team: stint?.team ?? null, source: row.source, stats: row.stats, model: "roster" as const }; }),
  ] };
  const allMedia: LabAthlete["media"] = { state: media.state === "ready" && videos.state === "ready" ? "ready" : "unavailable", truncated: media.truncated || videos.truncated, rows: [
    ...media.rows.map(row => ({ id: row.id, title: row.title || "Untitled media", kind: row.kind, source: row.provenance, model: "legacy media" as const })),
    ...videos.rows.map(row => ({ id: row.id, title: row.title || "Untitled video", kind: "video", source: null, model: "legacy video" as const })),
  ] };
  return { ...result, selectionState: "ready", selected: { ...summary(player), teamLabel: player.team, verified: player.is_verified, relationships, statistics, media: allMedia,
    externalIdentities: mapped(identities, row => ({ id: row.id, provider: row.provider, externalId: row.provider_player_id, sport: row.sport, league: row.league, method: row.match_method, confidence: row.match_confidence, verifiedAt: row.verified_at })), moments: graphMoments, evidence: graphEvidence, intelligenceState: completeGraph ? "ready" : "incomplete", intelligence } };
}
