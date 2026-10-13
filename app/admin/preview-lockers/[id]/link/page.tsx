import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { previewAdmin, PreviewError } from "@/lib/preview-lockers/server";
import { previewShortLink, validShortLinkAlias } from "@/lib/preview-lockers/short-link";
import { slugify } from "@/lib/preview-lockers/validation";
import { PreviewAccessWindow } from "./PreviewAccessWindow";

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
    db.from("preview_locker_short_links").select("alias,public_access_enabled,access_started_at,access_expires_at,access_extended_at").eq("preview_id", id).maybeSingle(),
    db.from("preview_link_inquiries").select("id,email,feature_requests,created_at,reviewed_at").eq("preview_id", id).order("created_at", { ascending: false }).limit(50),
  ]);
  if (previewError || linkError || inquiriesError) throw new PreviewError("preview_unavailable", 503);
  if (!preview) notFound();

  async function publishLink(formData: FormData) {
    "use server";
    const { id: actionId } = await params;
    if (!z.uuid().safeParse(actionId).success) notFound();
    const alias = formData.get("alias");
    if (typeof alias !== "string" || !validShortLinkAlias(alias)) {
      redirect(`/admin/preview-lockers/${actionId}/link?error=invalid`);
    }
    if (formData.get("rightsConfirmed") !== "on")
      redirect(`/admin/preview-lockers/${actionId}/link?error=rights`);
    const { client: authorizedClient } = await previewAdmin();
    const authorizedDb = authorizedClient as unknown as SupabaseClient;
    const { data: exists, error: existsError } = await authorizedClient.from("preview_lockers")
      .select("id").eq("id", actionId).maybeSingle();
    if (existsError) throw new PreviewError("preview_unavailable", 503);
    if (!exists) notFound();
    const { data: existingLink, error: existingLinkError } = await authorizedDb.from("preview_locker_short_links")
      .select("preview_id").eq("preview_id", actionId).maybeSingle();
    if (existingLinkError) throw new PreviewError("short_link_unavailable", 503);
    const { error } = existingLink
      ? await authorizedDb.from("preview_locker_short_links").update({ alias }).eq("preview_id", actionId)
      : await authorizedDb.from("preview_locker_short_links").insert({ preview_id: actionId, alias });
    if (error) {
      if (error.code === "23505") redirect(`/admin/preview-lockers/${actionId}/link?error=taken`);
      throw new PreviewError("short_link_unavailable", 503);
    }
    // The existing trigger records the high-risk publication change.
    const { data, error: publishError } = await authorizedDb.from("preview_locker_short_links")
      .update({ public_access_enabled: true }).eq("preview_id", actionId)
      .select("preview_id").maybeSingle();
    if (publishError || !data) throw new PreviewError("short_link_unavailable", 503);
    redirect(`/admin/preview-lockers/${actionId}/link?access=enabled`);
  }

  async function renameLink(formData: FormData) {
    "use server";
    const { id: actionId } = await params;
    if (!z.uuid().safeParse(actionId).success) notFound();
    const alias = formData.get("alias");
    if (typeof alias !== "string" || !validShortLinkAlias(alias))
      redirect(`/admin/preview-lockers/${actionId}/link?error=invalid`);
    const { client: authorizedClient } = await previewAdmin();
    const authorizedDb = authorizedClient as unknown as SupabaseClient;
    const { data, error } = await authorizedDb.from("preview_locker_short_links")
      .update({ alias }).eq("preview_id", actionId).eq("public_access_enabled", true)
      .select("preview_id").maybeSingle();
    if (error?.code === "23505") redirect(`/admin/preview-lockers/${actionId}/link?error=taken`);
    if (error) throw new PreviewError("short_link_unavailable", 503);
    if (!data) notFound();
    redirect(`/admin/preview-lockers/${actionId}/link?saved=1`);
  }

  async function unpublishLink() {
    "use server";
    const { id: actionId } = await params;
    if (!z.uuid().safeParse(actionId).success) notFound();
    const { client: authorizedClient } = await previewAdmin();
    const authorizedDb = authorizedClient as unknown as SupabaseClient;
    const { data, error } = await authorizedDb.from("preview_locker_short_links")
      .update({ public_access_enabled: false }).eq("preview_id", actionId)
      .select("preview_id").maybeSingle();
    if (error) throw new PreviewError("short_link_unavailable", 503);
    if (!data) notFound();
    redirect(`/admin/preview-lockers/${actionId}/link?access=disabled`);
  }

  const status = await searchParams;
  const suggested = slugify(preview.full_name);
  const current = typeof link?.alias === "string" ? link.alias : null;
  const published = link?.public_access_enabled === true;
  return <section className="mx-auto max-w-2xl space-y-6 p-6 sm:p-10">
    <Link href="/admin/preview-lockers" className="text-sm underline">Back to previews</Link>
    <h1 className="text-3xl font-semibold">Player invite link</h1>
    <p className="text-slate-300">Publish {preview.full_name}&apos;s reviewed Preview Locker to share it without requiring a player sign-in. The Admin controls stay protected.</p>
    {published && current ? <div className="rounded-lg border border-[#ffbb00]/50 p-4">
      <p className="text-sm text-slate-400">Share this link</p>
      <a className="break-all font-semibold text-[#ffbb00] underline" href={previewShortLink(current)}>{previewShortLink(current)}</a>
    </div> : <p role="status" className="rounded-lg border border-white/20 p-4">Unpublished draft. Its invite link cannot be opened by a visitor yet.</p>}
    {status.error === "invalid" && <p role="alert">Use 3–70 lowercase letters, numbers, or single hyphens, and avoid application routes.</p>}
    {status.error === "taken" && <p role="alert">That short link is already in use. Choose another name.</p>}
    {status.error === "rights" && <p role="alert">Confirm publication rights before publishing.</p>}
    {status.saved === "1" && <p role="status">Invite link updated.</p>}
    {status.access === "enabled" && <p role="status">Published. The first eligible visitor open starts the shared viewing window; publishing preserves any existing deadline.</p>}
    {status.access === "disabled" && <p role="status">Unpublished. Visitor access has stopped.</p>}
    <PreviewAccessWindow key={`${id}:${published}:${link?.access_expires_at ?? "pending"}:${link?.access_extended_at ?? "none"}`} previewId={id} published={published} observedAt={new Date().toISOString()} initialAccess={{
      access_started_at: typeof link?.access_started_at === "string" ? link.access_started_at : null,
      access_expires_at: typeof link?.access_expires_at === "string" ? link.access_expires_at : null,
      access_extended_at: typeof link?.access_extended_at === "string" ? link.access_extended_at : null,
    }} />
    <form action={published ? renameLink : publishLink} className="space-y-4">
      <label className="block space-y-2 text-sm font-semibold" htmlFor="alias"><span>Personalized link name</span>
        <span className="flex items-center gap-2"><span>bltz.me/</span><input id="alias" name="alias" required minLength={3} maxLength={70} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={current ?? suggested} className="h-11 min-w-0 flex-1 rounded-md border border-white/20 bg-background px-3" /></span>
      </label>
      {published ? <p className="text-sm text-slate-400">Changing the name stops the old invite URL from working. Send the updated link afterward.</p> : <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="rightsConfirmed" required className="mt-1" /><span>I confirm BLTZ may publish this Preview Locker and its current photos and videos to anyone with the link.</span></label>}
      <button className="min-h-11 rounded-md bg-[#ffbb00] px-5 font-semibold text-black" type="submit">{published ? "Update link name" : "Publish and create share link"}</button>
    </form>
    {published && <form action={unpublishLink} className="space-y-4 rounded-lg border border-white/20 p-4">
      <h2 className="text-xl font-semibold">Published access</h2>
      <p className="text-sm text-slate-300">Anyone with the link can view this Preview Locker and its media during the viewing window. Unpublishing stops visitor access immediately. Renaming or republishing does not restart the window.</p>
      <button type="submit" className="min-h-11 rounded-md border border-white/30 px-5">Unpublish Locker</button>
    </form>}
    <section className="space-y-3" aria-label="Locker inquiries">
      <h2 className="text-xl font-semibold">Unverified Locker inquiries</h2>
      <p className="text-sm text-slate-400">Email and optional feedback submitted by visitors. Submitted email does not verify identity or Locker ownership. Review it in the enrolled GTM contact before copying it to an empty contact email.</p>
      <Link href="/admin/gtm/funnel" className="inline-block text-sm underline">Review inquiries and follow-up in GTM</Link>
      {inquiries?.length ? <ul className="space-y-3">{inquiries.map((item) =>
        <li key={item.id} className="rounded-lg border border-white/20 p-4">
          <p className="break-all font-semibold">{item.email}</p>
          <p className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString("en-US")}</p>
          <p className="mt-1 text-xs text-slate-400">{item.reviewed_at ? "Email reviewed and copied to the enrolled contact; ownership remains unverified." : "Unverified submission · contact email unchanged"}</p>
          {item.feature_requests && <p className="mt-2 whitespace-pre-wrap text-sm">{item.feature_requests}</p>}
        </li>)}</ul> : <p className="text-sm text-slate-400">No inquiries yet.</p>}
      {(inquiries?.length ?? 0) >= 50 && <p className="text-xs text-slate-400">Showing the latest 50 inquiries.</p>}
    </section>
  </section>;
}
