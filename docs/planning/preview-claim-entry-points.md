# Preview Locker claim entry points — 2026-09-25

## Objective and scope

Ensure the existing preview Locker, Photos, Film Room, and video-detail pages each have a claim footer and a top-right navigation claim button. Preserve the existing claim form, consent, attribution, access checks, conversion feature flag, and public-page behavior. No redesign or new claim workflow.

## Findings and implementation

The Locker, Photos, and Film Room already rendered the claim footer and navigation button. The video-detail route omitted both. It now supplies the existing `ConversionSurface` as the detail view's footer, with the saved preview ID and existing `film_view` event type. Its rightmost navigation action is CLAIM for private previews; public video pages retain their avatar link.

The existing navigation button is extracted into `PreviewClaimButton` and reused by `PreviewRoomNav` and the detail view. It opens the footer's one existing dialog and does not duplicate claim forms or submit claims automatically. The existing Locker navigation retains its working claim actions.

## Files changed in this task

- `components/preview-lockers/PreviewClaimButton.tsx` — new shared navigation button, preserving existing styling and behavior.
- `components/preview-lockers/PreviewRoomNav.tsx` — reuse the shared button.
- `app/player/[slug]/videos/[videoId]/VideoDetailView.tsx` — preview-only navigation action and optional footer.
- `app/preview-lockers/[slug]/videos/[videoId]/page.tsx` — supply the existing claim footer.
- `tests/player/preview-locker-routes.test.tsx` — verify the footer receives the correct preview ID and event context.
- `tests/player/preview-locker.test.tsx` — verify claim controls; complete the existing fixture with an empty awards array required by the current mapper.
- `tests/preview-lockers/conversion-journey.test.tsx` — verify navigation opens the actual claim dialog and records one claim-click event.
- This report.

## Validation

- Chrome localhost: checked all four page types on the existing Keith Rivers preview. Each has claim navigation and exactly one footer trigger. The main Locker has its existing normal and sticky navigation buttons.
- Chrome localhost video detail: clicked the top-right CLAIM button and verified the existing claim form opens with email, consent, optional referrals, and existing rights disclaimer. No claim was submitted.
- Focused route/render/claim integration tests: 24 passed.
- TypeScript: `npx tsc --noEmit --incremental false` passed.
- Lint: zero errors, 211 warnings across the existing workspace.
- Production build: `npm run build` passed. An initial attempt using a Node certificate flag failed due to worker flag compatibility; the normal build passed without changing application configuration.
- Full suite: 783 passed, 10 failed, 24 skipped. Failures are outside these claim changes: six admin-session expectations, one recovery callback expectation, one mock-video category expectation, one stats renderer expectation, and one YouTube source expectation affected by other existing playback edits.
- Existing missing/inaccessible preview and foreign video-ID tests still pass. Keyboard/native button behavior is retained; no dedicated mobile viewport run was performed.

## Completion boundaries

- Changed route behavior: `/preview-lockers/[slug]/videos/[videoId]`; existing other preview routes audited. No new route URLs.
- Database, migrations, environment variables, roles, permissions, and rights changes: none. Existing `PREVIEW_CONVERSION_ENABLED` gating remains in effect.
- Career Graph: makes the existing Locker-claim loop reachable from every current preview page, including historical film. No graph records or schemas changed; Moment and Value Graphs unchanged.
- Remains useful after an athlete leaves an organization. No third-party workflow duplication or media-management scope expansion.
- Unrelated in-progress edits were preserved. No production deployment was performed for this update.
- Deferred: production release and dedicated mobile verification. The repository's referenced Product Doctrine file is absent; the supplied product guardrails were followed.
