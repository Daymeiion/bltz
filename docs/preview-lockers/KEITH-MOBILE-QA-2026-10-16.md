# Keith Rivers mobile QA — 2026-10-16

## Summary and scope

User authorized mobile QA and narrow fixes before manually sharing player Locker links. Base is current production `6eca7a7bb8d3ca2de208f847a8e1d67771b5fd40`. Use the isolated `codex/keith-mobile-qa-2026-10-16` checkout; the older dirty primary checkout and its unrelated work are preserved. This is presentation work, not a Locker redesign or new workflow.

## Access-window finding and safety

Before opening the Locker, the authenticated production Admin page already showed Keith's window as **expired**, started October13 at22:56UTC and expired October15 at22:56UTC. This predates today's QA. Do not describe the window as pending, reset it, extend it, republish it, or send its current expired link as though it were newly available. A separate approved recovery decision is needed before sending Keith's invitation. Preserve its historical timestamps and audit evidence.

All live visual checks use an already verified BLTZ Admin session on exactly `bltz.vercel.app`, in the same browser context. Do not switch to `bltz.me`, incognito, or an unsigned mobile context. Admin reads bypass admission and Admin analytics/conversion are excluded server-side. No interest form is submitted, appointment booked, invitation sent, or access/publication setting changed. Player email staysOFF; bounce checks stayON. No synthetic email is repeated.

## Findings and files changed

- `app/player/[slug]/photos/photo-room.module.css`: at320px, the centered overflowing filter row placed ALL atx−3.78 while its scroll container began atx18. The inaccessible start is fixed with start fallback plus safe centering. Phone search fields use16px.
- `app/player/[slug]/videos/film-room.module.css`: phone search fields use16px; native playback buttons and seeking expose44px targets with a thin4px visual seek track and a shrinkable seek region.
- `app/player/[slug]/videos/[videoId]/video-detail.module.css`: phone native playback/share buttons and seeking expose44px targets; reduced gaps keep controls within320px.
- `app/globals.css`: only preview-claim form text fields receive16px phone text, including nested referral fields; checkbox styling is unchanged.
- `components/preview-lockers/PublicPreviewClaim.tsx`: scope the mobile input rule to the public claim email and feedback fields.
- `app/player/[slug]/LockerView.tsx`: search input text increases14→16px. This small legibility change also applies on desktop; no hooks, data loading or actions change.

The marquee video title, existing hero, career tabs and bounded statistics table are preserved. The native uploaded video plays; the claim panel scrolls to its final actions. Missing college-season data is shown as pending rather than fabricated. Admin inspection is not proof of a verified athlete opening or claiming the Locker.

## Routes, database, configuration and permissions

No route is added. Existing `/preview-lockers/[slug]`, `/photos`, `/videos` and `/videos/[videoId]` consume shared style fixes. No database change, migration, new environment variable, dependency or permission change. Existing production source guards keep `BLTZ_PREVIEW_EMAIL_ENABLED=false` and `BLTZ_PREVIEW_EMAIL_BOUNCE_SYNC_ENABLED=true`.

## Validation and manual verification

34 tests across six focused suites passed, including conversion/claim acknowledgment, preview rendering, native video behavior, photo placement and pagination access. The first sandbox attempt failed before running tests because Vitest could not rename its temporary cache; the identical scoped rerun passed. TypeScript passed. Scoped lint has zero errors and30 warnings in existing Locker code; no unrelated lint cleanup is included. Independent review found no access/authentication/email/data mutation in the six-file patch. The sanitized public-only `npm run build` (Next16.3.6 Webpack) passed. Exact-source live post-deployment verification remains a release gate, not an assumed result.

Read actual `innerWidth` after applying each browser viewport: new tabs do not inherit the last tab's emulation. Target320,390 and430px; inspect filter reachability, career-table containment, claim scrolling, search inputs, playback and seeking. Record final live commit, measured layouts, before/after access dates and email flag in ignored `output/mobile-qa-keith-2026-10-16` evidence. Screenshots are browser evidence, not physical-device certification.

## Known limitations and deferred work

Chrome phone-width emulation does not certify physical iPhone/Safari keyboard, safe-area or Instagram WebView behavior. Do not claim that a real iPhone focus-zoom test was performed. Public and enrolled claim layouts differ; Admin inspection does not exercise an unsigned athlete submission. Guest submission coverage here comes from existing mocked tests; no guest visit may start or renew Keith's clock. Third-party YouTube availability is not guaranteed by native uploaded-video playback. Keith's already-expired invitation requires a separate recovery decision; its lifecycle is deliberately unchanged by this release.

## Product direction

This strengthens the existing Locker access and career-review/claim experience without changing canonical athlete identity or adding Career, Moment or Value Graph entities. The improvements remain useful after an athlete leaves an organization. No media-management workflow or future graph schema is introduced.
