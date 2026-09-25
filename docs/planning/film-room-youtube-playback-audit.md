# Film Room YouTube playback audit — 2026-09-21

## Outcome and root cause

Scoped playback fix implemented locally. No redesign, new product workflow, database writes, or deployment performed.

The reported production page, `/preview-lockers/keith-rivers-3a92b4f331f083552d05/videos`, visibly reproduced **YouTube Error 153** for `AXYE-hXNN-c` in Chrome. Its rendered document has `meta[name=referrer]` set to `no-referrer`, and its iframe has no explicit referrer policy. The production response also sends `Referrer-Policy: no-referrer`.

The causes are the private-preview policy in `proxy.ts`, inherited metadata in `app/preview-lockers/layout.tsx`, and missing iframe overrides in the Film Room and detail player. A separate legacy preview helper explicitly used `referrerPolicy="no-referrer"`. YouTube documents Error 153 as missing HTTP Referer or equivalent client identification: https://developers.google.com/youtube/iframe_api_reference#Events.

A second public Film Room defect was found: `toPublicVideo` passed legacy `videos.playback_url` values directly to native `<video>`. YouTube watch URLs stored there were never normalized into iframe sources. Private previews already parsed some YouTube formats, but used a separate implementation.

## Scoped implementation

- Normalize watch, youtu.be, Shorts, embed, mobile YouTube, and legacy youtube-nocookie URLs through one parser. Validate the complete 11-character ID and exact provider hostname. Query order, share parameters, and trailing slashes on path-based formats are supported. Reject non-HTTP(S), credentials, unexpected ports, and lookalike domains.
- Derive `provider: "youtube"`, `providerVideoId`, `originalUrl`, and an official `https://www.youtube.com/embed/{ID}` URL at the read boundary. Keep original stored URLs and records unchanged. No generated embed HTML is stored or executed.
- Recognized YouTube URLs with invalid IDs cannot enter native `<video>` playback. Direct file playback remains unchanged.
- Use a shared client player for Film Room, detail, and the legacy source helper. Set the requested iframe allow list, fullscreen, and explicit `strict-origin-when-cross-origin`. Pass the actual browser origin to the official IFrame API; do not spoof a Referer or proxy media.
- Retain YouTube's native controls and branding. Update the existing hover iframe to use controls and the same referrer/permission attributes.
- Use documented IFrame API error events, rather than relying only on iframe load errors. Invalid, unavailable, private, embedding-disabled, configuration, and API/network failures display `This video can't be played inside BLTZ.` and `Watch on YouTube`, using the original URL. Failed iframes are removed. An external link is also available while the player is healthy.
- Keep React-owned layout separate from the API-owned iframe. Destroy players on unmount and ignore late API initialization after navigation.

## Headers and access

Only `/player/[slug]/videos` and `/preview-lockers/[slug]/videos`, including their detail routes, receive:

```text
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: frame-src https://www.youtube.com https://www.youtube-nocookie.com
```

A nested private Film Room layout overrides the inherited referrer meta tag. Cross-origin requests disclose the origin, not the private slug/query. Other preview pages, APIs, and authentication callbacks keep their existing policies. Private cache and noindex rules and authorization checks are preserved. No existing CSP was found in Next config, Vercel config, root metadata, or session middleware; no existing CSP directives were loosened.

The browser session could access the saved private Film Room locally and in production. Anonymous HEAD requests to the exact page returned 404 in both environments. Local Chrome confirmed the corrected metadata, iframe referrer policy, official embed URL, and complete permission list. Development cache headers differ from production; existing private production cache logic was not changed.

## Playback and validation results

