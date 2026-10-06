**Design-reference history.** Current application source and typography take priority; see [current design index](current-design-index.md). Prototype data and activations are concepts, not production metrics or approvals.

# Intelligence Lab sample Activations

October 4, 2026. Interactive concept refinement for the existing [Athlete](http://127.0.0.1:3138/athlete.html?theme=dark) and [Moment](http://127.0.0.1:3138/moment.html?moment=usc&theme=dark) previews. Production integration is a separate step.

Latest revision: [Priority athletes and search additions](intelligence-lab-priority-athletes-2026-10-04.md). This report preserves the preceding sample-activation validation.

## Intent and scope

Primary user: BLTZ researcher reviewing a potential activation from a supported career Moment. Primary action: expand Activations below Opportunities, then select **See activation**. Secondary actions: edit sample metadata, attach brands and local creative, and inspect reach and channel performance. Mobile priority: a single scrolling editor with reachable Save/Cancel controls. Exclusions: campaign execution, publishing, real brand partnerships, live analytics, production schema and onboarding.

The shared rail adds one sample for Keith Rivers' Washington Moment. It follows the existing Moment → anniversary signal → alumni retrospective opportunity, then demonstrates a possible activation. Other athletes and the NFL event retain empty activation states. Sample associations with BLTZ/Nike, original abstract creative and future October 7–14 results are explicitly illustrative; they establish no sponsorship, rights, forecast or real performance.

The expandable card shows sample brands, release date, unique reach, impressions and engagement. Its modal edits title, description, release date, status and up to eight brand names. Save updates the card and stores metadata in the current browser tab; Cancel, Escape and close discard draft changes. Image/video attachments remain temporary in the open page, with no upload. Navigation/reload clears those files. The included original poster and five-second silent reel remain available.

Analytics distinguish reach from impressions and show engagement, clicks/CTR, eight-day impression totals, video starts/completions, likes/comments/shares/saves and channel breakdowns. Denominators and the fixed example measurement window are visible. Editing metadata does not recalculate sample results.

## Completion report

| Item | Result |
| --- | --- |
| Summary | Added matching expandable Activations cards and an editable, responsive sample modal to both concepts. |
| Files changed | New `mockups/intelligence-lab/activations.js`, `activations.css`, `assets/activation-sample-poster.svg`, `assets/activation-sample-reel.mp4`; updated `athlete.html`, `moment.html`, `workspace.js`, `serve.cjs`, `CONTRACT.md`; this report, latest revision pointers and activation screenshots in `previews/`. |
| Routes changed | Existing local Athlete/Moment concepts only. No application routes or deployment. |
| Database changes | None. Reviewed `data.js` SHA-256 remains `A79921A21FB8A1F6770047CACBBA7CECEA177AD471DED860344A2355E5F741D4`. |
| Migrations | None. |
| Environment variables | None. |
| Permission changes | No application authorization changes. The local preview server allows same-origin/blob image/video playback, remains unable to make remote connections, and serves video byte ranges. |
| Tests run | All concept JS/CJS syntax and CSS parsing passed. Changed code whitespace checks passed. Current HTML/module/media responses return 200 with correct MIME and no-store caching. Full video, valid/open/suffix/clamped ranges and HEAD passed; malformed/multiple/out-of-bounds ranges return 416. MP4 fully decodes. Delegated module checks cover 24 roster/view contexts, validation, escaping, storage fallback, metrics reconciliation, draft cleanup and BFCache cleanup. Application lint/type/test/build suites were not run for this isolated static concept. |
| Manual verification | Athlete and USC Moment show the sample below Opportunities; Lorenzo and NFL have empty states. Save updates card/reopen/reload; Cancel restores prior values. Required fields, catalog/custom brand attachment and removal checked. A local JPEG and MP4 attach/save/reopen/remove successfully; unsupported SVG is rejected. Default reel loads and plays. Both themes checked. Desktop and 390/320px mobile dialogs fit without page overflow; channel table scrolls within its region. Keyboard boundary trapping, Escape, opener focus restoration and scroll unlock verified. Table region has a visible keyboard focus indicator. No browser warnings/errors observed. Temporary viewport override reset; Moment activation editor left open. |
| Known limitations | Statistics and brand associations are fictional examples. Metadata persists only in session storage; local attached files disappear on navigation/reload. No publishing, permanent uploads, rights validation, live channel measurement or production authorization is implemented. |
| Deferred work | Production data integration, persisted activation records, permission/rights gates and authorized analytics integrations require a separate scoped implementation. No work remains for this concept addition. |

## Product direction

This makes a historical Moment's connection to its signal and opportunity understandable through a sample downstream action. It supports career recovery after an athlete leaves an organization. No persisted Career, Moment Contribution or Value Graph relationship changes, economic allocation, rights claim or earnings are created. The sample editor does not build a generalized media-management or campaign execution workflow.

The authoritative Product Doctrine file remains absent from this checkout. This incremental concept follows the supplied AGENTS product boundaries and the user's explicit sample-activation request.

## Review captures

- [Athlete card](../../mockups/intelligence-lab/previews/athlete-activation-card-dark.jpg)
- [Moment card](../../mockups/intelligence-lab/previews/moment-activation-card-dark.jpg)
- [Dark editor](../../mockups/intelligence-lab/previews/activation-modal-overview-dark.jpg)
- [Light editor](../../mockups/intelligence-lab/previews/activation-modal-overview-light.jpg)
- [Reach and performance](../../mockups/intelligence-lab/previews/activation-modal-statistics-dark.jpg)
- [Mobile dark](../../mockups/intelligence-lab/previews/activation-modal-mobile-dark.jpg)
- [Mobile light](../../mockups/intelligence-lab/previews/activation-modal-mobile-light.jpg)
