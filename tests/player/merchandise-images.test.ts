// @vitest-environment node
import { expect, it } from "vitest";
import { extractProductMetadata } from "@/lib/enrichment/product-metadata";
import { spawnSync } from "node:child_process";

const title = "Antoine Cason autographed Football Card (Arizona) 2008 Press Pass Rookie";
const meta = `<meta property="og:title" content="${title}">`;
it("reads Amazon's main product image without selecting ads or recommendations", () => {
  const html = `${meta}<img src="https://images.example.com/ad.jpg"><img id="landingImage" src="https://m.media-amazon.com/images/I/card-small.jpg" data-a-dynamic-image='{ "https://m.media-amazon.com/images/I/card-large.jpg?b=2&amp;a=1": [500,700], "https://m.media-amazon.com/images/I/card-medium.jpg": [300,400] }'>`;
  expect(extractProductMetadata(html, "https://www.amazon.com/card/dp/B07WSY679H")?.imageUrl).toBe("https://m.media-amazon.com/images/I/card-large.jpg?b=2&a=1");
});
it("reads NFL auction carousel image data when OpenGraph is an unresolved placeholder", () => {
  const html = `${meta}<meta property="og:image" content="$fbImageURL"><div id="productCarousel" data-media='[{"type":"video","src":"https://cdn.example.com/video.mp4"},{"type":"image","src":"https://vafloc02.s3.amazonaws.com/isyn/images/jersey-f.jpg","alt":"${title}"}]'></div>`;
  expect(extractProductMetadata(html, "https://nflauction.nfl.com/card/isynmv1/aucd/5491501")?.imageUrl).toBe("https://vafloc02.s3.amazonaws.com/isyn/images/jersey-f.jpg");
});
it.each([
  `<meta property="og:image:url" content="//cdn.example.com/card.jpg">`,
  `<meta name="twitter:image:src" content="/card.jpg">`,
  `<link rel="image_src" href="/card.jpg">`,
  `<img itemprop="image" data-src="/card.jpg" src="data:image/gif;base64,AAAA">`,
  `<script type="application/ld+json">{"@type":"Product","name":"${title}","image":["https://127.0.0.1/unsafe.jpg",{"contentUrl":"/card.jpg"}]}</script>`,
])("uses alternate product image metadata safely: %s", html => {
  expect(extractProductMetadata(meta + html, "https://cdn.example.com/products/card")?.imageUrl).toBe("https://cdn.example.com/card.jpg");
});
it("uses eBay main product image lazy attributes and preserves the exact image URL", () => {
  expect(extractProductMetadata(`${meta}<img id="icImg" data-zoom-src="//i.ebayimg.com/images/card.jpg?b=2&amp;a=1" src="/placeholder.gif">`, "https://www.ebay.com/itm/12345")?.imageUrl).toBe("https://i.ebayimg.com/images/card.jpg?b=2&a=1");
});
it("does not mistake arbitrary images, script strings or another seller's selectors for a product image", () => {
  const html = `${meta}<img src="https://cdn.example.com/logo.png"><img alt="Related player card" src="https://cdn.example.com/related.jpg"><script>const tag='<img itemprop="image" src="https://cdn.example.com/fake.jpg">';</script><img id="landingImage" src="https://cdn.example.com/not-amazon.jpg"><div id="productCarousel" data-media='[{"type":"image","src":"https://cdn.example.com/not-auction.jpg"}]'></div>`;
  expect(extractProductMetadata(html, "https://shop.example.com/products/card")?.imageUrl).toBeNull();
});
it("handles malformed gallery data and rejects unsafe images without losing product metadata", () => {
  expect(extractProductMetadata(`${meta}<img id="landingImage" src="https://127.0.0.1/private.jpg" data-a-dynamic-image='broken'>`, "https://amazon.com/dp/B07WSY679H")).toMatchObject({ title, imageUrl: null });
  expect(extractProductMetadata(`${meta}<div id="productCarousel" data-media='broken'></div>`, "https://nflauction.nfl.com/products/card")?.imageUrl).toBeNull();
});

it("persists missing review images without changing metadata, dismissal or access guards", () => {
  const result = spawnSync(process.execPath, ["scripts/verify-preview-merchandise-images.mjs"], { encoding: "utf8", timeout: 30_000 });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain("PASS: missing merchandise images");
}, 35_000);
