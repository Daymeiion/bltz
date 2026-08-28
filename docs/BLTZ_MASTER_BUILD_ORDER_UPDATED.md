# BLTZ Master Build Order

> **Historical planning artifact.** This file is not the authoritative implementation sequence.
>
> Use `docs/BLTZ_BUILD_ORDER.md` for current phase status, numbering, and priority. Use `docs/media/MEDIA-GRAPH-ROADMAP.md` for Media Graph architecture.
>
> Phase numbers in this document do not match the live sequence. In particular, this file’s Phase 5 and Phase 6 describe Digital Intelligence work. The authoritative Phase 5 is **BLTZ Media Graph** and Phase 6 is **Media Rights, Attribution & Clearance Engine**. The Current Priority section below is frozen as of this historical plan.

## Purpose

This file preserves an earlier implementation order, parallel-agent operating model, integration sequence, and release-gate proposal for historical context.

Do not use the instructions below as current execution authority. Current work follows `docs/BLTZ_BUILD_ORDER.md`.

BLTZ is now being developed as three connected product layers:

1. **BLTZ Locker** — the public athlete identity, career, media, and legacy experience.
2. **BLTZ Intelligence** — athlete digital-presence discovery, verification, scoring, recommendations, and historical tracking.
3. **BLTZ Organization** — roster intelligence, media infrastructure, permissions, reports, and university/team workflows.

The Player Locker remains the immediate release priority. The Intelligence and Organization layers must be added without destabilizing the nearly complete athlete-facing product.

---

# Product Direction

## Core Platform Thesis

BLTZ is not being built as another NIL marketplace, sponsorship CRM, or generic athletic-department CRM.

BLTZ is the athlete identity, media, and digital-intelligence infrastructure layer for sports.

The platform should eventually allow athletes and organizations to:

- Establish a canonical, verified athlete identity.
- Organize career history, accomplishments, media, and relationships.
- Measure athlete digital presence and discoverability.
- Identify missing, outdated, duplicated, or fragmented athlete information.
- Maintain public Digital Lockers.
- Organize and publish athlete-associated media.
- Track rights, provenance, approvals, and publication eligibility.
- View roster-level intelligence and media readiness.
- Generate reports for teams, universities, conferences, agencies, and media partners.
- Connect other systems through APIs and integrations.

## Product Build Sequence

```text
Stable Repository
    ↓
Completed Player Locker
    ↓
Canonical Athlete Identity
    ↓
Athlete Beta and Feedback
    ↓
Digital Intelligence MVP
    ↓
Athlete Case Studies
    ↓
Organization Dashboard
    ↓
Media Infrastructure
    ↓
Rights and Publishing
    ↓
University Design Partner
    ↓
Enterprise Hardening
    ↓
Commercial Organization Platform
```

---

# Multi-Agent Development Model

## Coordinator Task

One main Codex task acts as the technical lead and integration coordinator.

The Coordinator must:

- Define the current production cycle.
- Assign exact scope to each agent.
- Identify dependencies before work begins.
- Define contracts between database, queries, services, and UI.
- Prevent overlapping ownership.
- Review every completion report.
- Inspect changed files before merging.
- Merge branches in the required order.
- Resolve schema, generated-type, and shared-contract drift.
- Run final end-to-end verification.
- Update this build-order file and relevant project documentation.
- Stop or re-scope agents that begin unrelated work.
- Document blockers rather than allowing speculative rewrites.

The Coordinator should not perform a large feature implementation while also supervising three or four active agents unless the implementation is a small integration task.

## Maximum Parallelism

Run no more than **3–4 agents simultaneously**.

The normal operating model is:

1. **Database/Foundation Agent**
2. **Feature Agent**
3. **Public UI Agent**
4. **QA/Review Agent**

Not every cycle requires all four agents. Use only the agents whose work is truly independent.

---

# Agent Responsibilities

## Agent 1 — Database/Foundation

Owns:

- Supabase migrations
- Database functions and triggers
- Generated database types
- Canonical data models
- Server-side queries
- Organization and platform roles
- Row-Level Security policies
- Authentication contracts
- Permissions
- Audit foundations
- Storage policies
- Shared service interfaces that depend directly on the schema

