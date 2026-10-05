# Source review before canonical Moment promotion

Implementation update: the service-only audited review RPC and validated promotion CLI now exist and have promoted/replayed approved public sources and selected Sportradar game observations for the existing Keith Rivers Career ID. See [graph deployment record](graph-deployment-2026-09-30.md). The contract below remains the evidence acceptance checklist; its original future-writer statements describe the earlier planning snapshot.

This is the review contract for the next real-data experiment, prepared during the provider cooldown. It does not implement a writer, grant new privileges, or promote records. Use existing ingestion/graph contracts; do not add provider columns to canonical entities.

| Review step | Required evidence | Hold or reject when |
| --- | --- | --- |
| Retain observation | Provider, sport, league, identifier namespace, external ID, safe feed locator, fetched-at, normalizer version, immutable raw observation | Credentials or authenticated URLs are present; returned identity differs from request; observation cannot be reproduced |
| Resolve athlete | Existing canonical `players.id`, unique verified mapping, match method and confidence; contextual fields retain JSON Pointers | Names alone match; mappings conflict; more than one canonical athlete is plausible |
| Resolve career context | Source-backed team and season references, temporal boundaries as supplied | Provider team ID is treated as a BLTZ team UUID; team affiliation implies participation in every game |
| Establish occurrence | Exact event date or explicitly year-only/unknown precision, source statement and structured occurrence data | Scheduled date implies proof the event occurred; season/award year becomes an invented day |
| Establish athlete relationship | Explicit featured/participant/contributor relationship supported by the source; confidence and review status | Visual appearance implies sports contribution, rights ownership, or economic participation |
| Establish performance | Metric, value, unit, game/season phase and coverage context, source pointer | Missing statistics become zero; incomplete totals imply a record or first threshold crossing |
| Promote evidence | Canonical Moment and athlete association, source/ingestion linkage, human-readable assertion; relevant facts reviewed together | Source metadata is unavailable; date/athlete claims disagree; unresolved candidate is marked verified |
| Evaluate intelligence | Complete reviewed graph; exact-date occurrence for anniversaries; explicit reviewed milestone threshold | Evidence is future-dated, ambiguous, incomplete, truncated or only year-level |
| Review Opportunity | Originating Moment and Signals, score meaning, explanation, verified media and missing assets | Metadata implies cleared use; editorial priority becomes earnings or certainty |

The Lab is read-only. A future authorized writer must verify platform permissions, validate the entire promotion transaction, retain rejected/ambiguous observations, and record the reviewer and audit outcome. These are acceptance requirements for that writer, not a claim that it exists now.

First real-data sample: the already mapped Keith Rivers Career ID. A profile/season snapshot can create review context, but cannot by itself prove an exact-date significant game. After cooldown/quota checks, use one bounded schedule and one athlete-confirmed game response; preserve untested capabilities as untested. No cohort/onboarding write is part of this review.
