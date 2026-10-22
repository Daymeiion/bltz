# Birthdate and high-school fields — completion

Completed October 17, 2026. Production commit `8fd5514ac2b52bebaf479a3d496108a9b32301b4`.

## Summary

Birthdate and a separate high-school field now flow from scraping through review, editing, persistence, and Locker display. Manual values survive discovery refreshes. Older open preview editors that omit the new fields cannot erase saved values. College affiliations remain separate.

Cason's production preview now saves birthdate July 9, 1986, high school Los Alamitos High School, and college Arizona. His save is revision 33 and the matching audit record was verified in production.

## Files changed (27)

- [app/admin/preview-lockers/PreviewLockerForm.tsx](C:/Users/Administrator/bltz/output/preview-merchandise-search/app/admin/preview-lockers/PreviewLockerForm.tsx)
- [app/api/onboarding/claim/route.ts](C:/Users/Administrator/bltz/output/preview-merchandise-search/app/api/onboarding/claim/route.ts)
- [app/api/onboarding/publish/route.ts](C:/Users/Administrator/bltz/output/preview-merchandise-search/app/api/onboarding/publish/route.ts)
- [app/api/preview-lockers/[id]/route.ts](C:/Users/Administrator/bltz/output/preview-merchandise-search/app/api/preview-lockers/[id]/route.ts)
- [app/player/[slug]/page.tsx](C:/Users/Administrator/bltz/output/preview-merchandise-search/app/player/[slug]/page.tsx)
- [components/onboarding/ReviewForm.tsx](C:/Users/Administrator/bltz/output/preview-merchandise-search/components/onboarding/ReviewForm.tsx)
- [lib/pipeline/claude.ts](C:/Users/Administrator/bltz/output/preview-merchandise-search/lib/pipeline/claude.ts)
- [lib/pipeline/scrapers/wikipedia.ts](C:/Users/Administrator/bltz/output/preview-merchandise-search/lib/pipeline/scrapers/wikipedia.ts)
- [lib/pipeline/types.ts](C:/Users/Administrator/bltz/output/preview-merchandise-search/lib/pipeline/types.ts)
- [lib/player/bio-fields.ts](C:/Users/Administrator/bltz/output/preview-merchandise-search/lib/player/bio-fields.ts)
- [lib/preview-lockers/discovery.ts](C:/Users/Administrator/bltz/output/preview-merchandise-search/lib/preview-lockers/discovery.ts)
- [lib/preview-lockers/mapper.ts](C:/Users/Administrator/bltz/output/preview-merchandise-search/lib/preview-lockers/mapper.ts)
- [lib/preview-lockers/server.ts](C:/Users/Administrator/bltz/output/preview-merchandise-search/lib/preview-lockers/server.ts)
- [lib/preview-lockers/types.ts](C:/Users/Administrator/bltz/output/preview-merchandise-search/lib/preview-lockers/types.ts)
- [lib/preview-lockers/validation.ts](C:/Users/Administrator/bltz/output/preview-merchandise-search/lib/preview-lockers/validation.ts)
- [scripts/verify-biography-live.mjs](C:/Users/Administrator/bltz/output/preview-merchandise-search/scripts/verify-biography-live.mjs)
- [scripts/verify-preview-media.mjs](C:/Users/Administrator/bltz/output/preview-merchandise-search/scripts/verify-preview-media.mjs)
- [supabase/migrations/20261018030520_athlete_birthdate_high_school.sql](C:/Users/Administrator/bltz/output/preview-merchandise-search/supabase/migrations/20261018030520_athlete_birthdate_high_school.sql)
- [tests/onboarding/publish.test.ts](C:/Users/Administrator/bltz/output/preview-merchandise-search/tests/onboarding/publish.test.ts)
- [tests/pipeline/bio-fields.test.ts](C:/Users/Administrator/bltz/output/preview-merchandise-search/tests/pipeline/bio-fields.test.ts)
- [tests/player/news-page.test.tsx](C:/Users/Administrator/bltz/output/preview-merchandise-search/tests/player/news-page.test.tsx)
- [tests/preview-lockers/api.test.ts](C:/Users/Administrator/bltz/output/preview-merchandise-search/tests/preview-lockers/api.test.ts)
- [tests/preview-lockers/form.test.tsx](C:/Users/Administrator/bltz/output/preview-merchandise-search/tests/preview-lockers/form.test.tsx)
- [tests/preview-lockers/renderer.test.tsx](C:/Users/Administrator/bltz/output/preview-merchandise-search/tests/preview-lockers/renderer.test.tsx)
- [tests/preview-lockers/validation.test.ts](C:/Users/Administrator/bltz/output/preview-merchandise-search/tests/preview-lockers/validation.test.ts)
- [types/database.generated.ts](C:/Users/Administrator/bltz/output/preview-merchandise-search/types/database.generated.ts)
- [types/preview-lockers.generated.ts](C:/Users/Administrator/bltz/output/preview-merchandise-search/types/preview-lockers.generated.ts)

