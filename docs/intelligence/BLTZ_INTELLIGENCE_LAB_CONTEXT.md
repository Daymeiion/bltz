# BLTZ Intelligence Lab — Portable Project Context

Prepared: October 21, 2026. Intended use: upload this Markdown file to another LLM as project context.

## 1. How to use this handoff

This document summarizes the founder's decisions, repository architecture, approved interface, implementation boundaries and documented release evidence. It is self-contained; the repository paths at the end are optional references for an agent with code access.

**Status matters:** the latest release receipts reviewed for this export are dated October 5, 2026. No production, database, provider account or cloud configuration was checked live on October 21. Distinguish published functionality, implemented but disabled source, historical prototypes and future requirements. A source commit, passing local test or configured credential does not prove a deployed and operating system.

Use this as context for the user's next assignment, not as authorization to execute every historical plan. Preserve the approved Lab layout and existing workflows. Inspect the current source and deployment before implementation or publication.

## 2. Product direction

BLTZ is building persistent athlete career media and intelligence infrastructure. Athlete identity lasts across schools, professional teams, retirement and future organizations. The public Player Locker is an interface to that identity, rather than the underlying product itself.

The product connects three long-term graphs:

1. **Athlete Career Graph:** athlete identity, organizations, teams, seasons, achievements, games, Moments, media and career relationships.
2. **Moment Contribution Graph:** the event, featured and contributing athletes, teams, opponents, creators, media and explicitly established relationships.
3. **Athlete Value Graph:** authorized usage, attribution, transactions, allocations and earnings when those phases are approved. Estimated opportunity or media value is not athlete earnings.

The original Intelligence work was organized as Athlete Graph, Moment Graph, Media Graph, Signal Engine and Opportunity Engine. These are connected capabilities within the product, not five disconnected applications or competing databases.

The core intelligence path is:

```text
Canonical athlete identity
  → sourced career relationships and Moments
  → supporting performance/content/media evidence
  → deterministic, explainable Signals
  → potential Opportunities for human review
  → reviewed activation drafts when authorized
```

BLTZ's differentiation is persistent identity, historical relationships, provenance, attribution and long-term usefulness. Do not drift into a generic CRM, DAM, chatbot, social publishing suite, video editor or real-time sideline media platform.

Product authority: `docs/product/BLTZ_PRODUCT_DOCTRINE.md` → current PRD → build plan → assigned task. `docs/BLTZ_BUILD_ORDER.md` governs phases and records a bounded October 5 Intelligence implementation exception. That exception does not authorize completing every future Media Graph, rights, organization, campaign or payment phase.

## 3. The Intelligence Lab's purpose and boundaries

The Lab is a private internal research, inspection and demonstration console at:

**`/admin/intelligence`** — documented production origin: `https://bltz.vercel.app`.

It already exists and has an Admin sidebar entry. Do not create a replacement application or another Lab route for the same experience.

The Lab should make these questions answerable:

- Who is this athlete?
- Where and when did they play?
- What happened during their career?
- Which statistics or evidence support the Moment?
- Which media is actually connected to it?
- What source established each fact?
- Which external provider IDs map to the canonical entity?
- Why was a Signal generated, and which Opportunity follows from it?

Traceability is the primary goal. Unknown and incomplete states are part of the product, not defects to hide with fabricated demo content.

Protect Wizard-of-Oz athlete onboarding, previews, claims, public Lockers and unrelated Organization/CRM work. Do not create temporary administrator accounts when the user's existing authorized session is sufficient. The Lab is not campaign management, organization onboarding, payouts, enterprise roles or a customer dashboard.

## 4. The four workstreams

| Workstream | Responsibility | Established direction |
| --- | --- | --- |
| Graph Architecture | Canonical identity, relationships, schema and shared contracts | Reuse existing identity/context entities; additive sourced Moment foundation; preserve provenance and uncertainty. |
| Data & Enrichment | Provider ingestion, normalization, resolution and capability research | Provider adapters feed raw observations and reviewable candidates; external IDs never replace BLTZ IDs. |
| Signals & Opportunities | Deterministic rules, scoring, explanation and action candidates | Evidence-backed rules first; preserve Moment → Signal → Opportunity lineage; no speculative recommendations. |
| Intelligence Lab | Inspect and demonstrate all of the above | Existing private route, approved Athlete B/Moment B workspace, real data and explicit empty states. |

