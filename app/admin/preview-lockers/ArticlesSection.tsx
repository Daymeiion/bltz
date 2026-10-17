"use client";
import { BuilderSection } from "./BuilderSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { editScrapedArticle, type ArticleEdit } from "@/lib/preview-lockers/media";
import type { PlayerArticle } from "@/lib/enrichment/news";
import { newsArticleKeys, type NewsReview } from "@/lib/preview-lockers/news-review";
import NewsResultCard from "./NewsResults";
import DismissedReviewList from "./DismissedReviewList";
import BulkReviewControls from "./BulkReviewControls";

export default function ArticlesSection({ articles, edits, onChange, onReload, onRefresh, canLoad, dirty, saved, review, reviewKey, identityCurrent = true, playerName, onDismiss, onDismissSelected, onRestore, onRestoreSelected, onDismissedPage, busy = false, reviewError = "" }: {
  articles: PlayerArticle[]; edits: ArticleEdit[]; onChange: (items: ArticleEdit[]) => void;
  onReload: () => void; onRefresh: () => void; canLoad: boolean; dirty: boolean; saved: boolean;
  review: NewsReview | null; reviewKey: string; identityCurrent?: boolean; playerName: string;
  onDismiss: (url: string) => void; busy?: boolean; reviewError?: string;
  onRestoreSelected?: (urls: string[]) => Promise<boolean>; onRestore?: (url: string) => void; onDismissedPage?: (offset: number) => void;
  onDismissSelected: (urls: string[]) => Promise<boolean>;
}) {
  const update = (id: string, patch: Partial<ArticleEdit>) => onChange(edits.map(item => item.id === id ? { ...item, ...patch } : item));
  const fields = (item: ArticleEdit, label: string) => <div className="mt-4 grid gap-4 sm:grid-cols-2">
    <label className="grid gap-2 text-sm">Headline<Input aria-label={`${label} headline`} value={item.headline} maxLength={500} onChange={event => update(item.id, { headline: event.target.value })} /></label>
    <label className="grid gap-2 text-sm">Publisher<Input aria-label={`${label} publisher`} value={item.publisher} maxLength={200} onChange={event => update(item.id, { publisher: event.target.value })} /></label>
    <label className="grid gap-2 text-sm sm:col-span-2">Article link<Input aria-label={`${label} link`} type="url" value={item.articleUrl} maxLength={2048} onChange={event => update(item.id, { articleUrl: event.target.value })} /></label>
    <label className="grid gap-2 text-sm">Image URL (optional)<Input aria-label={`${label} image`} type="url" value={item.imageUrl ?? ""} maxLength={2048} onChange={event => update(item.id, { imageUrl: event.target.value || null })} /></label>
    <label className="grid gap-2 text-sm">Published date (optional)<Input aria-label={`${label} date`} type="date" value={item.publishedAt ?? ""} onChange={event => update(item.id, { publishedAt: event.target.value || null })} /></label>
    <label className="grid gap-2 text-sm sm:col-span-2">Short summary<Textarea aria-label={`${label} summary`} value={item.summary} maxLength={600} onChange={event => update(item.id, { summary: event.target.value })} /></label>
    <label className="flex min-h-11 items-center gap-3 text-sm"><input aria-label={`${label} visible`} type="checkbox" checked={item.visible} onChange={event => update(item.id, { visible: event.target.checked })} />Show in Locker articles</label>
  </div>;
  const existingSources = new Set(articles.map(article => article.article_url));
  const additional = edits.filter(item => !item.sourceUrl || !existingSources.has(item.sourceUrl));
  const draftKeys = new Set([...articles.flatMap(newsArticleKeys), ...edits.flatMap(item => newsArticleKeys({ article_url: item.articleUrl, canonical_url: item.sourceUrl ?? undefined, headline: item.headline }))]);
  const inDraft = (article: PlayerArticle) => newsArticleKeys(article).some(key => draftKeys.has(key));
  const add = (urls: string[]) => {
    if (!identityCurrent || busy) return;
    const requested = new Set(urls), seen = new Set(draftKeys);
    const additions = (review?.articles ?? []).filter(article => {
      if (!requested.has(article.article_url)) return false;
      const keys = newsArticleKeys(article); if (keys.some(key => seen.has(key))) return false;
      keys.forEach(key => seen.add(key)); return true;
    }).map(article => editScrapedArticle(article, crypto.randomUUID()));
    if (additions.length && edits.length + additions.length <= 40) onChange([...edits, ...additions]);
  };
  return <BuilderSection title="News articles" count={articles.length + (review?.articles.length ?? 0) + edits.filter(item => !item.sourceUrl).length} description="Review saved news suggestions and manage Locker article cards">
    <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" disabled={!canLoad} onClick={onReload}>Reload saved articles</Button><Button type="button" variant="outline" disabled={!canLoad} onClick={onRefresh}>Refresh scraped news</Button></div>
    {!saved ? <p className="text-sm text-muted-foreground">Save this preview before loading scraped articles. You can add articles manually now.</p> : dirty ? <p className="text-sm text-muted-foreground">Save your draft before reloading or refreshing scraped news.</p> : <p className="text-sm text-muted-foreground">Search uses the saved player name, college and team history. New searches add unique articles and keep your pending reviews; dismissed articles stay dismissed. Results are saved separately from Locker articles. Review each article, add it to the draft, then save to show it in the Locker.</p>}
    {reviewError && <p role="alert" className="break-words text-sm text-red-400">{reviewError}</p>}
    {busy && <p role="status" className="text-sm">Updating saved news reviews…</p>}
    <section aria-label="News articles for review" className="space-y-4">
      <h3 className="font-semibold" aria-live="polite">Articles for review · {review?.articles.length ?? 0}</h3>
      {review?.searched_at && <p className="text-sm text-muted-foreground">Last search · <time dateTime={review.searched_at}>{new Date(review.searched_at).toISOString().replace("T", " ").slice(0, 16)} UTC</time>. Saved articles may be older. Dismissals are saved.</p>}
      {!identityCurrent && <p role="status" className="text-sm">The player identity changed or the saved version is stale. Save and search again before adding these articles.</p>}
      {!review?.articles.length && <p className="text-sm text-muted-foreground">No saved matching articles awaiting review. Search for more coverage or add a reviewed article manually below.</p>}
      {!!review?.articles.length && <BulkReviewControls key={`${reviewKey}:${identityCurrent}`} items={review.articles.map(article => ({ url: article.article_url, inDraft: inDraft(article) }))}
        kind="articles" playerName={playerName} capacity={40 - edits.length} canAdd={identityCurrent} busy={busy} onAdd={add} onDismiss={onDismissSelected}>
        {selection => review.articles.map(article => <NewsResultCard key={article.article_url} article={article} playerName={playerName}
          selected={selection.selected.has(article.article_url)} onSelect={() => selection.toggle(article.article_url)} selectionDisabled={selection.disabled}
          inDraft={inDraft(article)} canAdd={identityCurrent && !busy && edits.length < 40} dismissDisabled={busy}
          onAdd={() => add([article.article_url])} onDismiss={() => onDismiss(article.article_url)} />)}
      </BulkReviewControls>}
    </section>
    <DismissedReviewList reviewKey={reviewKey} onRestoreSelected={onRestoreSelected} kind="articles" items={(review?.dismissed_articles ?? []).map(article => ({ url: article.article_url, title: article.headline, source: article.publisher }))} busy={busy} canRestore={identityCurrent && !!onRestore} onRestore={url => onRestore?.(url)} offset={review?.dismissed_offset} hasMore={review?.dismissed_has_more} onPage={onDismissedPage} canPage={canLoad} />
    <h3 className="font-semibold">Locker articles</h3>
    {!articles.length && <p className="text-sm text-muted-foreground">No saved matching articles loaded.</p>}
    {articles.map((article, index) => {
      const edit = edits.find(item => item.sourceUrl === article.article_url);
      return <details key={article.article_url} className="rounded-lg border p-4">
        <summary className="cursor-pointer break-words font-medium">{edit?.headline || article.headline} · {edit?.visible === false ? "Hidden" : "Shown"}</summary>
        <p className="mt-3 text-sm text-muted-foreground">Discovered from {article.publisher}</p>
        <a className="mt-2 block break-all text-sm underline" href={article.article_url} target="_blank" rel="noopener noreferrer">Original scraped article ↗</a>
        {edit ? <>{fields(edit, `Scraped article ${index + 1}`)}<Button className="mt-4" type="button" variant="outline" onClick={() => onChange(edits.filter(item => item.id !== edit.id))}>Reset to scraped details</Button></> : <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" variant="outline" disabled={edits.length >= 40} onClick={() => onChange([...edits, editScrapedArticle(article, crypto.randomUUID())])}>Edit article details</Button>
          <Button type="button" variant="outline" disabled={edits.length >= 40} onClick={() => onChange([...edits, { ...editScrapedArticle(article, crypto.randomUUID()), visible: false }])}>Hide article from Locker</Button>
        </div>}
      </details>;
    })}
    <h3 className="font-semibold">Added articles & retained edits</h3>
    {additional.map((item, index) => <details key={item.id} open className="rounded-lg border p-4">
      <summary className="cursor-pointer break-words font-medium">{item.headline || `Added article ${index + 1}`} · {item.visible ? "Shown" : "Hidden"}</summary>
      {item.sourceUrl && <p className="mt-3 text-sm text-muted-foreground">Retained edit of a previously scraped article.</p>}
      {fields(item, `Added article ${index + 1}`)}
      <Button className="mt-4" type="button" variant="outline" onClick={() => onChange(edits.filter(entry => entry.id !== item.id))}>{item.sourceUrl ? "Remove retained edit" : "Remove added article"}</Button>
    </details>)}
    <Button type="button" variant="outline" disabled={edits.length >= 40} onClick={() => onChange([...edits, { id: crypto.randomUUID(), sourceUrl: null, visible: true, headline: "", publisher: "", articleUrl: "", imageUrl: null, summary: "", publishedAt: null }])}>Add article</Button>
    <p className="text-xs text-muted-foreground">Use the original publisher article link and a short summary. Add only coverage you reviewed for this player. Save the draft to apply changes.</p>
  </BuilderSection>;
}