Rules:

- Only this agent may create or modify migrations during a parallel cycle.
- Schema changes must be documented before implementation.
- Generated types must be refreshed immediately after migrations.
- Query contracts must be delivered before dependent UI is merged.
- This agent must not redesign unrelated public UI.

Required completion report:

- Migrations added or changed
- Tables, columns, indexes, functions, and policies changed
- Generated types changed
- Query or service contracts added
- Backfill requirements
- Rollback notes
- Tests run
- Known blockers

## Agent 2 — Feature

Owns one complete workflow per cycle, such as:

- Authentication and role cleanup
- Organization membership
- Roster management
- Athlete record management
- Locker claim workflow
- Digital Presence scan workflow
- Intelligence report generation
- Media association workflow
- Rights approval workflow
- Locker publishing
- Organization reporting

Rules:

- Build against approved contracts.
- Do not create migrations unless explicitly reassigned as the Database Agent.
- Do not silently modify authorization rules.
- Keep the workflow vertically complete within the assigned scope.
- Reuse existing components before introducing new abstractions.

## Agent 3 — Public UI

Owns public-facing and responsive experiences that do not require independent schema changes:

- Marketing landing page
- Player Locker
- Film Room
- Photos
- Career timeline
- Awards and achievements
- Public media states
- Public SEO metadata
- Share and claim calls to action
- Responsive layouts
- Loading, empty, and error states
- Accessibility improvements
- Design-system consistency

Rules:

- Must not create migrations.
- Must not change canonical database contracts without Coordinator approval.
- May use mocks or existing contracts while foundation work is underway.
- Must isolate styling and presentation work from organization authorization logic.
- Must preserve working public routes.

## Agent 4 — QA/Review

Owns independent review and verification:

- Type checking
- Linting
- Unit and integration tests
- Route verification
- Permission checks
- RLS checks
- Responsive-layout review
- Accessibility review
- Regression review
- Generated-type drift
- Dead code and placeholder detection
- Cross-agent contract review
- Final-cycle defect report

Rules:

- Does not redesign features during review.
- May submit focused fixes when the Coordinator approves them.
- Must distinguish blockers from non-blocking improvements.
- Must verify authorization as different user roles.
- Must test merged integration branches, not only isolated worktrees.

---

# Parallel-Work Rules

## Good Parallel Work

These workstreams may proceed together when file ownership is clear:

- Authentication cleanup + public landing-page work
- Organization membership schema + Player Locker responsive work
- Roster backend workflow + unrelated public Film Room improvements
- Feature implementation + tests and documentation
- Organization dashboard wireframes + backend foundation
- Digital Presence scoring specification + public Locker polishing
- Intelligence report UI + independent search-collection service
- Media schema design + public media-gallery improvements
- University pilot materials + production hardening
- Case-study report generation + organization dashboard wireframes

## Work That Must Remain Sequential

```text
Migration → Generated Types → Queries / Services → Feature Logic → UI → QA
```

```text
Authentication Model → Role Authorization → Protected Layouts → Protected Pages
```

```text
Canonical Athlete Model → Identity Resolution → Digital Presence Scan → Scoring → Organization Reporting
```

```text
Media Schema → Provenance and Rights Rules → Approval Enforcement → Publishing
```

```text
Search Collection → Result Classification → Verified Source Review → Score Calculation → Recommendations
```

```text
Organization Membership → Team/Season Access → Roster Management → Organization Dashboard
```

Only the Database/Foundation Agent may create migrations during an active parallel cycle.

---

# Branch and Worktree Rules

Use one worktree per independent agent.

Recommended branch naming:

```text
codex/integration-<cycle>
codex/db-<scope>
codex/feature-<scope>
codex/ui-<scope>
codex/qa-<scope>
```

Each agent must:

- Start from the same approved integration commit.
- Avoid editing files owned by another agent unless coordinated.
- Commit focused changes.
- Provide a completion report before merge.
- Avoid drive-by cleanup.
- Document any contract assumption that may change.

