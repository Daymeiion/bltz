import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PreviewLockersList, type PreviewLockerListItem } from "./PreviewLockersList";

export const metadata = {
  title: "Preview Lockers | BLTZ Admin",
};

export default async function PreviewLockersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("preview_lockers")
    .select("id, slug, full_name, position, level, school, headshot_url, created_at")
    .order("created_at", { ascending: false });

  const items = (data ?? []) as PreviewLockerListItem[];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-3 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950 dark:text-white">Preview Lockers</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Demo-only lockers generated from scraped data. Never touches real player data —
            share a link straight from here during a pitch.
          </p>
        </div>
        <Link
          href="/admin/preview-lockers/new"
          className="flex-shrink-0 rounded-xl bg-[#ffbb00] px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-95"
        >
          + New Preview
        </Link>
      </div>

      <PreviewLockersList items={items} />
    </div>
  );
}
