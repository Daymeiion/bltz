// Isolated PostgreSQL regression; no hosted connection or external requests.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const title = "Antoine Cason autographed Football Card (Arizona) 2008 Press Pass Rookie";
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
    const save = async (imageUrl, changedTitle = title) => {
        const result = await db.query("select public.save_preview_merchandise_search($1,1,$2,$3,$4) as review", [id, "a".repeat(64), new Date(Date.now() - 60_000 + time++ * 1000).toISOString(), { items: [{ ...item, imageUrl, title: changedTitle }], status: "complete", candidates: 1, rejected: 0, errors: [] }]);
        return result.rows[0].review;
    };
    assert.equal((await save(null)).result.items[0].imageUrl, null);
    const image = "https://m.media-amazon.com/images/I/card.jpg";
    assert.equal((await save(image)).result.items[0].imageUrl, null); // Reproduces the old merge losing a discovered image.
    await db.exec("reset role");
    await db.exec(readFileSync("supabase/migrations/20261018204700_preview_merchandise_missing_images.sql", "utf8"));
    await db.exec("set role authenticated");
    const filled = await save(image, "A changed search title");
    assert.equal(filled.result.items.length, 1);
    assert.equal(filled.result.items[0].title, title);
    assert.equal(filled.result.items[0].imageUrl, image);
    assert.equal((await save(null)).result.items[0].imageUrl, image);
    const preserved = await save("https://cdn.example.com/replacement.jpg");
    assert.equal(preserved.result.items[0].imageUrl, image);
    await db.query("select public.dismiss_preview_merchandise_result($1,1,$2,$3)", [id, preserved.version, item.productUrl]);
    const dismissed = await save(image);
    assert.equal(dismissed.result.items.length, 0);
    assert.equal(dismissed.dismissed_items[0].imageUrl, image);
    assert.deepEqual((await db.query("select merchandise from public.preview_lockers where id=$1", [id])).rows[0].merchandise, []);
    await db.exec("select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false)");
    await assert.rejects(save(image), { code: "42501" });
    console.log("PASS: missing merchandise images, preserved metadata, deduplication, dismissals, RLS and no Locker writes");
}
finally {
    await db.close();
}