## Routes changed

- Existing `/preview-lockers/[slug]` maps saved birthdate, age, and high school into the shared Locker.
- Existing `/player/[slug]` reads canonical high school separately from college.
- Existing `/admin/preview-lockers/new` and `/admin/preview-lockers/[id]/edit` expose editable Birthdate and High school controls in Info.
- Existing preview discovery, create, and update APIs carry the new fields, retaining authorization and revision checks.
- Existing onboarding review, claim, and publish paths retain high school through canonical publication. The existing atomic publish function preserves saved high school when an older client omits the field.
- No new routes.

## Database changes

Added nullable `preview_lockers.dob` (date), `preview_lockers.high_school` (text), and `players.high_school` (text). Constraints reject future/out-of-range preview birthdates and empty, oversized, or control-character-containing school text. Existing rows retain null until reviewed enrichment or manual editing.

Extended atomic preview enrollment, immutable retry comparisons, and before/after audit values for the new fields. Extended canonical atomic publishing in place without changing its access or identity checks. Generated TypeScript fields were refreshed from disposable PostgreSQL information_schema; remaining CLI snapshot declarations were preserved.

## Migration

Applied `20261018030520_athlete_birthdate_high_school.sql` to production project `drxtzxnwdtgxwueiqygf` through a transaction guarded by the prior migration version and three function fingerprints. Source SHA256: `b10671604d3e34b0d01edd9a81bcee5addf21f123986c00fd71724d4046d065b`. Migration history recorded atomically. This migration did not backfill player data; Cason was updated afterward through the normal reviewed builder save.

## Environment variables

None added or changed. No dependencies added.

## Permission changes

Authenticated users receive column access to the two new preview fields under the existing Admin/assigned-viewer RLS policies. Admin mutation restrictions, revision comparison, and audit triggers remain active. Canonical high school uses existing player permissions. Publish RPC execution permissions are unchanged. Production checks confirmed anonymous preview DOB access is false and authenticated private-schema USAGE is false.

## Tests run

- Full Vitest suite: 197 files passed, 2 skipped; 1,620 tests passed, 24 skipped.
- Live identity-matched Wikipedia scraper returned `1986-07-09` and `Los Alamitos High School` for Cason.
- Disposable PostgreSQL proof covered migration application, nullable legacy rows, date and text constraints, grants/RLS, audit values, enrollment persistence, exact-payload retry conflicts, and unchanged publish execution restrictions.
- Regression tests cover infobox-only high-school extraction, source → synthesis → discovery → save schema → Locker mapping, manual edit preservation, builder save/reload, canonical display, older-editor omission versus explicit clearing, and canonical publish payloads.
- TypeScript and local production build passed. ESLint passed with 0 errors and the existing 290 warnings. Whitespace diff check passed.
- Vercel production deployment `dpl_CBKpmenQUZDyi7xNkEMnmDXDKKRt` is READY and assigned to `bltz.vercel.app`, `bltz.me`, and `www.bltz.me`. Runtime error query returned no error entries after verification.

## Manual verification

Opened a separate production editor and changed only the two biography fields; the user's original editor was not modified or reloaded. Verified values before saving, waited for the save confirmation, reloaded the editor, and confirmed both persisted while college remained Arizona. SQL confirmed revision 33, both saved values, and a matching audit record. Reloaded the public preview and verified the birthdate and high school on desktop and mobile; mobile document width equaled viewport width without horizontal overflow. The shared canonical route was covered by its page regression test.

[Official Arizona biography](https://arizonawildcats.com/sports/2007/4/17/207929644) confirms Cason's birthdate and high school; the same values were independently returned by the updated [Wikipedia adapter](https://en.wikipedia.org/wiki/Antoine_Cason).

![Saved biography fields](C:/Users/Administrator/bltz/output/biography-locker-desktop.png)

![Builder controls after save and reload](C:/Users/Administrator/bltz/output/biography-builder-saved.png)

## Known limitations

Existing players were not bulk-backfilled; Cason was the requested record update. Missing source facts remain unknown, and other records can acquire the fields through discovery or reviewed editing. The Supabase CLI advisor scan could not connect because this host lacks the required IPv6 route; the authenticated dashboard migration, direct SQL postchecks, and disposable PostgreSQL authorization/constraint checks succeeded.

## Deferred work

None for the requested workflow. No unrelated player records or user drafts were changed.

## Product direction

Strengthens Athlete Identity and Athlete → High School historical accuracy while preserving separate Athlete → College relationships. These facts remain useful after leaving an organization. Moment and Value Graph relationships were unchanged. No third-party commodity workflow was duplicated, no future-phase schema was introduced, and no generalized media-management scope was added.