---

# Integration Process

After each agent finishes:

1. Review its changed files and completion report.
2. Run type checking and relevant tests on that branch.
3. Merge the Database/Foundation branch first.
4. Regenerate and verify database types.
5. Update remaining worktrees from the integration branch.
6. Resolve query and generated-type changes before merging features.
7. Merge the Feature branch.
8. Merge the Public UI branch.
9. Run the QA/Review Agent against the combined integration branch.
10. Fix blockers through focused follow-up tasks.
11. Run final end-to-end verification.
12. Update documentation and phase status.
13. Create a stable integration checkpoint.

No branch should be merged solely because an agent reports completion.

---

# Required Task Contract

Every agent task must state:

- Relevant phase and PRD section
- Objective
- Included scope
- Excluded scope
- Files or directories likely to be owned
- Dependencies
- Contracts consumed
- Whether migrations are allowed
- Acceptance criteria
- Required tests
- Completion-report format

Every task must begin by inspecting existing code.

Every task must end with:

- Changed files
- Database changes
- Tests and commands run
- Manual verification
- Known limitations
- Deferred work
- Merge risks

---

# Phase 0 — Repository Audit and Stable Baseline

- Confirm the app runs locally and the current deployment works.
- Map routes, authentication, Supabase clients, schema, migrations, generated types, storage, components, tests, environment-variable names, and deployment configuration.
- Review the existing Player Locker and identify incomplete, broken, duplicated, placeholder, and unsecured functionality.
- Create a stable Git checkpoint.
- Deliver `docs/current-system-audit.md`.

Exit criteria:

- Application runs.
- Audit exists.
- Locker gaps are documented.
- Repository has a stable checkpoint.

Status: **Completed July 15, 2026.**

Local runtime, Supabase-backed Locker loading, tests, type checking, lint, and production build were verified. The stable checkpoint is maintained on `codex/phase-0-baseline`.

Vercel reports a successful production deployment but protects route access with SSO. Authoritative Supabase type generation also requires authenticated project access. Both external blockers are documented in `docs/current-system-audit.md`.

---

# Phase 1 — Finish and Stabilize the Existing Player Locker

## Objective

Complete the remaining public Locker work without introducing enterprise scope into the public experience.

## Review and Complete

- Public Locker route and athlete identity
- Hero media
- Career statistics
- Awards and achievements
- Highlights and game footage
- Interviews and postgame media
- Merchandise placeholders or integrations
- Teammate, alumni, school, and team relationships
- Mobile and desktop responsiveness
- Loading, empty, and error states
- SEO metadata
- Public/private visibility
- Locker claim state
- Athlete edit permissions
- Media provenance
- Supabase data loading
- Authentication and authorization boundaries
- Reusable components and design consistency
- Shareable Locker URLs
- Basic Locker analytics
- Athlete onboarding and claim calls to action
- Deferred next-Locker enhancement: claim-triggered transparent headshot processing, preserving the original and avoiding paid processing for unclaimed scraped candidates (see `docs/player-locker-gap-analysis.md`)

## Deliverables

- `docs/player-locker-gap-analysis.md`
- Completed or explicitly deferred critical Locker items
- Updated acceptance checklist
- Stable public demo route

Classify each feature as:

`complete`, `partially_complete`, `not_started`, `broken`, `blocked`, or `out_of_scope`.

## Exit Criteria

- Public Locker loads real data.
- Desktop and mobile layouts are usable.
- Eligible media renders.
- Private data is protected.
- Required states exist.
- Critical accessibility defects are resolved.
- Type checking, tests, lint, and production build pass.
- The Locker is ready for controlled athlete feedback.

## Recommended Parallel Cycle

- **Agent 1:** Authentication and role cleanup
- **Agent 2:** Locker claim and athlete edit-permission workflow
- **Agent 3:** Public Locker, Film Room, Photos, and landing-page completion
- **Agent 4:** Repository QA, TypeScript drift, route tests, and responsive review

Dependencies:

