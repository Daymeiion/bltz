"use client";
import { BuilderSection } from "./BuilderSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { merchandiseCategories, type PreviewContent } from "@/lib/preview-lockers/validation";
import type { MerchandiseResult } from "@/lib/enrichment/merchandise";
import { merchandiseListingKeys } from "@/lib/preview-lockers/merchandise-review";
import MerchandiseResultCard from "./MerchandiseResults";
import DismissedReviewList from "./DismissedReviewList";
import BulkReviewControls from "./BulkReviewControls";
import EditorialImageInput from "./EditorialImageInput";

export default function MerchandiseSection({ items, onChange, onSearch, canSearch, searching, result, resultKey, searchError, identityCurrent, playerName, onDismiss, onDismissSelected, onRestore, onRestoreSelected, dismissedItems = [], searchedAt, savingReview = false, busy = false, saved = false, imageUrls = {}, imageError, onUploadImage }: {
  items: PreviewContent["merchandise"]; onChange: (items: PreviewContent["merchandise"]) => void;
  onSearch: () => void; canSearch: boolean; searching: boolean; result: MerchandiseResult | null; resultKey: string;
  searchError: string; identityCurrent: boolean; playerName: string; onDismiss: (url: string) => void;
  searchedAt?: string; savingReview?: boolean;
  onRestoreSelected?: (urls: string[]) => Promise<boolean>; onRestore?: (url: string) => void; dismissedItems?: MerchandiseResult["items"];
  onDismissSelected: (urls: string[]) => Promise<boolean>; busy?: boolean;
  saved?: boolean; imageUrls?: Record<string,string>; imageError?: {id:string;message:string}|null;
  onUploadImage?: (id:string,file:File|undefined) => void;
}) {
  const update = (id: string, patch: Partial<typeof items[number]>) => onChange(items.map(item => item.id === id ? { ...item, ...patch } : item));
  const draftKeys = new Set(items.flatMap(merchandiseListingKeys));
  const inDraft = (item: NonNullable<typeof result>["items"][number]) => merchandiseListingKeys(item).some(key => draftKeys.has(key));
  const queueBusy = busy || searching || savingReview;
  const add = (urls: string[]) => {
    if (!identityCurrent || queueBusy) return;
    const requested = new Set(urls), seen = new Set(draftKeys);
    const additions = (result?.items ?? []).filter(item => {
      if (!requested.has(item.productUrl)) return false;
      const keys = merchandiseListingKeys(item); if (keys.some(key => seen.has(key))) return false;
      keys.forEach(key => seen.add(key)); return true;
    }).map(item => ({ id: crypto.randomUUID(), title: item.title, category: item.category, productUrl: item.productUrl, imageUrl: item.imageUrl, retailer: item.retailer, priceLabel: item.priceLabel, visible: true }));
    if (additions.length && items.length + additions.length <= 40) onChange([...items, ...additions]);
  };
  return <BuilderSection title="Merchandise" count={items.length} description="Add trading cards, jerseys and other products to the Locker Merchandise tab">
    <Button type="button" variant="outline" disabled={!canSearch} onClick={onSearch}>{searching ? "Searching merchandise…" : "Search merchandise"}</Button>
    <p className="text-sm text-muted-foreground">Targets eBay, Fanatics and COMC, plus broader web listings, using the saved player name with college and team history for trading cards and jerseys. Save your changes before searching. Results are saved here for later review, separately from Locker merchandise. New searches add unique listings and keep your pending reviews; dismissed listings stay dismissed. Review each seller listing before adding it to the draft, then save to show it in the Locker.</p>
    {searchError && <p role="alert" className="break-words text-sm text-red-400">{searchError}</p>}
    {searching && <p role="status" className="text-sm">Searching seller listings and checking player identity…</p>}
    {savingReview && <p role="status" className="text-sm">Saving review queue…</p>}
    {result && <section aria-label="Merchandise search results" className="space-y-4">
      <h3 className="font-semibold" aria-live="polite">Listings for review · {result.items.length}</h3>
      {searchedAt && <p className="text-sm text-muted-foreground">Last search · <time dateTime={searchedAt}>{new Date(searchedAt).toISOString().replace("T", " ").slice(0, 16)} UTC</time>. Saved listings may be older. Dismissals are saved. Prices and availability may have changed.</p>}
      {!identityCurrent && <p role="status" className="text-sm">The player identity changed or the saved version is stale. Reload or save, then search again before adding these listings.</p>}
      <p className="text-sm text-muted-foreground">Search suggestions are not added to the Locker automatically. Check the player, team, seller, current price and availability. Listings do not establish authenticity, endorsement or licensing rights.</p>
      {!result.items.length && <p className="text-sm">{result.status === "complete" ? "No matching merchandise listings available to review. You can add a reviewed product manually below." : "No matching listings could be verified from this search. Try again later or add a reviewed product manually."}</p>}
      {!!result.items.length && <BulkReviewControls key={`${resultKey}:${identityCurrent}`} items={result.items.map(item => ({ url: item.productUrl, inDraft: inDraft(item) }))}
        kind="listings" playerName={playerName} capacity={40 - items.length} canAdd={identityCurrent} busy={queueBusy} onAdd={add} onDismiss={onDismissSelected}>
        {selection => result.items.map(item => <MerchandiseResultCard key={item.productUrl} item={item} playerName={playerName}
          selected={selection.selected.has(item.productUrl)} onSelect={() => selection.toggle(item.productUrl)} selectionDisabled={selection.disabled}
          inDraft={inDraft(item)} canAdd={identityCurrent && !queueBusy && items.length < 40} dismissDisabled={queueBusy}
          onAdd={() => add([item.productUrl])} onDismiss={() => onDismiss(item.productUrl)} />)}
      </BulkReviewControls>}
    </section>}
    <DismissedReviewList reviewKey={resultKey} onRestoreSelected={onRestoreSelected} kind="listings" items={dismissedItems.map(item => ({ url: item.productUrl, title: item.title, source: item.retailer }))} busy={queueBusy} canRestore={identityCurrent && !!onRestore} onRestore={url => onRestore?.(url)} />
    <h3 className="font-semibold">Locker merchandise</h3>
    <p className="text-sm text-muted-foreground">Add products you found for this player. Links open the seller website. Price labels are optional and entered manually.</p>
    {items.map((item, index) => <details key={item.id} open className="rounded-lg border p-4">
      <summary className="cursor-pointer break-words font-medium">{item.title || `Merchandise ${index + 1}`} · {item.visible ? "Shown" : "Hidden"}</summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">Product title<Input aria-label={`Merchandise ${index + 1} title`} value={item.title} maxLength={160} onChange={event => update(item.id, { title: event.target.value })} /></label>
        <label className="grid gap-2 text-sm">Category<select aria-label={`Merchandise ${index + 1} category`} className="h-10 min-w-0 rounded-md border bg-background px-3" value={item.category} onChange={event => update(item.id, { category: event.target.value as typeof item.category })}>{merchandiseCategories.map(category => <option key={category} value={category}>{({ trading_card: "Trading card", jersey: "Jersey", apparel: "Apparel", memorabilia: "Memorabilia", other: "Other" })[category]}</option>)}</select></label>
        <label className="grid gap-2 text-sm sm:col-span-2">Product link<Input aria-label={`Merchandise ${index + 1} link`} type="url" value={item.productUrl} maxLength={2048} onChange={event => update(item.id, { productUrl: event.target.value })} /></label>
        <EditorialImageInput label={`Merchandise ${index+1}`} title={item.title} kind="merchandise" defaultUrl={item.imageUrl} storagePath={item.imageStoragePath} imageUrls={imageUrls} saved={saved} busy={busy} error={imageError?.id===item.id?imageError.message:undefined} onUpload={file=>onUploadImage?.(item.id,file)} onDefault={()=>update(item.id,{imageStoragePath:null})}/>
        <label className="grid gap-2 text-sm">Default image URL (optional)<Input aria-label={`Merchandise ${index + 1} image`} type="url" value={item.imageUrl ?? ""} maxLength={2048} onChange={event => update(item.id, { imageUrl: event.target.value || null })} /></label>
        <label className="grid gap-2 text-sm">Retailer (optional)<Input aria-label={`Merchandise ${index + 1} retailer`} value={item.retailer ?? ""} maxLength={160} onChange={event => update(item.id, { retailer: event.target.value || null })} /></label>
        <label className="grid gap-2 text-sm">Price label (optional)<Input aria-label={`Merchandise ${index + 1} price`} placeholder="$25 · check seller for current price" value={item.priceLabel ?? ""} maxLength={80} onChange={event => update(item.id, { priceLabel: event.target.value || null })} /></label>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input aria-label={`Merchandise ${index + 1} visible`} type="checkbox" checked={item.visible} onChange={event => update(item.id, { visible: event.target.checked })} />Show in Locker merchandise</label>
      </div>
      <Button className="mt-4" type="button" variant="outline" disabled={busy} onClick={() => onChange(items.filter(entry => entry.id !== item.id))}>Remove merchandise</Button>
    </details>)}
    <Button type="button" variant="outline" disabled={items.length >= 40} onClick={() => onChange([...items, { id: crypto.randomUUID(), title: "", category: "trading_card", productUrl: "", imageUrl: null, retailer: null, priceLabel: null, visible: true }])}>Add merchandise</Button>
  </BuilderSection>;
}
