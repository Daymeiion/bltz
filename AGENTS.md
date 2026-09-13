# AGENTS.md

> **PRODUCT AUTHORITY**
>
> `docs/product/BLTZ_PRODUCT_DOCTRINE.md` is the authoritative source for BLTZ product direction.
> If an older PRD, implementation plan, issue, task, wireframe, or legacy feature conflicts with the Product Doctrine, agents must flag the conflict and follow the Product Doctrine unless an explicit product decision overrides it.
>
> Product strategy hierarchy:
>
> `BLTZ_PRODUCT_DOCTRINE.md` → current PRD → build plan → agent task

## Project Overview

BLTZ is building a persistent **Athlete Career Identity Network** that connects fragmented athlete history, organizations, teams, seasons, moments, media, contributors, rights, activations, attribution, and economic value.

BLTZ is not primarily:

- A generic NIL marketplace
- A traditional athlete social network
- A simple video-hosting product
- A white-glove marketing agency
- An AI wrapper
- A generic CRM
- A full digital asset management replacement
- A social publishing suite
- A Greenfly-style real-time media orchestration platform

BLTZ uses AI as enabling technology, not as the core product.

The platform includes four connected surfaces:

1. Public Player Lockers
2. Athlete dashboards
3. Organization Console
4. BLTZ internal administration

The Player Locker is the public interface to the Athlete Career Graph.

The Athlete Dashboard lets athletes claim, verify, enrich, review, and manage the parts of that persistent identity they are permitted to control.

The Organization Console is the organization-facing operating layer for understanding and managing long-term relationships with current athletes, former athletes, alumni, career records, moments, connected media, rights, attribution, and activations.

The BLTZ Admin platform is the governance, trust, identity, rights, financial-exception, and platform-operations layer.

The Locker is not the underlying product. The Career Graph is the product. The Locker is how athletes, fans, brands, media, and organizations experience it.

## Core Product Thesis

Sports organizations, leagues, athletes, photographers, rights holders, media companies, and archives possess valuable career content and historical relationships that are fragmented across broadcasts, archives, social platforms, school websites, personal devices, Hudl, interviews, legacy media libraries, DAMs, and cloud storage.

Existing sports-media platforms already solve significant portions of real-time capture, organization, tagging, athlete delivery, galleries, UGC, and social distribution.

BLTZ should learn from and integrate with those systems where appropriate rather than rebuilding mature commodity workflows.

BLTZ differentiation is **persistence, identity, relationships, history, attribution, and long-term economic usefulness**.

The platform is built around three connected graphs:

1. **Athlete Career Graph**
   - Athlete
   - Organizations
   - Teams
   - Seasons
   - Achievements
   - Games
   - Moments
   - Media
   - Teammates
   - Creators
   - Rights
   - Brands
   - Revenue relationships

2. **Moment Contribution Graph**
   - Moment
   - Featured athlete
   - Contributing athletes
   - Team
   - Opponent
   - Event
   - Creator
   - Media assets
   - Rights holders
   - Campaigns
   - Distribution
   - Attribution
   - Economic participation

3. **Athlete Value Graph**
   - Asset / Moment
   - Usage
   - Campaign
   - Transaction
   - Rights
   - Attribution
   - Allocation
   - Earnings
   - Payout

The desired long-term product loop is:

1. BLTZ establishes or imports an Athlete Career ID.
2. Career history, organizations, teams, seasons, and achievements attach to that identity.
3. Important sports Moments are connected to the career.
4. Media assets are connected to the Moments and athlete identities they document.
5. Contributors, creators, organizations, and rights holders are associated without conflating appearance, contribution, ownership, or economic participation.
6. The public Player Locker exposes permitted portions of the athlete's persistent career identity.
7. Athletes claim, verify, correct, enrich, and share their Lockers.
8. Athlete-to-athlete, archive, and organization connections increase graph density.
9. Organizations activate current and former athletes through verified career relationships and connected media.
10. Usage, attribution, and economic activity are recorded against the graph.
11. Contractually defined value can be allocated and paid through approved payment infrastructure.