Later measured analytics and durable review work extends these contracts. It does not mean the entire intelligence system is running in production.

## 5. Canonical architecture and data contracts

### Existing entities to preserve

- **`public.players.id` is the canonical Athlete Career ID.** Do not create a second `athletes` table.
- Athlete identity is independent of authentication identity and may exist before an account or Locker claim.
- `player_lockers` is presentation/configuration, at most one per player; it does not own career history or media.
- Reuse `organizations`, `schools`, `teams`, `seasons`, `sports_events` and explicit roster relationships where valid.
- Schools are reference entities; organizations are tenants. An imported school/team label does not create tenant membership.
- Existing team UUIDs remain stable. Provider team IDs are not BLTZ UUIDs.
- Existing awards and season statistics are context, not automatic proof of a significant exact-date Moment.

### Minimum Intelligence graph foundation

The documented initial foundation uses five tables:

| Table | Role |
| --- | --- |
| `intelligence_sources` | Source/provider registry. |
| `intelligence_ingestions` | Timestamped, versioned observations, safe locators, raw payloads and normalization candidates/status. |
| `moments` | First-class occurrences, optional event linkage, review status, confidence and explicit date precision. |
| `moment_athletes` | Explicit athlete/Moment associations and relationship roles. |
| `intelligence_evidence` | Source-backed statements and structured facts attached to the canonical athlete and optionally a Moment. |

The graph document records deployment of this initial foundation and a service-only audited source-review/promotion RPC. Earlier paragraphs describing it as local-only are historical planning text, not the later deployment record. Newer analytics/review migrations have a separate, unreleased status.

Important invariants:

- Preserve day, year-only and unknown date precision. Never turn a season or award year into January 1.
- Confidence is nullable, on a 0–1 scale. Null means unknown. Review/verification status is separate.
- Evidence with a Moment requires the matching athlete/Moment relationship. Signals additionally require reviewed relationships and facts.
- Preserve source/ingestion linkage, immutable observation provenance, normalizer version and idempotency.
- Raw provider data stays server-side and must exclude transport credentials.
- Do not add a generic arbitrary-edge table or a parallel provider-shaped canonical model merely for convenience.
- Performance can be supporting evidence; a new competing performance table is not required for the initial slice.
- League registry, full canonical Media Graph and rights-engine schemas are phase-dependent, not implicitly authorized.

Shared graph DTOs include `GraphMoment`, `GraphEvidence`, `GraphSourceReference`, `GraphMomentAthlete` and `GraphExternalIdentity` in `lib/intelligence/contracts.ts`.

### External identities and ingestion

Existing verified `player_external_ids` mappings remain the mapping authority. The adapter projects them into provider-independent contracts. Its existing provider/sport/league constraints must be respected; do not claim arbitrary provider identities are already persisted.

```text
Provider response
  → safe immutable raw envelope
  → normalized candidate with evidence pointers
  → entity resolution
  → reviewed canonical association
  → provenance
```

Track provider, sport/league, identifier namespace, external ID, source, `fetched_at`, normalizer version, normalization status, confidence and match method. Candidate field evidence uses JSON Pointers into the observed payload.

A unique verified mapping with compatible identity can resolve an athlete. Conflicting mappings, identity contradictions or ambiguous names require review. Name similarity alone must never silently create or merge canonical athletes.

## 6. Providers, research and historical facts

Potential/source families discussed: BLTZ master player data, existing scraper, Sportradar, Sports Reference, Jivly, YouTube and public publisher/school sources. This list is not a claim that every integration is implemented or licensed.

### Sportradar