- Agent 2 must consume Agent 1’s approved auth contracts.
- Agent 3 must not change schema.
- Agent 4 reviews the merged integration branch.

---

# Phase 2 — Canonical Athlete and Platform Foundation

## Objective

Create the shared identity and organization foundation that supports both public Lockers and future enterprise products.

## Scope

- Users and profiles
- Canonical athletes
- Athlete aliases
- Athlete-team-season relationships
- Organizations
- Organization memberships
- Teams and seasons
- Organization roles and platform roles
- Locker-to-athlete canonical relationship
- Verified-source records
- Social-profile records
- Public/private field boundaries
- Protected route layouts
- Organization switcher foundation
- Server-side authorization
- RLS review
- Audit-log foundation

## Exit Criteria

- One canonical athlete identity can support a public Locker and organization membership.
- Roles and permissions are enforced server-side.
- Generated types are current.
- RLS policies are tested.
- Public Locker behavior remains stable.
- Organization and athlete relationships are documented.

## Recommended Parallel Cycle

- **Agent 1:** Canonical athlete, organization, membership, role, and RLS foundation
- **Agent 2:** Organization membership service and protected-layout feature against approved contracts
- **Agent 3:** Public Locker data-adapter cleanup without schema changes
- **Agent 4:** Permission matrix, RLS tests, generated-type review, and regressions

---

# Phase 3 — Athlete Beta and Feedback System

Status: **Active — V1 testing dashboard implementation completed August 11, 2026; controlled athlete testing and feedback outcomes pending.**

## Objective

Release the Locker to a controlled athlete cohort before expanding enterprise scope.

## V1 Beta Release Boundary

- The public Player Locker is the product being validated in V1.
- Each test athlete receives a unique, expiring claim link tied to the intended athlete and Locker.
- The athlete dashboard is an invite-only claim, review, correction, and preview workspace during testing. It is not a generally released V1 product surface.
- Dashboard changes remain draft or preview state until the approved publish workflow makes the corresponding Locker changes public.
- Media, Film Room management, Press, and Analytics dashboard pages are deferred until Locker feedback and observed athlete behavior justify them.
- Do not build full deferred pages merely to complete the sidebar. A deferred destination may use a small honest interest state that records an access attempt or explicit **Notify me** request, then returns the athlete to the available review workflow.
- Do not expose placeholder analytics, fabricated attribution, or incomplete rights and revenue data during the beta.
- Decide whether the full dashboard belongs in the public app release only after the controlled test cohort has been analyzed.

## Scope

- Beta-access controls
- Athlete onboarding
- Locker claim flow
- Profile-completion guidance
- Structured feedback form
- Event analytics
- Share tracking
- Athlete correction requests
- Media upload or submission request
- Testimonial and case-study consent tracking
- Admin feedback review
- Beta cohort tagging
- Deferred-feature interest events and notification requests
- Draft-versus-published Locker state validation

## Minimum Beta Dashboard

- Athlete identity and claim confirmation
- Current Locker preview
- Permitted profile, headshot, background, biography, and quote review controls
- Correction and media-submission requests
- View-live action for already published Lockers
- Structured feedback and support access
- Clear draft, saved, pending-review, and published states

Implementation status: **Complete for the V1 controlled-testing boundary.** The dashboard mockup now provides the approved responsive overview, Locker preview and view-live access, athlete identity presentation, headshot and dashboard-background controls, biography editing with optional AI polish, photo upload entry, sortable and swipeable highlight presentation, desktop-only Locker theme preview, persistent local test state, and honest deferred-page placeholders. Production persistence, claim-token enforcement, review state transitions, feedback capture, and cohort analytics remain Phase 3 integration work.

## Required Beta Signals

- Claim-link opened, validated, expired, rejected, and completed
- Locker preview viewed and live Locker opened
- Dashboard section selected
- Deferred destination selected (`media`, `film_room`, `press`, or `analytics`)
- Notify request submitted or dismissed for each deferred destination
- Field edited, correction requested, media submitted, and review completed
- Time from claim-link open to completed review

Interest signals measure demand; they must not be presented as evidence that the deferred feature exists.