A team relationship may last one season.

**An athlete identity can last a lifetime.**

Permanent strategic reminders:

- Greenfly follows the workflow. BLTZ follows the athlete.
- Other platforms move today's media. BLTZ connects media to permanent athlete identity.
- Media is not the moat. The relationships surrounding the media are the moat.
- Sports history belongs to more than the star visible in the photograph.
- Optimize for graph density, accuracy, persistence, and economic usefulness — not file volume.

## Repository Goals

The repository should support one connected platform with shared authentication, shared data, shared permissions, and shared design foundations.

Preferred route structure:

```text
/
├── locker/[athleteSlug]       Public Player Locker
├── athlete/                   Athlete dashboard
├── organization/              School/team CRM
└── admin/                     BLTZ internal admin
```

Do not create disconnected applications or duplicate backends unless explicitly approved.

## Technology Stack

Preserve the existing project stack unless a documented architectural change is approved.

Expected stack:

- Next.js
- TypeScript
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage or approved object storage
- Vercel
- Existing package manager and repository conventions

Before structural changes, inspect and document the framework version, routing model, authentication, Supabase clients, generated database types, migrations, components, deployment configuration, environment variables, and tests.

## Development Principles

### Preserve working code

Do not replace working architecture merely because another approach appears cleaner.

Prefer incremental changes, reusable components, small feature branches, version-controlled migrations, and backward-compatible changes.

Avoid full rewrites without approval, duplicate Supabase clients, duplicate components, parallel data models, and production shortcuts that weaken security.

### Build one workflow at a time

Do not attempt to build the entire CRM or Admin platform in one task.

Each task should define scope, exclusions, routes, schema changes, permissions, acceptance criteria, and manual verification steps.

### Product behavior before polish

The PRD controls product behavior. Wireframes and reference images control layout intent. Existing design tokens and components control implementation consistency.

When these conflict:

1. Security, privacy, legal, and permission requirements take priority.
2. `docs/product/BLTZ_PRODUCT_DOCTRINE.md` controls product direction.
3. Current PRD-defined behavior controls workflow implementation.
4. Existing reusable patterns take priority.
5. Wireframes guide hierarchy.
6. Visual polish comes last.

If a current PRD conflicts with the Product Doctrine, do not silently follow the older PRD. Flag the conflict and avoid expanding the conflicting feature.

## Wireframe-First Workflow

Full Figma designs are not required for every page.

Create a low-cost wireframe before building a complex screen when page hierarchy, primary action, table columns, content grouping, modal behavior, mobile behavior, navigation, empty states, approval steps, or analytics hierarchy are unclear.

Wireframes may be hand sketches, screenshots with annotations, grayscale Figma frames, Markdown diagrams, or static HTML mockups.

Store approved references in:

```text
/docs/design-reference/
```

Suggested files:

```text
crm-dashboard-wireframe.png
crm-media-library-wireframe.png
crm-athlete-detail-wireframe.png
admin-rights-queue-wireframe.png
admin-organization-review-wireframe.png
```

Each wireframe should include:

```markdown
# Page intent
Primary user:
Primary action:
Secondary actions:
Critical information:
Mobile priority:
Known exclusions:
```

Do not spend tokens generating detailed visual design before the workflow is understood.

## Product Boundaries

### Player Locker

The Locker is public-facing, athlete-centered, and persistent across teams, organizations, leagues, and retirement.

It is the public interface to the Athlete Career ID and may include:

- Verified athlete identity
- Career timeline
- Organizations, teams, and seasons
- Statistics and achievements
- Awards
- Games and significant Moments
- Game footage and highlights
- Interviews and postgame media
- Connected historical media
- Teammate and alumni connections
- School and professional history
- Provenance and attribution labels
- Brand integrations
- Merchandise
- Fan engagement
- Current activity
- Permitted economic or licensing indicators