- Sportradar is an enrichment provider, not the BLTZ schema or identity authority.
- The founder corrected the trial deadline to **October 10, 2026**, not October 13. That historical planning deadline has passed as of this export. Verify current entitlement before new calls; do not reuse an old “13 days remaining” statement.
- Low rolling quota usage does not rule out QPS throttling, concurrent requests or a provider cooldown.
- Recorded research used a 2.5-second minimum request gap and shared ledger/cooldown checks. Five paced calls succeeded; actual request starts were approximately 3.4 seconds apart. This did not establish the precise cause of the earlier HTTP 429.
- Honor `Retry-After`, global pacing, shared cooldown, bounded retries and request budgets. Do not repeatedly retry blindly or fetch provider data on every UI render.
- A dated NFL season catalog listed 2000–2026. A 2000 schedule and sampled game-statistics response succeeded. A listed year or one successful sample does not prove complete historical coverage or every field's availability.
- APIs versus MCP are transport choices for adapters; neither should redefine canonical data.

### Getty and other content sources

The founder requested a Getty connection separate from Sportradar and wanted media referenced against discovered Keith Rivers facts. Do not assume a Sportradar Images trial equals direct Getty access. The reviewed Lab delivery documents do not establish a cleared direct Getty production integration. Verify the actual product entitlement, authentication and permitted usage before implementing one.

The earlier audit did not find a Jivly ingestion pipeline. Sports Reference research originally referenced a reviewed college CSV workflow; newer source-protection guidance makes Sports Reference **link-only**, permitting retention/removal of existing exact saved CSV entries without authorizing a new manual CSV source or arbitrary uploaded tables.

YouTube, interviews and articles can establish source-backed content context. Discovery or fetch time is not publication, upload, release or event time. Unknown upload dates remain unknown. Old articles or undated videos do not prove a recent activity spike.

### Keith Rivers: the initial real-athlete example

Canonical Career ID used in the reviewed sample: `c5dae871-a277-4256-9a0c-17a40940ad3f`.

Documented sample facts and limits:

- Two reviewed Moment associations, 21 verified evidence records, eight sources/ingestions, one verified external identity and eight legacy season-stat records were recorded in the earlier live-data check. These are dated sample counts, not current database totals.
- USC vs. Washington, October 7, 2006: reviewed USC evidence credits 12 tackles, one tackle for loss and two deflections.
- Buffalo Bills at Chicago Bears, September 7, 2014: recorded provider research reports three tackles, one assist and four combined tackles.
- Nine unique play-by-play plays contained explicit Keith references in the sampled 2014 feed. Eighteen nested matches are not eighteen plays or proof of eighteen contributions.
- The initial user assumption of a 2014 retirement was corrected in stored research: 2014 is final regular-season context in the sample; an official Dallas report dated July 30, 2015 establishes retirement. Do not equate last playing season with retirement date, or fill an unsourced profile field from a prototype.
- Career-era reporting, a 2021 interview and 2025 publisher-linked video provide historical/post-career context. Some YouTube dates remain unknown.
- An explicitly player-linked private Preview Locker supplied an ESPN portrait reference. Portrait availability does not establish connection to either sports Moment or clearance for commercial use.
- No normalized roster history or verified Moment-to-media links were established in that initial sample. Empty media/relationship states are intentional.

The USC Moment's 20-year anniversary was October 7, 2026. An evaluation around October 1–5 could show an approaching anniversary; **it is not approaching on October 21**. Use an explicit historical evaluation date when reproducing that demonstration.

## 7. Deterministic intelligence

### Original graph evaluator

The original pure graph evaluator implements:

1. `historical_anniversary`: reviewed exact-day past occurrence, verified athlete association and complete source metadata; upcoming anniversary within a configurable UTC window, default 30 days.
2. `career_milestone`: an explicit reviewed milestone assertion meets its reviewed threshold within a configurable recent window, default 30 days. It does not infer a record or first crossing from incomplete totals.

Anniversary score: 40 base + up to 40 for proximity + 20 for an anniversary divisible by five. Milestone priority is 70/100. These are editorial review priorities, not probabilities, reach, commercial conversion or earnings. Confidence is a separate evidence-derived value.

Signals preserve canonical athlete/Moment IDs, stable key, rule/version, score, confidence, explanation, evidence, source entities, evaluation/detection timestamp and target date. Opportunities preserve the Moment and originating Signal keys, explanation, supporting evidence and review state. The original Opportunities are recomputed candidates rather than automatically persisted campaigns.

