// @vitest-environment node
import { expect, it, vi } from "vitest";
import { discoverMerchandise, isProductUrl, merchandiseQueries, productMatchesIdentity, type ProductMetadata } from "@/lib/enrichment/merchandise";
import { extractProductMetadata } from "@/lib/enrichment/product-metadata";
import { SearchProviderError } from "@/lib/search/errors";
const identity = { fullName: "Antoine Cason", sport: "football", schools: ["Arizona"], teams: ["SD"] };
const product: ProductMetadata = { title: "Antoine Cason Arizona Wildcats football trading card", productUrl: "https://shop.example.com/products/cason", canonicalUrl: "https://shop.example.com/products/cason", category: "trading_card", description: "Arizona Wildcats football rookie card", imageUrl: null, retailer: "Card Shop", priceLabel: null, availability: "unknown" };
const signal = () => AbortSignal.timeout(2000);
it("searches each bounded college/team context with a quoted name and both trading cards and jerseys", () => {
  expect(merchandiseQueries(identity)).toEqual([
    '"Antoine Cason" football Arizona trading cards', '"Antoine Cason" football Arizona jersey',
    '"Antoine Cason" football San Diego Chargers trading cards', '"Antoine Cason" football San Diego Chargers jersey',
  ]);
  expect(merchandiseQueries({ ...identity, schools: [], teams: [] })).toEqual([]);
  expect(merchandiseQueries({ ...identity, fullName: "Antoine" })).toEqual([]);
  expect(merchandiseQueries({ ...identity, teams: Array.from({ length: 30 }, (_, i) => `Team ${i}`) })).toHaveLength(12);
});
it.each([
  ["Alex Smith Utah basketball trading card", "Utah basketball", false],
  ["Alex Smith Stanford football jersey", "Stanford football", false],
  ["Alex Smithson Utah football jersey", "Utah football", false],
  ["Alex Smith Utah trading card", "Collector edition", false],
  ["Alex Smith San Francisco 49ers jersey", "Replica jersey", true],
  ["Alex Smith Utah football trading card", "Football rookie card", true],
])("checks seller metadata for identity and football context: %s", (title, description, accepted) => {
  expect(productMatchesIdentity({ ...product, title, description }, { fullName: "Alex Smith", sport: "football", schools: ["Utah"], teams: ["SF"] })).toBe(accepted);
});
it.each(["https://shop.example.com/", "https://shop.example.com/search?q=Cason", "https://www.ebay.com/sch/i.html?_nkw=Cason", "https://shop.example.com/collections/jerseys", "https://shop.example.com/blog/cason", "https://shop.example.com/players/cason", "http://shop.example.com/products/cason", "https://127.0.0.1/products/cason"])("rejects unsafe and non-product destination %s", url => expect(isProductUrl(url)).toBe(false));
it("deduplicates listings, corroborates affiliations and never treats search snippets as identity evidence", async () => {
  const search = vi.fn(async () => [{ url: product.productUrl + "?utm_source=search" }, { url: product.productUrl }, { url: "https://shop.example.com/products/wrong" }]);
  const extract = vi.fn(async (url: string) => url.endsWith("wrong") ? { ...product, title: "Alex Smith basketball trading card", description: "Utah basketball" } : product);
  const result = await discoverMerchandise(identity, { name: "fixture", search }, extract, signal());
  expect(result.items).toHaveLength(1);
  expect(result.items[0].matchedAffiliations).toContain("Arizona");
  expect(result.items[0]).not.toHaveProperty("visible");
  expect(extract).toHaveBeenCalledTimes(2);
});
it("checks policy, validates output fields, and does not extract restricted sources", async () => {
  const extract = vi.fn(async () => ({ ...product, imageUrl: "https://127.0.0.1/a", priceLabel: "x".repeat(81) }));
  const result = await discoverMerchandise(identity, { name: "fixture", search: async () => [{ url: "https://www.pro-football-reference.com/products/cason" }, { url: product.productUrl }] }, extract, signal());
  expect(extract).toHaveBeenCalledTimes(1); expect(result.items).toEqual([]);
});
it("returns partial reviewed candidates when another category search fails", async () => {
  let calls = 0;
  const result = await discoverMerchandise(identity, { name: "fixture", search: async () => { if (++calls === 2) throw new SearchProviderError("search_rate_limited"); return [{ url: product.productUrl }]; } }, async () => product, signal());
  expect(result.status).toBe("partial"); expect(result.items).toHaveLength(1); expect(result.errors).toContain("search_rate_limited");
});
it("does not spend searches without identity or configuration and reports a complete zero-match search honestly", async () => {
  const search = vi.fn(async () => []);
  expect((await discoverMerchandise(identity, null, async () => null, signal())).status).toBe("unavailable");
  expect((await discoverMerchandise({ ...identity, schools: [], teams: [] }, { name: "fixture", search }, async () => null, signal())).errors).toContain("merchandise_identity_incomplete");
  expect(search).not.toHaveBeenCalled();
  expect(await discoverMerchandise(identity, { name: "fixture", search }, async () => null, signal())).toMatchObject({ items: [], status: "complete", errors: [] });
});
it("extracts a single product, exact remote image, price, stock and identity properties without body content", () => {
  const html = `<meta property="og:site_name" content="Card Shop"><link rel="canonical" href="https://evil.example.com/products/other"><script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: product.title, category: "Sports Trading Cards", description: "Arizona rookie card", additionalProperty: [{ name: "Sport", value: "Football" }], image: "https://cdn.example.com/image//cason.jpg?b=2&a=1", offers: { "@type": "Offer", price: 12.99, priceCurrency: "USD", availability: "https://schema.org/InStock" }, review: "Private review not retained" })}</script><body>Never retain this whole seller page</body>`;
  const parsed = extractProductMetadata(html, product.productUrl)!;
  expect(parsed).toMatchObject({ title: product.title, category: "trading_card", priceLabel: "USD 12.99", availability: "in_stock", canonicalUrl: product.productUrl, imageUrl: "https://cdn.example.com/image//cason.jpg?b=2&a=1" });
  expect(parsed.description).toContain("Football"); expect(JSON.stringify(parsed)).not.toMatch(/Private review|Never retain/);
});
it("supports OpenGraph listing metadata but rejects catalogs, editorial pages and fabricated prices", () => {
  const meta = `<meta property="og:title" content="Antoine Cason San Diego Chargers jersey"><meta property="og:description" content="Football jersey"><meta property="product:price:amount" content="25"><meta property="product:price:currency" content="USDX">`;
  expect(extractProductMetadata(meta, "https://www.ebay.com/itm/12345")).toMatchObject({ category: "jersey", priceLabel: null });
  expect(extractProductMetadata(`${meta}<meta property="og:image" content="$fbImageURL">`, "https://www.ebay.com/itm/12345")?.imageUrl).toBeNull();
  expect(extractProductMetadata(meta, "https://shop.example.com/story/cason")).toBeNull();
  const catalog = `<script type="application/ld+json">[{"@type":"Product","name":"A"},{"@type":"Product","name":"B"}]</script>`;
  expect(extractProductMetadata(catalog, product.productUrl)).toBeNull();
  expect(extractProductMetadata(meta, "https://shop.example.com/collections/all")).toBeNull();
});
