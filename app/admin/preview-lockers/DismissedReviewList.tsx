"use client";
import { Button } from "@/components/ui/button";
import { useState } from "react";
export default function DismissedReviewList({ kind, items, busy, canRestore, onRestore, offset = 0, hasMore = false, onPage, canPage = true }: {
  kind: "articles" | "listings"; items: { url: string; title: string; source: string | null }[];
  busy: boolean; canRestore: boolean; onRestore: (url: string) => void;
  offset?: number; hasMore?: boolean; onPage?: (offset: number) => void; canPage?: boolean;
}) {
  const [localOffset, setLocalOffset] = useState(0);
  const pageOffset = onPage ? offset : Math.min(localOffset, Math.max(0, Math.floor((items.length - 1) / 200) * 200));
  const pageItems = onPage ? items : items.slice(pageOffset, pageOffset + 200);
  const more = onPage ? hasMore : pageOffset + 200 < items.length;
  const changePage = onPage ?? setLocalOffset;
  return <details className="rounded-lg border p-4">
    <summary className="min-h-11 cursor-pointer font-semibold">Dismissed {kind} · {items.length}{hasMore ? "+" : ""}</summary>
    <section aria-label={"Dismissed " + kind} className="mt-4 space-y-4">
      <p className="text-sm text-muted-foreground">Restore an item to review it again. Restoration is saved immediately and does not add it to the Locker.</p>
      {!items.length && <p className="text-sm">No dismissed {kind} on this page.</p>}
      {pageItems.map(item => <article key={item.url} className="space-y-3 rounded-lg border p-4">
        <h4 className="break-words font-semibold">{item.title}</h4>
        {item.source && <p className="break-words text-sm text-muted-foreground">{item.source}</p>}
        <a className="block break-all text-sm underline" href={item.url} target="_blank" rel="noopener noreferrer">{kind === "articles" ? "Review publisher article" : "Review seller listing"} ↗</a>
        <Button type="button" variant="outline" disabled={busy || !canRestore} aria-label={"Restore to review: " + item.title} onClick={() => onRestore(item.url)}>Restore to review</Button>
      </article>)}
      {(pageOffset > 0 || more) && <div className="flex flex-wrap items-center gap-3" aria-label={"Dismissed " + kind + " pages"}>
        <Button type="button" variant="outline" disabled={busy || !canPage || pageOffset === 0} onClick={() => changePage(Math.max(0, pageOffset - 200))}>Previous dismissed {kind}</Button>
        <p className="text-sm">Page {Math.floor(pageOffset / 200) + 1}</p>
        <Button type="button" variant="outline" disabled={busy || !canPage || !more} onClick={() => changePage(pageOffset + 200)}>Next dismissed {kind}</Button>
      </div>}
    </section>
  </details>;
}
