# BLTZ School and Team CRM Product Requirements Document

## Document Status

- Product: BLTZ School and Team CRM
- Version: 1.0
- Product type: Organization-facing sports media operations platform
- Related product: BLTZ Player Locker
- Related document: `bltz-admin-platform-prd.md`

## 1. Executive Summary

The BLTZ School and Team CRM gives schools, teams, athletic departments, media departments, and authorized rights holders one system to manage athlete records, sports media, permissions, publishing, campaigns, analytics, and revenue attribution.

It is not a traditional sales CRM. It connects organization-owned or authorized media to individual athlete identities and Player Lockers.

The CRM should help an organization answer:

- Which athletes are represented?
- Which content assets do we possess?
- Who appears in each asset?
- What rights do we have?
- What approvals are missing?
- What can be published?
- Where has content been published?
- How is content performing?
- What revenue has been generated?
- How should revenue be allocated?

## 2. Product Vision

BLTZ converts fragmented sports archives and athlete career content into structured digital media assets.

The CRM makes sports content searchable, athlete-linked, rights-aware, approval-ready, publishable, measurable, and revenue-attributable.

## 3. Core Product Loop

1. An organization accesses its workspace.
2. Staff manages the athlete roster.
3. Staff adds or selects a media asset.
4. Staff associates athletes with the asset.
5. Rights and permissions are recorded.
6. Required approvals are requested.
7. Approved content is published.
8. Content appears in relevant Player Lockers.
9. BLTZ tracks engagement and revenue.
10. The organization reviews performance and allocation.

The MVP must demonstrate this loop end to end.

## 4. Goals

### MVP goals

- Structured roster workspace
- Central media library
- Athlete-media relationships
- Rights and permission records
- Approval workflows
- Locker publishing
- Basic analytics
- Revenue allocation records
- Role-based access
- Auditable changes

### Long-term goals

- Automated ingestion and tagging
- Multiple sports and seasons
- Advanced licensing
- Sponsor campaigns
- Athlete media valuation
- Automated reporting and payouts
- Support for schools, professional teams, leagues, collectives, and media partners

## 5. Non-Goals for Initial MVP

- Live broadcast rights acquisition
- Automated legal verification
- Full contract lifecycle management
- Automated payouts
- Advanced ad serving
- Real-time transcoding pipelines
- Recruiting workflows
- NIL marketplace matching
- Full messaging
- AI-generated legal decisions
- Full mobile parity for dense CRM workflows

## 6. Primary Users

### Organization Owner

Manages organization settings, staff roles, major publishing decisions, and financial reporting.

### Organization Administrator

Manages teams, roster, media, users, and settings.

### Media Manager

Adds and organizes media, associates athletes, prepares approvals, publishes approved content, and reviews performance.

### Rights Manager

Creates and reviews rights records, monitors restrictions and expirations, and escalates exceptions.

### Analyst

Views analytics and revenue reports without publishing or rights-edit access.

### Viewer

Read-only organization access.

### Athlete

Operates primarily through the athlete dashboard and may review, approve, decline, or request changes to associated content.

## 7. Roles and Permissions

Recommended roles:

```text
owner
organization_admin
media_manager
rights_manager
analyst
viewer
```

Permissions must be server-side.

| Capability | Owner | Admin | Media Manager | Rights Manager | Analyst | Viewer |
|---|---:|---:|---:|---:|---:|---:|
| View dashboard | Yes | Yes | Yes | Yes | Yes | Yes |
| Manage roster | Yes | Yes | Yes | Limited | No | No |
| Add media | Yes | Yes | Yes | Yes | No | No |
| Edit rights | Yes | Yes | Limited | Yes | No | No |
| Request approval | Yes | Yes | Yes | Yes | No | No |
| Publish eligible content | Yes | Yes | Yes | Limited | No | No |
| View analytics | Yes | Yes | Yes | Yes | Yes | Yes |
| View revenue | Yes | Yes | Limited | Limited | Yes | Limited |
| Manage users | Yes | Yes | No | No | No | No |

## 8. Information Architecture

```text
/organization
/organization/select
/organization/[organizationId]/dashboard
/organization/[organizationId]/athletes
/organization/[organizationId]/athletes/[athleteId]
/organization/[organizationId]/media
/organization/[organizationId]/media/[mediaId]
/organization/[organizationId]/rights
/organization/[organizationId]/approvals
/organization/[organizationId]/campaigns
/organization/[organizationId]/campaigns/[campaignId]
/organization/[organizationId]/analytics
/organization/[organizationId]/revenue
/organization/[organizationId]/settings
/organization/[organizationId]/members
```

## 9. Navigation

Primary navigation:

- Overview
- Athletes
- Media
- Rights
- Approvals
- Campaigns
- Analytics
- Revenue
- Settings

Utilities:

- Organization switcher
- Team and season filter
- Search
- Notifications
- Help
- User menu

Prioritize desktop and tablet. Critical approvals should remain usable on mobile.

## 10. Dashboard

### Purpose

Provide an operational summary and surface urgent work.

### Summary cards

