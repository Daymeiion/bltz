import { z } from "zod";
import type { TrustedAnalyticsEvent } from "./server";

/** V1 compatibility definitions do not relabel historical opens as playback. */
export const legacyBLTZEventSchema = z.object({
  event_id: z.string().uuid(), schema_version: z.literal(1),
  event_name: z.string().regex(/^[a-z][a-z0-9_]{0,79}$/),
  event_version: z.literal("legacy-v1"),
  occurred_at: z.string().datetime({ offset: true }), received_at: z.string().datetime({ offset: true }),
  environment: z.enum(["development", "production", "preview", "synthetic"]),
  surface: z.enum(["public_locker", "athlete_dashboard", "onboarding", "internal_lab", "preview", "synthetic", "server_workflow"]),
  producer: z.literal("bltz_collector"),
  actor_kind: z.enum(["anonymous", "authenticated", "internal", "operational"]),
  measurement_basis: z.enum(["unverified_client", "server_workflow", "legacy_alias"]),
  audience_eligible: z.boolean(), subject_player_id: z.string().uuid().nullable(),
  moment_id: z.string().uuid().nullable(), asset_id: z.string().uuid().nullable(),
  asset_model: z.enum(["legacy_media", "legacy_video", "media_asset"]).nullable(),
  session_id: z.string().uuid().nullable(),
  scope_key: z.enum(["public_audience", "internal_admin"]),
  source_channel: z.literal("unknown"),
  properties: z.object({ legacy_event_name: z.string(), definition: z.string(),
    requested_use: z.enum(["license", "print"]).optional(),
  }).strict(),
}).strict().superRefine((event, ctx) => {
  if (!!event.asset_id !== !!event.asset_model) ctx.addIssue({ code: "custom", message: "qualified asset identity required" });
  if (event.audience_eligible && (event.surface !== "public_locker" || !event.subject_player_id || !event.session_id || event.actor_kind === "internal" || event.actor_kind === "operational" || event.measurement_basis !== "unverified_client")) {
    ctx.addIssue({ code: "custom", message: "invalid audience eligibility" });
  }
});
/** Preview identities/media are opaque experiment context, never canonical Player/asset bindings. */
export const previewSprintEventSchema = z.object({
  event_id: z.string().uuid(), schema_version: z.literal(1),
  event_name: z.string().regex(/^preview_[a-z][a-z0-9_]{0,79}$/),
  event_version: z.literal("preview-sprint-v1"),
  occurred_at: z.string().datetime({ offset: true }), received_at: z.string().datetime({ offset: true }),
  environment: z.enum(["development", "production"]), surface: z.literal("preview"),
  producer: z.literal("bltz_collector"), actor_kind: z.enum(["anonymous", "authenticated", "operational"]),
  measurement_basis: z.enum(["unverified_client", "server_workflow"]), audience_eligible: z.literal(false),
  subject_player_id: z.null(), moment_id: z.null(), asset_id: z.null(), asset_model: z.null(),
  session_id: z.string().uuid().nullable(), scope_key: z.literal("preview_sprint"), source_channel: z.literal("unknown"),
  properties: z.object({
    preview_id: z.string().uuid(), event_kind: z.enum([
      "locker_view", "photos_view", "film_view", "photo_open", "video_open", "video_play", "video_progress", "video_complete", "stats_view", "claim_click", "referral_link_copied",
      "sent", "accepted", "declined", "claim_submit", "dashboard_interest", "booking_click", "booking_confirmed", "walkthrough_completed", "referral_created", "referral_copied", "referral_submit", "referred_prepared", "referred_claimed",
    ]),
    media_id: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/).optional(),
    progress: z.union([z.literal(25), z.literal(50), z.literal(75)]).optional(),
  }).strict(),
}).strict().superRefine((event, ctx) => {
  if (event.event_name !== `preview_${event.properties.event_kind}`) ctx.addIssue({ code: "custom", message: "preview definition mismatch" });
  const mediaEvent = ["photo_open", "video_open", "video_play", "video_progress", "video_complete"].includes(event.properties.event_kind);
  if (mediaEvent !== !!event.properties.media_id || (event.properties.event_kind === "video_progress") !== (event.properties.progress !== undefined)) {
    ctx.addIssue({ code: "custom", message: "invalid preview media context" });
  }
  if (event.measurement_basis === "unverified_client" && (!event.session_id || event.actor_kind === "operational")) ctx.addIssue({ code: "custom", message: "preview session required" });
});
export const bltzEventSchema = z.union([legacyBLTZEventSchema, previewSprintEventSchema]);
export type BLTZEvent = z.infer<typeof bltzEventSchema>;
export type LegacyBLTZEvent = z.infer<typeof legacyBLTZEventSchema>;