Fail closed on incomplete/truncated reads, future or conflicting evidence, unreviewed relationships, invalid identities and year-only dates. An evaluation timestamp controls rule windows but does not reconstruct historical verification state without immutable fact/review history.

### Later measured-loop implementation

Prepared source adds seven rules to the original two:

- `locker_discovery_spike`
- `moment_rediscovery`
- `asset_engagement_spike`
- `athlete_distribution_growth`
- `licensing_intent_cluster`
- `measurement_coverage_failure`
- `print_intent_cluster`

This is **nine of 46 catalogued rules**, not a complete operating engine. Thirty-seven remain deferred. Rule source availability is not evidence of hosted collection or production coverage.

Prepared measured lineage:

```text
Event journal
  → atomic immutable export / transactional outbox
  → durable delivery batch
  → signed QStash callback
  → Tinybird acknowledgment
  → event-ID/content reconciliation
  → versioned features and deterministic Signals
  → reviewed Opportunities and activation drafts
```

The design includes bounded retries/batches, publisher/worker leases, replay handling, ambiguity quarantine and logical event-ID deduplication. Feature/run lineage includes scope, environment, input hashes, versions, windows and watermarks. Versions documented include `engagement-v1` and `measured-v1`.

Current manual refresh covers athlete/public-audience subjects with partial coverage. Growth requires complete comparable windows and adequate samples; it stays suppressed without coverage attestation. Unknown, missing, partial, unavailable and stale data are not zero. Tab sessions are not unique people. Unknown distribution must stay unknown.

## 8. Approved interface and interaction decisions

The founder selected **Athlete concept B and Moment concept B** after a three-column roster reference. Preserve this direction; do not redesign the Lab from scratch.

### Desktop

- Left: athlete watchlist, selection/removal and search-result add controls.
- Center: shared athlete identity header and a file-folder container for the selected data.
- Right: stacked **Signals**, **Opportunities**, **Activations** sections, each with expandable card lists.
- Equal 17px gaps between outer columns and between right-rail sections.
- Portrait is square, capped at **250 × 250px**. Earlier 400px/300px iterations are superseded. The portrait track uses up to 40% subject to that cap; information fills the remaining width with a modest gap.
- Name stays on one line using dynamic fitting. School/team, sport and position appear together with dot separators. Status/date sits below that row, not as a badge above the name. Unknown status stays explicit.
- The teams-and-seasons section was removed in the final iteration. Do not restore its old pills or article links as an assumed requirement.
- Email, Locker, phone and social controls sit below identity information in a 2×2 grid. Each has an outlined/background icon and adjacent data without a surrounding filled data box or redundant label. Recorded email/phone can be copied; social expands to multiple linked accounts; Locker currently links to the player's Preview Locker.
- Private contact data is not inferred or harvested: the current profile DTO deliberately leaves email/phone null. Show unavailable states where data is not authorized/recorded.
- Photographer, attribution/rights and identity/provenance icons overlay the portrait. Hover reveals detail; click can keep it open. Identity shows Career ID and provider mapping. Avoid repeating portrait credits elsewhere.

### File folders, Moments and evidence

- Athlete tabs: **Intelligence first and selected by default**, then Moments and Media. The old Sources tab was removed.
- Moment tabs: Evidence, Connections, Media. The shared athlete header stays consistent with the athlete view.
- Folder tabs have smooth rounded tops and outward rounded bottom flares. They sit close together, align toward the right on desktop and center on mobile. Tab switches must not change the middle container's width.
- Folder body aligns with the portrait's left edge; retain 10px portrait-to-folder spacing.
- Moment cards retain a sport/competition subtitle, condensed all-caps title, short one-sentence description below it without a dash, and date below the description. Exact automated description-selection logic remains undecided.
- Attached media can appear as stacked previews on the right with a subtle hover movement, only when real links/previews are supported. The Inspect Moment button sits at the far right of the card action area.
- Confidence/evidence metrics and review priority use circular indicators, centered evenly side by side. Priority displays Low/Mid/High inside the circle without its numeric score. Unknown confidence remains unknown.
- Source/evidence cards use a two-column desktop grid, one column on mobile. Show an actual supplied publisher/team/provider logo; otherwise say **Logo not provided**. Evidence detail expands on demand.

