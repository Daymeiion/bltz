import { expect, it } from "vitest";
import { merchandiseListingKeys, merchandiseQueueResultSchema } from "@/lib/preview-lockers/merchandise-review";
import { merchandiseResultSchema } from "@/lib/enrichment/merchandise";
const same = (a: string, b: string) => merchandiseListingKeys({ productUrl: a }).some(key => merchandiseListingKeys({ productUrl: b }).includes(key));
it("deduplicates tracking, fragments, www, trailing slashes and query ordering", () => {
  expect(same("https://www.shop.example.com/card/?b=2&a=1&utm_source=x#card", "https://shop.example.com/card?a=1&b=2")).toBe(true);
  expect(same("https://shop.example.com/card?size=M", "https://shop.example.com/card?size=L")).toBe(false);
});
it.each([
  ["https://amazon.com/card/dp/B01N26VW34", "https://www.amazon.com/gp/product/B01N26VW34?ref=search"],
  ["https://ebay.com/itm/card/12345", "https://www.ebay.com/itm/12345?hash=x"],
  ["https://nflauction.nfl.com/first/isynmv1/aucd/5491501", "https://nflauction.nfl.com/second/isynmv1/aucd/5491501"],
  ["https://sportsmemorabilia.com/a/p-4580493739672+z-9", "https://www.sportsmemorabilia.com/b/p-4580493739672+z-8"],
])("matches alternate listing paths by seller product ID: %s", (a, b) => { expect(same(a, b)).toBe(true); });
it("keeps different seller listings and IDs separate and rejects cross-domain canonicals", () => {
  expect(same("https://amazon.com/dp/B01N26VW34", "https://amazon.com/dp/B07WSY679H")).toBe(false);
  expect(same("https://ebay.com/itm/12345", "https://ebay.co.uk/itm/12345")).toBe(false);
  expect(merchandiseListingKeys({ productUrl: "https://shop.example.com/card", canonicalUrl: "https://other.example.com/card" })).toEqual(["url:https://shop.example.com/card"]);
  expect(merchandiseListingKeys({ productUrl: "https://shop.example.com/card", canonicalUrl: "https://shop.example.com/alias", listingKeys: ["url:https://shop.example.com/earlier"] })).toContain("url:https://shop.example.com/earlier");
});
it("accepts accumulated review queues above twelve without raising the search limit", () => {
  const item = { title: "Player football card", category: "trading_card", productUrl: "https://shop.example.com/card", canonicalUrl: "https://shop.example.com/card", imageUrl: null, retailer: null, priceLabel: null, availability: "unknown", description: "Card", matchedAffiliations: ["Arizona"] };
  const result = { items: Array.from({ length: 25 }, (_, i) => ({ ...item, productUrl: `${item.productUrl}/${i}` })), status: "complete", candidates: 12, rejected: 0, errors: [] };
  expect(merchandiseQueueResultSchema.safeParse(result).success).toBe(true);
  expect(merchandiseResultSchema.safeParse(result).success).toBe(false);
  expect(merchandiseQueueResultSchema.safeParse({ ...result, items: Array(201).fill(item) }).success).toBe(false);
});