- Active athletes
- Claimed Lockers
- Unclaimed Lockers
- Published media
- Pending approvals
- Rights expiring soon
- Qualified views
- Watch time
- Estimated media value
- Direct revenue

### Sections

- Tasks requiring attention
- Recent media activity
- Top content
- Top Player Lockers
- Recent approvals
- Rights alerts
- Publishing activity
- Revenue summary

### Empty state

1. Add team
2. Import roster
3. Invite staff
4. Add media
5. Configure rights
6. Publish first asset

### Acceptance criteria

- Data is organization-scoped.
- Date filters work.
- Pending tasks link correctly.
- Unauthorized financial data is hidden.
- Loading, empty, and error states exist.

## 11. Athlete and Roster Management

### Athlete list fields

- Headshot
- Name
- Jersey number
- Position
- Team
- Season
- Athlete status
- Locker status
- Claim status
- Media count
- Qualified views
- Approval count
- Revenue
- Last updated

### Filters

- Team
- Season
- Position
- Active or former
- Claimed or unclaimed Locker
- Approval status
- Media availability

### Athlete detail sections

- Overview
- Career information
- Locker preview
- Associated media
- Pending approvals
- Rights notes
- Campaign participation
- Analytics
- Revenue
- Activity log

### Athlete creation

- Manual entry
- CSV import
- Approved data import
- BLTZ Admin-created record

### Duplicate handling

Flag likely duplicates. Complex merges and identity conflicts go to BLTZ Admin.

### Locker states

```text
not_created
unclaimed
claim_pending
claimed
suspended
archived
```

## 12. Media Library

### Supported media types

```text
game_footage
highlight
interview
press_conference
commercial
documentary
photo
audio
player_generated
article
other
```

### Media list fields

- Thumbnail
- Title
- Type
- Source
- Team
- Season
- Event
- Athletes
- Rights status
- Approval status
- Publication status
- Views
- Watch time
- Revenue
- Updated date

### Media detail sections

- Preview
- Metadata
- Athlete associations
- Rights record
- Approval requirements
- Publishing destinations
- Campaign associations
- Analytics
- Revenue
- Activity log

### Actions

- Add metadata
- Upload supported files
- Attach authorized URLs
- Associate athletes
- Set featured athlete
- Add event and season
- Submit rights review
- Request approval
- Publish
- Unpublish
- Archive

### Publication statuses

```text
draft
pending_rights
pending_approval
approved
scheduled
published
unpublished
blocked
archived
```

Publication must be blocked when requirements are unmet.

## 13. Athlete-Media Relationships

Use a many-to-many join table:

```text
id
media_asset_id
athlete_id
relationship_type
start_timestamp
end_timestamp
featured
approval_status
created_at
updated_at
```

Relationship types:

```text
featured
appears
interview_subject
speaker
teammate
opponent
historical_reference
```

Association does not establish ownership or rights.

## 14. Rights Management

### Rights fields

- Rights owner
- Rights source
- License type
- Permitted platforms
- Commercial use
- Sponsorship use
- Editing permission
- Download permission
- Territory
- Start date
- Expiration date
- Revenue terms
- Athlete approval requirement
- Organization approval requirement
- Supporting documents
- Internal notes
- Status

### Statuses

```text
unverified
pending_review
approved
restricted
expired
revoked
```

### Rules

- Unverified content cannot be monetized.
- Restricted content follows recorded limitations.
- Expired or revoked content cannot remain commercially published.
- Sensitive changes require audit logs.
- Exceptions may be escalated to BLTZ Admin.

### Rights dashboard

- Pending review
- Expiring in 30 days
- Expiring in 60 days
- Restricted assets
- Published assets with rights issues
- Missing documents

## 15. Approval Workflows

### Approval types

- Athlete
- Organization
- Rights
- Sponsor
- BLTZ Admin exception

### Athlete responses

```text
approve
request_changes
decline
```

### Request fields

- Asset
- Requested from
- Requested by
- Type
- Message
- Deadline
- Status
- Response
- Response time
- Change notes

### Statuses

```text
draft
sent
viewed
approved
changes_requested
declined
expired
cancelled
```

Every transition must be recorded.

## 16. Locker Publishing

### Destinations

- Public Player Locker
- Athlete dashboard
- Team media page
- Campaign page
- Future syndication channels

### Controls

- Destination
- Featured placement
- Publish date
- Unpublish date
- Display title
- Display description
- Sponsor
- Visibility
- Geographic restriction
- Age restriction when required

### Provenance labels

- School Archive
- Team Licensed
- Personal Upload
- Broadcast Partner
- Rights Verified

Only eligible assets may publish. Internal rights data remains private.

## 17. Campaigns

### Fields

- Campaign name
- Sponsor
- Organization
- Teams
- Athletes
- Media assets
- Dates
- Budget
- Deliverables
- Target audience
- Approval requirements
- Revenue terms
- Status

### Statuses

```text
draft
pending_approval
approved
scheduled
active
paused
completed
cancelled
```

### MVP capabilities

- Create campaign
- Select athletes
- Select approved media
- Add sponsor
- Define dates
- Add deliverables
- Record revenue
- View performance

