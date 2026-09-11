import { z } from "zod";

export const attributionCode = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
export const conversionInput = z.object({
  preview_id: z.uuid().nullable(),
  action: z.enum(["state", "view", "photos_view", "film_view", "claim_click", "declined", "claim_submit", "booking_click", "referral_created", "referral_copied", "referral_intake"]),
  request_id: z.uuid(), session_id: z.uuid(),
  data: z.object({
    email: z.email().max(254).optional(), consent: z.boolean().optional(),
    dashboard_interest: z.boolean().optional(), reason: z.string().max(500).optional(),
    full_name: z.string().trim().min(2).max(120).optional(), token: z.uuid().optional(),
    utm: z.object({ utm_source: attributionCode.optional(), utm_medium: attributionCode.optional(), utm_campaign: attributionCode.optional() }).strict().optional(),
  }).strict(),
}).strict().superRefine((v, ctx) => {
  if (v.action !== "referral_intake" && !v.preview_id) ctx.addIssue({code:"custom",message:"Preview required"});
  if (["claim_submit","referral_intake"].includes(v.action) && (!v.data.email || v.data.consent !== true)) ctx.addIssue({code:"custom",message:"Email and permission required"});
  if (v.action === "referral_intake" && (!v.data.token || !v.data.full_name || v.preview_id)) ctx.addIssue({code:"custom",message:"Referral details required"});
});
export type ConversionAction = z.infer<typeof conversionInput>["action"];
export type ConversionData = z.infer<typeof conversionInput>["data"];
export function readAttribution(search: string) {
  const params = new URLSearchParams(search);
  return Object.fromEntries(["utm_source","utm_medium","utm_campaign"].flatMap(key => {
    const value = params.get(key); return attributionCode.safeParse(value).success ? [[key,value!]] : [];
  }));
}
export type FunnelCampaign = { preview_id: string; contact_id: string; sent_at: string | null; is_test: boolean };
export type FunnelEvent = { preview_id: string; kind: string; session_id: string };
export function funnelMetrics(campaigns: FunnelCampaign[], events: FunnelEvent[]) {
  const eligible = campaigns.filter(c => !c.is_test);
  const sent = new Set(eligible.filter(c => c.sent_at).map(c => c.preview_id));
  const selected = new Set(eligible.map(c => c.preview_id));
  const rows = events.filter(e => selected.has(e.preview_id));
  const kinds = ["view","photos_view","film_view","claim_click","accepted","declined","claim_submit","dashboard_interest","booking_click","booking_confirmed","walkthrough_completed","referral_created","referral_copied","referral_submit","referred_prepared","referred_claimed"];
  return { enrolled: eligible.length, athletes: new Set(eligible.map(c => c.contact_id)).size, sent: sent.size,
    eventCount: rows.length, sessions: new Set(rows.filter(e => ["view","photos_view","film_view"].includes(e.kind)).map(e => `${e.preview_id}:${e.session_id}`)).size,
    stages: kinds.map(kind => ({kind, previews: new Set(rows.filter(e => e.kind === kind).map(e => e.preview_id)).size,
      numerator: new Set(rows.filter(e => e.kind === kind && sent.has(e.preview_id)).map(e => e.preview_id)).size, denominator: sent.size,
      events: rows.filter(e => e.kind === kind).length})),
  };
}
