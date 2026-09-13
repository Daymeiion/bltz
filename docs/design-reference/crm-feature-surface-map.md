# BLTZ Organization CRM Feature Surface Map

Status: design direction approved; implementation remains phase-gated.

This document records where the currently planned CRM capabilities belong in the
approved spacious, folder-style interface. It is a navigation and product-contract
reference, not authorization to skip the sequence in `docs/BLTZ_BUILD_ORDER.md`.

## Design references

- `crm-overview-approved-direction.png` — overview hierarchy and shared shell
- `crm-player-roster-direction.png` — roster and player master-detail direction
- `crm-player-intelligence-direction.png` — social sources, explainable scores, and recommendations
- `crm-media-list-direction.png` — media search, filters, list browsing, and selected-asset actions
- `crm-reports-exports-direction.png` — report library and server-generated PDF exports
- `crm-invoices-direction.png` — invoice detail, audit history, and server-generated invoice PDFs

The images contain fictional preview data. They define hierarchy and interaction
intent, not production data contracts or permission behavior.

## Progressive disclosure

The overview is an operational briefing, not a complete database view. It may show
the highest-priority task, recommendation, performance trend, and responsible team,
then link to the focused workspace below.

| Workspace | Primary responsibility | Included capabilities | Current build dependency |
| --- | --- | --- | --- |
| Overview | What needs attention now | Assigned work, prioritized recommendations, selected trends, ownership by department | Phase 3 shell first; live metrics arrive with their owning phases |
| Players | Who the organization manages | Roster, player record, Locker state, social-source inventory, digital-presence history, player recommendations | Phase 4 roster; verified-source and scoring contracts required before live intelligence |
| Media | What content the organization controls | Server-side search, paginated gallery/list views, athlete associations, event/team/season context, status and selected-asset actions | Phase 5 Media Graph |
| Agreements | What has been agreed and billed | Agreements, documents, invoices, payment status, invoice PDF versions | Financial/invoice contract must be approved before implementation; automated invoicing is deferred in the current CRM PRD |
| Attribution | How measurable value is connected | Asset, athlete, campaign, partner, and stakeholder attribution with measured facts separated from estimates | Phases 6, 10, 11, and 12 |
| Reports | What can be shared and audited | Organization/team/athlete/asset reports, scheduled reports, export history, secure PDF downloads | Phase 10 reporting shell; authoritative analytics in Phase 11 |
| Messages and notes | How staff coordinate | Threads, internal notes, assignments, attachments, and activity context | Implement with the workflow that owns each conversation; private-by-default |

Future navigation entries may be visible during the shell phase only when clearly
marked unavailable. A preview must not imply that its backing workflow already exists.

## Player social and digital-presence contract

The player intelligence screen must distinguish four layers:

1. Verified identity and official sources.
2. Measured observations captured at a specific scan time.
3. Versioned score calculations derived from those observations.
4. BLTZ recommendations or other modeled interpretation.

Required presentation rules:

- Every score shows its scale, methodology version, scan date, and confidence or coverage.
- Every percentage identifies its denominator and time window.
- Social profiles show verification state and last verification date.
- Recommendations link to evidence, expected impact, confidence, and an accountable owner.
- Recommendations can be assigned, dismissed, and reviewed without changing measured evidence.
- Missing sources are shown as missing or unverified; the UI must not invent handles, follower counts, reach, revenue, or visibility claims.
- Historical charts use stored, reproducible snapshots rather than recomputing old scores with a new formula.

Until verified-source, completeness, score-version, and scan-history contracts exist,
the production state is `Not scanned`; numerical values remain preview-only.

## Media search and list contract

- Search and filters execute server-side within the active organization context.
- Results are paginated or cursor-based; the browser does not load the raw media corpus.
- Gallery and list are two presentations of the same authorized result contract.
- Search covers approved fields such as title, athlete, event, source, team, season, and media type.
- Rights and publication status are returned as safe summary fields; private rights terms remain in authorized detail views.
- Selecting a result does not grant permission to mutate it. Association, rights review, publication, and archive actions require independent server authorization.
- Phase 5 uses the Media Graph and must not extend legacy `media` or `videos` into the new model.

## PDF reports

PDF reports are server-generated documents, not client-side screenshots. Each export
records:

- report type and scope;
- organization, team, athlete, media asset, or campaign identifiers as applicable;
- selected season/date range and timezone;
- included sections and metric definitions;
- data snapshot timestamp;
- score/methodology versions where applicable;
- creator, version, immutable reference ID, and audit event;
- generation status, storage locator, retention state, and access policy.

Private exports use protected storage and short-lived signed downloads. A download
must re-check authorization. Reports visibly separate measured data, modeled
estimates, and BLTZ recommendations.

## Invoice PDFs

Invoice PDFs live in `Agreements -> Invoices`, while Reports may link to that
workspace. The PDF is rendered server-side from an authoritative, versioned invoice
record. The browser may submit intent and permitted edits, but it does not supply the
trusted total, payment state, organization identity, or final PDF content.

An invoice PDF version records its invoice ID, agreement or campaign references,
line items, currency, totals, snapshot timestamp, generator, version, immutable
reference ID, audit event, and protected file location. Payment state and attributed
revenue are separate concepts.

The current CRM PRD explicitly defers automated invoicing. Implementing the invoice
workspace therefore requires a future approved financial schema and build-order
update; this visual reference preserves the intended product surface without pulling
that work into Phase 3.

## Shared interaction and accessibility rules

- Use large rounded workspaces, folder-style tabs, and 28–40px separation between major sections.
- Prefer one primary decision per card and no more than a few prioritized items on the overview.
- Use charts and diagrams only when they communicate a relationship more clearly than a row or sentence.
- Keep status text in addition to color, visible keyboard focus, semantic headings, labelled controls, and responsive alternatives for wide lists.
- Preserve empty, loading, denied, error, generating, ready, and expired-download states.
- Organization color themes may alter approved accent tokens but must retain contrast and semantic status colors.
- Motion is brief, optional, and reduced-motion safe; it must not delay operational work.

## Implementation order

1. Finish the reusable Phase 3 shell and overview hierarchy using empty or explicitly labelled preview states.
2. Build roster and player records in Phase 4; do not expose a live presence score yet.
3. Implement Media Graph search/list/detail against Phase 5 contracts.
4. Add rights and clearance summaries only after Phase 6 authorization and permission resolution exist.
5. Add campaign reporting shell in Phase 10 and authoritative analytics/report exports in Phase 11.
6. Add revenue and financial review in Phase 12; schedule invoices and invoice PDFs only after the financial contract is approved.
7. Insert an explicit, approved Digital Presence workstream into the authoritative build order before implementing scans, scoring, or recommendations. The archived master plan is useful background but is not current execution authority.

## Acceptance gates for later implementation

- No preview fixture is presented as live organization data.
- No client-provided identity, total, score, source, or privileged status is trusted.
- Every query and export is organization-scoped and role-authorized server-side.
- Scores and recommendations are explainable and reproducible from stored evidence.
- Percentages name their denominator and time window.
- Media results are searchable and paginated without exposing the raw corpus.
- PDF generation, storage, access, versioning, and audit behavior have tests.
- Empty, loading, denied, error, partial-data, generation, and expired-link states are verified.