### Watchlist, mobile and typography

- Search placeholder: **Search athletes, teams and moments…**, centered in the top bar. Inspect actual query support before claiming fully implemented cross-entity search merely from that label.
- A separate plus control adds a search result to the watchlist. Unreviewed athletes may be added as **Awaiting review** without invented scores or organization membership.
- Priority thresholds: Low 0–40, Mid 41–70, High 71–100; green/yellow/red dots respectively, plus text. Unreviewed is neutral. Athlete priority uses the highest qualifying reviewed Signal score.
- Do not show per-athlete Signal/Opportunity counts in list rows. Preserve compact line height and a plain remove icon without a box.
- Mobile puts search in the top navigation, portrait first, then name, school/team–sport–position, status and contact controls. Center Moment subtitle/title/description/date/media. The watchlist opens as a dismissible panel.
- Support dark and light themes. BLTZ gold is `#ffbb00`, with blue secondary accents and navy/black or neutral light surfaces.
- The implementation uses Barlow/body typography, condensed all-caps Moment display headings and JetBrains Mono metadata. Final size refinements: former 11px Barlow detail text → 14px; former 9px Barlow captions → 12px; JetBrains Mono → 11px. This does not mean every font on the page has one size.
- Motion is slight and purposeful, with reduced-motion support. Preserve accessible keyboard controls, visible focus, contrast, alt text and text-plus-color status.

The editable sample activation modal and fictional metrics from concept work are not proof of a live commercial activation workflow. Published empty Activations states must not be filled with invented brands, reach or revenue.

## 9. Media, rights and security boundaries

Keep **appearance, sports contribution, attribution, legal ownership, licensing rights and economic participation** distinct. None follows automatically from the others.

- An athlete-level media relationship is not a verified Moment media relationship.
- Discovery of a Getty image, interview, article or video does not authorize download, display, editing, publication or commercial use.
- Use the conceptual permission boundary `resolveMediaPermissions(asset, usageContext)`. Current compatibility behavior is limited to qualified legacy display use; unsupported commercial/publishing/licensing uses fail closed.
- Reviewed intended use or editorial approval is not a licensing agreement. Draft brand attachment is not a partnership.
- Do not attach fictional reach metrics or earnings to a real athlete. Draft activation metrics remain null without actual measured evidence.
- Never put API keys, session cookies, passwords, signing keys, service-role credentials, raw provider payloads, private notes or financial allocations into client props or exported context.

The private Lab uses server-side authorization based on existing authentication and internal-admin checks, not `profiles.role` or browser-supplied claims. The service client is created only after authority is established. Data reads and DTOs are scoped, bounded and validated. Dynamic/noindex behavior is additional protection, not authorization.

`lib/intelligence/evidence-projection.ts` filters structured evidence before serialization. Performance panels expose actual statistic fields, not raw observations, reviewer actors, rights metadata or unrelated identifiers. Public Lockers must not receive private Lab data.

## 10. Published state versus prepared source

### Dated published evidence

The October 4–5 Lab release and typography refinement were published and inspected in authenticated Chrome. The October 5 closeout found all 67 approved Lab overlays, including 41 runtime files, present in production. Later same-day security work preserved this UI.

The latest reviewed release receipt records:

- Production deployment: `dpl_ENerkCAjvM3KoLsbvu5gFpJkDJj9`, promoted October 5, 2026.
- Security source commit: `889df1ba2eb6eaecfb1376c6b0527a1b57789a2a`.
- Branch: `codex/auth-security-production-2026-10-05`.
- Independent source comparison: 1,089 uploaded files matched the reviewed source.
- Earlier published baseline/checkpoint: `bc12fadb2c7de49d15b440c80abe4e2c8f7cf2cc`; previous deployment `dpl_95pdtfr5Ka2BR9qZHuiS9EGhJ9Hr` is the recorded rollback.

These are historical receipts, not a fresh October 21 production attestation. The older closeout's deployment ID is superseded by the later security receipt.

### Implemented, committed and pushed; not activated

Measured analytics and review production-support source is recorded at:

- Commit: `37a9b59294a66859e92d5314cf8bdd111d5f75e8`.
- Branch: `codex/analytics-production-support-2026-10-05`.

