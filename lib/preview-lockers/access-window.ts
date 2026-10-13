import { z } from "zod";

export const previewWindowSchema = z.object({
  state: z.enum(["unavailable", "pending", "active", "expired"]),
  remaining_seconds: z.number().int().nonnegative(),
  access_started_at: z.string().nullable().optional(),
  access_expires_at: z.string().nullable().optional(),
  access_extended_at: z.string().nullable().optional(),
});
export type PreviewWindow = z.infer<typeof previewWindowSchema>;
export const previewExtensionInput = z.object({ reason: z.string().trim().min(10).max(500), requestId: z.uuid().optional() }).strict();

/** Browser admission is independent of analytics configuration and transport. */
export function isExcludedPreviewStart(request: Request) {
  return request.headers.has("next-router-prefetch")
    || /prefetch|prerender/i.test([request.headers.get("purpose"), request.headers.get("sec-purpose")].join(" "))
    || /bot|crawler|spider|headless|monitor|uptime|facebookexternalhit|preview|whatsapp/i.test(request.headers.get("user-agent") ?? "")
    || request.headers.get("sec-fetch-site") !== "same-origin"
    || request.headers.get("sec-fetch-dest") !== "empty";
}
