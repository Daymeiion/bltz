import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { PreviewLockerRow } from "./types";
import { resolvePreviewPhotos } from "./photos";

export async function readPrivatePreview(slug: string, options: { photoLimit?: number; photoOffset?: number } = {}) {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(`/preview-lockers/${slug}`)}`);
  const { data: isAdmin, error: authError } = await session.rpc("is_internal_admin");
  if (authError || isAdmin !== true) notFound();

  // Preview tables are service-only in the deployed schema. Verify the caller
  // against the database's admin predicate before constructing this client.
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("preview_lockers").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error("Unable to load the private preview. Please try again.");
  if (!data) notFound();
  const row = data as PreviewLockerRow;
  const resolved = await resolvePreviewPhotos(supabase, row.photos, {
    limit: options.photoLimit ?? 0,
    offset: options.photoOffset,
  });
  return {
    supabase,
    data: { ...row, photos: resolved.photos, photo_count: resolved.total },
  };
}
