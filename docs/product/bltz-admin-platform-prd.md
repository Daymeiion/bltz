# BLTZ Admin Platform Product Requirements Document

## Document Status

- Product: BLTZ Admin Platform
- Version: 1.0
- Product type: Internal governance and operations system
- Related product: BLTZ School and Team CRM
- Related document: `school-team-crm-prd.md`

## 1. Executive Summary

The BLTZ Admin Platform gives authorized BLTZ staff tools to govern organizations, users, athlete identities, Locker claims, media-rights exceptions, takedowns, trust and safety, financial disputes, platform configuration, and system operations.

The Admin Platform does not replace normal school or team workflows. Organizations manage ordinary roster, media, approval, publishing, campaign, and reporting activity in the School/Team CRM.

BLTZ Admin handles verification, exceptions, conflicts, enforcement, platform-wide controls, sensitive financial review, audit oversight, and system health.

## 2. Product Vision

BLTZ requires a trusted governance layer because athlete identity, media ownership, rights, approvals, money, and public publishing can create disputes and legal exposure.

The Admin Platform should answer:

- Which organizations are approved?
- Who controls each organization?
- Which athlete identity is canonical?
- Who may claim a Locker?
- Which rights cases need review?
- Which content must be restricted or removed?
- Which users require support or enforcement?
- Which revenue records are disputed?
- What changed, who changed it, and why?
- Is the platform healthy?

## 3. Goals

### MVP goals

- Review and approve organizations
- Manage organization status
- Review user accounts and access
- Resolve athlete identity conflicts
- Review Locker claims
- Review rights exceptions
- Process takedown requests
- Manage trust and safety cases
- Review revenue disputes
- View audit logs
- View basic system status
- Enforce role-based Admin permissions

### Long-term goals

- Automated risk scoring
- Advanced rights workflows
- Legal case management
- Fraud detection
- Platform policy configuration
- Payout operations
- Compliance reporting
- Advanced observability
- AI-assisted case summaries
- Multi-region support

## 4. Non-Goals for Initial MVP

- Replacing legal counsel
- Automated final legal determinations
- Full accounting system
- Full support ticketing system
- Identity-verification vendor replacement
- Permanent deletion without retention controls
- Automated enforcement without review
- Full payout processing
- Public-facing Admin access

## 5. Admin Roles

```text
support_admin
organization_admin
identity_admin
rights_admin
trust_safety_admin
finance_admin
technical_admin
super_admin
```

### Support Admin

Views users, organizations, support context, and account-access issues. Cannot approve rights or alter financial records.

### Organization Admin

Reviews applications, approves or rejects organizations, suspends access, and handles membership disputes.

### Identity Admin

Reviews athlete claims, resolves duplicates, manages canonical identity, and reviews identity disputes.

### Rights Admin

Reviews rights exceptions and documents, restricts or approves media use, and processes takedowns.

### Trust and Safety Admin

Reviews reported content and conduct, suspends content or accounts, and escalates serious cases.

### Finance Admin

Reviews revenue records, allocations, and financial disputes.

### Technical Admin

Views platform health, failed jobs, integrations, and approved retry controls.

### Super Admin

Broadest access. High-risk actions still require confirmation, reason logging, and potentially dual approval.

## 6. Security Principles

- Admin access must be enforced server-side.
- Sensitive records require strict database policies.
- High-risk actions require reasons.
- Financial and rights changes require audit logs.
- Impersonation, if added, must be restricted and logged.
- Service-role credentials never appear in browser code.
- Privileged roles should support MFA and shorter sessions.

## 7. Information Architecture

```text
/admin
/admin/dashboard
/admin/organizations
/admin/organizations/[organizationId]
/admin/users
/admin/users/[userId]
/admin/athletes
/admin/athletes/[athleteId]
/admin/claims
/admin/claims/[claimId]
/admin/rights
/admin/rights/[caseId]
/admin/takedowns
/admin/takedowns/[caseId]
/admin/trust-safety
/admin/trust-safety/[caseId]
/admin/finance
/admin/finance/[caseId]
/admin/audit
/admin/system
/admin/settings
```

## 8. Admin Dashboard

### Summary cards

- Pending organizations
- Pending Locker claims
- Identity conflicts
- Rights cases
- Takedown requests
- Trust and safety cases
- Revenue disputes
- Suspended organizations
- Failed system jobs
- High-priority open cases

### Sections

- Priority queue
- Recent enforcement
- Organization approvals
- Claim decisions
- Rights risk
- Financial disputes
- Platform activity
- System alerts

### Acceptance criteria