## Exit Criteria

- At least 20 athlete tests.
- At least 10 actively completed Lockers.
- At least 5 useful testimonials or structured feedback records.
- Three potential case-study athletes selected.
- Product changes are prioritized from observed behavior rather than assumptions.
- Deferred dashboard pages have not been promoted into scope without cohort evidence.
- Dashboard drafts cannot accidentally publish to a public Locker.

Phase 3 remains active until the controlled cohort satisfies these outcome-based exit criteria. Completing the V1 dashboard interface does not by itself complete athlete beta validation.

---

# Phase 4 — Digital Intelligence Specification and Manual MVP

## Objective

Define and prove the Digital Presence Intelligence workflow before automating it at scale.

## Initial Workflow

```text
Enter Athlete
    → Resolve Identity
    → Gather Search Results
    → Identify Verified Sources
    → Classify Results
    → Review Missing or Conflicting Data
    → Calculate Explainable Score
    → Generate Recommendations
    → Attach Findings to Locker
```

## Inputs

- Athlete name
- School
- Sport
- Position
- Graduation year
- Known social handle
- Official roster URL
- Known aliases

## Outputs

- Verified official sources
- Search-result inventory
- Social-profile inventory
- Current and outdated pages
- Duplicate or conflicting identities
- Media coverage
- Missing achievements or biography information
- Broken links
- Brand consistency issues
- Digital Presence Score
- Confidence score
- Recommendations
- Scan date
- Review status

## Initial Score Categories

```text
Identity Accuracy           20 points
Official Source Coverage    20 points
Media Completeness          20 points
Search Discoverability      15 points
Brand Consistency           10 points
Career Completeness         10 points
Monetization Readiness       5 points
                           ─────────
Total                      100 points
```

The methodology must remain explainable and versioned.

## Deliverables

- `docs/digital-intelligence-methodology.md`
- `docs/digital-presence-score-v1.md`
- Manual scan workflow
- Internal athlete report
- Review and approval status
- Three completed sample scans

## Exit Criteria

- Three real athlete reports are credible and reproducible.
- Source attribution is visible.
- Scoring is explainable.
- Similar-name identity risks are handled.
- No unsupported visibility or revenue claims are presented.
- Manual review is clearly distinguished from automation.

---

# Phase 5 — Search Collection and Verification Engine

## Objective

Automate the collection and normalization of public athlete-presence data while preserving human verification.

## Scope

- Search-query templates
- Search-provider abstraction
- Search-result ingestion
- URL normalization
- Domain classification
- Metadata extraction
- Canonical URL handling
- Link health
- Result deduplication
- Athlete-name collision detection
- Official-domain allowlists
- Source-confidence scoring
- Crawl and API rate controls
- Scan scheduling
- Error and retry handling
- Cost tracking
- Raw-result retention policy

## Important Constraint

Free SEO and search data may be used during development, but the system must not depend on scraping practices that violate provider terms or create an unstable production dependency.

Provider-specific collection logic must be isolated behind service interfaces.

## Exit Criteria

- A scan can collect and normalize public results.
- Duplicate URLs are handled.
- Official and non-official sources are distinguished.
- Similar-name conflicts are flagged for review.
- Provider costs and failures are visible.
- Results can be reproduced from stored snapshots.
- Manual verification remains available.

---

# Phase 6 — Digital Presence Report and Historical Tracking

## Objective

Turn verified scan data into useful athlete and organization intelligence.

## Scope

- Score calculation service
- Score-version history
- Confidence calculation
- Recommendation engine
- Missing-content analysis
- Brand consistency checks
- Historical snapshots
- Before-and-after comparison
- Athlete report
- Internal analyst report
- Exportable summary
- Locker improvement recommendations
- Evidence links for every scored category

## Exit Criteria

- Every report can explain why a score was assigned.
- Score changes can be traced to source changes.
- Historical comparisons use real snapshots.
- Recommendations link to evidence.
- Reports distinguish measured facts from AI-generated interpretation.
- Three athlete case studies can be produced.

---

# Phase 7 — Athlete Case Studies and GTM Evidence

