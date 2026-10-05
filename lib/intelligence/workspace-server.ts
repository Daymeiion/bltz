import "server-only";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { authorizeIntelligenceLab, loadIntelligenceLab } from "./lab-server";
import { contentItemsFromEvidence } from "./content";
import type { GraphEvidence, GraphMoment } from "./contracts";
import type { LabSection } from "./lab-types";
import { safeSourceUrl } from "./lab-format";
import { isSafeSourceLocator } from "./ingestion/contracts";
import { evaluateGraphIntelligence } from "./signals";
import { projectGraphEvidenceData } from "./evidence-projection";
import type { WorkspaceAthleteSummary, WorkspaceMedia, WorkspaceProfile, WorkspaceResult } from "./workspace-types";

const uuid = z.string().uuid();
const nullable = z.string().nullable();
const confidence = z.number().min(0).max(1).nullable();
const status = z.enum(["candidate", "verified", "rejected"]);
const playerSchema = z.object({ id: uuid, name: z.string(), full_name: nullable, slug: z.string(), school: nullable, position: nullable, team: nullable });
const profileSchema = z.object({ id: uuid, headshot_url: nullable, image_url: nullable, profile_image: nullable, current_status: nullable, youtube_urls: z.array(z.string()).nullable(), spotify_url: nullable });
const joinSchema = z.object({ id: uuid, moment_id: uuid, player_id: uuid, relationship_type: z.string(), status, confidence });
const momentSchema = z.object({ id: uuid, title: z.string(), occurred_on: nullable, occurred_year: z.number().nullable(), date_precision: z.enum(["day", "year", "unknown"]), sport: nullable, event_id: uuid.nullable(), status, confidence });
const evidenceSchema = z.object({ id: uuid, player_id: uuid, moment_id: uuid.nullable(), source_id: uuid, ingestion_id: uuid.nullable(), fact_type: z.string(), statement: z.string(), structured_data: z.record(z.string(), z.unknown()), status, confidence });
const sourceSchema = z.object({ id: uuid, name: z.string(), provider: z.string() });
const ingestionSchema = z.object({ id: uuid, locator: nullable, fetched_at: z.string() });
const mediaSchema = z.object({ id: uuid, kind: z.string(), url: z.string(), source_url: nullable, credits: nullable, license_status: z.string(), public_locker_approved: z.boolean(), license_kind: nullable, rights_holder: nullable });
const previewSchema = z.object({ id: uuid, player_id: uuid, slug: z.string(), headshot_url: nullable, photos: z.array(z.unknown()), social: z.array(z.unknown()) });
const directoryPortraitSchema = z.object({ id: uuid, player_id: uuid, headshot_url: nullable });
const playerColumns = "id,name,full_name,slug,school,position,team";
const joinColumns = "id,moment_id,player_id,relationship_type,status,confidence";
const momentColumns = "id,title,occurred_on,occurred_year,date_precision,sport,event_id,status,confidence";
type Db = ReturnType<typeof createServiceClient>;
type Query = PromiseLike<{ data: unknown; error: unknown }>;
const empty = <T>(): LabSection<T> => ({ state: "ready", rows: [], truncated: false });

async function read<T>(query: Query, schema: z.ZodType<T>, cap: number): Promise<LabSection<T>> {
  try {
    const { data, error } = await query;
    const parsed = z.array(schema).safeParse(data);
    if (error || !parsed.success) return { state: "unavailable", rows: [], truncated: false };
    return { state: "ready", rows: parsed.data.slice(0, cap), truncated: parsed.data.length > cap };
  } catch { return { state: "unavailable", rows: [], truncated: false }; }
}

/** Browser references only. Do not expose credentials or private/local network locations. */
export function safeWorkspaceUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048 || /[\s\\\u0000-\u001f\u007f]/.test(value)) return null;
  const safe = safeSourceUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  if (url.protocol !== "https:" || url.port || !/\.[a-z]{2,}$/i.test(url.hostname)
    || /(^|\.)(local|localhost|internal|test|invalid)$/i.test(url.hostname)) return null;
  return safe;
}

/** Legacy eligibility adapter for internal inspection, not the future rights engine. */
function resolveMediaPermissions(asset: z.infer<typeof mediaSchema>, usageContext: "internal_intelligence_preview") {
  const url = safeWorkspaceUrl(asset.url);
  const allowed = usageContext === "internal_intelligence_preview" && asset.license_status === "approved"
    && asset.public_locker_approved && !!asset.license_kind?.trim() && !!url
    && ["photo", "headshot", "video"].includes(asset.kind);
  return { previewUrl: allowed ? url : null, reason: allowed ? "Existing legacy asset approval; no additional use rights inferred." : "Preview withheld: explicit existing asset approval and a safe URL are required." };
}

