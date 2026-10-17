"use client";
import { BuilderSection } from "./BuilderSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { merchandiseCategories, type PreviewContent } from "@/lib/preview-lockers/validation";
import type { MerchandiseResult } from "@/lib/enrichment/merchandise";
import { normalizeArticleUrl } from "@/lib/enrichment/news";
import MerchandiseResultCard from "./MerchandiseResults";

export default function MerchandiseSection({ items, onChange, onSearch, canSearch, searching, result, resultKey, searchError, identityCurrent, playerName, onDismiss }: {
  items: PreviewContent["merchandise"]; onChange: (items: PreviewContent["merchandise"]) => void;
  onSearch: () => void; canSearch: boolean; searching: boolean; result: MerchandiseResult | null; resultKey: string;
  searchError: string; identityCurrent: boolean; playerName: string; onDismiss: (url: string) => void;
}) {
  const update = (id: string, patch: Partial<typeof items[number]>) => onChange(items.map(item => item.id === id ? { ...item, ...patch } : item));
  return <BuilderSection title="Merchandise" count={items.length} description="Add trading cards, jerseys and other products to the Locker Merchandise tab">
    <Button type="button" variant="outline" disabled={!canSearch} onClick={onSearch}>{searching ? "Searching merchandise…" : "Search merchandise"}</Button>
    <p className="text-sm text-muted-foreground">Searches the saved player name with college and team history for trading cards and jerseys. Save your changes before searching. Results stay in this editor until you reload; review each seller listing before adding it to the draft, then save to show it in the Locker.</p>
    {searchError && <p role="alert" className="break-words text-sm text-red-400">{searchError}</p>}
    {searching && <p role="status" className="text-sm">Searching seller listings and checking player identity…</p>}
    {result && <section aria-label="Merchandise search results" className="space-y-4">
      <h3 className="font-semibold" aria-live="polite">Listings for review · {result.items.length}</h3>
      {!identityCurrent && <p role="status" className="text-sm">The player identity changed or the saved version is stale. Reload or save, then search again before adding these listings.</p>}
      <p className="text-sm text-muted-foreground">Search suggestions are not added to the Locker automatically. Check the player, team, seller, current price and availability. Listings do not establish authenticity, endorsement or licensing rights.</p>
      {!result.items.length && <p className="text-sm">{result.status === "complete" ? "No matching merchandise listings available to review. You can add a reviewed product manually below." : "No matching listings could be verified from this search. Try again later or add a reviewed product manually."}</p>}
      {result.items.map(item => <MerchandiseResultCard key={`${resultKey}:${item.productUrl}`} item={item} playerName={playerName}
        inDraft={items.some(saved => [item.productUrl, item.canonicalUrl].includes(normalizeArticleUrl(saved.productUrl) ?? ""))}
        canAdd={identityCurrent && !searching && items.length < 40}
        onAdd={() => onChange([...items, { id: crypto.randomUUID(), title: item.title, category: item.category, productUrl: item.productUrl, imageUrl: item.imageUrl, retailer: item.retailer, priceLabel: item.priceLabel, visible: true }])}
        onDismiss={() => onDismiss(item.productUrl)} />)}
    </section>}
    <h3 className="font-semibold">Locker merchandise</h3>
    <p className="text-sm text-muted-foreground">Add products you found for this player. Links open the seller website. Price labels are optional and entered manually.</p>
    {items.map((item, index) => <details key={item.id} open className="rounded-lg border p-4">
      <summary className="cursor-pointer break-words font-medium">{item.title || `Merchandise ${index + 1}`} · {item.visible ? "Shown" : "Hidden"}</summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">Product title<Input aria-label={`Merchandise ${index + 1} title`} value={item.title} maxLength={160} onChange={event => update(item.id, { title: event.target.value })} /></label>
        <label className="grid gap-2 text-sm">Category<select aria-label={`Merchandise ${index + 1} category`} className="h-10 min-w-0 rounded-md border bg-background px-3" value={item.category} onChange={event => update(item.id, { category: event.target.value as typeof item.category })}>{merchandiseCategories.map(category => <option key={category} value={category}>{({ trading_card: "Trading card", jersey: "Jersey", apparel: "Apparel", memorabilia: "Memorabilia", other: "Other" })[category]}</option>)}</select></label>
        <label className="grid gap-2 text-sm sm:col-span-2">Product link<Input aria-label={`Merchandise ${index + 1} link`} type="url" value={item.productUrl} maxLength={2048} onChange={event => update(item.id, { productUrl: event.target.value })} /></label>
        <label className="grid gap-2 text-sm">Image URL (optional)<Input aria-label={`Merchandise ${index + 1} image`} type="url" value={item.imageUrl ?? ""} maxLength={2048} onChange={event => update(item.id, { imageUrl: event.target.value || null })} /></label>
        <label className="grid gap-2 text-sm">Retailer (optional)<Input aria-label={`Merchandise ${index + 1} retailer`} value={item.retailer ?? ""} maxLength={160} onChange={event => update(item.id, { retailer: event.target.value || null })} /></label>
        <label className="grid gap-2 text-sm">Price label (optional)<Input aria-label={`Merchandise ${index + 1} price`} placeholder="$25 · check seller for current price" value={item.priceLabel ?? ""} maxLength={80} onChange={event => update(item.id, { priceLabel: event.target.value || null })} /></label>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input aria-label={`Merchandise ${index + 1} visible`} type="checkbox" checked={item.visible} onChange={event => update(item.id, { visible: event.target.checked })} />Show in Locker merchandise</label>
      </div>
      <Button className="mt-4" type="button" variant="outline" onClick={() => onChange(items.filter(entry => entry.id !== item.id))}>Remove merchandise</Button>
    </details>)}
    <Button type="button" variant="outline" disabled={items.length >= 40} onClick={() => onChange([...items, { id: crypto.randomUUID(), title: "", category: "trading_card", productUrl: "", imageUrl: null, retailer: null, priceLabel: null, visible: true }])}>Add merchandise</Button>
  </BuilderSection>;
}
