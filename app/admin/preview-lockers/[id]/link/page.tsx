import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { previewAdmin, PreviewError } from "@/lib/preview-lockers/server";
import { previewShortLink, validShortLinkAlias } from "@/lib/preview-lockers/short-link";
import { slugify } from "@/lib/preview-lockers/validation";

export const dynamic = "force-dynamic";

export default async function PreviewLinkPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { client } = await previewAdmin();
  const db = client as unknown as SupabaseClient;
  const [{ data: preview, error: previewError }, { data: link, error: linkError }] = await Promise.all([
    client.from("preview_lockers").select("id,slug,full_name").eq("id", id).maybeSingle(),
    db.from("preview_locker_short_links").select("alias").eq("preview_id", id).maybeSingle(),
  ]);
  if (previewError || linkError) throw new PreviewError("preview_unavailable", 503);
  if (!preview) notFound();

  async function saveLink(formData: FormData) {
    "use server";
    const { id: actionId } = await params;
    if (!z.uuid().safeParse(actionId).success) notFound();
    const alias = formData.get("alias");
    if (typeof alias !== "string" || !validShortLinkAlias(alias)) {
      redirect(`/admin/preview-lockers/${actionId}/link?error=invalid`);
    }
    const { client: authorizedClient } = await previewAdmin();
    const authorizedDb = authorizedClient as unknown as SupabaseClient;
    const { data: exists, error: existsError } = await authorizedClient.from("preview_lockers")
      .select("id").eq("id", actionId).maybeSingle();
    if (existsError) throw new PreviewError("preview_unavailable", 503);
    if (!exists) notFound();
    const { error } = await authorizedDb.from("preview_locker_short_links")
      .upsert({ preview_id: actionId, alias }, { onConflict: "preview_id" });
    if (error) {
      if (error.code === "23505") redirect(`/admin/preview-lockers/${actionId}/link?error=taken`);
      throw new PreviewError("short_link_unavailable", 503);
    }
    redirect(`/admin/preview-lockers/${actionId}/link?saved=1`);
  }

  const status = await searchParams;
  const suggested = slugify(preview.full_name);
  const current = typeof link?.alias === "string" ? link.alias : null;
  return <section className="mx-auto max-w-2xl space-y-6 p-6 sm:p-10">
    <Link href="/admin/preview-lockers" className="text-sm underline">Back to previews</Link>
    <h1 className="text-3xl font-semibold">Player invite link</h1>
    <p className="text-slate-300">Set a short link for {preview.full_name}. The link opens the private preview at its Vercel address; only the assigned viewer or BLTZ admins can see the Locker.</p>
    {current && <div className="rounded-lg border border-white/20 p-4">
      <p className="text-sm text-slate-400">Share this link</p>
      <a className="break-all font-semibold text-[#ffbb00] underline" href={previewShortLink(current)}>{previewShortLink(current)}</a>
    </div>}
    {status.error === "invalid" && <p role="alert">Use 3–70 lowercase letters, numbers, or single hyphens, and avoid application routes.</p>}
    {status.error === "taken" && <p role="alert">That short link is already in use. Choose another name.</p>}
    {status.saved === "1" && <p role="status">Invite link saved.</p>}
    <form action={saveLink} className="space-y-4">
      <label className="block space-y-2 text-sm font-semibold" htmlFor="alias"><span>Personalized link name</span>
        <span className="flex items-center gap-2"><span>bltz.me/</span><input id="alias" name="alias" required minLength={3} maxLength={70} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={current ?? suggested} className="h-11 min-w-0 flex-1 rounded-md border border-white/20 bg-background px-3" /></span>
      </label>
      <p className="text-sm text-slate-400">Changing a saved name will stop the old link from working. Send the new link to the player after saving.</p>
      <button className="min-h-11 rounded-md bg-[#ffbb00] px-5 font-semibold text-black" type="submit">Save link</button>
    </form>
  </section>;
}
