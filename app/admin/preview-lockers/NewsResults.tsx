"use client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PlayerArticle } from "@/lib/enrichment/news";
export default function NewsResultCard({ article, playerName, inDraft, canAdd, dismissDisabled, onAdd, onDismiss }: {
  article: PlayerArticle; playerName: string; inDraft: boolean; canAdd: boolean; dismissDisabled: boolean;
  onAdd: () => void; onDismiss: () => void;
}) {
  const [reviewed, setReviewed] = useState(false); const reviewId = useId();
  return <article className="min-w-0 space-y-3 rounded-lg border p-4">
    <h4 className="break-words font-semibold">{article.headline}</h4>
    <p className="break-words text-sm text-muted-foreground">{article.publisher}{article.published_at ? ` · ${article.published_at.slice(0, 10)}` : ""}</p>
    {!!article.summary && <p className="break-words text-sm">{article.summary}</p>}
    <a className="block break-all text-sm underline" href={article.article_url} target="_blank" rel="noopener noreferrer">Review publisher article ↗</a>
    <label htmlFor={reviewId} className="flex min-h-11 items-start gap-3 text-sm"><input id={reviewId} className="mt-1" type="checkbox" checked={reviewed} disabled={inDraft || !canAdd} onChange={event => setReviewed(event.target.checked)} />I reviewed this article for {playerName}.</label>
    <div className="flex flex-wrap gap-3"><Button type="button" disabled={!reviewed || inDraft || !canAdd} onClick={onAdd}>{inDraft ? "In draft" : "Add to draft"}</Button><Button type="button" variant="outline" disabled={dismissDisabled} onClick={onDismiss}>Dismiss article</Button></div>
  </article>;
}