### Deferred capabilities

- Automated ad serving
- Brand lift studies
- Dynamic pricing
- Contract generation
- Automated invoicing
- Sponsor marketplace

## 18. Analytics

### Core metrics

- Qualified views
- Unique viewers
- Total watch time
- Average duration
- Completion rate
- Rewatch rate
- Shares
- Locker visits
- Sponsor clicks
- Commerce conversions
- Direct revenue
- Estimated media value
- Network lift

### Reporting levels

- Organization
- Team
- Athlete
- Media asset
- Campaign
- Date range

Estimated media value must remain separate from direct revenue. Simulated data must be labeled.

## 19. Revenue

### Revenue sources

```text
sponsorship
advertising
subscription
pay_per_view
merchandise
licensing
affiliate
donation
other
```

### Revenue fields

- Source
- Gross amount
- Fees
- Net amount
- Asset
- Campaign
- Organization
- Date
- Status
- Supporting reference

### Allocation fields

- Athlete share
- Team share
- School share
- Rights-holder share
- BLTZ share
- Other stakeholder share
- Status

### Statuses

```text
estimated
pending
confirmed
disputed
payable
paid
cancelled
```

MVP may use simulated or manually recorded allocations. Automated payouts are deferred.

## 20. Notifications

Generate notifications for approvals, rights expirations, rights revocation, blocked assets, publication, campaigns, revenue, disputes, and invitations.

Initial delivery may be in-app and email.

## 21. Organization Settings

- Identity
- Logo
- Brand colors
- Teams
- Seasons
- Members
- Roles
- Publishing defaults
- Approval defaults
- Revenue defaults
- Notifications
- Data export
- Support contact

## 22. Search

Global search should eventually support athletes, media, campaigns, rights, events, and teams. MVP may begin with module-level search.

## 23. Audit Logging

Audit:

- User invitations
- Role changes
- Athlete changes
- Rights changes
- Approval transitions
- Publishing and unpublishing
- Revenue changes
- Dispute escalation
- Sensitive exports

Audit fields include actor, action, entity, previous value, new value, timestamp, organization, and request metadata where available.

## 24. Data Model Summary

```text
organizations
organization_memberships
teams
seasons
athletes
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
notifications
audit_logs
```

## 25. Backend Requirements

- Server-side authorization
- Row Level Security where appropriate
- Signed media access
- Validated uploads
- Pagination
- Search and filtering
- Audit events
- Valid status transitions
- Type-safe data access
- Version-controlled migrations

## 26. Performance Requirements

- Meaningful dashboard content under roughly 3 seconds on typical broadband
- Paginated tables
- Lazy thumbnails
- Responsive media previews
- Server-side filtering where appropriate
- No full media loading in list views

## 27. Accessibility

- Keyboard navigation
- Visible focus states
- Accessible forms
- Sufficient contrast
- Semantic tables
- Screen-reader labels
- Text with status icons
- Responsive table alternatives

## 28. Wireframe Requirements

Detailed Figma is not required. Wireframe when hierarchy or workflow is unclear.

Priority wireframes:

1. Dashboard
2. Athlete list
3. Athlete detail
4. Media library
5. Media detail
6. Rights record
7. Approval queue
8. Campaign detail
9. Analytics
10. Revenue detail

Each wireframe should state primary user, primary action, critical information, secondary actions, empty state, mobile priority, and exclusions.

## 29. MVP Build Phases

### Phase 1: Foundation

Authentication, organizations, memberships, roles, protected routes, organization switcher, CRM shell.

### Phase 2: Roster

Athlete list, detail, Locker relationship, CSV import, search, and filters.

### Phase 3: Media

Media library, detail, athlete associations, uploads, and statuses.

### Phase 4: Rights and Approvals

Rights records, approval requests, athlete responses, and publication blocking.

### Phase 5: Locker Publishing

Publish destination, Locker display, provenance, and unpublishing.

### Phase 6: Admin Exceptions

Rights exceptions, identity conflicts, and takedown support.

### Phase 7: Campaigns and Analytics

Campaigns, analytics events, reports, revenue records, and allocations.

## 30. MVP Launch Acceptance Criteria

1. Organization can sign in.
2. Authorized user can access CRM.
3. Roster can be created or imported.
4. Athlete record can be opened.
5. Media asset can be added.
6. Multiple athletes can be associated.
7. Rights record can be attached.
8. Approval request can be sent.
9. Athlete can respond.
10. Eligible content can publish.
11. Content appears in correct Locker.
12. Content can be unpublished.
13. Basic analytics are visible.
14. Revenue records and allocations are visible.
15. Unauthorized users are blocked.
16. Sensitive actions create audit records.
17. Loading, empty, and error states exist.
18. Type checking and production build pass.

## 31. Success Metrics

- Organizations activated
- Staff invited
- Athletes imported
- Lockers connected
- Media assets added
- Athlete-media associations
- Rights records completed
- Approval completion rate
- Time from upload to publication
- Published assets
- Qualified views
- Watch time
- Revenue recorded
- Organization retention