The Locker must not expose internal rights records, disputes, private notes, confidential revenue terms, private identity-verification data, or unpublished financial allocations.

The Locker is a primary distribution and acquisition surface. It should remain useful long after the athlete leaves the organization that originally created or controlled the media.

### Athlete Dashboard

Athletes may:

- Claim and verify their Career ID / Locker
- Manage permitted Locker fields
- Correct or enrich career history
- Review organizations, seasons, achievements, and Moments
- Review associated media
- Suggest missing media or missing Moments
- Confirm or dispute permitted attribution relationships
- Approve or decline content where approval is required
- Request corrections
- View performance
- View properly scoped value and revenue records
- Complete approved payout onboarding when applicable

Athlete identity must not depend on user-account creation.

An Athlete Career ID may exist before the athlete creates an account, claims the Locker, verifies identity, or connects a payout account.

### Organization Console

The Organization Console is **not** primarily a media-management CRM.

Its purpose is:

> Manage an organization's relationship with athlete identities across time.

Organizations may manage:

- Current athletes
- Former athletes and alumni
- Athlete Career IDs
- Claimed and unclaimed Lockers
- Roster and season relationships
- Career records
- Historical affiliations
- Significant Moments
- Connected media
- Archive-to-athlete relationships
- Contributor relationships
- Rights metadata
- Approvals
- Activations and campaigns
- Attribution
- Analytics
- Contractually defined economic participation
- Organization settings

Media Library functionality remains a supporting capability. It must not become the strategic center of the Organization Console.

Prefer views such as:

- Athlete Network
- Alumni Network
- Career Connections
- Moment Connections
- Connected Media
- Archive Recovery
- Activation Opportunities
- Attribution & Value

over generalized DAM-first workflows.

### BLTZ Admin

BLTZ Admin governs:

- Organization approval
- User access
- Athlete identity conflicts
- Duplicate Career IDs
- Locker claims
- Career-record conflicts
- Moment conflicts
- Rights exceptions
- Attribution disputes
- Takedowns
- Trust and safety
- Financial disputes
- Payout exceptions
- Settings
- Audit logs
- System health

Admin should handle exceptions and governance, not duplicate ordinary organization workflows.

## Roles and Permissions

Organization roles:

```text
owner
organization_admin
media_manager
rights_manager
analyst
viewer
```

Platform roles:

```text
user
support_admin
organization_admin
identity_admin
rights_admin
trust_safety_admin
finance_admin
technical_admin
super_admin
```

A user may hold multiple roles in different contexts. Do not rely on one global role field for organization permissions. `auth.users` is authentication identity. `profiles` is user profile data. Organization membership and platform authorization must not depend on `profiles.role`.

Use an organization membership model:

```text
organization_memberships
- id
- organization_id
- user_id
- role
- status
- created_at
- updated_at
```

All protected actions must be authorized server-side. Hiding a button is not sufficient access control.

## Shared Data Model

Expected entities should evolve toward the Career Identity Network while preserving existing canonical identifiers and phase boundaries.

Core identity and organization entities:

```text
auth.users
profiles
organizations
organization_memberships
schools
teams
seasons
players
athlete_claims
player_lockers
athlete_team_seasons
```

Career and Moment entities, when introduced in the authorized build phase:

```text
sports_events
career_achievements
moments
moment_athletes
moment_organizations
moment_media
moment_contributors
```

Media and rights entities, when introduced in the authorized build phase:

```text
media_assets
athlete_media
rights_records
approval_requests
provenance_records
```

Activation and value entities, when introduced in the authorized build phase:

```text
campaigns
campaign_assets
campaign_athletes
analytics_events
revenue_records
revenue_allocations
athlete_value_ledger
disputes
audit_logs
notifications
```

