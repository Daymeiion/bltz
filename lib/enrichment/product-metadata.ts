import { attrs, clean, imageUrl, imageValue, object, ofType, readPageMetadata } from "./article-metadata";
import { normalizeArticleUrl } from "./news";
import { isProductUrl, type ProductMetadata } from "./merchandise";
import { remoteAssetReference, requireSourceAction } from "@/lib/source-policy/policy";
import type { PreviewContent } from "@/lib/preview-lockers/validation";

/** Product-specific markup only. Never guess from logos, ads or related items. */
function galleryImages(tags: string, url: string): string[] {
  const host = new URL(url).hostname.replace(/^www\./, "");
  const images: string[] = [];
  for (const tag of tags.matchAll(/<(img|link|div)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)) {
    const a = attrs(tag[0]);
    if (tag[1].toLowerCase() === "link" && a.rel?.toLowerCase().split(/\s+/).includes("image_src")) images.push(a.href);
    if (host === "nflauction.nfl.com" && a.id === "productCarousel" && a["data-media"]?.length < 100_000) {
      try {
        const media: unknown = JSON.parse(a["data-media"]);
        if (Array.isArray(media)) for (const value of media.slice(0, 30)) {
          const item = object(value);
          if (item.type === "image" && typeof item.src === "string") images.push(item.src);
        }
      } catch { /* A malformed gallery does not invalidate readable metadata. */ }
    }
    if (tag[1].toLowerCase() !== "img") continue;
    const amazon = /^(?:[a-z0-9-]+\.)?amazon\.com$/.test(host) && a.id === "landingImage";
    const ebay = /^(?:[a-z0-9-]+\.)?ebay\.com$/.test(host) && a.id === "icImg";
    if (!amazon && !ebay && !a.itemprop?.split(/\s+/).includes("image")) continue;
    images.push(a["data-old-hires"], a["data-a-hires"], a["data-zoom-src"]);
    if (amazon && a["data-a-dynamic-image"]?.length < 100_000) {
      try {
        const dynamic = object(JSON.parse(a["data-a-dynamic-image"]));
        images.push(...Object.entries(dynamic).slice(0, 30).map(([src, size]) => {
          const dimensions = Array.isArray(size) ? size : [];
          const area = dimensions.length === 2 && dimensions.every(n => typeof n === "number" && Number.isFinite(n) && n > 0 && n <= 20_000)
            ? dimensions[0] * dimensions[1] : 0;
          return { src, area };
        }).sort((a, b) => b.area - a.area).map(item => item.src));
      } catch { /* Fall back to the main image's src/lazy attributes. */ }
    }
    images.push(a["data-src"], a["data-lazy-src"], a.src);
  }
  return images.filter(value => typeof value === "string");
}

function category(text: string): PreviewContent["merchandise"][number]["category"] | null {
  if (/\b(?:trading cards?|sports cards?|football cards?|rookie cards?|panini|topps|upper deck|bowman|donruss|fleer|prizm)\b/i.test(text)) return "trading_card";
  if (/\bjerseys?\b/i.test(text)) return "jersey";
  if (/\b(?:t-shirts?|tees?|hoodies?|sweatshirts?|apparel)\b/i.test(text)) return "apparel";
  if (/\b(?:memorabilia|autograph(?:ed)?|signed|game.used)\b/i.test(text)) return "memorabilia";
  return null;
}
function priceLabel(offer: Record<string, unknown>, meta: Record<string, string>): string | null {
  const price = clean(offer.price ?? meta["product:price:amount"] ?? meta["og:price:amount"], 30);
  const currency = clean(offer.priceCurrency ?? meta["product:price:currency"] ?? meta["og:price:currency"], 20).toUpperCase();
  // Numeric JSON-LD prices are supported without reading prose or search snippets.
  const raw = typeof offer.price === "number" ? String(offer.price) : price;
  return /^\d{1,7}(?:\.\d{1,4})?$/.test(raw) && Number(raw) <= 1_000_000 && /^[A-Z]{3}$/.test(currency) ? `${currency} ${raw}` : null;
}
/** Single-product metadata only; no HTML, reviews, body, inventory or checkout data escapes. */
export function extractProductMetadata(html: string, input: string): ProductMetadata | null {
  const url = normalizeArticleUrl(input);
  if (!url || !isProductUrl(url)) return null;
  requireSourceAction(url, "EXTRACT_METADATA"); requireSourceAction(url, "PERSIST_METADATA");
  const { meta, structured, canonical, tags } = readPageMetadata(html);
  const products = structured.filter(item => ofType(item, "Product"));
  if (products.length > 1) return null; // Multi-product catalog pages are not a player listing.
  const product = products[0];
  const title = clean(product?.name || meta["og:title"] || meta["twitter:title"] || /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(tags)?.[1], 160);
  const explicitProduct = product || /(?:^|:)product(?:\.|$)/i.test(meta["og:type"] ?? "");
  const parsedUrl = new URL(url);
  const listingPath = /\/(?:products?|items?|itm|dp|gp\/product|cards)\/|(?:[\/+_-])p-\d+/i.test(parsedUrl.pathname)
    || parsedUrl.hostname === "nflauction.nfl.com" && /\/isynmv1\/aucd\/\d+(?:\/|$)/i.test(parsedUrl.pathname);
  if (!title || (!explicitProduct && !listingPath)) return null;
  const description = clean(product?.description || meta["og:description"] || meta["twitter:description"] || meta.description, 400);
  const properties = [product?.additionalProperty].flat().slice(0, 30).map(object).filter(p => /^(?:sport|team|player|athlete|league|college)$/i.test(clean(p.name, 40))).map(p => clean(p.value, 80));
  const context = clean([clean(product?.category, 160), ...properties].filter(Boolean).join(" · "), 300);
  const kind = category(`${title} ${clean(product?.category, 160)}`);
  if (!kind) return null;
  const hint = normalizeArticleUrl(canonical || clean(product?.url, 2048) || meta["og:url"] || url, url);
  const canonicalUrl = hint && new URL(hint).hostname.replace(/^www\./, "") === new URL(url).hostname.replace(/^www\./, "") && isProductUrl(hint) ? hint : url;
  requireSourceAction(canonicalUrl, "PERSIST_METADATA");
  const offer = object(Array.isArray(product?.offers) ? product.offers[0] : product?.offers);
  const stock = clean(offer.availability || meta["product:availability"], 150).replace(/^https?:\/\/schema.org\//i, "").toLowerCase();
  const image = [...[product?.image].flat().map(imageValue), meta["og:image:secure_url"], meta["og:image"], meta["og:image:url"], meta["twitter:image"], meta["twitter:image:src"], ...galleryImages(tags, url)]
    .filter(value => value && !/\$fbimageurl|\$\{|\{\{|%7b|(?:^|[\/_-])(?:placeholder|spacer|transparent|no[-_]image)(?:[\/_\-.]|$)/i.test(value))
    .map(value => remoteAssetReference(imageUrl(value, url))).find(Boolean);
  return { title, category: kind, productUrl: url, canonicalUrl, imageUrl: remoteAssetReference(image),
    retailer: clean(meta["og:site_name"], 160) || new URL(url).hostname.replace(/^www\./, ""),
    description: clean([description, context].filter(Boolean).join(" · "), 600), priceLabel: priceLabel(offer, meta),
    availability: /^(?:instock|in stock|limitedavailability)$/.test(stock) ? "in_stock" : /^(?:outofstock|out of stock|soldout|sold out|discontinued)$/.test(stock) ? "out_of_stock" : "unknown" };
}