## Objective

Create measurable proof that BLTZ improves athlete identity organization, media readiness, and discoverability.

## Process

1. Capture a baseline scan.
2. Review identity conflicts and missing data.
3. Complete or improve the Locker.
4. Add verified career information.
5. Organize available media.
6. Publish approved updates.
7. Capture a follow-up scan.
8. Document measurable changes.
9. Record athlete feedback.
10. Produce a presentation-ready case study.

## Exit Criteria

- At least three case studies contain verifiable evidence.
- Claims are supported by measured data.
- Athlete permission is documented.
- Case studies are ready for university discovery meetings.

---

# Phase 8 — Organization Platform Foundation

## Objective

Create the multi-tenant organization shell for teams, universities, agencies, and future enterprise customers.

## Scope

- Organization routes
- Organization switcher
- Member access
- Team and season filters
- Dashboard shell
- Shared table, filter, status, modal, and empty-state components
- Organization settings
- Organization branding
- Invitation workflow
- Role-based navigation
- Audit visibility
- Feature flags
- Pilot-organization status

## Exit Criteria

- A user can belong to one or more organizations.
- Role-based navigation works.
- Organization data is isolated.
- The public Locker remains independent.
- Pilot features can be enabled per organization.

---

# Phase 9 — Roster and Athlete Records

## Scope

- Athlete list, search, and filters
- Athlete detail
- Team and season relationships
- Locker and claim status
- Intelligence status
- Manual creation and CSV import
- Duplicate warnings
- Locker preview
- Digital Presence summary
- Staff notes
- Priority status
- Athlete verification state

## Exit Criteria

- Authorized staff can manage a roster.
- Duplicate athletes are flagged.
- Canonical athletes are reused rather than recreated.
- Locker and Intelligence status are visible.
- Imports are validated and reversible where practical.

---

# Phase 10 — Organization Intelligence Dashboard

## Initial Metrics

- Roster size
- Verified athletes
- Complete Lockers
- Average Digital Presence Score
- Athletes missing official sources
- Athletes missing media
- Outdated athlete information
- Identity conflicts
- Recently changed records
- Highest-priority actions
- Media completeness
- Last scan status
- Recommended content opportunities

## Exit Criteria

A coach, GM, digital staff member, or athletics administrator can immediately understand:

- What is missing
- Which athletes require attention
- What media exists
- What BLTZ recommends
- What changed over time

---

# Phase 11 — Media Library and Athlete Associations

- Media library and media detail
- Upload or authorized URL workflow
- Media metadata and types
- Many-to-many athlete-media relationships
- Event, team, and season relationships
- Source and ownership fields
- Provenance
- Publication status and activity history
- Search and filtering
- Staff-approved public media
- Media completeness reporting

Exit criteria:

- Authorized users can add media.
- Media can be associated with multiple athletes.
- Provenance is recorded.
- Publication status is visible.
- Media can feed eligible Lockers.
- Organization reports can identify media gaps.

---

# Phase 12 — Rights and Approval Workflows

- Rights records and statuses
- Usage restrictions and expiration dates
- Supporting documents
- Athlete, organization, and rights-holder approvals
- Approval responses
- Publication-blocking rules
- Audit history
- Revocation
- Rights exception review

Exit criteria:

- Ineligible media cannot publish.
- Required approvals are enforced.
- Rights state is traceable.
- Expiration and revocation affect publication.
- Public Locker provenance is accurate.

---

# Phase 13 — Locker Publishing Workflow

Required end-to-end workflow:

1. Organization selects an asset.
2. Organization associates athletes.
3. Rights are recorded.
4. Required approvals are requested.
5. Athlete responds.
6. Eligible content is published.
7. Content appears in the correct Locker.
8. Provenance is displayed.
9. Content can be unpublished.
10. Audit history records every material action.

Do not begin campaigns or advanced monetization until this workflow works.

---

# Phase 14 — University Design-Partner Preparation

## Objective

Prepare BLTZ for a limited football or single-team university pilot.

## Deliverables

