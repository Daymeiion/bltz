"use client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import type { MerchandiseCandidate } from "@/lib/enrichment/merchandise";

export default function MerchandiseResultCard({ item, playerName, inDraft, canAdd, onAdd, onDismiss }: {
  item: MerchandiseCandidate; playerName: string; inDraft: boolean; canAdd: boolean;
  onAdd: () => void; onDismiss: () => void;
}) {
  const [reviewed, setReviewed] = useState(false);
  const [failedImage, setFailedImage] = useState(false);
  const reviewId = useId();
  return <article className="min-w-0 space-y-3 rounded-lg border p-4">
    {item.imageUrl && !failedImage && <img className="h-36 max-w-full object-contain" src={item.imageUrl} alt={item.title} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedImage(true)} />}
    <h4 className="break-words font-semibold">{item.title}</h4>
    <p className="text-sm text-muted-foreground">{item.retailer} · {item.category.replace(/_/g, " ")}</p>
    {item.evidence === "search_result" && <p className="text-sm text-amber-400">Search result only · seller page unverified. Open the seller link and confirm the player and team before adding.</p>}
    <p className="break-words text-sm">{item.evidence === "search_result" ? "Search title mentions" : "Matched college/team"}: {item.matchedAffiliations.join(", ")}</p>
    {item.description && <p className="break-words text-sm text-muted-foreground">{item.description}</p>}
    <p className="text-sm">{item.priceLabel ? `Seller-reported price: ${item.priceLabel}` : "Price not provided by seller metadata."} {item.availability === "out_of_stock" ? "Seller reports out of stock." : item.availability === "in_stock" ? "Seller reports in stock." : "Availability unknown."}</p>
    <a className="block break-all text-sm underline" href={item.productUrl} target="_blank" rel="noopener noreferrer">Review seller listing ↗</a>
    <label htmlFor={reviewId} className="flex min-h-11 items-start gap-3 text-sm"><input id={reviewId} className="mt-1" type="checkbox" checked={reviewed} disabled={inDraft || !canAdd} onChange={event => setReviewed(event.target.checked)} />I reviewed this listing for {playerName}.</label>
    <div className="flex flex-wrap gap-3"><Button type="button" disabled={!reviewed || inDraft || !canAdd} onClick={onAdd}>{inDraft ? "In draft" : "Add to draft"}</Button><Button type="button" variant="outline" onClick={onDismiss}>Dismiss listing</Button></div>
  </article>;
}
