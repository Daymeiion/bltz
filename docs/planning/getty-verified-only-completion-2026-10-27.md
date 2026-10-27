# Getty exact matches and verified-only licensing controls

## Objective and scope

The user's October 27 follow-up requests searching remaining Dante Hughes photos under both **Dante Hughes** and **Daymeion Hughes**, removing Getty licensing icons/modals from non-Getty or unmatched photos, and centering the licensing button at the bottom of each image. This supersedes the previous athlete-search fallback behavior documented in `getty-photo-grid-links-2026-10-27.md`.

Product reference: `docs/product/BLTZ_PRODUCT_DOCTRINE.md`. Reuse existing source URLs and the shared Getty licensing component. No provider ingestion, licensing transaction, future-phase schema, or publication-eligibility changes.

## Search and matching evidence

Reviewed both pages of Getty's [Dante Hughes search](https://www.gettyimages.com/photos/dante-hughes) and the [Daymeion Hughes search](https://www.gettyimages.com/photos/daymeion-hughes). Extracted and visually compared 102 distinct relevant candidate thumbnails against all 21 previously unmatched stored photos. Additional targeted searches covered California/USC/UCLA game action, Chargers/Bengals context, and the Fifth Bridge event.

Two additional exact matches were confirmed by visible image content and asset numbers, then verified against HTTP-200 canonical detail pages:

| Stored photo | Exact Getty asset |
| --- | --- |
| `images (4)` / `78c45342-9d43-4628-a3d6-05d2503eb7c7` | [599195822 — Daymeion Hughes interception vs. UCLA](https://www.gettyimages.com/detail/news-photo/daymeion-hughes-cornerback-with-the-cal-bears-intercepting-news-photo/599195822) |
| `images (5)` / `b359b49b-b7ee-4608-8ca8-6544edef20b3` | [90326775 — Colts/Bengals tackle](https://www.gettyimages.com/detail/news-photo/foschi-of-the-cincinnati-bengals-runs-with-the-ball-against-news-photo/90326775) |

Similar headshots and a portrait from the same Fifth Bridge event were not accepted as exact matches: matching the athlete or event alone is insufficient. Getty searches did not establish exact matches for the remaining 19 stored images, which include personal/source photographs, Alamy-marked images, editorial graphics, and trading cards. They remain visible without Getty licensing controls.

The two canonical URLs were saved in the existing photo `sourceUrl` fields through the authenticated admin form. Read-back confirmed revision **19**, all **32 photos** retained, **13 exact Getty source links**, and a standard `preview.updated` audit entry. The user's separate pre-existing unsaved editor was not changed.

## Completion report

1. **Summary:** Expanded verified Getty matches from 11 to 13; removed all athlete-search fallback licensing UI; centered the button at the bottom of verified images in both grids and the related row.
2. **Files changed:** `components/player/GettyLicenseControl.tsx`, `components/player/RelatedMediaStrip.tsx`, `components/player/related-media-strip.module.css`, `tests/player/related-media-strip.test.tsx`, `tests/preview-lockers/renderer.test.tsx`, and this report.
3. **Routes changed:** Existing `/preview-lockers/[slug]`, `/preview-lockers/[slug]/photos`, and shared `/player/[slug]` and `/player/[slug]/photos` presentations. No route definitions added.
4. **Database changes:** Only the two existing Dante preview photo source URL values, saved using the application's normal admin workflow. No direct SQL or schema change.
5. **Migrations:** None.
6. **Environment variables:** None added or changed. Existing system-CA and workspace-temp settings used for validation only.
7. **Permission changes:** None. Exact Getty HTTPS detail URLs are required before rendering any trigger or dialog. A filename containing `gettyimages` alone does not qualify. No usage rights, ownership, or payment entitlement is inferred. Existing sensitive access and eligibility remain unchanged; audit creation verified.
8. **Tests run:** Focused row/grid suites passed (39 tests), including unmatched personal photos, misleading filenames, invalid/spoofed URLs, mapped modal behavior, and ordinary photo interaction. Final full-suite/build/lint and live evidence are recorded below.
9. **Manual verification:** All source photos and candidate contact sheets visually inspected; two exact detail pages and saved data/audit verified. Live UI results recorded below.
10. **Known limitations:** No exact Getty match established for 19 photos; they have no Getty licensing UI. Similar frames were intentionally not substituted. Physical touch-device verification remains unavailable.
11. **Deferred work:** Additional exact matching may be possible if new source metadata or Getty catalog records become available. No requested verified-only UI behavior is deferred.

The shared button uses horizontal centering independently of its hover animation, with an 8px bottom inset. On narrow related-row images, the separate eye button moves to the upper-left corner to avoid overlapping the centered licensing control. Keyboard focus, touch visibility, Radix modal accessibility, and safe new-tab links are retained. Getty credit is absent from a related row containing no verified Getty images.

## Product direction check

Strengthens existing athlete-media-source attribution and graph accuracy across the athlete's career. No new Moment or Value Graph relationships or schemas. Source links remain useful after organization changes. Getty continues to handle licensing rather than BLTZ duplicating its transaction workflow; no DAM scope added.

## Release validation

Clean release validation passed: 236 test files passed, two skipped; **1,923 tests passed**, 24 skipped. Production Webpack build including TypeScript passed. Full ESLint passed with zero errors and 296 existing warnings. CRLF-aware diff validation passed. Existing disabled-iframe test diagnostics remain nonfatal.