| Check | Result |
| --- | --- |
| Reported Keith Rivers video, localhost | Passed in Chrome, including the existing saved private Film Room; playback reached 40/50 seconds |
| Normal public YouTube example `M7lc1UVf-VE` | Official player and duration loaded; reported Keith Rivers video used for confirmed moving playback |
| youtu.be form of reported video | Official player initialized and playback started; original short URL retained |
| Shorts form of reported video | Playback progress observed; this checks URL syntax using the supplied video ID, not a separate Shorts-only upload |
| `/embed/` and legacy nocookie forms | Normalization and integration tests passed |
| Malformed ID | Browser showed exact fallback text and original link without an iframe |
| Unavailable ID `00000000000` | Real YouTube error produced exact fallback text and original link in Chrome |
| Embedding disabled/private | API error callbacks 100, 101, and 150 covered by automated tests; no separately controlled real restricted-video fixture was supplied |
| Other API errors | Codes 2, 5, and 153 covered by automated tests |
| Production | Exact reported page reproduced Error 153; fix not deployed, so post-fix production playback remains pending |
| Vercel deployment | Repository-recorded deployment `bltz-ra81uyjem-daymeiions-projects.vercel.app` redirects to Vercel login; preview playback blocked by deployment protection |
| Mobile | Attempted 390px viewport override did not apply (actual width remained 1745px); mobile verification is still pending |
| Focused regression suite | 60 tests passed across 6 files |
| TypeScript | `npx tsc --noEmit --incremental false` passed; final production build also passed type checking |
| Lint | Full lint: 0 errors, 209 warnings. Final targeted lint: 0 errors, 1 existing thumbnail `<img>` warning |
| Production build | `npm run build` passed after final player and metadata changes |
| Full test suite | 756 passed, 9 failed, 24 skipped in the existing workspace; failures listed below |

Full-suite failures are outside the playback fix: six `admin-session-rejection` expectations, one recovery callback expectation, one preview media/stats regression, and the unchanged mock-video category assertion (mock data contains only CFB/PRO). These were not altered to make the playback task green. Happy DOM logs its expected iframe-loading-disabled diagnostic in the hover test; live provider playback is verified in Chrome rather than the unit-test DOM.

The temporary localhost fixture used for URL/error checks was removed before the production build. No test data was persisted. Test/build logs are under `output/film-room-*` in this workspace.

## Files changed by this task

- `proxy.ts`
- `lib/player/youtube.ts` (new)
- `lib/player/public-video.ts`
- `lib/preview-lockers/video.ts`
- `lib/preview-lockers/validation.ts` (only parser import/helper; pre-existing unrelated edits preserved)
- `components/player/YouTubePlayer.tsx` (new)
- `components/player/VideoPreview.tsx`
- `app/player/[slug]/videos/FilmRoomView.tsx`
- `app/player/[slug]/videos/[videoId]/VideoDetailView.tsx`
- `app/preview-lockers/[slug]/videos/page.tsx`
- `app/preview-lockers/[slug]/videos/layout.tsx` (new metadata override; no new URL)
- `tests/player/youtube.test.tsx` (new)
- `tests/player/film-room-headers.test.ts` (new)
- `tests/player/video-preview.test.tsx`
- `tests/player/preview-locker.test.tsx`
- `tests/preview-lockers/validation.test.ts`
- `tests/preview-lockers/video-source.test.tsx`
- This audit document.

## Completion boundaries

- Routes: existing public/private Film Room and video-detail routes only; no new route URLs.
- Database changes and migrations: none. Provider normalization is derived from existing URL fields, preserving backward compatibility.
- Environment variables and dependencies: none added.
- Permission changes: none; no claims, approvals, attribution, publication, or rights decisions changed. No new sensitive mutations requiring audit records.
- Career Graph impact: restores playback of media already connected to the athlete's persistent Locker; no graph schema changes. Moment/Value Graph relationships unchanged. Career utility remains independent of a current organization.
- No mature third-party workflow duplicated and no scope drift toward media management. No future-phase schema introduced. The referenced Product Doctrine file was absent in this checkout; the supplied product guardrails were followed.
- Deferred: deploy the scoped patch through the normal release process, verify the fixed production page, obtain access to a Vercel preview containing the fix, test a controlled embedding-disabled/private upload, and complete a real mobile viewport check. The workspace contains unrelated pre-existing changes and was not published wholesale.

## Production release result

User-authorized release completed: commit `b24559b1a959d6d803818a21cbbb0947de17c18f` is on `main`. Vercel preview `dpl_1FrKgHT4tV9qNiiF8AYmKw89MPhM` and production `dpl_mksGR1RKngPGxSzpTZXc9JscJuJQ` are Ready. The existing `bltz.vercel.app` alias serves the fix. Chrome playback of the reported Keith Rivers video reached 25/50 seconds without Error 153, then was paused. Production returns the corrected referrer/CSP headers while preserving private cache headers and anonymous 404 behavior. The isolated checkout passed 60 focused tests and its production build. Preview browser playback was not tested: automatic approval review rejected the temporary deployment-authentication access link; production was verified through the existing authorized session. No database, environment-variable, or application-permission changes were needed.
