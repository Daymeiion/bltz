# BLTZ Intelligence: deterministic Signals and Opportunities

## Objective and authorized scope

The September 30, 2026 Intelligence task authorizes an internal, evidence-backed proof of `player → moment → signal → opportunity`. This work is independent of the Wizard-of-Oz cohort, onboarding, public Locker publishing, Beta Intelligence, and GTM. The task overrides the older build order's CRM-first priority for this isolated workstream. It does not authorize enterprise CRM, a chatbot, automated outreach, campaigns, rights clearance, monetary valuation, or athlete payments.

Product authority remains the doctrine supplied in AGENTS.md. The referenced `docs/product/BLTZ_PRODUCT_DOCTRINE.md` was absent at audit time. Signals serve persistent career identity and career recovery; media management is a supporting concern.

## Current-state audit

| Existing area | Evidence in repository | Decision |
| --- | --- | --- |
| Canonical athlete identity | `players.id`; Phase 2 `athlete_team_seasons`, `sports_events`, `sports_event_athletes` | Consume canonical IDs and explicit relationships. Never match names or substitute provider IDs here. |
| Cohort intelligence | `lib/beta-intelligence/query.ts`, `lib/queries/beta-intelligence.ts`; `analytics_events`, `athlete_insights`, baseline snapshots | Cohort behavior and manual operational insights are separate from career signals. Preserve them. |
| Product analytics | `lib/analytics/events.ts`, `docs/analytics-event-taxonomy.md`, aggregate Beta RPC | Existing allowlist contains Locker/media views, claims, sharing, edits. These are product events, not comparable historical athlete performance observations. |
| Founder relationship scoring | `lib/gtm/scoring.ts`, `lib/gtm/classification.ts` | Enterprise/contact score explicitly excludes athlete scoring. Do not import it or reuse GTM opportunities. |
| Legacy analytics | `lib/queries/analytics.ts` | Contains mock fallbacks and estimated invite-source breakdowns. Must not feed Intelligence evidence or scores. |
| Awards | `player_awards` contains verification, source URL, confidence, year | A year is insufficient for an exact-day anniversary. An award is not automatically a career milestone or first crossing. |
| Statistics | Legacy `player_season_stats` and Phase 2 `athlete_season_stats` | Source-labelled JSON totals alone do not prove a dated Moment, a record, comparable baselines, or career totals. |
| Scraper provenance | `lib/pipeline/types.ts` and synthesis | URLs and confirmation are useful inputs but do not establish reviewed, exact-date canonical Moment associations. No onboarding changes. |
| New Moment contract | `lib/intelligence/contracts.ts` | Graph Architecture owns contracts, migrations, source/evidence models. This work only adapts read DTOs. |

There was no existing deterministic career Signal Engine or graph Opportunity Engine found. No live database career Moment was asserted by this audit. Existing tests use names such as Daymeion Hughes, Joe Ayoob, and Patrick Mahomes; those test names do not prove live canonical records or dated career facts.

## Minimum model and implementation plan

1. Read authorized canonical Moments and their athlete associations through the shared Graph DTO.
2. Fail closed unless the Moment, association, exact day, and occurrence evidence are reviewed and sourced.
3. Evaluate two deterministic rules against explicit `asOf` and windows.
4. Return candidate Signals and candidate Opportunities, with the athlete, Moment, source identities, evidence, explanation, rule version, and stable keys.
5. Have the private Intelligence Lab render this output. The evaluator itself neither authorizes reads nor performs database/network operations.

The implementation is in `lib/intelligence/signals/{types,evaluate,graph,index}.ts`. It adds no routes, migrations, tables, background jobs, environment variables, permissions, or dependencies. Future persistence belongs to Graph Architecture and needs an approved immutable run/evidence snapshot design. Current keys are derived identities, not database UUIDs.

### Rule input contract

`evaluateGraphIntelligence(moments, playerId, options)` consumes shared `GraphMoment[]` and the canonical `players.id`. It filters evidence to the same canonical athlete and Moment. The Moment and at least one athlete association must be `verified`, and reviewed confidence must be known. Multiple reviewed roles are consolidated into one athlete/Moment fact, using the minimum confidence across the reviewed roles. Candidate or rejected additional roles do not invalidate established reviewed participation. Confidence is a finite value between 0 and 1; it remains separate from editorial score.

Required reviewed occurrence assertion:

```ts
{
  factType: "moment_occurrence",
  status: "verified",
  athleteId: "<canonical players UUID>",
  momentId: "<canonical Moment UUID>",
  statement: "<human-readable evidence of this athlete's dated Moment>",
  data: { occurredOn: "YYYY-MM-DD" },
  confidence: 0.95,
  source: {
    id: "<canonical source UUID>", name: "<source name>", provider: "<provider>",
    locator: "<retrieval URL or source locator>", fetchedAt: "<ISO timestamp>"
  }
}
```

