import { createHash } from "node:crypto";
import { z } from "zod";
import { previewAdmin, readBody, json, failure, PreviewError, PREVIEW_COLUMNS } from "@/lib/preview-lockers/server";
import { previewRecord } from "@/lib/preview-lockers/validation";
import { previewIdentityKey, previewNewsIdentity, withSchoolAliases } from "@/lib/preview-lockers/enrichment";
import { configuredSearchProvider } from "@/lib/enrichment/search-provider";
import { discoverCombine, combineSearchPlan } from "@/lib/enrichment/combine";
import { fetchCombineResults } from "@/lib/enrichment/safe-fetch";

export const runtime = "nodejs";
export const maxDuration = 60;
/** Returns review suggestions only. Never updates any Locker content. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await previewAdmin(); const { id } = await params;
    const input = z.object({ revision: z.number().int().positive() }).strict().safeParse(await readBody(req, 256));
    if (!z.uuid().safeParse(id).success || !input.success) throw new PreviewError("invalid_input", 400);
    const saved = await client.from("preview_lockers").select(PREVIEW_COLUMNS).eq("id", id).maybeSingle();
    if (saved.error) throw new PreviewError("preview_unavailable", 503);
    if (!saved.data) throw new PreviewError("preview_not_found", 404);
    const row = previewRecord.parse(saved.data);
    if (row.revision !== input.data.revision) throw new PreviewError("preview_conflict", 409);
    const provider = configuredSearchProvider({ reviewTitles: true });
    if (!provider) throw new PreviewError("search_not_configured", 503);
    const identity = await withSchoolAliases(client, previewNewsIdentity(row));
    if (!combineSearchPlan(identity).length) throw new PreviewError("combine_identity_incomplete", 400);
    const admission = await client.rpc("admit_preview_discovery", { p_identity_hash: createHash("sha256").update(`combine:${previewIdentityKey(row)}`).digest("hex") });
    if (admission.error || !admission.data) throw new PreviewError("combine_rate_limited", 429);
    let succeeded = false;
    try {
      const result = await discoverCombine(identity, provider, fetchCombineResults, AbortSignal.any([req.signal, AbortSignal.timeout(45_000)]));
      const current = await client.from("preview_lockers").select("revision").eq("id", id).maybeSingle();
      if (current.error) throw new PreviewError("preview_unavailable", 503);
      if (!current.data || current.data.revision !== row.revision) throw new PreviewError("preview_conflict", 409);
      succeeded = result.status !== "unavailable";
      return json({ revision: row.revision, result }, succeeded ? 200 : 503);
    } finally { await client.rpc("finalize_preview_discovery", { p_request_id: admission.data, p_succeeded: succeeded }); }
  } catch (error) { return failure(error); }
}
