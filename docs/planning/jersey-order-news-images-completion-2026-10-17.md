# Jersey badge chronology and news image fitting

Completed October 17, 2026. Production commit: `c9185ef083ff1081fca73cdba3f1e8253b91a105`.

## Summary

Jersey badges now follow the athlete's saved college and professional season history. Earliest seasons come first, with source row order resolving multiple team stints in the same season. PFR historical team abbreviations match their Locker team names. Sorting changes presentation only and preserves saved team lists, jersey numbers, colors, and review decisions.

News artwork uses `object-fit: contain` in the shared Locker Media cards and full article dialog. The mobile preview CSS override also uses contain.

## Files changed

- [Jersey ordering helper](C:/Users/Administrator/bltz/output/preview-merchandise-search/lib/player/jersey-history.ts)
- [Preview Locker mapper](C:/Users/Administrator/bltz/output/preview-merchandise-search/lib/preview-lockers/mapper.ts)
- [Shared Locker renderer](C:/Users/Administrator/bltz/output/preview-merchandise-search/app/player/[slug]/LockerView.tsx)
- [Mobile article styling](C:/Users/Administrator/bltz/output/preview-merchandise-search/app/globals.css)
- [Jersey regression tests](C:/Users/Administrator/bltz/output/preview-merchandise-search/tests/pipeline/jersey-history.test.tsx)
- [Locker renderer regression tests](C:/Users/Administrator/bltz/output/preview-merchandise-search/tests/preview-lockers/renderer.test.tsx)

## Routes changed

Existing `/preview-lockers/[slug]` uses chronological badge mapping. Existing `/player/[slug]` and preview Lockers share the updated news image presentation. No routes were added.

## Database changes, migrations, environment variables, and permissions

None. No database records were edited. Existing authorization, review queues, RLS, and audit behavior remain unchanged. This task changes public presentation only.

## Tests run

- Full Vitest suite: 196 files passed, 2 skipped; 1,613 tests passed, 24 skipped.
- Focused jersey history tests: 9 passed, including Cason's real imported CSV and college/unknown-history ordering.
- Focused Locker renderer tests: 12 passed, including image containment in Media cards and the full article dialog. Repeated after completing the typed article fixture.
- TypeScript: passed.
- ESLint: passed with 0 errors and the existing 290 warnings.
- Production build: passed. Initial type/build checks caught the incomplete test fixture; both passed after correction.
- Whitespace diff check: passed.

## Deployment and manual verification

Normal fast-forward push to production `main`; Vercel deployment `dpl_2L8dm9PXjfrhMuktidCd1h2um6re` is READY, with `bltz.vercel.app`, `bltz.me`, and `www.bltz.me` assigned to the tested commit.

Verified [Cason's production Locker](https://bltz.vercel.app/preview-lockers/antoine-cason) on desktop and mobile:

- San Diego #20 → Arizona #20 → Carolina #20 → Baltimore #23, retaining all four team color combinations.
- All six available news images loaded and computed to `object-fit: contain` at both sizes.
- The existing unavailable-image fallback remained visible for the article without artwork.
- Mobile page width matched viewport width, with no horizontal overflow.
- Production runtime error query returned no error entries after verification.

![Chronological badges](C:/Users/Administrator/bltz/output/jersey-order-desktop.png)

![Uncropped news artwork](C:/Users/Administrator/bltz/output/news-contain-desktop.png)

## Known limitations and deferred work

Teams without dated season records retain their relative saved order after dated teams. With no dated history, the saved order is preserved. Same-year chronology follows the saved source rows. No dates or team stints are inferred. No work remains deferred for the requested changes.

## Product direction

Strengthens the presentation accuracy of Athlete → Team → Season relationships and Athlete → News connections. These remain useful after the athlete leaves an organization. Moment Graph and Value Graph relationships were unchanged. Existing career imports and shared components were reused; no mature third-party workflow was duplicated and no generalized media-management scope was added.