These names describe intended concepts, not permission to create every table immediately.

The authoritative build order and phase-specific architecture documents control when schemas are introduced.

One media asset may connect to multiple athletes and multiple Moments. Use normalized relationships rather than arrays of athlete IDs.

One Moment may connect to multiple athletes with different relationship types.

Do not conflate:

- appearance
- contribution
- attribution
- rights ownership
- licensing rights
- economic participation

Canonical table names differ from product language. See **Canonical Identifiers and Media Graph Guardrails** below. Do not create a second `athletes` table.

## Canonical Identifiers and Media Graph Guardrails

Architecture decisions for this section are recorded in `docs/media/MEDIA-GRAPH-ROADMAP.md`. The authoritative phase sequence is `docs/BLTZ_BUILD_ORDER.md`.

- `public.players.id` is the canonical Athlete Career ID. Product copy may say “athlete” or “Athlete Career ID”; the table remains `players`.
- Athlete identity is separate from authentication identity. A `players` row may exist without a linked application user.
- Claiming a Locker links a verified user to an existing Athlete Career ID. Do not architect athlete identity around account creation.
- `player_lockers` is a presentation and configuration entity with at most one row per `players` row. Lockers consume graph data and media; they do not own media or career history.
- `schools` are directory and reference entities. Organizations are separate tenant entities and may reference a school.
- Existing `teams` retain their UUIDs and require organization context in Phase 2. Do not recreate teams to satisfy tenancy.
- Stable `seasons`, `sports_events`, and normalized athlete-team-season/roster relationships are identity and career context.
- Moments are first-class domain entities when their authorized phase begins. Do not reduce the future model to only `athlete -> media`; prefer `athlete -> moment -> media` where appropriate.
- A Moment may connect multiple athletes with different roles such as featured athlete, participant, contributor, or other explicit relationship types.
- Do not infer contribution solely from visual appearance in media.
- Existing `media` and `videos` tables are legacy Phase One models. Do not extend them into the future Media Graph. Phase 5 adapts or migrates them at a documented boundary.
- Existing license fields on `media` (`license_status`, `license_kind`, `license_request_*`, `public_locker_approved`, and related columns) are legacy Locker eligibility fields. They must not become the Phase 6 rights engine.
- Provider integrations use adapters. Getty IDs and other provider-specific fields must not become core columns on athletes (`players`), Lockers (`player_lockers`), teams, organizations, or Moments.
- Media storage is supporting infrastructure. Do not make storage topology the organizing principle of athlete identity or historical relationships.
- Phase 5 is **BLTZ Media Graph**. Phase 6 is **Media Rights, Attribution & Clearance Engine**. Earlier phases must not prematurely design those schemas.
- All media eligibility checks must go through one conceptual permission API: `resolveMediaPermissions(asset, usageContext)`. Do not scatter `license_status` or equivalent checks across Locker, Organization Console, Admin, or campaign surfaces.
- Revenue and value concepts must remain distinct:
  - potential media value
  - attributed transaction value
  - allocated athlete earnings
  - claimable / unclaimed earnings
  - paid earnings
- Do not represent estimated value as athlete earnings.
- Do not automatically assign teammate revenue shares. Economic participation must derive from explicit agreements, rights, campaign rules, or organization policies.

## Media and Rights Rules

Every media asset should be capable of supporting relationships to:

- source
- type
- organization
- team
- season
- event
- Moment
- athlete(s)
- creator(s)
- contributor(s)
- rights owner
- license type
- monetization permission
- editing permission
- territory
- dates
- approval requirements
- publication status

Media is not merely a file. Whenever possible, the system should preserve what the asset means and who or what it connects to.

Rights statuses:

```text
unverified
pending_review
approved
restricted
expired
revoked
```

Publication must be blocked when required rights or approvals are missing.

Rights, publication, attribution, and financially significant changes must create audit-log entries.

