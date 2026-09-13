# GTM Prompt 6 Live Data Pass — QA Report

**Date:** 2026-08-28  
**Environment:** BLTZ production Supabase (`drxtzxnwdtgxwueiqygf`) plus local corrected release preview  
**Recommendation:** **FAIL / HOLD LIVE COMMIT** until the P1 findings below are resolved

## Executive result

The Player Master remains intact at **24,740 canonical `nfl_players` records**. The supplied LinkedIn export is readable and within the corrected import limits, but it has **not** been committed to GTM. Production currently contains **0 GTM contacts**, **0 Contact-to-Player links**, and **0 import jobs**.

The file contains **6,378 parsed rows**: **6,100 valid named connections**, **278 invalid rows without contact identity**, **0 repeated normalized LinkedIn URLs**, and **103 populated email addresses**. Its SHA-256 is `b3020ed186433bc21e3d175d5d812065eddd467f3889b81e5ccb3730416c5961`.

The Foundation V1 parser, preview ledger, URL/email/source deduplication, idempotency protection, manual ambiguous-match review, and internal-data RLS are present. Prompt 6 cannot yet be executed safely as specified because classification, field precedence, Player Master matching, automatic score explanation, review queues, and strategic cohorts are not implemented in the production schema/import path.

## Evidence

| Check | Result |
|---|---|
| Canonical Player Master count | Pass — 24,740 |
| GTM contacts before import | Pass — 0; no prior live import to repeat |
| GTM import ledger | Pass — empty |
| CSV size and limit | Pass — 752,277 bytes; corrected release accepts 2 MB / 10,000 rows |
| CSV parse | Pass — 6,100 valid, 278 invalid, 0 in-file duplicates |
| Anonymous GTM access | Pass — contacts and notes return no count/data under RLS |
| GTM unit suite | Pass — 44 tests across parser, matching, scoring, and workflows |
| Corrected local preview | Pass — running on `localhost:3100`; authorized sign-in is required |
| Live import commit | Not run — held to prevent knowingly incomplete classification/matching |

## Findings

### P0 — Blocking

None found in the already-deployed GTM Foundation V1 controls.

### P1 — Must fix before live Prompt 6 commit

1. **Automatic classification does not exist.** Production has no `classification_source`, `classification_confidence`, or `classification_status` fields, deterministic rules, or manual lock. Every row in this LinkedIn export therefore enters as `unclassified`.
2. **Player matching is gated by pre-classification.** The importer only searches Players for rows already labeled `athlete`, while the LinkedIn export has no contact-type column. As written, the real file would produce zero Player-match reviews even when connections are present in Player Master.
3. **Player Master identity linkage is not deployed.** The additive `player_master_gsis_id` promotion migration exists on `codex/gtm-player-promotion` but the production column is absent. The current importer searches `public.players`, not the full 24,740-record `nfl_players` universe required by Prompt 6.
4. **LinkedIn updates can overwrite founder-entered identity/context fields.** The current import update path replaces display name, first/last name, company, and title whenever the CSV provides them. There is no field-level provenance or manual-verification lock enforcing Prompt 6 precedence.
5. **Automatic priority recalculation is incomplete.** Enterprise scoring exists and is database-maintained only when all five 0–5 factors are supplied, but the live import derives none of those factors and stores no score-change explanation.
6. **Prompt 6 review queues and strategic cohorts are absent.** There are no focused views for needs-classification, strategic Player network, enterprise decision makers, multipliers, high priority, ambiguous identity, or the requested Top 50/25/20 cohorts.

### P2 — Should fix

1. The invalid-row preview returns only the first 20 issues. The aggregate count is correct, but reviewing why all 278 rows were excluded requires better summarized reasons or exportable diagnostics.
2. Founder-network metrics cannot distinguish auto-classified from manually verified records until classification provenance is added.

### P3 — Future enhancement

1. Organization-type analytics and richer persona/tag aggregation can remain straightforward deterministic aggregations; AI classification is not required.
2. Outreach, messaging, and sequencing remain correctly out of scope.

## Required safe continuation

1. Deploy the additive Player Master contact-reference migration.
2. Add deterministic classification with provenance, confidence, review status, and a manual lock.
3. Classify before Player matching; match against stable Player Master identity and require review for ambiguity.
4. Enforce field precedence so imports enrich rather than overwrite verified founder data.
5. Add explainable scoring inputs and the focused Prompt 6 queues/cohorts.
6. Re-run preview with the real file, review ambiguous matches, then commit once through an authenticated Admin session.
7. Repeat the same file to prove idempotency, verify counts/metrics, and run end-to-end UI/RBAC regression.

No synthetic contacts were created and no outreach was initiated.
