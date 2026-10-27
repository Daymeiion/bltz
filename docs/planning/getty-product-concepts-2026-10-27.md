# Dante Hughes print-on-demand meeting concepts

## Objective and scope

Replace the existing related/Getty row in Dante's Photo Room with five product mockups: a framed print, a signed poster, a pillow, a set of three stickers, and a fan holding a giant head-only face cutout. Every product opens a modal with an estimated price and a visible, disabled Buy Now button.

Product authority: `docs/product/BLTZ_PRODUCT_DOCTRINE.md`; direct October 27 user request. This is a meeting showcase around existing career/source relationships, not a commerce launch. No checkout, catalog ingestion, product rights approval, orders, earnings, payments, or future-phase schemas are introduced.

## Page intent

- Primary user: Getty meeting attendee viewing Dante's career archive.
- Primary action: inspect one of five product concepts.
- Secondary actions: open the corresponding Getty source page; resume the existing photo slideshow when paused.
- Critical information: product preview, illustrative USD estimate, product specifications, source attribution, disabled purchase action, and facsimile autograph labeling.
- Mobile priority: swipe through the five cards; scroll within a viewport-constrained modal with visible close and purchase status.
- Known exclusions: working purchase flow, signed-in storefront, authentic autograph certification, supplier availability, licensing quote, fulfillment and revenue allocation.

## Product concepts and sources

| Concept | Illustrative estimate | Getty source image IDs | Final asset |
| --- | --- | --- | --- |
| Framed print | $89 | [82679329](https://www.gettyimages.com/detail/82679329) | `public/images/dante-hughes/product-concepts/framed-print.webp` |
| Signed poster | $129 | [599195822](https://www.gettyimages.com/detail/599195822) | `public/images/dante-hughes/product-concepts/signed-poster.webp` |
| Photo pillow | $39 | [76443769](https://www.gettyimages.com/detail/76443769) | `public/images/dante-hughes/product-concepts/photo-pillow.webp` |
| Sticker set, three stickers | $12 | [106613403](https://www.gettyimages.com/detail/106613403), [77549351](https://www.gettyimages.com/detail/77549351), [51458178](https://www.gettyimages.com/detail/51458178) | `public/images/dante-hughes/product-concepts/sticker-set.webp` |
| Fan face cutout | $49 | [113640536](https://www.gettyimages.com/detail/113640536) | `public/images/dante-hughes/product-concepts/fan-face-cutout.webp` |

The built-in image-generation tool produced five concept mockups using inspected Getty archive photographs as references. These are generated product visualizations, not original Getty product photographs. The fan is generated; the autograph is a concept facsimile and is explicitly identified as unauthenticated in its modal. Estimates are illustrative retail concepts, not market research, Getty licensing quotes, available offers, or athlete earnings.

The complete final prompt set and reference IDs are saved in `docs/design-reference/dante-product-concepts-prompts.json`. Original generated PNGs remain in the generator's default output directory. The five web-ready WebP versions are saved in the project paths above, totaling approximately 710 KB. No runtime image-generation service is used.

## Completion report

1. **Summary:** Five product examples replace the related photo row only in Dante's preview Photo Room. Each opens its own estimated-price modal and has a disabled native Buy Now button with no purchase handler or checkout link.
2. **Files changed:** `components/player/ProductConceptRow.tsx`, `components/player/product-concept-row.module.css`, `lib/preview-lockers/getty-product-concepts.ts`, `app/player/[slug]/photos/PhotoRoomView.tsx`, `tests/player/product-concept-row.test.tsx`, `tests/preview-lockers/renderer.test.tsx`, the five assets above, the saved prompt set, and this report.
3. **Routes changed:** Presentation in existing `/preview-lockers/dante-hughes/photos` only. Other athletes retain their existing related-photo row; canonical public routes do not get this demo. Existing grid licensing controls and source links remain. No route definitions added.
4. **Database changes:** None. No athlete media or source records edited for this task.
5. **Migrations:** None.
6. **Environment variables:** None added or changed. Existing system-CA/workspace-temp settings used for validation only.
7. **Permission changes:** None. Existing preview access remains. This showcase does not establish image licensing, commercial rights, authentic signatures, financial entitlements, or availability. No financial/audit transaction is triggered by viewing or trying the disabled button.
8. **Tests run:** Focused suites passed (32 tests), including all five modals, estimates, source links, disabled buttons/no purchase request, Escape/focus restoration, slideshow resumption, Dante-only replacement, and absence from canonical public views. Full-suite/build/lint results are recorded below. An initial resume test with a single-photo fixture was corrected to use a resumable two-photo slideshow; no application change was needed.
9. **Manual verification:** Source references and all five generated visuals inspected, including exactly three physical stickers and a head-only face cutout. Live UI verification is recorded below.
10. **Known limitations:** These are AI-generated meeting concepts with illustrative pricing. No supplier pricing, licensed product availability or authentic autograph is represented. Physical touch-device verification is not performed.
11. **Deferred work:** No requested demo behavior deferred. Real commerce, supplier integration and product rights clearance require a separately authorized phase.

## Product direction check

The concepts demonstrate possible uses of existing athlete-career-media-source relationships that persist after organization changes. No new Career, Moment or Value Graph records, ownership assumptions, or revenue allocations are created. Getty's licensing workflow remains external. No generalized DAM, publishing or checkout platform is duplicated.

## Release validation

Clean release validation passed: **237 test files passed**, two skipped; **1,931 tests passed**, 24 skipped. The production Webpack build including TypeScript passed. Full ESLint passed with zero errors and 298 warnings (the previous 296 plus the new test-only Next Image mock's two image warnings). CRLF-aware diff validation passed. All five final WebP assets were decoded and dimension-checked. No application package or environment settings changed.

## Live production verification

Commit `5018165466756f1af82e7d2abe04c27a593ece83` reached Ready in production deployment `HtjsSV9xYFPeTXZNTqaLVkbtqktv`. Live Dante Photo Room shows exactly five product cards and no previous related-media strip. All five final image assets loaded successfully. The original photo grid retains all 32 photos and its 13 verified Getty licensing controls.

Each product modal was opened in the live browser and checked for the correct product title, image, USD estimate, safe Getty source links, a visible **disabled** Buy Now button, and working Escape dismissal. All five passed. The sticker set showed three Getty source links, and the signed poster describes its unauthenticated concept signature. Modal and row screenshots are saved at `tmp/getty-pod/live-face-modal.png` and `tmp/getty-pod/live-product-row.png`.

The generated scenes and references were visually inspected. Narrow-screen layout is implemented with horizontal card scrolling and a viewport-constrained modal; physical touch and narrow-viewport browser verification remain limitations because the available viewport override did not reliably apply in this session. No purchase or licensing transaction was submitted. No requested demo work remains deferred.

## Child fan image revision

The user requested replacing the adult holding the face cutout with a child. The built-in image tool edited the prior generated image, preserving the printed Dante face cutout, navy clothing, and stadium setting. The revised asset is `public/images/dante-hughes/product-concepts/fan-face-cutout-kid.webp`; the original asset remains. The product manifest uses the new URL for both the row card and modal, and its alt text/description identify the child. Price ($49), Getty source (113640536), disabled Buy Now behavior, routes, permissions, database, migrations, environment variables and the other four concepts remain unchanged. The exact edit prompt is appended to `docs/design-reference/dante-product-concepts-prompts.json`.

Child revision validation: the seven existing product-modal tests passed; lint for the changed manifest passed; the production Webpack build including TypeScript passed; CRLF-aware diff validation passed. No new tests were added for this image/content-only change. Live image verification follows publication.
