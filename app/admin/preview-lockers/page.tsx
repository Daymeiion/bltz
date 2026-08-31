import Link from "next/link";
import { previewAdmin } from "@/lib/preview-lockers/server";

export const dynamic = "force-dynamic";
export default async function PreviewList({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { client } = await previewAdmin();
  const query = await searchParams;
  const page = Math.min(10000, Math.max(1, Number.parseInt(query.page || "1", 10) || 1));
  const { data, error } = await client.from("preview_lockers").select("id,slug,full_name,school,updated_at").order("created_at", { ascending: false }).order("id").range((page - 1) * 50, page * 50);
  return <section className="mx-auto max-w-6xl space-y-6 p-6 sm:p-10"><h1 className="text-3xl font-semibold">Preview Lockers</h1><p>Private Player Uploader demos. Not public profiles, verified media, or Athlete Career IDs.</p><Link className="inline-flex min-h-11 items-center rounded-md border px-4 font-semibold" href="/admin/preview-lockers/new">Create private preview</Link>
    {error ? <p role="alert">Saved previews are unavailable. Try reloading; no data was changed.</p> : !data?.length ? <p>No saved previews on this page.</p> : <ul className="divide-y rounded-lg border">{data.slice(0, 50).map(row => <li key={row.id} className="flex flex-wrap items-center justify-between gap-4 p-4"><div><h2 className="font-semibold">{row.full_name}</h2><p className="text-sm">{row.school || "School not recorded"}</p></div><div className="flex flex-wrap gap-4"><Link className="underline" href={`/admin/preview-lockers/${row.id}/edit`}>Edit {row.full_name}</Link><Link className="underline" href={`/preview-lockers/${row.slug}`}>Open Locker</Link><Link className="underline" href={`/preview-lockers/${row.slug}/photos`}>Photos</Link></div></li>)}</ul>}
    <nav aria-label="Preview pages" className="flex gap-4">{page > 1 && <Link href={`/admin/preview-lockers?page=${page - 1}`}>Previous page</Link>}{!error && (data?.length ?? 0) > 50 && <Link href={`/admin/preview-lockers?page=${page + 1}`}>Next page</Link>}</nav>
  </section>;
}