The system must keep these concepts separate:

- **Appearance** — who visibly appears in an asset
- **Contribution** — who contributed to the underlying sports Moment
- **Attribution** — who should receive credit
- **Rights ownership** — who controls legal rights to the asset
- **Licensing rights** — who may authorize a specific use
- **Economic participation** — who is entitled to financial participation under an applicable agreement

Appearance or contribution alone must never create inferred ownership or payment entitlement.

## Product Strategy Decision Filter

Before implementing a major feature, the assigned agent must answer:

1. Does this strengthen Athlete Identity?
2. Does this strengthen the Athlete Career Graph?
3. Does this strengthen the Moment Contribution Graph?
4. Does this strengthen the Athlete Value Graph?
5. Does this create a persistent relationship between entities?
6. Is it still valuable after the athlete leaves the organization?
7. Does it improve the Player Locker or Locker-claim loop?
8. Does it help recover or preserve athletic history?
9. Does it improve attribution?
10. Does it increase graph density or graph accuracy?
11. Is another mature platform already better positioned to solve this workflow?
12. Could BLTZ integrate instead of rebuilding it?

If questions 1–10 are mostly **NO** and questions 11–12 are **YES**:

**DO NOT BUILD THE FEATURE.**

Document the integration opportunity or flag it for product review.

### Explicit Non-Goals / Integration-First Workflows

Do not prioritize building:

- Full DAM replacement
- Real-time sideline media ingestion
- Photographer assignment management
- Professional media editing
- Social scheduling
- Social publishing suites
- Complete UGC collection platforms
- Video editing suites
- Generalized file storage
- Commodity facial-recognition infrastructure
- Greenfly-style real-time media orchestration

These capabilities may be integrated when they materially strengthen the BLTZ graph.

### Required Engineering Priority

When requirements compete, prioritize:

1. Athlete Identity
2. Career Persistence
3. Player Locker
4. Athlete Claim Network
5. Athlete Career Graph
6. Moment Contribution Graph
7. Organization Relationships
8. Connected Media
9. Attribution
10. Athlete Value Ledger
11. Distribution
12. Enterprise Intelligence
13. Payments
14. General Media Management

Lower-priority media-management functionality must not delay or complicate identity and graph foundations.

### Former Athlete Wedge

Former athletes are a high-priority early validation population because their career media and institutional relationships are often fragmented after organizational support ends.

Product work should support:

- Career reconstruction
- Historical media discovery
- Significant Moment recovery
- Former team relationships
- Teammate connections
- Alumni identity
- Locker claiming
- Long-term persistence

The strategic objective is not merely to create profiles.

It is to create **Career Recovery Projects** that reconnect athletes to the history and media they helped create.

## Security Requirements

- Never expose Supabase service-role credentials to the browser.
- Never commit secrets.
- Use environment variables.
- Enforce Row Level Security where applicable.
- Verify organization membership server-side.
- Verify Admin permissions server-side.
- Validate uploads and restrict file type and size.
- Use signed URLs for private media where required.
- Protect internal notes and disputes.
- Log sensitive actions.
- Treat financial changes as auditable events.
- Do not permanently delete legal, financial, or rights history without a retention policy.

## Database Rules

- All schema changes require migrations.
- Do not manually edit production tables without a migration.
- Regenerate TypeScript database types after schema changes.
- Add indexes for common filters.
- Use foreign keys.
- Prefer soft deletion for legal, financial, or audit-significant records.
- Preserve created_at and updated_at.
- Document destructive changes before execution.
- `supabase/migrations` is the only authoritative active migration directory. `lib/supabase/migrations` is legacy and must receive no new migrations.

## Design System

BLTZ should feel athletic, editorial, premium, precise, identity-first, and professional.

The Organization Console should feel like a sports career-intelligence and athlete-network operating product, not a generic sales CRM and not a commodity DAM.