- University-specific demo environment
- 15–25 athlete pilot-cohort capability
- Three athlete case studies
- Organization dashboard
- Digital Presence baseline report
- Media inventory workflow
- Pilot implementation brief
- Pilot success metrics
- Data-flow diagram
- Security overview
- Privacy overview
- Accessibility status
- Data ownership statement
- Media ownership and rights boundaries
- Support plan
- Feedback schedule
- Final pilot-report template

## Initial Positioning

BLTZ should be presented as:

> The athlete identity, media, and digital-intelligence infrastructure layer that complements existing NIL, compliance, website, content, and operations platforms.

Do not position BLTZ as:

- A replacement NIL marketplace
- A sponsorship CRM
- A compliance platform
- A payment system
- A recruiting evaluation platform
- A generic Salesforce replacement

## Recommended Initial Pilot

**BLTZ Football Digital Identity and Media Intelligence Pilot**

Suggested scope:

- One sport
- 15–25 athletes
- Public and staff-approved data
- 3–8 staff users
- Baseline Digital Presence Reports
- Digital Lockers
- Media inventory
- Roster dashboard
- Final impact report

---

# Phase 15 — University Pilot

## Scope

- Pilot-organization onboarding
- Staff invitations
- Pilot athlete cohort
- Baseline scans
- Locker review
- Media inventory
- Staff corrections
- Recommendations
- Usage analytics
- Feedback sessions
- Final impact report
- Pilot retrospective
- Commercial conversion assessment

## Excluded From Initial Pilot

- Academic records
- Medical information
- Compensation data
- NIL contract execution
- NIL compliance
- Payments
- Recruiting evaluations
- Internal performance data
- Sensitive student records
- Automatic ownership claims over university media

---

# Phase 16 — BLTZ Admin Foundation

- Platform Admin roles and protected routes
- Admin navigation and dashboard
- Organization review
- User review
- Locker claim review
- Identity conflict queue
- Intelligence review queue
- Scan failure queue
- Audit viewer
- Pilot support tools

---

# Phase 17 — Rights Exceptions, Takedowns, and Trust & Safety

- Rights cases
- Temporary restrictions
- Takedown requests
- Evidence and internal notes
- Trust and safety cases
- Account and content enforcement
- Escalation workflows

---

# Phase 18 — Enterprise Hardening

- Security and RLS review
- Single sign-on readiness
- Audit-log completeness
- Upload validation and rate limiting
- Error and job monitoring
- Performance and accessibility review
- Data retention, backup, and recovery
- Vendor-security documentation
- Deployment and rollback procedures
- Tenant-isolation testing
- Incident-response plan
- Data export and deletion
- API-key management
- Cost monitoring
- Service-level objectives

---

# Phase 19 — Commercial Organization Platform

## BLTZ Team

- One roster or sport
- Athlete identity
- Digital Lockers
- Presence scoring
- Basic media inventory
- Roster dashboard
- Scheduled scans
- Reports

## BLTZ Athletics

- Multiple sports
- Organization analytics
- Expanded media management
- Staff roles
- Custom reports
- More frequent scanning
- Integrations

## BLTZ Enterprise

- Multi-organization access
- API access
- Custom integrations
- Advanced intelligence
- White labeling where appropriate
- Dedicated support
- Conference, agency, association, or media use cases

---

# Phase 20 — Campaigns

Do not begin until Locker publishing, rights enforcement, and organization identity infrastructure are stable.

- Sponsor and campaign records
- Athlete and media selection
- Deliverables and dates
- Approval and status workflows
- Publishing destinations
- Reporting shell

---

# Phase 21 — Analytics

Initial metrics:

- Qualified views
- Unique viewers
- Total watch time
- Average watch duration
- Completion and rewatch rates
- Shares and Locker visits
- Sponsor clicks and commerce conversions
- Direct revenue
- Estimated media value
- Network lift
- Digital Presence Score change
- Media completeness change
- Profile-verification change
- Staff time saved where measurable

Direct revenue and estimated media value must remain separate.

Measured metrics and modeled estimates must remain clearly labeled.

---

# Phase 22 — Revenue Attribution and Financial Review