export function workspacePriority(scores: number[]): Pick<WorkspaceAthleteSummary, "priority" | "priorityLabel" | "hasIntelligence"> {
  const valid = scores.filter(score => Number.isFinite(score) && score >= 0 && score <= 100);
  if (!valid.length) return { priority: null, priorityLabel: "Awaiting review", hasIntelligence: false };
  const priority = Math.max(...valid);
  return { priority, priorityLabel: priority >= 71 ? "High" : priority >= 41 ? "Mid" : "Low", hasIntelligence: true };
}

function summary(row: z.infer<typeof playerSchema>, scores: number[] = [], complete = true): WorkspaceAthleteSummary {
  return { id: row.id, name: row.full_name || row.name, slug: row.slug, school: row.school, position: row.position,
    teamLabel: row.team, portraitUrl: null, ...workspacePriority(complete ? scores : []), intelligenceState: complete ? "ready" : "incomplete" };
}

/** .or() uses PostgREST syntax: restrict the search operand, never interpolate its grammar. */
function searchOperand(query: string) { return query.replace(/[^\p{L}\p{N}\s'-]/gu, " ").trim().slice(0, 120); }

async function searchPlayers(db: Db, query: string): Promise<LabSection<z.infer<typeof playerSchema>>> {
  const operand = searchOperand(query);
  if (query && !operand) return empty();
  let playerRequest = db.from("players").select(playerColumns).order("name").order("id").limit(26);
  if (operand) playerRequest = playerRequest.or(["name", "full_name", "school", "team"].map(column => `${column}.ilike.%${operand}%`).join(","));
  const [players, matches] = await Promise.all([
    read(playerRequest, playerSchema, 25),
    operand ? read(db.from("moments").select(momentColumns).ilike("title", `%${operand}%`).order("id").limit(26), momentSchema, 25) : Promise.resolve(empty<z.infer<typeof momentSchema>>()),
  ]);
  if (!operand || !matches.rows.length) return { ...players, truncated: players.truncated || matches.truncated, state: players.state === "ready" && matches.state === "ready" ? "ready" : "unavailable" };
  const joins = await read(db.from("moment_athletes").select(joinColumns).in("moment_id", matches.rows.map(row => row.id)).order("id").limit(101), joinSchema, 100);
  const ids = [...new Set(joins.rows.filter(row => row.status !== "rejected").map(row => row.player_id))];
  const related = ids.length ? await read(db.from("players").select(playerColumns).in("id", ids).order("name").order("id").limit(101), playerSchema, 100) : empty<z.infer<typeof playerSchema>>();
  const rows = [...new Map([...players.rows, ...related.rows].map(row => [row.id, row])).values()];
  return { state: [players, matches, joins, related].every(section => section.state === "ready") ? "ready" : "unavailable", rows: rows.slice(0, 25), truncated: rows.length > 25 || [players, matches, joins, related].some(section => section.truncated) };
}

/** Bounded, complete reviewed graph reads determine the initial priority directory. */
async function priorityDirectory(db: Db, asOf: string): Promise<LabSection<WorkspaceAthleteSummary>> {
  const joins = await read(db.from("moment_athletes").select(joinColumns).eq("status", "verified").order("id").limit(201), joinSchema, 200);
  const momentIds = [...new Set(joins.rows.map(row => row.moment_id))];
  const playerIds = [...new Set(joins.rows.map(row => row.player_id))];
  const [moments, evidence, players] = await Promise.all([
    momentIds.length ? read(db.from("moments").select(momentColumns).in("id", momentIds).order("id").limit(201), momentSchema, 200) : Promise.resolve(empty<z.infer<typeof momentSchema>>()),
    momentIds.length ? read(db.from("intelligence_evidence").select("id,player_id,moment_id,source_id,ingestion_id,fact_type,statement,structured_data,status,confidence").in("moment_id", momentIds).order("id").limit(501), evidenceSchema, 500) : Promise.resolve(empty<z.infer<typeof evidenceSchema>>()),
    playerIds.length ? read(db.from("players").select(playerColumns).in("id", playerIds).order("name").order("id").limit(201), playerSchema, 200) : Promise.resolve(empty<z.infer<typeof playerSchema>>()),
  ]);
  const sourceIds = [...new Set(evidence.rows.map(row => row.source_id))];
  const ingestionIds = [...new Set(evidence.rows.flatMap(row => row.ingestion_id ? [row.ingestion_id] : []))];
  const [sources, ingestions] = await Promise.all([
    sourceIds.length ? read(db.from("intelligence_sources").select("id,name,provider").in("id", sourceIds).order("id").limit(501), sourceSchema, 500) : Promise.resolve(empty<z.infer<typeof sourceSchema>>()),
    ingestionIds.length ? read(db.from("intelligence_ingestions").select("id,locator,fetched_at").in("id", ingestionIds).order("id").limit(501), ingestionSchema, 500) : Promise.resolve(empty<z.infer<typeof ingestionSchema>>()),
  ]);
  const sections = [joins, moments, evidence, players, sources, ingestions];
  const truncated = sections.some(section => section.truncated);
  if (sections.some(section => section.state !== "ready") || truncated) return { state: "unavailable", rows: [], truncated };
  const graphEvidence: GraphEvidence[] = evidence.rows.map(row => {
    const source = sources.rows.find(item => item.id === row.source_id);
    const ingestion = ingestions.rows.find(item => item.id === row.ingestion_id);
    return { id: row.id, athleteId: row.player_id, momentId: row.moment_id, factType: row.fact_type, statement: row.statement, data: projectGraphEvidenceData(row.fact_type, row.structured_data), status: row.status, confidence: row.confidence, ingestionId: row.ingestion_id,
      source: { id: source?.id ?? null, name: source?.name ?? "Source unavailable", provider: source?.provider ?? "unknown", fetchedAt: ingestion?.fetched_at ?? null, locator: ingestion?.locator && isSafeSourceLocator(ingestion.locator) ? ingestion.locator : safeSourceUrl(ingestion?.locator) } };
  });
  const graph: GraphMoment[] = moments.rows.map(row => ({ id: row.id, title: row.title, occurredOn: row.occurred_on, occurredYear: row.occurred_year, datePrecision: row.date_precision, sport: row.sport, eventId: row.event_id, status: row.status, confidence: row.confidence,
    athletes: joins.rows.filter(join => join.moment_id === row.id).map(join => ({ athleteId: join.player_id, relationshipType: join.relationship_type, status: join.status, confidence: join.confidence })), evidence: graphEvidence.filter(item => item.momentId === row.id) }));
  const rows = players.rows.map(player => {
    const evaluated = evaluateGraphIntelligence(graph, player.id, { asOf });
    return summary(player, [...evaluated.signals.map(item => item.score), ...evaluated.opportunities.map(item => item.strength)]);
  }).filter(row => row.hasIntelligence).sort((a, b) => (b.priority ?? -1) - (a.priority ?? -1) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return { state: "ready", rows: rows.slice(0, 25), truncated: rows.length > 25 };
}

function validDay(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? value : null;
}

async function selectedExtras(db: Db, result: WorkspaceResult["result"]): Promise<Pick<WorkspaceResult, "profile" | "profileState" | "media" | "mediaPreviewState" | "content">> {
  const athlete = result.selected;
  if (!athlete) return { profile: null, profileState: "ready", media: empty(), mediaPreviewState: "ready", content: empty() };
  const [profiles, permissions, previews] = await Promise.all([
    read(db.from("players").select("id,headshot_url,image_url,profile_image,current_status,youtube_urls,spotify_url").eq("id", athlete.id).limit(2), profileSchema, 1),
    read(db.from("media").select("id,kind,url,source_url,credits,license_status,public_locker_approved,license_kind,rights_holder").eq("player_id", athlete.id).order("id").limit(101), mediaSchema, 100),
    read(db.from("preview_lockers").select("id,player_id,slug,headshot_url,photos,social").eq("player_id", athlete.id).order("id").limit(2), previewSchema, 1),
  ]);
  const player = profiles.rows[0];
  // Multiple links are an identity conflict; do not silently pick a preview.
  const preview = previews.state === "ready" && !previews.truncated ? previews.rows[0] : null;
  const metadataOnly = "Preview withheld: existing asset approval metadata is unavailable.";
  const media: LabSection<WorkspaceMedia> = { ...athlete.media, rows: athlete.media.rows.map(row => {
    const asset = row.model === "legacy media" ? permissions.rows.find(item => item.id === row.id) : null;
    const resolved = asset ? resolveMediaPermissions(asset, "internal_intelligence_preview") : null;
    return { ...row, previewUrl: resolved?.previewUrl ?? null, sourceUrl: safeWorkspaceUrl(asset?.source_url), credits: asset?.credits ?? null, publicationStatus: asset?.license_status ?? "unverified", permissionReason: resolved?.reason ?? metadataOnly, momentIds: [] };
  }) };
  const knownPortrait = [player?.headshot_url, player?.image_url, player?.profile_image].map(safeWorkspaceUrl).find(Boolean) ?? null;
  const portraitAsset = knownPortrait ? permissions.rows.find(asset => safeWorkspaceUrl(asset.url) === knownPortrait && resolveMediaPermissions(asset, "internal_intelligence_preview").previewUrl) : null;
  // This explicit canonical link permits inspection of the existing private
  // Locker portrait. It conveys neither public eligibility nor ownership.
  const previewPortrait = safeWorkspaceUrl(preview?.headshot_url);
  const portraitUrl = portraitAsset ? knownPortrait : previewPortrait;
  const previewPhoto = preview?.photos.find(entry => entry && typeof entry === "object"
    && safeWorkspaceUrl((entry as Record<string, unknown>).url) === previewPortrait) as Record<string, unknown> | undefined;
  const sports = [...new Set(athlete.moments.rows.map(row => row.sport).filter((sport): sport is string => !!sport))];
  const statusFacts = athlete.evidence.rows.filter(row => row.status === "verified" && row.factType === "career_status");
  const fact = statusFacts.length === 1 ? statusFacts[0] : null;
  const recordedStatus = typeof fact?.data.status === "string" ? fact.data.status : player?.current_status ?? null;
  const date = validDay(fact?.data.statusDate);
  const socials: WorkspaceProfile["socialLinks"] = [];
  // Spotify and YouTube content URLs are media references, not inferred social accounts.
  if (preview) for (const entry of preview.social.slice(0, 12)) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const url = safeWorkspaceUrl(item.sourceUrl);
    const label = typeof item.platform === "string" ? item.platform : null;
    if (url && label && label.length <= 40) socials.push({ label: `${label} content`, url });
  }
  return { profile: { athleteId: athlete.id, portraitUrl, portraitSource: portraitAsset ? "Canonical player image, matched to an approved legacy asset" : previewPortrait ? "Linked private Locker preview (canonical Athlete Career ID)" : null,
    portraitAttribution: { creator: null, owner: portraitAsset?.rights_holder ?? null, credits: portraitAsset?.credits ?? (typeof previewPhoto?.credits === "string" ? previewPhoto.credits : null), sourceUrl: safeWorkspaceUrl(portraitAsset?.source_url ?? previewPhoto?.sourceUrl), license: portraitAsset?.license_kind ?? null },
    status: recordedStatus, statusDate: date, statusDatePrecision: date ? "day" : "unknown", sport: sports.length === 1 ? sports[0] : null,
    email: null, phone: null, socialLinks: socials, lockerHref: preview && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(preview.slug) ? `/preview-lockers/${preview.slug}` : null },
    profileState: profiles.state === "ready" && !profiles.truncated && previews.state === "ready" && !previews.truncated ? "ready" : "unavailable",
    media, mediaPreviewState: permissions.state === "ready" && !permissions.truncated ? "ready" : "unavailable",
    content: { state: athlete.evidence.state, rows: contentItemsFromEvidence(athlete.evidence.rows), truncated: athlete.evidence.truncated } };
}

/** Every service client is constructed only after the established internal-admin gate. */
export async function loadIntelligenceWorkspace(params: { q?: string; athlete?: string; asOf?: string }): Promise<WorkspaceResult> {
  await authorizeIntelligenceLab();
  const db = createServiceClient();
  const query = (params.q ?? "").trim().slice(0, 120);
  const now = new Date().toISOString();
  const day = validDay(params.asOf) ?? now.slice(0, 10);
  const evaluatedAt = new Date(Math.min(Date.parse(`${day}T23:59:59.999Z`), Date.parse(now))).toISOString();
  const [directory, search] = await Promise.all([priorityDirectory(db, evaluatedAt), searchPlayers(db, query)]);
  const selection = params.athlete || (query ? search.rows[0]?.id : directory.rows[0]?.id ?? search.rows[0]?.id);
  // Reuse the existing selected-graph read and its completeness/authentication gates.
  const lab = await loadIntelligenceLab({ athlete: selection, asOf: day });
  const selected = lab.selected;
  const rows = search.rows.map(row => {
    const prioritized = directory.rows.find(item => item.id === row.id);
    if (prioritized) return prioritized;
    if (selected?.id === row.id) return summary(row, [...selected.intelligence.signals.map(item => item.score), ...selected.intelligence.opportunities.map(item => item.strength)], selected.intelligenceState === "ready");
    return summary(row, [], false);
  });
  const portraitIds = [...new Set([...directory.rows, ...rows].map(row => row.id))];
  const portraitRows = portraitIds.length ? await read(db.from("preview_lockers").select("id,player_id,headshot_url").in("player_id", portraitIds).order("id").limit(101), directoryPortraitSchema, 100) : empty<z.infer<typeof directoryPortraitSchema>>();
  if (portraitRows.state === "ready" && !portraitRows.truncated) for (const row of [...directory.rows, ...rows]) {
    const links = portraitRows.rows.filter(item => item.player_id === row.id);
    row.portraitUrl = links.length === 1 ? safeWorkspaceUrl(links[0].headshot_url) : null;
  }
  const result: WorkspaceResult["result"] = { ...lab, query, search: { ...search, rows } };
  const extras = await selectedExtras(db, result);
  return { result, directory, ...extras, momentMediaState: "not_supported" };
}
