import Link from "next/link";
import { previewAdmin } from "@/lib/preview-lockers/server";
import BatchBuilder from "./BatchBuilder";

export const dynamic = "force-dynamic";
export default async function BatchBuildPage() {
  await previewAdmin();
  return <section className="mx-auto max-w-5xl space-y-6 p-6 sm:p-10">
    <div className="space-y-2">
      <Link href="/admin/preview-lockers" className="inline-flex min-h-11 items-center underline">Back to Preview Lockers</Link>
      <h1 className="text-3xl font-semibold">Batch build from player names</h1>
      <p className="text-sm text-slate-400">Paste player names. Each one is matched in the Player Master list, added to the cohort and Contacts, given a private preview Locker, and built with the career, awards, news and merchandise searches. Built Lockers show a yellow dot in the list until you review them and mark them complete.</p>
    </div>
    <BatchBuilder />
  </section>;
}
