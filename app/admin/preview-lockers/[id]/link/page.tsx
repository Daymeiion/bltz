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
  searchParams: Promise<{ error?: string; saved?: string; access?: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { client } = await previewAdmin();
  const db = client as unknown as SupabaseClient;
  const [{ data: preview, error: previewError }, { data: link, error: linkError }, { data: inquiries, error: inquiriesError }] = await Promise.all([
    client.from("preview_lockers").select("id,slug,full_name").eq("id", id).maybeSingle(),
    db.from("preview_locker_short_links").select("alias,public_access_enabled").eq("preview_id", id).maybeSingle(),
    db.from("preview_link_inquiries").select("email,feature_requests,created_at").eq("preview_id", id).order("created_at", { ascending: false }).limit(50),
  ]);
  if (previewError || linkError || inquiriesError) throw new PreviewError("preview_unavailable", 503);
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

  async function setLinkAccess(formData: FormData) {
    "use server";
    const { id: actionId } = await params;
    if (!z.uuid().safeParse(actionId).success) notFound();
    const enabled = formData.get("enabled") === "true";
    if (enabled && formData.get("rightsConfirmed") !== "on")
      redirect(`/admin/preview-lockers/${actionId}/link?error=rights`);
    const { client: authorizedClient } = await previewAdmin();
    const authorizedDb = authorizedClient as unknown as SupabaseClient;
    const { data, error } = await authorizedDb.from("preview_locker_short_links")
      .update({ public_access_enabled: enabled }).eq("preview_id", actionId)
      .select("preview_id").maybeSingle();
    if (error) throw new PreviewError("short_link_unavailable", 503);
    if (!data) notFound();
    redirect(`/admin/preview-lockers/${actionId}/link?access=${enabled ? "enabled" : "disabled"}`);
  }

  const status = await searchParams;
  const suggested = slugify(preview.full_name);
  const current = typeof link?.alias === "string" ? link.alias : null;
  return <section className="mx-auto max-w-2xl space-y-6 p-6 sm:p-10">
    <Link href="/admin/preview-lockers" className="text-sm underline">Back to previews</Link>
    <h1 className="text-3xl font-semibold">Player invite link</h1>
    <p className="text-slate-300">Set a short link for {preview.full_name}. You can permit link-only viewing after confirming publication rights for its current media.</p>
    {current && <div className="rounded-lg border border-white/20 p-4">
      <p className="text-sm text-slate-400">Share this link</p>
      <a className="break-all font-semibold text-[#ffbb00] underline" href={previewShortLink(current)}>{previewShortLink(current)}</a>
    </div>}
    {status.error === "invalid" && <p role="alert">Use 3–70 lowercase letters, numbers, or single hyphens, and avoid application routes.</p>}
    {status.error === "taken" && <p role="alert">That short link is already in use. Choose another name.</p>}
    {status.error === "rights" && <p role="alert">Confirm publication rights before enabling link access.</p>}
    {status.saved === "1" && <p role="status">Invite link saved.</p>}
    {status.access === "enabled" && <p role="status">Link access enabled. Anyone with this URL can view the Locker.</p>}
    {status.access === "disabled" && <p role="status">Link access disabled.</p>}
    <form action={saveLink} className="space-y-4">
      <label className="block space-y-2 text-sm font-semibold" htmlFor="alias"><span>Personalized link name</span>
        <span className="flex items-center gap-2"><span>bltz.me/</span><input id="alias" name="alias" required minLength={3} maxLength={70} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={current ?? suggested} className="h-11 min-w-0 flex-1 rounded-md border border-white/20 bg-background px-3" /></span>
      </label>
      <p className="text-sm text-slate-400">Changing a saved name will stop the old link from working. Send the new link to the player after saving.</p>
      <button className="min-h-11 rounded-md bg-[#ffbb00] px-5 font-semibold text-black" type="submit">Save link</button>
    </form>
    {current && <form action={setLinkAccess} className="space-y-4 rounded-lg border border-white/20 p-4">
      <h2 className="text-xl font-semibold">Link access</h2>
      <p className="text-sm text-slate-300">{link?.public_access_enabled
        ? "Anyone with this link can view the full Preview Locker and its media."
        : "Only an assigned viewer or BLTZ admin can open this Locker."}</p>
      {link?.public_access_enabled ? <>
        <input type="hidden" name="enabled" value="false" />
        <button type="submit" className="min-h-11 rounded-md border border-white/30 px-5">Disable link access</button>
      </> : <>
        <input type="hidden" name="enabled" value="true" />
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="rightsConfirmed" required className="mt-1" />
          <span>I confirm BLTZ may publish this Preview Locker and its current photos and videos to anyone with the link.</span>
        </label>
        <button type="submit" className="min-h-11 rounded-md bg-[#ffbb00] px-5 font-semibold text-black">Enable link access</button>
      </>}
    </form>}
    <section className="space-y-3" aria-label="Locker inquiries">
      <h2 className="text-xl font-semibold">Player inquiries</h2>
      <p className="text-sm text-slate-400">Email and optional feedback submitted through this Locker. Review identity before assigning viewer access.</p>
      {inquiries?.length ? <ul className="space-y-3">{inquiries.map((item) =>
        <li key={item.email} className="rounded-lg border border-white/20 p-4">
          <p className="break-all font-semibold">{item.email}</p>
          <p className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString("en-US")}</p>
          {item.feature_requests && <p className="mt-2 whitespace-pre-wrap text-sm">{item.feature_requests}</p>}
        </li>)}</ul> : <p className="text-sm text-slate-400">No inquiries yet.</p>}
    </section>
  </section>;
}