The example shows a contract, not an athlete fact. A source's identity and fetched timestamp are required. A retrieved source also needs a locator; explicitly `manual` reviewed evidence can omit its locator if its canonical source ID, name, and captured timestamp exist. A missing timestamp is incomplete and is never filled with the current time. Provider-specific identifiers do not become Signal identities.

The reviewed occurrence assertion's date must match `moment.occurredOn`. Conflicting reviewed dates suppress evaluation. Candidate or rejected evidence cannot establish facts. A year-only Moment never acquires a fabricated January 1 date. An identity source, birth date, account timestamp, or season year cannot substitute for occurrence evidence.

Optional explicit reviewed milestone assertion:

```ts
{
  factType: "career_milestone", status: "verified",
  data: {
    label: "<reviewed milestone label>", statistic: "<career statistic key>",
    value: 1000, threshold: 1000, unit: "<statistic unit>"
  }
  // Same athlete/Moment linkage, source metadata, confidence, and human evidence.
}
```

The numeric example is schema illustration only. Ingestion or human review must establish what the career statistic covers. The engine does not add season totals, infer a first threshold crossing, infer a record, or invent a milestone from an impressive performance. More than one reviewed milestone assertion for a Moment is treated as ambiguous and is not selected automatically.

### Rules

| Rule | Trigger | Score and explanation |
| --- | --- | --- |
| `historical_anniversary:v1` | Verified exact-day past Moment has an anniversary from the UTC evaluation day through the next 30 days, inclusive; anniversary year is at least 1 | 40 base + 0–40 date proximity + 20 when anniversary years are divisible by 5. Explanation includes dates, years, days until, configured window, and complete score calculation. |
| `career_milestone:v1` | Reviewed explicit milestone value meets a positive reviewed threshold; dated Moment falls within the past 30 UTC days, inclusive | Fixed 70/100 editorial review priority; evidence and threshold are shown. No inference of first crossing or record. |

Windows are configurable integer days from 0 through 366. Leap-day anniversaries only occur on actual February 29; the engine does not move them to February 28. A zero-day anniversary window evaluates the anniversary day only. Scores mean **0–100 editorial review priority**, not a probability, earnings, monetary value, reach, or expected commercial conversion.

Signal confidence is the minimum of the Moment/association confidence and supporting evidence confidence. Low confidence stays visible rather than being disguised as a high score. There is no claim that confidence is statistically calibrated.

### Outputs for the Intelligence Lab

```ts
import { evaluateGraphIntelligence } from "@/lib/intelligence/signals";

const result = evaluateGraphIntelligence(moments, playerId, {
  asOf: "2026-09-30T00:00:00Z",
  anniversaryWindowDays: 30,
  milestoneRecencyDays: 30,
});
```

The caller obtains real graph data and server-authorizes it first. The ISO evaluation timestamp is required and must carry a timezone offset. Calendar calculations use UTC; a local offset is normalized before calculating day distances. `asOf` and `detectedAt` hold the normalized supplied evaluation time, not an implied persistence timestamp.

Signals return `key`, `type`, `ruleVersion`, `playerId`, `momentId`, `score`, `scoreScale`, `confidence`, `explanation`, `evidence`, `sourceEntities`, `detectedAt`, `asOf`, `targetDate`, `data`, and `status: candidate`. Each evidence item preserves source ID/name/provider/locator/fetched timestamp and the human assertion. A safe HTTP(S) source URL is provided when the locator is a URL.

Opportunities return `key`, `type`, `playerId`, `momentId`, `signalKeys`, `strength`, `confidence`, `explanation`, `evidence`, and `status: candidate`. Opportunity types are `anniversary_retrospective_review` and `career_milestone_review`. A candidate is a review action, not a campaign or legal/commercial entitlement. Its explanation requires checking available media, rights, and athlete preferences before any activation. No organization is invented when the graph supplies none.

`key` is stable for a rule version, canonical athlete, Moment, and target date. A new anniversary year has a new key. Scores vary as the anniversary approaches. No repeated evaluation writes duplicate rows. Multiple canonical athletes can receive distinct signals for the same explicitly associated Moment. Duplicate Moment facts for one athlete require resolution rather than silently choosing a row.

Empty data returns empty Signals and Opportunities. `skipped` reports incomplete facts using:

- `invalid_canonical_identity`
- `moment_or_athlete_relationship_unverified` (also includes conflicting reviewed dates)
- `invalid_moment_fact`
- `missing_invalid_or_future_evidence`
- `exact_occurrence_date_required`
- `future_moment`
- `duplicate_moment_facts_require_resolution`
- `career_milestone_assertion_not_supported`

