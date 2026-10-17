"use client";
import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** Mounted with the queue/identity key so a refreshed queue requires fresh intent. */
export default function BulkReviewControls({ items, kind, playerName, capacity, canAdd, busy, onAdd, onDismiss, children }: {
  items: { url: string; inDraft: boolean }[]; kind: "articles" | "listings"; playerName: string;
  capacity: number; canAdd: boolean; busy: boolean;
  onAdd: (urls: string[]) => void; onDismiss: (urls: string[]) => Promise<boolean>;
  children: (selection: { selected: Set<string>; toggle: (url: string) => void; disabled: boolean }) => ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [reviewed, setReviewed] = useState(false); const reviewId = useId();
  const chosen = items.filter(item => selected.has(item.url)), addable = chosen.filter(item => !item.inDraft);
  const changeSelection = (next: Set<string>) => { setSelected(next); setReviewed(false); };
  const clear = () => changeSelection(new Set());
  const overflow = addable.length > capacity;
  return <div className="space-y-4">
    <div role="group" aria-label={`Bulk ${kind === "articles" ? "news article" : "merchandise listing"} actions`} className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={busy || !items.length || chosen.length === items.length} onClick={() => changeSelection(new Set(items.map(item => item.url)))}>Select all</Button>
        <Button type="button" variant="outline" disabled={busy || !chosen.length} onClick={clear}>Clear selection</Button>
        <p role="status" className="text-sm">{chosen.length} selected · {addable.length} ready to add</p>
      </div>
      <label htmlFor={reviewId} className="flex min-h-11 items-start gap-3 text-sm"><input id={reviewId} className="mt-1" type="checkbox" checked={reviewed} disabled={busy || !canAdd || !addable.length} onChange={event => setReviewed(event.target.checked)} />I reviewed the selected {kind} for {playerName}.</label>
      {overflow && <p role="status" className="text-sm">This draft can hold {capacity} more {capacity === 1 ? "item" : "items"}. Select fewer new {kind}.</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={busy || !canAdd || !reviewed || !addable.length || overflow} onClick={() => { onAdd(addable.map(item => item.url)); clear(); }}>Add selected to draft</Button>
        <Button type="button" variant="outline" disabled={busy || !chosen.length} onClick={async () => { if (await onDismiss(chosen.map(item => item.url))) clear(); }}>Dismiss selected</Button>
      </div>
      <p className="text-xs text-muted-foreground">Save draft to show added items in the Locker. Dismissing only removes suggestions from this review queue.</p>
    </div>
    {children({ selected, toggle: url => { setSelected(current => { const next = new Set(current); if (next.has(url)) next.delete(url); else next.add(url); return next; }); setReviewed(false); }, disabled: busy })}
  </div>;
}