export type AnalyticsRuntimeEnvironment = "development" | "production";

/** Environment identity comes only from server deployment settings, never an event or request. */
export function getAnalyticsRuntimeEnvironment(env: Record<string, string | undefined> = process.env): AnalyticsRuntimeEnvironment | null {
  if (env.BLTZ_ANALYTICS_PIPELINE_ENABLED !== "true") return null;
  if (env.BLTZ_ANALYTICS_ENVIRONMENT === "development" && env.VERCEL_ENV !== "production") return "development";
  if (env.BLTZ_ANALYTICS_ENVIRONMENT === "production" && env.VERCEL_ENV === "production"
    && env.BLTZ_ANALYTICS_PRODUCTION_ENABLED === "true") return "production";
  return null;
}

export function analyticsPipelineEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return getAnalyticsRuntimeEnvironment(env) !== null;
}

/** Preserve the old development-only meaning for callers that have not adopted production scope. */
export function developmentAnalyticsEnabled(): boolean { return getAnalyticsRuntimeEnvironment() === "development"; }

/** Export only reviewed definitions, never arbitrary properties or account IDs. */
export function toBLTZEvent(event: TrustedAnalyticsEvent, receivedAt = new Date().toISOString(), environment: AnalyticsRuntimeEnvironment = "development"): LegacyBLTZEvent {
  if (environment !== "development" && environment !== "production") throw new Error("analytics_environment_invalid");
  const alias = event.eventName === "locker_shared" && (event.properties?.mechanism === "clipboard" || event.properties?.method === "copy_link");
  const name = event.eventName === "media_viewed" ? "media_opened" : alias ? "share_intent_alias" : event.eventName === "locker_shared" ? "share_intent" : event.eventName;
  const publicAudience = event.source === "public_locker" && event.activityClass !== "internal" && event.activityClass !== "operational";
  return legacyBLTZEventSchema.parse({
    event_id: event.clientEventId, schema_version: 1, event_name: name, event_version: "legacy-v1",
    occurred_at: event.occurredAt ?? receivedAt, received_at: receivedAt, environment,
    surface: event.source === "beta_feedback" ? "athlete_dashboard" : event.source,
    producer: "bltz_collector", actor_kind: event.activityClass ?? (event.userId ? "authenticated" : "anonymous"),
    measurement_basis: alias ? "legacy_alias" : event.source === "public_locker" ? "unverified_client" : "server_workflow",
    audience_eligible: publicAudience && !alias && !!event.athleteId && !!event.sessionId,
    subject_player_id: event.athleteId ?? null, moment_id: event.validatedContext?.momentId ?? null,
    asset_id: event.validatedContext?.assetId ?? null, asset_model: event.validatedContext?.assetModel ?? null,
    session_id: event.sessionId ?? null, scope_key: publicAudience ? "public_audience" : "internal_admin",
    source_channel: "unknown",
    properties: { legacy_event_name: event.eventName, definition: event.eventName === "media_viewed" ? "legacy selection/detail open; exposure and playback unknown" : alias ? "clipboard alias excluded; share_link_copied records the intent" : event.eventName === "locker_shared" || event.eventName === "share_link_copied" ? "share intent; downstream distribution unknown" : "legacy tab-session intent; not people or returning visitors" },
  });
}
