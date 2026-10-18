// @vitest-environment node
import { expect, it } from "vitest";
import { extractProductMetadata } from "@/lib/enrichment/product-metadata";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

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

it("persists missing review images on repeated searches while preserving saved images, metadata and dismissed state", async () => {
  const db = new PGlite();
  const admin = "00000000-0000-4000-8000-000000000001";
  const id = "00000000-0000-4000-8000-000000000002";
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create schema private; grant usage on schema auth to authenticated;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function public.is_internal_admin() returns boolean language sql stable as $$select auth.uid()='${admin}'::uuid$$;
      create table public.players(id uuid primary key);
      create table public.preview_enrichments(preview_id uuid primary key, news_review_version integer);
      create table public.audit_logs(actor_user_id uuid,action text,entity_type text,entity_id text,actor_role_scope text,new_values jsonb);
      create table public.player_articles(id uuid primary key,status text); alter table public.player_articles enable row level security;
      create policy preview_articles_admin_dismiss on public.player_articles for update to authenticated using(public.is_internal_admin());
      create table public.preview_lockers(id uuid primary key,revision integer,merchandise jsonb default '[]');
      alter table public.preview_lockers enable row level security; grant select,update on public.preview_lockers to authenticated;
      create policy preview_admin_read on public.preview_lockers for select to authenticated using(public.is_internal_admin());
      create policy preview_admin_update on public.preview_lockers for update to authenticated using(public.is_internal_admin()) with check(public.is_internal_admin());
      insert into public.preview_lockers(id,revision) values('${id}',1);`);
    for (const file of ["20261017033348_preview_merchandise_review_queue.sql", "20261017035825_preview_merchandise_queue_merge.sql", "20261017073440_preview_media_restore.sql"]) {
      await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
    }
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${admin}',false);`);
    const item = { title, category: "trading_card", productUrl: "https://amazon.com/dp/B07WSY679H", canonicalUrl: "https://amazon.com/dp/B07WSY679H", imageUrl: null, description: "Arizona football", retailer: "Amazon", priceLabel: null, availability: "unknown", matchedAffiliations: ["Arizona"] };
    let time = 0;
    const save = async (imageUrl: string | null, changedTitle = title) => {
      const result = await db.query<{ review: { result: { items: Array<typeof item & { imageUrl: string | null }> }; version: number; dismissed_items: Array<typeof item & { imageUrl: string | null }> } }>(
        "select public.save_preview_merchandise_search($1,1,$2,$3,$4) as review",
        [id, "a".repeat(64), new Date(Date.now() - 60_000 + time++ * 1000).toISOString(), { items: [{ ...item, imageUrl, title: changedTitle }], status: "complete", candidates: 1, rejected: 0, errors: [] }]);
      return result.rows[0].review;
    };
    expect((await save(null)).result.items[0].imageUrl).toBeNull();
    const image = "https://m.media-amazon.com/images/I/card.jpg";
    expect((await save(image)).result.items[0].imageUrl).toBeNull(); // Reproduces the old merge losing a discovered image.
    await db.exec("reset role");
    await db.exec(readFileSync("supabase/migrations/20261018204700_preview_merchandise_missing_images.sql", "utf8"));
    await db.exec("set role authenticated");
    const filled = await save(image, "A changed search title");
    expect(filled.result.items).toHaveLength(1);
    expect(filled.result.items[0]).toMatchObject({ title, imageUrl: image });
    expect((await save(null)).result.items[0].imageUrl).toBe(image);
    const preserved = await save("https://cdn.example.com/replacement.jpg");
    expect(preserved.result.items[0].imageUrl).toBe(image);
    await db.query("select public.dismiss_preview_merchandise_result($1,1,$2,$3)", [id, preserved.version, item.productUrl]);
    const dismissed = await save(image);
    expect(dismissed.result.items).toHaveLength(0);
    expect(dismissed.dismissed_items[0].imageUrl).toBe(image);
    expect((await db.query<{ merchandise: unknown[] }>("select merchandise from public.preview_lockers where id=$1", [id])).rows[0].merchandise).toEqual([]);
    await db.exec("select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false)");
    await expect(save(image)).rejects.toMatchObject({ code: "42501" });
  } finally { await db.close(); }
}, 30_000);