Media can be visually prominent where useful, but the interface hierarchy should center athletes, careers, Moments, relationships, attribution, and actionable organization intelligence.

Preferred direction:

- Dark mode
- Deep navy and black surfaces
- Gold accent `#ffbb00`
- Strong blue secondary accents
- Barlow sime-Condensed for display headings
- Roboto Condensed or the current body font
- JetBrains Mono for metadata where appropriate
- Strong hierarchy
- Clear tables
- Media thumbnails
- Compact status indicators
- Minimal decorative styling

Avoid excessive pills, bubble layouts, decorative blobs, wavy separators, generic SaaS illustrations, excess gradients, emojis, operational carousels, unnecessary animation, and replacing the Locker design without instruction.

## Accessibility

Maintain contrast, keyboard navigation, visible focus states, semantic headings, clear form labels, text-plus-color statuses, alt text, and responsive alternatives for wide tables.

## Testing and Validation

Before marking work complete, run available linting, type checking, unit tests, integration tests, and production build validation.

At minimum verify authorized and unauthorized behavior, loading, empty and error states, mobile usability, audit creation, persistence, and that public pages do not expose private data.

## Required Completion Report

Every task must report:

1. Summary
2. Files changed
3. Routes changed
4. Database changes
5. Migrations
6. Environment variables
7. Permission changes
8. Tests run
9. Manual verification
10. Known limitations
11. Deferred work

## Agent Task Template

```markdown
## Objective
## PRD reference
## Included
## Excluded
## Required routes
## Required data
## Required permissions
## Acceptance criteria
## Validation commands
```

Before coding, inspect relevant files, identify reusable components, assess schema impact, provide a concise file-change plan, and avoid unrelated edits.

After coding, run validation, report failures honestly, document manual steps, and do not claim completion when acceptance criteria are unmet.

## Current Build Order

The authoritative phase sequence is `docs/BLTZ_BUILD_ORDER.md`.

Do not infer permission to create future-phase schemas from this document. The build-order document and phase-specific architecture files control implementation timing.

The strategic sequence should now be interpreted through the Product Doctrine:

1. Repository audit
2. Authentication and role cleanup
3. Organization and membership foundation
4. Athlete identity and canonical Career ID integrity
5. Organization Console shell
6. Athlete Network / roster / alumni relationships
7. Career timeline, seasons, teams, and historical affiliations
8. Athlete claim and verification loop
9. Player Locker enrichment and distribution
10. Moment foundation
11. Connected Media / BLTZ Media Graph
12. Media Rights, Attribution & Clearance Engine
13. Organization archive recovery and historical-media linking
14. Activations and campaigns
15. Analytics and graph intelligence
16. Athlete Value Ledger
17. Revenue attribution and approved payment integrations

Do not skip the shared foundation to build visually complete dashboards first.

Do not design future-phase Media Graph, rights-engine, Moment, or Value Ledger tables before their authorized architecture phase.

### Organization Console Direction

The Organization Console should evolve away from a generic media-management CRM.

Prefer building:

- Athlete Network
- Current Athlete views
- Alumni / Former Athlete views
- Claimed vs unclaimed Career IDs
- Career completeness
- Organization and season relationships
- Moment connections
- Connected historical media
- Archive recovery opportunities
- Attribution and rights visibility
- Activation opportunities
- Athlete value and economic intelligence when authorized

Media Library remains a supporting module.

Do not allow legacy PRDs or wireframes to make media folders, upload flows, or DAM workflows the primary organizing principle of the product.

### Completion Check for Product Direction

Before marking a product task complete, report:

- Which Career Graph relationships were strengthened?
- Which Moment Graph relationships were strengthened, if applicable?
- Which Value Graph relationships were strengthened, if applicable?
- Whether the feature remains useful after an athlete leaves an organization
- Whether any mature third-party workflow was unnecessarily duplicated
- Any identified scope drift toward generalized media management

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