The reviewed documents explicitly distinguish this source checkpoint from the live security release. No hosted analytics end-to-end canary, scheduler activation or application of its new production schema is claimed.

The October 5 release receipt documents these four flags as false:

```text
BLTZ_ANALYTICS_PIPELINE_ENABLED
BLTZ_ANALYTICS_PRODUCTION_ENABLED
BLTZ_INTELLIGENCE_WORKFLOWS_ENABLED
BLTZ_INTELLIGENCE_WORKFLOWS_PRODUCTION_ENABLED
```

The current `vercel.json` inspected for this export explicitly pins only the two workflow flags to false; the two analytics flag keys are absent from that file. Current cloud values were not checked. Configuration-key absence does not establish that analytics has been activated or that hosted release gates passed.

Prepared durable models include delivery outbox/batches, engine runs, feature snapshots, review Opportunities, reviewed Moment/asset links, activation drafts/assets and workflow history. They support stable identities, assignment/review states, optimistic revisions and idempotent history. Editing invalidates revision-bound editorial approval. These are not the full enterprise campaign or rights engines.

Prepared migrations:

```text
20261005183837_intelligence_measured_delivery.sql
20261005184406_intelligence_review_workflows.sql
20261005231340_production_delivery_environment.sql
20261005231344_production_review_environment.sql
```

Do not run these merely because they are listed here. Migration-history reconciliation, isolated hosted staging, scoped Tinybird resources/tokens, a fixed reachable HTTPS worker, matching regional QStash signing keys, signed delivery, acknowledgment/replay/lost-ack reconciliation, monitoring and auditable recovery ownership are release gates. **Changing flags alone is not activation readiness.**

### Source-management caution

Later repository status records reconciliation onto `codex/csv-matching-recovery-2026-10-05`, based on `3c31bd99ab78c717430b6938df333e03c011c7a0`. Earlier descriptions of the mixed `codex/preview-locker-release` checkout are historical. Inspect the actual current branch/worktree rather than restoring an old stash or snapshot wholesale.

Vercel's recorded Git production branch is `main`, while reviewed releases used explicit CLI promotion. A branch push is not proof of production publication. Do not redeploy stale `main`, an old release folder or an old rollback simply to preserve the Lab; compare and retain all newer unrelated published changes.

## 11. Implementation map

Repository stack observed for this export: Next.js 16.3.6 App Router, React 19, TypeScript, npm, Supabase/PostgreSQL/Auth and Vercel. Current source also includes Tinybird/QStash support. Inspect installed versions and the local Next.js guides before changing framework code.

| Area | Main paths |
| --- | --- |
| Existing Lab route and approved interface | `app/admin/intelligence/page.tsx`, `CareerWorkspace.tsx`, `career-workspace.module.css` |
| Findings/research | `app/admin/intelligence/ResearchView.tsx`, `lib/intelligence/research.ts`, `research-server.ts` |
| Authorized graph/workspace reads and DTOs | `lib/intelligence/lab-server.ts`, `workspace-server.ts`, `contracts.ts`, `workspace-types.ts` |
| Evidence privacy projection | `lib/intelligence/evidence-projection.ts` |
| Ingestion and resolution | `lib/intelligence/ingestion/` |
| Image metadata normalization/matching | `lib/intelligence/images/` |
| Original pure graph rules | `lib/intelligence/signals/` |
| Prepared measured features/rules | `lib/intelligence/features/`, `measured-server.ts`, `measured-validation.ts`, `measured-integrity.ts` |
| Prepared review workflows | `lib/intelligence/workflows/`, `app/admin/intelligence/WorkflowReviewPanel.tsx` |
| Navigation and theme integration | `components/admin/AdminSidebar.tsx`, `AdminThemeShell.tsx` |
| Lab tests | `tests/intelligence/`; graph/migration checks also under `tests/database/` |

The default page renders the career workspace; `?view=findings` selects the research view. Query context includes athlete, Moment, search and UTC evaluation date. The page is force-dynamic and noindex, with explicit unavailable handling. The non-production `/admin/intelligence/examples` is Admin-only; synthetic scenarios must remain separated from real records/ranking.

Current/prepared endpoint inventory must be checked against the deployed candidate:

