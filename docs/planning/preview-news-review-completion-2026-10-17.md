# Saved news review queue completion — October 17, 2026

## Summary and release

Production now saves new scraped news as private pending reviews. Later searches append unique results, preserve unreviewed article details and keep dismissed aliases dismissed. Adding news to a Locker requires per-article review, Add to draft and Save draft. Existing Locker articles retain their editorial controls.

Released commits `1385357b56164d80461e3359e1a15773c42cf8a2` and `fde05a0c5ec1bf8281b5872ed32ed1a19e4b48a9`. Final Vercel deployment `dpl_9uRo4sr5yCThq7fXxkEMmv3evaCV` is READY on `bltz.me`, `www.bltz.me` and `bltz.vercel.app`. The follow-up commit ensures reopening uses persisted identity rather than affiliation display suggestions.

[Open Antoine Cason's preview builder](https://bltz.vercel.app/admin/preview-lockers/a471cb24-5d17-4e3f-b165-f1b97c77d69e/edit), then select Media → News articles. Two real new articles are saved there for review.

## Files changed

Source changes are in `C:/Users/Administrator/bltz/output/preview-merchandise-search`; unrelated root-checkout changes were preserved.

- `app/admin/preview-lockers/ArticlesSection.tsx`: private pending queue alongside existing Locker article controls.
- `app/admin/preview-lockers/NewsResults.tsx`: explicit review, Add to draft and dismissal controls.
- `app/admin/preview-lockers/PreviewLockerForm.tsx`: saved queue state, validated reload/search responses and version-checked dismissals.
- `app/admin/preview-lockers/[id]/edit/page.tsx`: load saved pending news on reopen using persisted identity.
- `app/admin/preview-lockers/EnrichmentPanel.tsx`: clarify matched news and Media review workflow.
- `app/api/preview-lockers/[id]/news/route.ts`: private queue GET, revision-aware POST, dismissal PATCH and conflict/capacity handling.
- `lib/preview-lockers/news-review.ts`: queue validation and URL/headline alias keys.
- `lib/preview-lockers/news-review-server.ts`: private pending reader with current football/player relevance gates.
- `lib/preview-lockers/enrichment.ts`: safe queue-capacity diagnostics.
- `lib/enrichment/news.ts`: narrow headline-key input type for reuse; discovery limits/ranking unchanged.
- `lib/search/errors.ts`: safe queue errors.
- `types/news-review.generated.ts`, `types/enrichment.generated.ts`: official regenerated scoped schema types.
- `supabase/migrations/20261017065704_preview_news_review_queue.sql`: additive schema, merge persistence, dismissal and audit changes.
- `scripts/verify-preview-news-review.mjs`: isolated current-schema SQL regressions.
- `scripts/verify-preview-enrichment.mjs`: preserve historical enrichment regressions while checking current schema types.
- `tests/preview-lockers/enrichment-api.test.ts`, `enrichment-persistence.test.ts`, `media-form.test.tsx`: update existing API/persistence/curation expectations.
- `tests/preview-lockers/news-review.test.ts`, `news-review-reader.test.ts`, `news-review-form.test.tsx`: alias/schema, private reader and review UI regressions.
- `docs/planning/preview-news-review-queue-2026-10-17.md`: scope, acceptance criteria and validation plan.

## Routes changed

Existing `/admin/preview-lockers/[id]/edit` Media tab and GET/POST/PATCH `/api/preview-lockers/[id]/news`. No new public route or Locker renderer change.

## Database changes and migration

Applied migration `20261017065704_preview_news_review_queue.sql` to production Supabase project `drxtzxnwdtgxwueiqygf`. Migration count advanced from 85 to 86.

Reuses `player_articles` and its existing statuses: `accepted` preserves existing Locker articles, `review` stores new pending suggestions, `rejected` stores dismissed suggestions, and `inactive` retains consolidated duplicate history. Adds bounded `review_keys` aliases to article rows, `news_review_version` and `news_searched_at` to `preview_enrichments`, and a partial queue index. No parallel article store or future Media Graph table.

The existing enrichment RPC now merges atomically under the preview row lock, preserving award validation/mapping. Normalized URL, canonical and same-publisher headline keys consolidate duplicate groups transitively without replacing saved details. Existing published data takes priority; otherwise a dismissal takes priority over pending work. Empty/failed searches and same-identity revision changes preserve prior work. Different identities remain isolated without deleting historical rows. Pending queues cap at 200, each search remains capped at twelve, and overflow fails atomically. Alias groups are bounded at 64 keys.

The guarded production migration verified the database identifier, migration history and prior function body. It locked out concurrent persistence before DDL and checked hashes of every existing preview, article and enrichment report. All existing row data remained unchanged apart from the additive column defaults.

## Environment variables and permissions

No new environment variables or application dependencies. Existing Tavily configuration, identity queries, metadata/source-policy checks, discovery budget and cooldown remain.

Pending and dismissed articles are Admin-only under RLS. Server-side Admin authorization, same-origin mutation checks and private/no-store responses remain. New dismissal RPC is security invoker, with narrow column UPDATE grants and RLS permitting only Admin review/rejected rows to become rejected; no publication or metadata/identity update is granted. Existing enrichment definer authorization remains intact. Anonymous function execution and queue reads are denied. No authenticated INSERT/DELETE or headline UPDATE grant was added. New private audit trigger records article review mutations as `preview.news_review`; existing enrichment audit remains.

## Tests run

- `node scripts/verify-preview-news-review.mjs`: PASS. Covers additive migration, legacy Locker preservation, append/metadata retention, URL/headline/canonical/transitive deduplication, persistent dismissals, empty/failed searches, revision/identity separation, idempotency/out-of-order/version guards, 200-item atomic overflow and capacity recovery, audits, no publication, narrow grants and Admin/viewer/stranger/anonymous RLS.
- `node scripts/verify-preview-enrichment.mjs --check-types`: PASS. Historical enrichment regressions, award catalog/linking safeguards and current generated types.
- Full Vitest: 191 files passed, 2 skipped; 1,565 tests passed, 24 skipped.
- Final focused reopening/form/reader/persistence rerun: 18 passed.
- TypeScript: PASS. Final webpack production build with official generated types: PASS. Final Vercel production build/promotion: PASS.
- ESLint: 0 errors; 290 existing warnings.
- Supabase security advisors at error level, before and after migration: no issues.
- Git whitespace and CRLF preservation: PASS. Release checkout clean.

## Production manual verification

1. Captured Antoine Cason's baseline: preview revision 2, five existing accepted articles, zero article edits and zero Locker merchandise.
2. First real news search at `2026-10-17T07:09:38.626Z` saved two new pending articles: ESPN's Cardinals opportunity story and Zona Zealots' Arizona All-American career article. All five prior Locker articles and their original details remained.
3. Reopened the final production release without searching: both pending articles loaded from saved data. Review checkboxes reset and remained usable. Checking a review enabled Add to draft; unchecking disabled it again. Nothing was added or dismissed.
4. After the existing cooldown, a second real search at `2026-10-17T07:12:56.688Z` retained both pending article IDs, URLs, headlines and original metadata. No additional unique article appeared in this second batch. Queue version advanced to 3; `preview.news_review` audit count reached 10. Duplicate-key pairs across existing/pending/dismissed active groups remained zero.
5. Final state: five existing Locker articles, two pending reviews, zero dismissals, zero article edits, preview revision 2 and zero Locker merchandise. No article was added to the Locker or hidden during verification.
6. Opened the actual Locker Media tab: it showed the original five articles and neither pending article.
7. Anonymous GET/POST/PATCH returned 401 with private/no-store. Anonymous table reads returned 401. A production read-only authenticated non-Admin transaction could see neither pending/dismissed articles nor enrichment state. Isolated tests also cover assigned viewers and unauthorized mutations.
8. Mobile at 390 × 844: document width 390, readable article cards, accessible review labels and visible Add/Dismiss controls. Restored desktop viewport and left the builder Media tab open. Closed owned SQL/Locker verification tabs.
9. Vercel runtime error queries returned no entries. Browser recorded one listener-channel-closed message without an application failure; search, review gating and reopening succeeded.

## Known limitations and deferred work

Stored article details are deliberately preserved and may be older than the latest search. Provider availability and source restrictions still determine which new articles can be discovered; no search-title-only news fallback was added. Same-publisher headline deduplication follows the existing news convention; canonical URLs can link syndicated copies across publishers. Unknown aliases without matching URL, canonical or headline keys remain distinct. Existing source-policy and identity gates still apply when reading saved evidence.

The SQL verification scripts use locally available PGlite, consistent with the existing enrichment verification script; no application dependency was added. No required work remains deferred for this request. Stats, merchandise, rights, payment and future Media Graph changes are excluded.

## Product direction check

Strengthens athlete identity → discovered historical coverage → persistent private review → explicitly curated Locker articles. Useful after an athlete leaves an organization. Does not infer Moment, contribution, ownership, licensing, revenue or Value Graph relationships. Reuses the existing discovery provider and article model; no mature publishing workflow or generalized media-management system was duplicated.

## Evidence

Release evidence is under `C:/Users/Administrator/bltz/output/news-review-*`, including migration/type/advisor receipts, before/first/final database snapshots, two search UI snapshots, reopened state, Locker boundary proof, anonymous checks, comparison, test/build logs and screenshots.

![Saved news review queue](C:/Users/Administrator/bltz/output/news-review-desktop.png)

![Mobile news review controls](C:/Users/Administrator/bltz/output/news-review-mobile.png)
