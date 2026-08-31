import { createPreview, previewRecord, equivalentPreview } from "@/lib/preview-lockers/validation";
import { previewAdmin, readBody, json, failure, PreviewError, PREVIEW_COLUMNS } from "@/lib/preview-lockers/server";
import type { PreviewDatabase } from "@/types/preview-lockers.generated";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  try {
    const { client } = await previewAdmin();
    const parsed = createPreview.safeParse(await readBody(req));
    if (!parsed.success) throw new PreviewError("invalid_input", 400);
    const { id, content } = parsed.data;
    const insert: PreviewDatabase["public"]["Tables"]["preview_lockers"]["Insert"] = { id, ...content };
    const { data, error } = await client.from("preview_lockers").insert(insert).select(PREVIEW_COLUMNS).single();
    if (error?.code === "23505") {
      // Retry returns an identical saved create, never overwrites another slug or later edits.
      const existing = await client.from("preview_lockers").select(PREVIEW_COLUMNS).eq("id", id).maybeSingle();
      if (!existing.error && existing.data) {
        const row = previewRecord.parse(existing.data);
        if (row.revision === 1 && Object.entries(content).every(([key, value]) => equivalentPreview(row[key as keyof typeof row], value))) return json({ id: row.id, slug: row.slug, revision: row.revision });
      }
      throw new PreviewError("preview_conflict", 409);
    }
    if (error || !data) throw new PreviewError("could_not_create", 503);
    return json({ id: data.id, slug: data.slug, revision: data.revision }, 201);
  } catch (error) { return failure(error); }
}
