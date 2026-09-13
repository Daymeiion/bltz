# GTM Prompt 6 P1 Remediation

**Date:** 2026-08-28

**Branch:** `codex/gtm-player-promotion`

**Production data status:** No LinkedIn rows imported by this change

## Outcome

The six P1 findings in the live-data QA hold now have local implementation coverage:

1. LinkedIn rows are deterministically classified before preview, with source, confidence, status, reasons, and multi-role personas.
2. Player matching runs for every importable contact rather than only rows pre-labeled as athletes.
3. Candidate lookup uses the complete canonical `nfl_players` Player Master and stable GSIS identifiers. A canonical `players` UUID is linked only when it already exists.
4. Founder-entered non-empty identity, context, and scoring fields are locked against lower-precedence imports. Empty fields remain eligible for enrichment.
5. Eligible enterprise records receive the existing weighted 0–100 score with stored factors, inferred inputs, and reasons. Athlete scoring remains out of scope.
6. Contacts exposes classification, identity-review, strategic-network, enterprise, multiplier, and requested Top 50/25/20 review queues.

The pre-landing audit also corrected three release defects:

- Explicit existing contact types, including `investor`, are preserved while Prompt 6 automatic investor signals remain primary type `multiplier` with an Investor persona.
- Duplicate/skipped rows no longer require repeated ambiguous Player-match decisions.
- Player-name candidate lookup normalizes punctuation and spacing instead of relying on exact case-insensitive text.

## Database deployment order

Apply migrations in this order before deploying the matching application build:

1. `20260828215242_promote_player_prospects_to_gtm_contacts.sql`
2. `20260828233000_close_gtm_prompt6_p1_gaps.sql`

The second migration is additive. Existing contacts backfill to explicit `unclassified` classification and `clear` identity-review state. It creates no contacts or Players.

Recovery requires returning the application to the V1 import function before removing the V2 functions. Preserve classification and score explanations if a forward fix or rollback is needed for audit continuity.

## Verification

- TypeScript: passed
- Focused Prompt 6 classification, matching, migration, import-contract, and Contacts tests: passed
- Full Vitest suite: 59 test files passed, 2 skipped; 395 tests passed, 24 skipped
- Next.js 16 production build with Webpack: passed across all routes, including GTM overview, Contacts, Imports, and Players
- PostgreSQL migration chain: parsed successfully inside a transaction and rolled back; no production schema or data changes were retained

## Live-data gate

The supplied LinkedIn CSV remains uncommitted. After the migrations and application are released together, an authenticated administrator must preview the real file, review ambiguous matches, approve the import, repeat the same file to verify duplicate control, then verify metrics and RBAC. No outreach or sequencing is part of this task.
