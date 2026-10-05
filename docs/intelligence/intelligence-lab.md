# Intelligence Lab implementation and verification

## Objective

Private internal inspection of canonical athlete identity, career relationships, sourced Moments, supporting statistics, legacy media metadata, verified external identities, deterministic Signals and candidate Opportunities. Reference: founder's September 30 Intelligence Lab prompt and shared `graph-architecture.md`.

## Included and excluded

Included: existing `/admin/intelligence`, findings and coverage gaps, the corrected October 10 deadline and read-only cooldown status, athlete search/selection, explicit UTC evaluation cutoff, traceable evidence links, reviewed career-era/post-career news/interview/video metadata, and a separate fictional display example requested by the founder. Existing responsive admin navigation, theme and unavailable/empty states remain.

Excluded: CRM, campaigns, organization onboarding/roles, payouts, approvals, graph editing, provider fetches from the UI, notifications, persistence of evaluated signals, public publishing, media clearance, and fabricated live data. The isolated example is visibly fictional, never persisted, and excluded from real athlete records/counts. The Lab does not read previews, GTM contacts, account identifiers, financial fields or raw provider payloads.

## Data and permissions

`lib/intelligence/lab-server.ts` calls the existing SSR Auth client's `getUser` and `is_internal_admin` before constructing the existing service-role client. Profile roles or browser claims never grant access. Every selected graph/media/identity query is scoped to the canonical UUID or IDs discovered from its explicitly scoped relationships. Query results are parsed and bounded; unsuccessful/malformed reads are unavailable, while successful empty reads are empty.

The five new graph tables are service-only. The server selects just ingestion `id,locator,fetched_at` when resolving evidence, never raw payloads. Safe relative provider locators remain traceable but do not become browser authentication URLs. Internal source metadata and graph evidence stay in this private server-rendered surface. `force-dynamic` and noindex metadata prevent static publishing/indexing.

Existing roster relationships, team seasons, tenant organizations and legacy season statistics are read as context. Legacy media/video descriptors do not imply usage clearance or Moment association. No asset URLs, signed storage URLs, rights exceptions or license terms are shown. A future authorized Media Graph adapter must supply verified Moment links before opportunity media availability can be claimed.

Signals require complete graph reads and reviewed occurrence evidence. Source-fetch metadata failures, sample truncation, missing/ambiguous relationships and year-only dates suppress rules. Scores describe editorial priority on a 0–100 scale; confidence remains separate. Rules use the selected UTC date's end capped at the actual current timestamp, which is displayed explicitly. The Lab cannot reconstruct historical verification state.

The content adapter whitelists reviewed content metadata, preserving publisher links, canonical evidence IDs, match basis and confidence. Article publication, video release, described occurrence and capture dates are distinct. Missing video upload dates cannot become newsletter dates. Career context is reviewed rather than assigned by comparing only publication dates with retirement. Historical/undated content cannot manufacture a recent-news or activity-spike Signal. Rights remain unknown; linked interviews are not automatically associated with a sports Moment.

## Files and routes

- `app/admin/intelligence/{page,LabView,loading,error}.tsx`
- `lib/intelligence/lab-{server,types,format}.ts`
- `tests/intelligence/lab.test.tsx`
- Small additions to `components/admin/AdminSidebar.tsx` and `AdminThemeShell.tsx`
- Hierarchy reference: `docs/design-reference/intelligence-lab-wireframe.md`

The findings update changes only the existing `/admin/intelligence` route, through `view=findings|athlete|example` query states. No API or customer route changes. No new environment variables or packages. Existing Supabase variables and server-only service client are reused. Full file/validation record: `findings-view-delivery.md`.

## Tests and manual verification

Automated Lab tests cover anonymous/non-admin/failed-authority denial before service construction, safe selected-athlete query boundaries, no cohort/raw/account-field reads, unavailable versus empty schema, escaping wildcard searches, bounded/malformed results, sourced exact-date signal/opportunity traversal, source URL safety and rendered empty states. Synthetic occurrence tests attached to a known athlete's UUID test the pipeline only; they do not assert a real historical occurrence.

Production browser smoke on localhost confirmed an anonymous visit redirects to `/auth/admin?next=%2Fadmin%2Fintelligence` and renders Admin Sign In without research data. No user session was altered or authentication bypassed.

Still required in staging after migration reconciliation:

1. Sign in as an existing internal administrator and search/select a real athlete.
2. Confirm normalized affiliations, legacy statistics/metadata and actual verified identities reflect the stored athlete only.
3. Import/review a real source-backed exact-date Moment through an approved writer; confirm evidence, rule explanation and Opportunity links. Do not invent a date from a season/award year.
4. Change the evaluation date to demonstrate reproducible windows on the same graph snapshot.
5. Check at mobile and desktop widths, keyboard focus, source links, and unavailable/truncated states.
6. Repeat as an ordinary authenticated user and anonymous visitor; verify denial, then verify previews, claims, referrals and public Lockers.

Authenticated staging visual/mobile QA and actual real-athlete Moment generation have not been claimed. Actual-component static desktop/mobile previews are verified separately and omit the admin shell. The graph migration remains local, so absent deployed graph tables show unavailable sections. The opportunity view explains missing Moment-to-media links instead of inventing available assets.