```text
/api/admin/intelligence
/api/admin/intelligence/features
/api/admin/intelligence/workflows
/api/internal/analytics/dispatch
/api/internal/analytics/deliver
/api/internal/analytics/reconcile
```

The reviewed security release excluded the new delivery routes; their presence in source is not a deployment claim. Current source additionally contains newer preview analytics contracts in `lib/analytics/{preview-event,preview-client,preview-report,bltz-event}.ts` and `/api/preview-analytics/events`; do not assume the entire current checkout equals the older measured-loop checkpoint.

Configuration names include existing server-only Supabase/provider settings and, for prepared delivery, `BLTZ_ANALYTICS_ENVIRONMENT`, `BLTZ_ANALYTICS_WORKER_URL`, `BLTZ_ANALYTICS_DISPATCH_SECRET`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`, `QSTASH_URL`, `TINYBIRD_ANALYTICS_URL`, `TINYBIRD_ANALYTICS_INGEST_TOKEN`, `TINYBIRD_ANALYTICS_QUERY_TOKEN` and `BLTZ_INTELLIGENCE_WORKFLOWS_ENVIRONMENT`. These are names only, not evidence of configured access or permission to activate anything. Never request secret values in a chat/context document.

## 12. Validation, limitations and next work

Dated validation receipts:

- Original final Lab UI milestone: 253 core tests across 19 files, TypeScript and production build passed; authenticated desktop/mobile and anonymous access checks recorded.
- Later security candidate: 1,052 tests passed, zero failed, 24 skipped; TypeScript/build passed; lint zero errors with 287 warnings.
- Unreleased production-support candidate: 1,406 tests passed, zero failed, 24 skipped; TypeScript/build passed; lint zero errors with 288 warnings.
- Runtime dependency audits at those later checkpoints were clear. Seven high build-tool `braces` findings remained documented for a separate compatible tooling upgrade. These are dated results, not an October 21 audit.

Priorities for a future authorized assignment:

1. Establish the actual current source/deployment/schema baseline and read the current Product Doctrine/build-order exception.
2. Preserve the approved interface while improving real evidence, entity resolution and explicit relationships.
3. Complete hosted delivery/migration/canary gates before enabling measured analytics or durable review workflows.
4. Review genuine media-to-Moment links and intended-use/rights evidence. Verify provider entitlements; do not assume Getty clearance or an active Sportradar trial.
5. Expand rule coverage only with adequate observations, comparable baselines and explainable evidence. Do not label partial measurement a complete engine.
6. Keep campaign publishing, partner agreements, commercial transactions, rights-engine expansion, revenue allocation and payouts in their separately authorized phases.

Do not rebuild or substantially restyle the Lab without a new design request. Do not change onboarding, silently merge athletes, invent statistics/dates/media, use synthetic metrics in live demonstrations, expose private data or infer economic entitlement from participation.

## 13. Repository references and freshness

The most useful deeper references are:

- `docs/product/BLTZ_PRODUCT_DOCTRINE.md`
- `docs/BLTZ_BUILD_ORDER.md` and `docs/ACTIVE_BUILD.md`
- `docs/intelligence/CTO-STATUS.md`
- `docs/intelligence/graph-architecture.md`
- `docs/intelligence/source-review.md`
- `docs/intelligence/signals-opportunities.md`
- `docs/intelligence/career-workspace-production-2026-10-04.md`
- `docs/intelligence/career-workspace-captions-2026-10-04.md`
- `docs/intelligence/measured-loop-implementation-2026-10-05.md`
- `docs/intelligence/measured-loop-completion-2026-10-05.md`
- `docs/intelligence/production-support-checkpoint-2026-10-05.md`
- `docs/intelligence/production-release-plan-2026-10-05.md`
- `docs/intelligence/release-handoff-2026-10-05.md`

Older planning documents can contain statements later superseded by deployment receipts or source-protection decisions. The approved product direction and latest explicit decision take priority; conflicts should be surfaced rather than silently resolved using the oldest plan.

This export is documentation only. Creating it did not change the application, routes, database, migrations, dependencies, permissions, environment variables or production deployment. It contains no credential values or private contact exports.
