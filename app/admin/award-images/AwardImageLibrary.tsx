"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { IMAGE_LIMIT, imageType, type AwardImage, type AwardImageLibrary as Library } from "@/lib/award-images/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type UploadItem = { name: string; status: string };
async function responseJson(response: Response) {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.replaceAll("_", " ") || "Request failed. Try again.");
  return body;
}

export default function AwardImageLibrary() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [showRemoved, setShowRemoved] = useState(false);
  const [removing, setRemoving] = useState<AwardImage | null>(null);
  const load = useCallback(async () => {
    setLibrary(await responseJson(await fetch("/api/admin/award-images", { cache: "no-store" })));
  }, []);
  useEffect(() => { void load().catch(() => setError("Could not load images. Try refreshing below.")); }, [load]);

  async function upload(files: File[]) {
    if (busy || !files.length) return;
    setBusy(true); setError(""); setMessage("");
    setQueue(files.map(file => ({ name: file.name, status: "Waiting" })));
    let saved = 0, duplicates = 0, failed = 0;
    for (const [index, file] of files.entries()) {
      const update = (status: string) => setQueue(items => items.map((item, i) => i === index ? { ...item, status } : item));
      if (file.size > IMAGE_LIMIT || !/\.(png|jpe?g|webp)$/i.test(file.name)) {
        update("Skipped: use PNG, JPG or WebP, up to 10 MB each."); failed++; continue;
      }
      update("Uploading…");
      try {
        const bytes = await file.arrayBuffer(), type = imageType(new Uint8Array(bytes));
        if (!type) throw new Error("Invalid image");
        const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map(value => value.toString(16).padStart(2, "0")).join("");
        const claim = { sha256, mime: type.mime, size: file.size, original_filename: file.name };
        const ticket = await responseJson(await fetch("/api/admin/award-images/uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(claim) }));
        let result = ticket;
        if (!ticket.duplicate) {
          const uploaded = await createClient().storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: type.mime });
          if (uploaded.error && !/already exists|duplicate/i.test(uploaded.error.message)) throw new Error("Upload failed");
          const details = { title: file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").slice(0, 160) || "Award image", image_source_url: null, image_license: null, attribution: null, asset_status: "placeholder", active: true };
          result = await responseJson(await fetch("/api/admin/award-images/uploads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...claim, details }) }));
        }
        if (result.duplicate) { duplicates++; update("Already in library"); }
        else { saved++; update("Saved"); }
      } catch { failed++; update("Upload failed. Select this file again to retry."); }
    }
    try { await load(); } catch { setError("Uploads finished, but images could not refresh. Refresh below to see saved images."); }
    setMessage(`${saved} uploaded · ${duplicates} already saved · ${failed} skipped or failed.`);
    setBusy(false);
  }

  async function changeActive(image: AwardImage, active: boolean) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await responseJson(await fetch(`/api/admin/award-images/${image.id}`, {
        method: active ? "PATCH" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision: image.revision, ...(active ? { active: true } : {}) }),
      }));
      setLibrary(current => current ? { ...current, images: current.images.map(item => item.id === image.id ? { ...item, active: result.active, revision: result.revision } : item) } : current);
      setRemoving(null);
      setMessage(`“${image.title}” ${active ? "restored to" : "removed from"} the library.`);
    } catch (cause) {
      setError(cause instanceof Error && cause.message === "award image changed"
        ? "This image changed. Cancel and refresh the library before trying again."
        : `Could not ${active ? "restore" : "remove"} this image. Try again.`);
    } finally { setBusy(false); }
  }

  const images = library?.images.filter(image => (showRemoved || image.active) && `${image.title} ${image.original_filename ?? ""}`.toLowerCase().includes(query.toLowerCase())) ?? [];
  const imageCount = library?.images.filter(image => showRemoved || image.active).length;
  return <div className="mx-auto max-w-7xl space-y-7 p-4 md:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="font-oswald text-3xl font-bold uppercase">Award Image Library</h1><p className="mt-2 text-sm text-muted-foreground">Upload images, then choose one for each award in the preview builder.</p></div>
      <Link href="/admin/preview-lockers" className="text-sm underline">Preview Lockers</Link>
    </header>
    <section className="space-y-4 rounded-lg border bg-card p-5" aria-label="Award image uploads">
      <h2 className="text-xl font-semibold">Upload images</h2>
      <p className="text-sm text-muted-foreground">Choose multiple PNG, JPG or WebP images. Up to 10 MB each.</p>
      <Input aria-label="Upload award images" type="file" multiple accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => { void upload(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      {queue.length > 0 && <details open={busy}><summary className="cursor-pointer text-sm">Upload progress ({queue.length} files)</summary><ul className="mt-3 max-h-56 overflow-auto text-sm" aria-live="polite">{queue.map((item, index) => <li className="flex flex-wrap justify-between gap-2 border-b py-2" key={index}><span className="break-all">{item.name}</span><span>{item.status}</span></li>)}</ul></details>}
    </section>
    {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    <section aria-label="Stored award images" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">All images{library ? ` (${imageCount})` : ""}</h2><div className="flex max-w-full gap-2"><Input aria-label="Search award images" placeholder="Search images" value={query} onChange={e => setQuery(e.target.value)} /><Button type="button" variant="outline" disabled={busy} onClick={() => { setError(""); void load().catch(() => setError("Could not refresh images.")); }}>Refresh</Button></div></div>
      <label className="flex w-fit items-center gap-2 text-sm"><input type="checkbox" checked={showRemoved} disabled={busy} onChange={e => setShowRemoved(e.target.checked)} />Show removed images</label>
      {!library && !error && <p role="status">Loading images…</p>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{images.map(image => <figure key={image.id} className="min-w-0 rounded-lg border bg-card p-3">
        {image.imageUrl ? <img loading="lazy" decoding="async" className="h-36 w-full object-contain" src={image.imageUrl} alt={image.title} /> : <div className="grid h-36 place-items-center text-xs text-muted-foreground">Image unavailable</div>}
        <figcaption className="mt-3 break-words text-sm">{image.title}</figcaption>
        {!image.active && <p className="mt-1 text-xs text-muted-foreground">Removed</p>}
        <Button type="button" variant="outline" size="sm" className="mt-3 w-full" disabled={busy} aria-label={`${image.active ? "Remove" : "Restore"} ${image.title}`} onClick={() => {
          if (image.active) { setError(""); setRemoving(image); }
          else void changeActive(image, true);
        }}>{image.active ? "Remove image" : "Restore image"}</Button>
      </figure>)}</div>
      {library && !images.length && <p className="text-sm text-muted-foreground">{query ? "No images match your search." : library.images.length && !showRemoved ? "No active images. Upload images above or show removed images to restore them." : "No images yet. Upload your award images above."}</p>}
    </section>
    <AlertDialog open={!!removing} onOpenChange={open => { if (!open && !busy) { setRemoving(null); setError(""); } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove “{removing?.title}”?</AlertDialogTitle>
          <AlertDialogDescription>This image will be hidden from the award picker and Lockers. Award records are preserved. You can restore the image using Show removed images.</AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><Button type="button" variant="destructive" disabled={busy} onClick={() => { if (removing) void changeActive(removing, false); }}>{busy ? "Removing…" : "Remove image"}</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
