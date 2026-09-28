import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { isPublicPreview } from "@/lib/preview-lockers/server";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const inputSchema = z.object({
  previewId: z.uuid(),
  email: z.email().max(254),
  featureRequests: z.string().max(2000).optional(),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
});

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (request.headers.get("origin") !== url.origin || request.headers.get("sec-fetch-site") === "cross-site")
    return Response.json({ error: "invalid_origin" }, { status: 403, headers });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return Response.json({ error: "invalid_content_type" }, { status: 415, headers });
  if (Number(request.headers.get("content-length")) > 4096)
    return Response.json({ error: "payload_too_large" }, { status: 413, headers });
  let input: unknown;
  try {
    const body = await request.text();
    if (body.length > 4096) throw new Error("large");
    input = JSON.parse(body);
  } catch {
    return Response.json({ error: "invalid_input" }, { status: 400, headers });
  }
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400, headers });
  const service = createServiceClient();
  const { previewId, featureRequests } = parsed.data;
  try {
    if (!await isPublicPreview(service, previewId))
      return Response.json({ error: "not_found" }, { status: 404, headers });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503, headers });
  }
  const { error } = await service.from("preview_link_inquiries").insert({
    preview_id: previewId,
    email: parsed.data.email.trim().toLowerCase(),
    feature_requests: featureRequests?.trim() || null,
  });
  if (error && error.code !== "23505")
    return Response.json({ error: "unavailable" }, { status: 503, headers });
  return Response.json({ saved: true }, { headers });
}
