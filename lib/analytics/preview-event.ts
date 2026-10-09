import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAnalyticsRuntimeEnvironment } from "./bltz-event";
import { consumeAnalyticsRateLimits } from "./server";

export const previewEventInputSchema = z.object({
  previewId: z.uuid(), eventId: z.uuid(), sessionId: z.uuid(),
  eventName: z.enum(["locker_view", "photos_view", "film_view", "photo_open", "video_open", "video_play", "video_progress", "video_complete", "stats_view", "claim_click", "referral_link_copied"]),
  assetId: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/).optional(),
  progress: z.union([z.literal(25), z.literal(50), z.literal(75)]).optional(),
}).strict().superRefine((event, ctx) => {
  const media = ["photo_open", "video_open", "video_play", "video_progress", "video_complete"].includes(event.eventName);
  if (media !== !!event.assetId || (event.eventName === "video_progress") !== (event.progress !== undefined)) ctx.addIssue({ code: "custom", message: "invalid_media_context" });
});

export function isOperationalPreviewRequest(request: Request) {
  return /bot|crawler|spider|headless|monitor|uptime/i.test(request.headers.get("user-agent") ?? "")
    || /prefetch|prerender/i.test(`${request.headers.get("purpose") ?? ""} ${request.headers.get("sec-purpose") ?? ""}`)
    || request.headers.has("next-router-prefetch");
}

/** Auth is verified on the server; an input cannot supply a user, Player, scope or environment. */
export async function previewAnalyticsActor(request: Request) {
  if (isOperationalPreviewRequest(request)) return { userId: null, excluded: true };
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  // Missing/expired cookies may use an approved public link. Unexpected auth failures fail closed.
  if (error && error.name !== "AuthSessionMissingError" && error.status !== 401 && error.status !== 400) throw new Error("preview_actor_unavailable");
  if (!user) return { userId: null, excluded: false };
  const internal = await client.rpc("is_internal_admin");
  if (internal.error) throw new Error("preview_actor_unavailable");
  return { userId: user.id, excluded: internal.data === true };
}

export async function recordPreviewEvent(request: Request, input: z.infer<typeof previewEventInputSchema>) {
  const environment = getAnalyticsRuntimeEnvironment();
  if (!environment || isOperationalPreviewRequest(request)) return { accepted: false, excluded: true };
  const actor = await previewAnalyticsActor(request);
  if (actor.excluded) return { accepted: false, excluded: true };
  const limited = await consumeAnalyticsRateLimits({ request, sessionId: input.sessionId, userId: actor.userId });
  if (!limited) return { error: "rate_limited", status: 429 };
  const { data, error } = await createServiceClient().rpc("record_preview_analytics_event", {
    p_input: input, p_actor: actor.userId, p_environment: environment,
  }).abortSignal(AbortSignal.timeout(10_000));
  if (error) {
    if (error.code === "42501") return { error: "not_found", status: 404 };
    if (error.code === "22023") return { error: "invalid_event", status: 400 };
    if (error.code === "54000") return { error: "rate_limited", status: 429 };
    throw new Error("preview_analytics_unavailable");
  }
  return z.object({ accepted: z.boolean(), excluded: z.boolean().optional(), duplicate: z.boolean().optional(), eventId: z.uuid().optional() }).strict().parse(data);
}