- Only authorized roles can view data.
- Queue items link correctly.
- Role-specific sections are protected.
- Urgent cases are identifiable.
- Loading, empty, and error states exist.

## 9. Organization Management

### Statuses

```text
draft
pending_review
approved
rejected
suspended
restricted
closed
```

### Review fields

- Organization name
- Type
- Legal name
- Website
- Domain
- Contact
- Documents
- Teams
- Requested access
- Application date
- Risk notes
- Decision
- Reason
- Reviewer
- Review date

### Actions

- Approve
- Reject
- Request information
- Restrict
- Suspend
- Reinstate
- Close
- Transfer ownership after review
- Add internal notes

### Organization detail tabs

- Overview
- Teams
- Members
- Athletes
- Media
- Rights
- Cases
- Revenue
- Audit history
- Internal notes

Decisions require reasons and must be audited.

## 10. User Management

### User detail

- Name
- Email
- Status
- Verification
- Organization memberships
- Athlete relationship
- Platform roles
- Login history summary
- Cases
- Claims
- Revenue relationship
- Audit history

### Statuses

```text
active
pending
restricted
suspended
disabled
deleted
```

### Actions

- Restrict
- Suspend
- Reinstate
- Revoke sessions
- Remove membership
- Assign or remove platform role
- Add internal notes
- Escalate

Privileged role assignment requires high-level approval, reason, confirmation, and audit logging.

## 11. Athlete Identity Management

### Purpose

Maintain one reliable athlete identity across teams, seasons, Lockers, media, and claims.

### Identity fields

- Canonical name
- Alternate names
- Birth year when appropriate
- Position
- Teams
- Schools
- Seasons
- League history
- External IDs
- Locker ID
- Claim status
- Verification status
- Duplicate confidence

### Case types

- Duplicate athlete
- Incorrect association
- Competing claim
- Name mismatch
- Team-history conflict
- Merged-record error
- Fraudulent claim

### Actions

- Mark canonical record
- Merge
- Reject merge
- Split record
- Transfer associations
- Lock identity
- Request evidence
- Escalate

Merges must preserve media, rights, claims, revenue, audit history, and organization relationships.

## 12. Locker Claims

### Statuses

```text
draft
submitted
pending_review
needs_information
approved
rejected
cancelled
revoked
```

### Evidence may include

- Email-domain evidence
- Approved identity provider result
- School or team verification
- Social account verification
- Professional profile
- Supporting documents
- Manual references

### Review view

- Athlete record
- Claimant
- Evidence
- Conflicting users
- Locker status
- Organization confirmation
- Risk flags
- Previous decisions

### Actions

- Approve
- Reject
- Request information
- Escalate
- Revoke
- Transfer under documented process

Claim history must be preserved.

## 13. Rights Case Management

### Case types

```text
ownership_dispute
license_question
expired_rights
unauthorized_publication
territory_conflict
commercial_use_conflict
athlete_objection
rights_holder_objection
supporting_document_review
other
```

### Fields

- Case ID
- Type
- Priority
- Organization
- Media asset
- Rights record
- Claimant
- Respondent
- Documents
- Notes
- Reviewer
- Legal review status
- Resolution
- Reason
- Dates

### Statuses

```text
open
triage
awaiting_information
under_review
restricted_pending_review
resolved
closed
appealed
```

### Actions

- Restrict media
- Unpublish
- Request documents
- Approve limited use
- Approve full use
- Reject use
- Record exception
- Escalate to counsel
- Close
- Reopen

## 14. Takedown Requests

### Sources

- Rights holder
- Athlete
- Organization
- Legal representative
- Platform detection
- Public report

### Fields

- Requester
- Contact
- Claimed authority
- Asset
- Reason
- Documentation
- Jurisdiction
- Urgency
- Temporary action
- Resolution

### Statuses

```text
submitted
triage
information_requested
temporarily_restricted
under_review
approved
rejected
withdrawn
closed
```

Preserve the asset record and history. Do not silently delete.

## 15. Trust and Safety

### Case types

- Impersonation
- Harassment
- Fraud
- Spam
- Inappropriate media
- Account compromise
- Misleading sponsorship
- Policy violation
- Other

### Actions

- Warn
- Restrict feature
- Remove content
- Suspend account
- Suspend organization
- Revoke sessions
- Escalate
- Close with no action

Separate public explanation from internal notes and preserve evidence.

## 16. Finance and Revenue Disputes

### Types

```text
incorrect_allocation
missing_revenue
duplicate_revenue
incorrect_fee
wrong_stakeholder
payment_status
refund
chargeback
other
```

### Fields

- Revenue record
- Allocation
- Organization
- Athlete
- Campaign
- Gross amount
- Disputed amount
- Reason
- Supporting records
- Reviewer
- Resolution
- Adjustment
- Approval history

