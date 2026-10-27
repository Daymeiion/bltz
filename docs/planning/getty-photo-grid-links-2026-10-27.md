# Dante Hughes Getty photo links and licensing controls

## Objective and scope

User request: resolve Dante Hughes's numbered Getty photos to their corresponding Getty detail pages, then give the Photo Room grid and main Locker photo grid the existing Getty-row hover control, licensing modal, and new-tab external handoff.

Product reference: `docs/product/BLTZ_PRODUCT_DOCTRINE.md`. This strengthens source attribution around existing athlete-connected media while delegating licensing to Getty. No provider ingestion, purchasing, rights engine, identity schema, or media-publication eligibility changes are included.

## Implementation

- Verified all 11 `gettyimages-<id>` filenames in Dante's saved preview against Getty's canonical detail pages. Every page returned HTTP 200 and the matching numeric asset ID.
- Saved their canonical URLs in the existing photo `sourceUrl` fields using the authenticated admin editor and normal Save draft workflow. Verified revision 18, all 32 saved photos retained, and a `preview.updated` audit entry.
- Preserved the user's separate open editor and its unsaved photo removal. That older draft must be reconciled with the newer saved revision before saving.
- Extracted the row's existing Radix dialog into `GettyLicenseControl` and reused it in the row, Photo Room grid, and main Locker photo grid.
- Validated exact Getty HTTPS detail URLs before linking; unmatched preview photos retain the athlete-search fallback with explicit search wording.
- Preserved slideshow-selection behavior. Licensing controls are sibling buttons, appear on hover or keyboard focus, and remain visible on coarse-pointer/touch devices. Escape and close restore focus. External links use `_blank` and `noopener noreferrer`.
- Restricted existing photo CSS to the actual photograph so Getty logos retain their dimensions and position. Grid controls sit above the image without changing the photo layout.

## Verified Getty assets

| Image number | Canonical Getty page |
| --- | --- |
| 51458178 | https://www.gettyimages.com/detail/news-photo/dwayne-jarrett-of-the-usc-trojans-over-daymeion-hughes-of-news-photo/51458178 |
| 76443769 | https://www.gettyimages.com/detail/news-photo/dante-hughes-of-the-indianapolis-colts-breaks-up-a-pass-news-photo/76443769 |
| 76443777 | https://www.gettyimages.com/detail/news-photo/dante-hughes-of-the-indianapolis-colts-tackles-daniel-coats-news-photo/76443777 |
| 77118318 | https://www.gettyimages.com/detail/news-photo/melvin-bullitt-and-dante-hughes-of-the-indianapolis-colts-news-photo/77118318 |
| 77549351 | https://www.gettyimages.com/detail/news-photo/corner-back-dante-hughes-of-the-indianapolis-colts-looks-to-news-photo/77549351 |
| 78070869 | https://www.gettyimages.com/detail/news-photo/roddy-white-of-the-atlanta-falcons-runs-past-dante-hughes-news-photo/78070869 |
| 78071230 | https://www.gettyimages.com/detail/news-photo/roddy-white-of-the-atlanta-falcons-goes-in-for-a-touchdown-news-photo/78071230 |
| 81360339 | https://www.gettyimages.com/detail/news-photo/college-football-usc-dwayne-jarrett-in-action-making-catch-news-photo/81360339 |
| 82679329 | https://www.gettyimages.com/detail/news-photo/jerome-simpson-of-the-cincinnati-bengals-runs-his-route-news-photo/82679329 |
| 95566612 | https://www.gettyimages.com/detail/news-photo/wide-receiver-antwaan-randle-el-of-the-washington-redskins-news-photo/95566612 |
| 106613403 | https://www.gettyimages.com/detail/news-photo/cornerback-dante-hughes-of-the-san-diego-chargers-warms-up-news-photo/106613403 |

## Completion report

1. **Summary:** Exact source links for the 11 identified Getty assets, plus shared licensing UI on both requested grids and the existing related row.
2. **Files changed:** `components/player/GettyLicenseControl.tsx`, `components/player/RelatedMediaStrip.tsx`, `components/player/related-media-strip.module.css`, `app/player/[slug]/LockerView.tsx`, `app/player/[slug]/photos/PhotoRoomView.tsx`, `app/player/[slug]/photos/photo-room.module.css`, `tests/player/preview-locker.test.tsx`, `tests/player/related-media-strip.test.tsx`, `tests/preview-lockers/renderer.test.tsx`, and this report.
3. **Routes changed:** UI on existing `/preview-lockers/[slug]` and `/preview-lockers/[slug]/photos`; shared canonical `/player/[slug]` and `/player/[slug]/photos` expose the control only for photos with a Getty detail source. No new route definitions.
4. **Database changes:** Only existing Dante preview photo source URL data, saved through the app's normal authenticated admin workflow; no manual SQL or schema changes.
5. **Migrations:** None.
6. **Environment variables:** None added or changed. Validation used existing local credentials server-side, system CA support, and the workspace temp directory.
7. **Permission changes:** None. Existing route access, media eligibility, and privacy remain. A source URL grants no rights or economic entitlement. Standard audit creation verified.
8. **Tests run:** Production Webpack build including TypeScript passed. Full ESLint passed with zero errors and 296 existing warnings. Focused final tests passed (50 tests), covering row/grid actions, exact URLs, unsafe-source fallback, modal closure/focus restoration, new-tab safety, and gallery preservation. An initial full-suite run found one outdated exact-class assertion; that assertion was corrected and its suite passed. Final full-suite and release results are appended below. CRLF-aware diff validation passed. Initial sandbox temporary-file and font-certificate failures were resolved with the existing workspace temp/system-CA settings.
9. **Manual verification:** All 11 live Getty canonical pages and saved source data verified. Production UI evidence is appended after release. Local anonymous preview access correctly returned 404; it did not expose the private preview without the existing session.
10. **Known limitations:** The other 21 photos do not have identified Getty asset filenames; their modals retain the clearly labeled athlete-search fallback. No unverified exact matches were invented. Physical touch-device testing is not performed.
11. **Deferred work:** Matching any additional non-numbered photos requires separate visual/source identification. No Getty API integration or licensing checkout is introduced.

## Product direction check

- Career Graph: strengthens the existing athlete-to-media-to-source relationship and attribution context.
- Moment Graph: no new Moment relationships or schema.
- Value Graph: no earnings, allocation, ownership, or payment relationships inferred.
- Persistence: source links remain useful after organization changes.
- Integration: Getty retains its licensing and transaction workflow.
- Scope drift: no generalized media-management or DAM features added.