- Revenue records and sources
- Athlete, organization, rights-holder, and BLTZ allocations
- Status workflows
- Disputes and Admin review
- Append-only adjustment history where practical
- Reconciliation
- Audit history

---

# Phase 23 — API and Integration Platform

Begin only after canonical identity, authorization, Intelligence, media, and organization contracts are stable.

- Athlete API
- Verified-source API
- Locker API
- Media API
- Intelligence API
- Organization API
- Webhooks
- API keys
- Usage limits
- Documentation
- Integration sandbox
- Partner access controls
- Versioning
- Deprecation policy

---

# Current Priority

## Active Priority

`Phase 1 — Finish and Stabilize the Existing Player Locker`

Do not pause the Locker release to build the entire Digital Intelligence or Organization platform.

## Immediate Parallel Cycle

### Coordinator

- Define auth and role contracts.
- Confirm Phase 1 acceptance criteria.
- Assign file ownership.
- Maintain integration branch.
- Review and merge all work.

### Agent 1 — Database/Foundation

**Priority:** Authentication and role cleanup

- Audit current auth model.
- Stabilize user, athlete, and platform-role contracts.
- Review public/private access boundaries.
- Update RLS and generated types if required.
- Do not begin broad organization migrations until Phase 1 contracts are stable.

### Agent 2 — Feature

**Priority:** Locker claim and athlete-edit workflow

- Complete claim state.
- Complete athlete edit permissions.
- Use Agent 1 auth contracts.
- Do not redesign organization membership yet.
- Add focused tests.

### Agent 3 — Public UI

**Priority:** Public Locker and marketing demo

- Finish responsive Locker UI.
- Finish landing page.
- Finish Film Room and Photos states.
- Resolve loading, empty, and error states.
- Improve public SEO metadata.
- Do not change schema.

### Agent 4 — QA/Review

**Priority:** Repository quality and regression control

- TypeScript drift
- Type checking
- Lint
- Tests
- Route coverage
- Permission checks
- Responsive layouts
- Placeholder and broken-feature review
- Final merged-cycle verification

## Next Cycle After Phase 1

`Phase 2 — Canonical Athlete and Platform Foundation`

The organization membership schema may be planned during Phase 1, but migrations should wait until authentication, user, athlete, and role contracts are stable.

---

# Task Execution Rules

For every task:

1. Reference the relevant phase and PRD section.
2. State included and excluded scope.
3. Inspect existing code first.
4. Reuse existing components.
5. Identify migrations before coding.
6. Do not edit unrelated files.
7. Only the assigned Database/Foundation Agent may create migrations.
8. Run lint, type checks, tests, and build validation where available.
9. Report changed files, database changes, tests, limitations, and manual verification steps.
10. Do not claim completion when acceptance criteria are unmet.
11. Document blockers instead of bypassing architecture.
12. Preserve public Locker functionality during platform expansion.
13. Do not make unsupported SEO, visibility, NIL, revenue, or valuation claims.
14. Keep measured data, modeled estimates, and AI recommendations clearly separated.
15. Maintain source attribution and provenance for public athlete information.
16. Protect sensitive and private athlete or organization data.
17. Prefer a narrow working vertical slice over broad unfinished scaffolding.
18. Merge foundation changes before dependent features.
19. Run final end-to-end verification after each parallel cycle.
20. Create a stable checkpoint after every accepted phase.

---

# Definition of a Successful Near-Term Release

The next major release is successful when:

- The public Player Locker is stable and ready for athlete testing.
- Athletes can claim, review, correct, and share their Locker.
- BLTZ has a canonical athlete identity foundation.
- Feedback and beta analytics are captured.
- Three athlete case-study candidates are active.
- The first explainable Digital Presence report can be produced.
- No enterprise expansion has destabilized the player experience.

The near-term objective is not to finish the entire infrastructure platform.

It is to prove this connected value chain:

```text
Verified Athlete Identity
    → Digital Locker
    → Digital Presence Analysis
    → Actionable Improvements
    → Roster-Level Intelligence
    → University Pilot
```