Unrelated Moments without an explicit athlete association are excluded. More than one milestone assertion suppresses milestone selection. Eligible historical Moments outside the configured anniversary window produce no condition, rather than a missing-data error.

## Rules deliberately gated by missing evidence contracts

| Candidate | Required before implementation |
| --- | --- |
| Performance spike | Comparable sport/statistic/unit/phase/competition baselines, minimum sample, observation dates, complete data coverage, and reviewed athlete/event links. |
| Media activity spike | Measured asset-level events, source-specific coverage, comparable equal windows, bot/deduplication treatment, denominator and baseline; product-view events alone do not prove external media activity. |
| Media gap | Explicit scoped inventory completeness or a reviewed missing-asset assertion. An empty or failed query does not establish a gap. |
| Alumni connection | Verified dated former affiliations, explicit school/organization identity and actual relationship evidence; matching school text alone is insufficient. |
| Resurfacing content | Dated external activity observations and asset/Moment identity links; discovery timestamps alone do not establish renewed public attention. |

## Reproducibility and persistence limits

The same graph fact snapshot and options reproduce the same result. Evidence fetched after `asOf` is excluded. However, the current shared DTO lacks review-effective timestamps and immutable fact-history snapshots. `asOf` controls evaluation time; it cannot reconstruct which database facts had been verified at an earlier historical instant. Persisted engine runs must store the complete input snapshot, rule version, windows, evaluation time, and resulting evidence references before promising historical point-in-time replay.

Rule changes require a new version. Persistence must preserve candidate/reviewed/dismissed/resolved state independently from re-evaluation and must not overwrite historical evidence. Neither this evaluator nor the Lab publishes media or infers rights ownership, contribution, economic participation, or payouts.

## Acceptance criteria and tests

Acceptance: verified and sourced graph facts produce reproducible explanations; candidate, conflicting, missing, year-only, future, and invalid facts produce no unsupported signal; stable keys preserve canonical identity; Opportunities retain their Signal and Moment relationships; empty data never produces demo facts.

Automated commands:

```text
node node_modules/vitest/vitest.mjs run tests/intelligence/signals.test.ts tests/intelligence/signals-graph.test.ts
node node_modules/eslint/bin/eslint.js lib/intelligence/signals tests/intelligence/signals*.ts
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

At verification, 42 deterministic unit/adapter tests passed, targeted lint passed, and the full application TypeScript check passed. Cases cover anniversary windows, year boundaries, leap dates, timezone conversion, threshold assertions, ambiguous duplicates, conflicting evidence, source/association confidence, multiple athlete roles, provenance completeness, explicit athlete association, invalid/future evidence, immutable inputs, deterministic keys, and empty results. Application build and integration regression suites are coordinated by the root engineering workstream.

Tests explicitly identify synthetic canonical UUIDs and synthetic event/statistic facts. A negative test uses the existing repository athlete name Daymeion Hughes without assigning career facts; this is not live database validation. Live known-athlete tests remain pending real canonical IDs and reviewed dated Moment/evidence rows. They are not replaced by invented athlete records.

Manual verification after the Graph migration and Lab are available:

1. Select a real canonical athlete in the authorized Lab and inspect a verified exact-day Moment, its explicit athlete association, and its occurrence source.
2. Supply an `asOf` inside its upcoming anniversary window; confirm date/year/day calculation, editorial score calculation, minimum confidence, source links, and opportunity-to-signal-to-Moment tracing.
3. Move `asOf` outside the window; confirm the candidate disappears without mutating graph records.
4. Test unknown date, year precision, candidate association, missing timestamp/source, and conflicting reviewed dates; confirm incomplete/empty states rather than invented signals.
5. If a reviewed milestone assertion exists, inspect its career scope and threshold evidence; confirm a candidate appears only inside the recency window.
6. Verify unauthorized users cannot access the Lab; the caller owns authorization. Confirm all cohort, claim, onboarding, GTM, and public Locker behavior stays unchanged.

No live Signal write, schema change, external request, claim mutation, or outreach was performed by this workstream. Persistence/review UI, other rules, historical snapshots, scheduled detection, and live known-athlete fixture verification are deferred.

## Product direction check

The implementation strengthens existing athlete-to-Moment and Moment-to-source evidence relationships through traceable derived intelligence. Opportunities explicitly preserve Moment and Signal links. It does not introduce Value Graph earnings or entitlements. Career anniversaries remain useful after an athlete leaves an organization. No mature media management or third-party publishing workflow was duplicated; no generalized media management scope was introduced.
