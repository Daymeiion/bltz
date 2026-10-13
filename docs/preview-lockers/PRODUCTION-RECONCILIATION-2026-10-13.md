# Production source reconciliation — 2026-10-13

Local reversible candidate only. Branch: `codex/preview-release-reconcile-2026-10-13`. Base: reviewed release `45577ed`. Current production reported by root: `167de565c86114334309c3281c65f8e3e094f5e2`, deployment `dpl_6wEGT4uzQjxFZzrYfTMHrX6gXBvx`. Their common ancestor is `6b74fb662aa0783abbfbd272222adb7a6a192add`.

## Objective and scope

Combine the previously reviewed tracking, analytics delivery, invitation/bounce, authentication/security, and PFR release with the newer athlete-history/source-policy work. The live divergent branch omitted those reviewed artifacts; its internal analytics/bounce endpoints return 404. A new candidate restores the reviewed source while preserving the user-approved builder and history behavior. Nothing was committed, pushed, deployed, sent, or changed in a database/provider.

This is source reconciliation, not the first-open 48-hour/manual-channel feature. No future CSV expansion, CRM dashboards, new graph schemas, package changes, new secret variables or permission changes are included.

## Files and preservation

Sixteen application/test files change relative to the reviewed base:

- `app/admin/preview-lockers/PreviewLockerForm.tsx`: small source-policy save-error and 32-affiliation UI delta from `aede98d`; PFR import, provider-expiry text, and existing form behavior remain.
- `lib/pipeline/{claude.ts,types.ts,scrapers/cfbverse.ts,scrapers/wikipedia.ts}`: complete school/pro-team recovery and source provenance.
- `lib/player/school-identity.ts`: campus-aware aliases; existing `team-history-name.ts` was already identical and is unchanged.
- `lib/preview-lockers/{affiliations.ts,branding.ts,discovery.ts,merge-suggestions.ts,types.ts,validation.ts}`: branded affiliations, append-only suggestion merge, optional award provenance, and 32-item source capacity. Existing school display-name and PFR fields are retained.
- `lib/source-policy/{fetch.ts,policy.ts}` and the existing/new `tests/pipeline/{synthesize.test.ts,wikipedia-source-policy.test.ts}`: reviewed bounded adapters and regression coverage.

The builder shell, folder components/CSS, new/edit routes, and builder tests already match the newer builder after ignoring EOL differences. Two patch context conflicts were reconciled while retaining existing `schoolHistoryName` and `PreviewTeamPill.name` behavior. No historical migrations were edited.

The prior baseline supplies the missing activity/email panels, event collector, analytics dispatch/delivery/reconcile workers, bounce worker, inquiry RPC/session integration, IONOS/DSN modules, dependencies, generated types, PFR files, and migration source history. Restored routes are existing reviewed routes; no new route implementation was authored here. The production-to-reviewed source difference is 217 meaningful files, so deployment review must explicitly cover that restoration scope, not describe this as merely a 16-file release.

## Validation

- Focused history/preview/PFR: 123 tests passed across 13 files.
- Reviewed analytics/inquiry/email/bounce: 212 tests passed across 18 files. External services are mocked; no mail was sent.
- TypeScript `--noEmit --incremental false`: passed.
- Scoped ESLint: zero errors; three warnings on unchanged form lines (two ref reads and existing HTML navigation). React review found no new component/hook/authorization change.
- `git diff --check`: passed after correcting two blank-line EOL artifacts.
- Independent bounded source review: no actionable omissions/conflicts; all history/source-policy files match the approved live changes after EOL normalization, and PFR/tracking/email/security preservation was confirmed. It did not rerun tests or query the database.
- Explicit baseline preservation check: packages, internal APIs, funnel, analytics, types, migrations, auth/recovery, PFR parser, and existing stats policy are unchanged relative to HEAD.
- Matching package-lock SHA-256: `ADC79CF043970188448E7FBEA5E660008142A66E15EF0B36E3C523F3FF181D86`. Dependencies reused via a local junction to the stable release; no install or package update.

Sanitized validation logs and selected patches are in the parent ignored directory `C:/Users/Administrator/bltz/output/bounce-verification-2026-10-13`, with `reconciliation-*` filenames. Root subsequently ran the local Next16.3.6 Webpack production build with the existing trusted CA and only public browser configuration: it passed, including TypeScript and97static pages. The generated route manifest contains all three internal analytics workers, the preview event API, the invitation API and the bounce worker. Hosted browser/runtime verification remains a post-approval release gate.

## Known limitation and deferred work

Root's read-only database check confirmed the canonical target and 80 migrations through `20261011213800`; invitation/analytics RPCs remain intact and today's send count is zero. The actual `private.preview_items_valid('team')` accepts 12 affiliations and rejects 13/32/33. The retained 32-item UI/source capacity does not establish >12 persistence. No database fix or migration was authored; a minimal forward cap fix requires root review and may accompany the manual-window release.

Keep production invitation sending OFF. The approved single bounce test remains paused while live workers are missing. Existing unverified-interest/anonymous-visitor boundaries remain: no claim, ownership, consent, or economic entitlement is inferred.

Career history and athlete-to-school/team discovery relationships improve; no canonical Career ID, Moment, or Value Graph data changes. History remains useful after an athlete leaves an organization. No third-party media workflow was duplicated and no generalized media-management scope was added.

Root release guard: vercel.json now explicitly pins BLTZ_PREVIEW_EMAIL_ENABLED=false and BLTZ_PREVIEW_EMAIL_BOUNCE_SYNC_ENABLED=true, in addition to the verified Production project Config. This adds one configuration file to the16 integration files and introduces no secret, route, schema or permission. Future invitation activation must explicitly review this pin; the isolated synthetic-send exception must never be promoted. The cap12 database limitation and first-open48-hour/manual-channel work remain deferred. Nothing has been pushed, deployed or emailed.
