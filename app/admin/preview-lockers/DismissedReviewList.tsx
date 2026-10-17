"use client";
import { Button } from "@/components/ui/button";
import { useState } from "react";
type DismissedItem = { url: string; title: string; source: string | null };
type ReviewActions = {
  kind: "articles" | "listings"; items: DismissedItem[];
  busy: boolean; canRestore: boolean; onRestore: (url: string) => void;
  onRestoreSelected?: (urls: string[]) => Promise<boolean>;
};
function DismissedSelectionPage({ kind, items, busy, canRestore, onRestore, onRestoreSelected }: ReviewActions) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const chosen = items.filter(item => selected.has(item.url));
  const disabled = busy || !canRestore;
  return <>
    {!!items.length && <div role="group" aria-label={"Bulk dismissed " + kind + " actions"} className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={disabled || chosen.length === items.length} onClick={() => setSelected(new Set(items.map(item => item.url)))}>Select all on page</Button>
        <Button type="button" variant="outline" disabled={busy || !chosen.length} onClick={() => setSelected(new Set())}>Clear selection</Button>
        <p role="status" className="text-sm">{chosen.length} selected on this page</p>
      </div>
      <Button type="button" disabled={disabled || !onRestoreSelected || !chosen.length} onClick={async () => { if (await onRestoreSelected?.(chosen.map(item => item.url))) setSelected(new Set()); }}>Restore selected</Button>
    </div>}
    {items.map(item => <article key={item.url} className="space-y-3 rounded-lg border p-4">
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" aria-label={"Select dismissed " + (kind === "articles" ? "article: " : "listing: ") + item.title} disabled={disabled} checked={selected.has(item.url)} onChange={() => setSelected(current => { const next = new Set(current); if (next.has(item.url)) next.delete(item.url); else next.add(item.url); return next; })} />Select {kind === "articles" ? "article" : "listing"}</label>
      <h4 className="break-words font-semibold">{item.title}</h4>
      {item.source && <p className="break-words text-sm text-muted-foreground">{item.source}</p>}
      <a className="block break-all text-sm underline" href={item.url} target="_blank" rel="noopener noreferrer">{kind === "articles" ? "Review publisher article" : "Review seller listing"} ↗</a>
      <Button type="button" variant="outline" disabled={disabled} aria-label={"Restore to review: " + item.title} onClick={() => onRestore(item.url)}>Restore to review</Button>
    </article>)}
  </>;
}
export default function DismissedReviewList({ kind, items, busy, canRestore, onRestore, onRestoreSelected, reviewKey = "", offset = 0, hasMore = false, onPage, canPage = true }: ReviewActions & {
  reviewKey?: string;
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
      <DismissedSelectionPage key={`${reviewKey}:${canRestore}:${pageOffset}`} kind={kind} items={pageItems} busy={busy} canRestore={canRestore} onRestore={onRestore} onRestoreSelected={onRestoreSelected} />
      {(pageOffset > 0 || more) && <div className="flex flex-wrap items-center gap-3" aria-label={"Dismissed " + kind + " pages"}>
        <Button type="button" variant="outline" disabled={busy || !canPage || pageOffset === 0} onClick={() => changePage(Math.max(0, pageOffset - 200))}>Previous dismissed {kind}</Button>
        <p className="text-sm">Page {Math.floor(pageOffset / 200) + 1}</p>
        <Button type="button" variant="outline" disabled={busy || !canPage || !more} onClick={() => changePage(pageOffset + 200)}>Next dismissed {kind}</Button>
      </div>}
    </section>
  </details>;
}
