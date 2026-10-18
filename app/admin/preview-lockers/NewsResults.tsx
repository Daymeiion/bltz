"use client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PlayerArticle } from "@/lib/enrichment/news";
export default function NewsResultCard({ article, playerName, inDraft, canAdd, dismissDisabled, onAdd, onEdit, onDismiss, selected, onSelect, selectionDisabled }: {
  article: PlayerArticle; playerName: string; inDraft: boolean; canAdd: boolean; dismissDisabled: boolean;
  onAdd: () => void; onEdit: () => void; onDismiss: () => void;
  selected: boolean; onSelect: () => void; selectionDisabled: boolean;
}) {
  const [reviewed, setReviewed] = useState(false); const reviewId = useId();
  return <article className="min-w-0 space-y-3 rounded-lg border p-4">
    <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" aria-label={`Select article: ${article.headline}`} checked={selected} disabled={selectionDisabled} onChange={onSelect} />Select article</label>
    <h4 className="break-words font-semibold">{article.headline}</h4>
    <p className="break-words text-sm text-muted-foreground">{article.publisher}{article.published_at ? ` · ${article.published_at.slice(0, 10)}` : ""}</p>
    {!!article.summary && <p className="break-words text-sm">{article.summary}</p>}
    <a className="block break-all text-sm underline" href={article.article_url} target="_blank" rel="noopener noreferrer">Review publisher article ↗</a>
    {inDraft ? <p role="status" className="text-sm">Already added to Locker articles. Edit it below, then Save draft to apply changes.</p> : <label htmlFor={reviewId} className="flex min-h-11 items-start gap-3 text-sm"><input id={reviewId} aria-label={`I reviewed this article for ${playerName}.`} className="mt-1" type="checkbox" checked={reviewed} disabled={!canAdd} onChange={event => setReviewed(event.target.checked)} />I reviewed this article for {playerName}.</label>}
    <div className="flex flex-wrap gap-3">{inDraft ? <Button type="button" variant="outline" disabled={dismissDisabled} onClick={onEdit}>Edit article</Button> : <Button type="button" disabled={!reviewed || !canAdd} onClick={onAdd}>Add to draft</Button>}<Button type="button" variant="outline" disabled={dismissDisabled} onClick={onDismiss}>Dismiss article</Button></div>
  </article>;
}
