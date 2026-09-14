import { conversionInput } from "@/lib/preview-lockers/conversion";
import { failure, json, previewAccess, PreviewError, readBody } from "@/lib/preview-lockers/server";
import type { ConversionDatabase } from "@/types/preview-conversion.generated";

export async function POST(req: Request) {
  try {
    if (process.env.PREVIEW_CONVERSION_ENABLED !== "true") throw new PreviewError("not_found", 404);
    const input = conversionInput.safeParse(await readBody(req, 16384));
    if (!input.success) throw new PreviewError("invalid_input", 400);
    const { client, isAdmin } = await previewAccess();
    if (isAdmin) return json({ excluded: true });
    if (req.headers.has("next-router-prefetch") || /prefetch/i.test(req.headers.get("purpose") || "") || /bot|crawler|spider/i.test(req.headers.get("user-agent") || "")) return json({ excluded: true });
    const value = input.data;
    if (value.action === "claim_submit") {
      // Do not acknowledge new request fields against an older RPC that would discard them.
      const readiness = await client.rpc("preview_media_ttl", { p_preview: value.preview_id });
      if (readiness.error) throw new PreviewError("conversion_unavailable", 503);
      if (typeof readiness.data !== "number" || readiness.data <= 0) throw new PreviewError("preview_expired", 403);
    }
    // PostgreSQL permits null for referral intake; CLI function types omit argument nullability.
    const args: Omit<ConversionDatabase["public"]["Functions"]["preview_conversion"]["Args"], "p_preview"> & {p_preview:string|null} = { p_preview: value.preview_id, p_action: value.action, p_request: value.request_id, p_session: value.session_id, p_data: value.data };
    const { data, error } = await client.rpc("preview_conversion", args);
    if (error) throw new PreviewError(error.code === "22023" ? "invalid_or_conflicting_response" : error.code === "54000" ? "rate_limited" : "conversion_unavailable", error.code === "42501" ? 403 : error.code === "22023" ? 409 : error.code === "54000" ? 429 : 503);
    return json(data);
  } catch (error) { return failure(error); }
}
