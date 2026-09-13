import Link from "next/link";
import { Film, ImageIcon, Pencil, Search, UserRound } from "lucide-react";
import { previewAdmin } from "@/lib/preview-lockers/server";

export const dynamic = "force-dynamic";
export default async function PreviewList({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; sort?: string }> }) {
  const { client } = await previewAdmin();
  const query = await searchParams;
  const name = typeof query.q === "string" ? query.q.trim().slice(0, 120) : "";
  const sort = query.sort === "name" ? "name" : "newest";
  const page = Math.min(10000, Math.max(1, Number.parseInt(query.page || "1", 10) || 1));
  let request = client.from("preview_lockers").select("id,slug,full_name,school,updated_at");
  if (name) request = request.ilike("full_name", `%${name.replace(/[\\%_]/g, "\\$&")}%`);
  const { data, error } = await request.order(sort === "name" ? "full_name" : "created_at", { ascending: sort === "name" }).order("id").range((page - 1) * 50, page * 50);
  const pageHref = (next: number) => `/admin/preview-lockers?${new URLSearchParams({ q: name, sort, page: String(next) })}`;
  const actionClass = "inline-flex h-11 min-w-11 items-center justify-center rounded-md border border-white/15 text-slate-300 transition-colors hover:border-[#ffbb00]/60 hover:text-[#ffbb00] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00]";
  return <section className="mx-auto max-w-6xl space-y-6 p-6 sm:p-10">
    <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-semibold">Preview Lockers</h1><Link className="inline-flex min-h-11 items-center rounded-md border px-4 font-semibold" href="/admin/preview-lockers/new">Create private preview</Link></div>
    <p className="text-sm text-slate-400">Private previews and saved drafts. Resume a draft with Edit.</p>
    <form action="/admin/preview-lockers" method="get" className="flex flex-wrap items-end gap-3" role="search" aria-label="Search preview lockers">
      <label className="grid min-w-0 flex-1 gap-2 text-sm">Search by name<input key={name} type="search" name="q" defaultValue={name} maxLength={120} placeholder="Find an athlete…" className="h-11 w-full rounded-md border bg-background px-3 focus-visible:outline focus-visible:outline-[#ffbb00]" /></label>
      <label className="grid gap-2 text-sm">Sort<select key={sort} name="sort" defaultValue={sort} className="h-11 rounded-md border bg-background px-3"><option value="newest">Newest first</option><option value="name">Name A–Z</option></select></label>
      <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-md bg-[#ffbb00] px-4 font-semibold text-black"><Search size={18} aria-hidden="true" />Search</button>
      {name && <Link className="inline-flex h-11 items-center px-2 underline" href="/admin/preview-lockers">Clear</Link>}
    </form>
    {error ? <p role="alert">Saved previews are unavailable. Try reloading; no data was changed.</p> : !data?.length ? <p>{name ? `No previews match “${name}” on this page.` : "No saved previews on this page."}</p> : <ul className="divide-y divide-white/10 rounded-lg border border-white/15">{data.slice(0, 50).map(row => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0 flex-1 basis-48"><h2 className="break-words font-semibold">{row.full_name}</h2><p className="text-sm text-slate-400">{row.school || "School not recorded"}</p></div>
      <div className="flex shrink-0 items-center gap-2" aria-label={`Actions for ${row.full_name}`}>
        <Link className={`${actionClass} gap-2 px-3`} aria-label={`Edit ${row.full_name}`} href={`/admin/preview-lockers/${row.id}/edit`}><Pencil size={16} aria-hidden="true" />Edit</Link>
        <Link className={actionClass} href={`/preview-lockers/${row.slug}`} aria-label={`Open Locker for ${row.full_name}`} title="Open Locker"><UserRound size={19} aria-hidden="true" /></Link>
        <Link className={actionClass} href={`/preview-lockers/${row.slug}/photos`} aria-label={`Photos for ${row.full_name}`} title="Photos"><ImageIcon size={19} aria-hidden="true" /></Link>
        <Link className={actionClass} href={`/preview-lockers/${row.slug}/videos`} aria-label={`Film Room for ${row.full_name}`} title="Film Room"><Film size={19} aria-hidden="true" /></Link>
      </div>
    </li>)}</ul>}
    <nav aria-label="Preview pages" className="flex min-h-11 items-center gap-4">{page > 1 && <Link href={pageHref(page - 1)}>Previous page</Link>}<span className="text-sm text-slate-400">Page {page}</span>{!error && (data?.length ?? 0) > 50 && <Link href={pageHref(page + 1)}>Next page</Link>}</nav>
  </section>;
}