### Controls

- Do not silently overwrite original records.
- Use adjustment records where possible.
- High-value changes may require dual approval.
- Every financial change requires an audit event.
- Estimated media value is not payable revenue.

## 17. Audit Logs

### Required fields

- Actor
- Actor role
- Action
- Entity type
- Entity ID
- Organization
- Previous value
- New value
- Reason
- Timestamp
- Request metadata
- Correlation ID where available

### Filters

- Actor
- Organization
- Action
- Entity
- Date
- Risk level
- Admin role

Audit exports are restricted and logged.

## 18. System Operations

### Initial views

- Failed background jobs
- Media-processing status
- Email failures
- Webhook failures
- Scheduled publication failures
- Storage status
- Database integration status
- External service status
- Deployment metadata

### Actions

- Retry eligible job
- Mark investigated
- Add incident note
- Link records
- Escalate incident

This does not replace dedicated observability tools.

## 19. Platform Settings

- Organization types
- Sports
- Media types
- Rights statuses
- Approval defaults
- Publication defaults
- Revenue categories
- Notification templates
- Case priorities
- Feature flags

Only highly authorized roles may modify settings. All changes are audited.

## 20. Search

Global search should support organizations, users, athletes, Lockers, media, rights cases, claims, takedowns, and finance disputes. Results must respect role permissions.

## 21. Notifications and Assignment

Cases support assignment, priority, due date, followers, status changes, escalation, and notifications.

Initial delivery: in-app and email.

## 22. Internal Notes

Internal notes must be hidden from organizations and athletes, show author and time, support role restrictions, preserve sensitive case history, and avoid unnecessary sensitive information.

## 23. Data Model Summary

```text
platform_roles
organization_reviews
athlete_claims
identity_cases
rights_cases
takedown_requests
trust_safety_cases
finance_disputes
case_assignments
case_events
internal_notes
audit_logs
system_jobs
platform_settings
notifications
```

Reference shared platform entities rather than duplicating them.

## 24. Backend Requirements

- Strict server-side authorization
- Strong RLS where applicable
- Version-controlled migrations
- Append-only event history where appropriate
- Safe evidence access
- Signed URLs for private documents
- Valid status transitions
- Audit logging
- Pagination
- Role-aware search
- Rate limiting
- Confirmation for destructive operations

## 25. Wireframe Requirements

Full Figma is not required. Wireframe high-risk or complex pages before implementation.

Priority wireframes:

1. Admin dashboard
2. Organization review
3. User detail
4. Identity conflict
5. Locker claim review
6. Rights case detail
7. Takedown case
8. Finance dispute
9. Audit log
10. System operations

Each wireframe should document primary role, primary decision, evidence, actions, reason fields, escalation, sensitive information, empty state, and error state.

## 26. MVP Build Phases

### Phase 1: Admin Foundation

Platform roles, protected routes, Admin shell, permission checks, audit framework.

### Phase 2: Organization Review

Pending queue, organization detail, decisions, restrictions, and notes.

### Phase 3: Identity and Claims

Athlete search, identity detail, duplicates, Locker claims, and decisions.

### Phase 4: Rights and Takedowns

Rights queue, case detail, restriction actions, takedowns, and evidence.

### Phase 5: Trust and Safety

Case queue, account and content restrictions, enforcement history.

### Phase 6: Finance

Revenue disputes, dispute detail, adjustments, and resolution.

### Phase 7: Operations

Audit viewer, system jobs, settings, and operational alerts.

## 27. MVP Launch Acceptance Criteria

1. Only authorized Admins can enter Admin routes.
2. Platform roles are enforced server-side.
3. Organizations can be reviewed.
4. Decisions require reasons.
5. Organizations can be suspended and reinstated.
6. Users can be reviewed.
7. Identity conflicts can be opened.
8. Locker claims can be approved or rejected.
9. Rights cases can be created and resolved.
10. Content can be temporarily restricted.
11. Takedowns can be processed.
12. Trust and safety actions can be recorded.
13. Revenue disputes can be reviewed.
14. Financial adjustments preserve history.
15. Sensitive actions generate audits.
16. Audit logs can be searched.
17. Loading, empty, and error states exist.
18. Unauthorized actions are blocked.
19. Production build passes.
20. Known limitations are documented.

## 28. Success Metrics

- Organization review time
- Claim review time
- Rights case resolution time
- Takedown response time
- Finance dispute resolution time
- Open case volume
- Overdue case volume
- Reopened cases
- Enforcement reversals
- Audit coverage
- Failed Admin actions
- Platform incidents detected
