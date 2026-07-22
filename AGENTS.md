# AGENTS.md

## Project Overview

BLTZ is athlete media infrastructure that transforms fragmented athlete career content into measurable, monetizable, long-term digital assets.

BLTZ is not:

- A generic NIL marketplace
- A traditional athlete social network
- A simple video-hosting product
- A white-glove marketing agency
- An AI wrapper

BLTZ uses AI as enabling technology, not as the core product.

The platform includes four connected surfaces:

1. Public Player Lockers
2. Athlete dashboards
3. School and team media CRM
4. BLTZ internal administration

The Player Locker is the athlete-facing identity and media layer. The School/Team CRM is the organization-facing operating layer. The BLTZ Admin platform is the governance, trust, rights, and platform-operations layer.

## Core Product Thesis

Sports organizations, athletes, and rights holders possess valuable content that is fragmented across broadcasts, archives, social platforms, school websites, personal devices, Hudl, interviews, and legacy media libraries.

BLTZ organizes this content around the athlete, verifies its permissions, distributes it through Player Lockers, measures its performance, and attributes revenue to the appropriate stakeholders.

The primary product loop is:

1. A school or team manages its roster.
2. The organization adds or selects a media asset.
3. Athletes are associated with that asset.
4. Rights and permissions are recorded.
5. Required approvals are collected.
6. Approved content is published to Player Lockers.
7. Fans engage with the content.
8. Performance and revenue are measured.
9. Revenue is attributed to organizations, athletes, and BLTZ.

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

1. Security and permissions take priority.
2. PRD-defined behavior takes priority.
3. Existing reusable patterns take priority.
4. Wireframes guide hierarchy.
5. Visual polish comes last.

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

The Locker is public-facing and athlete-centered. It may include athlete identity, career statistics, awards, game footage, highlights, interviews, postgame media, merchandise, brand integrations, fan engagement, teammate connections, alumni connections, school history, and provenance labels.

The Locker must not expose internal rights records, disputes, private notes, or confidential revenue terms.

### Athlete Dashboard

Athletes may claim or manage their Locker, edit permitted fields, review associated content, approve or decline content, request changes, view performance, and view revenue records.

### School/Team CRM

Organizations manage roster, athlete records, media, athlete tagging, rights metadata, approvals, publishing, campaigns, analytics, revenue attribution, and organization settings.

### BLTZ Admin

BLTZ Admin governs organization approval, user access, athlete identity conflicts, duplicate records, Locker claims, rights exceptions, takedowns, trust and safety, financial disputes, settings, audit logs, and system health.

Admin should handle exceptions, not duplicate ordinary organization workflows.

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

A user may hold multiple roles in different contexts. Do not rely on one global role field for organization permissions.

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

Expected entities:

```text
users
profiles
organizations
organization_memberships
teams
seasons
athletes
athlete_claims
lockers
media_assets
athlete_media
rights_records
approval_requests
campaigns
campaign_assets
campaign_athletes
analytics_events
revenue_records
revenue_allocations
disputes
audit_logs
notifications
```

One media asset may be connected to multiple athletes. Use a join table rather than an array of athlete IDs.

## Media and Rights Rules

Every media asset should support source, type, organization, team, season, event, athletes, rights owner, license type, monetization permission, editing permission, territory, dates, approval requirements, and publication status.

Rights statuses:

```text
unverified
pending_review
approved
restricted
expired
revoked
```

Publication must be blocked when required rights or approvals are missing. Rights and publication changes must create audit-log entries.

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

## Design System

BLTZ should feel athletic, editorial, premium, precise, media-first, and professional.

The CRM should feel like an internal sports-media operations product, not a generic sales CRM.

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

1. Repository audit
2. Authentication and role cleanup
3. Organization and membership foundation
4. CRM shell
5. Roster and athlete records
6. Media library
7. Rights and approvals
8. Locker publishing workflow
9. Admin review queues
10. Campaigns
11. Analytics
12. Revenue attribution

Do not skip the shared foundation to build visually complete dashboards first.
