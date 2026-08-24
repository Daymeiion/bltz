# Decision 0001 — Wave 1 Application Foundation Without Schema Migration

**Date:** 2026-08-24  
**Status:** Approved  
**Owner:** CRM Coordinator  
**Applies to:** Foundation/DB Wave 1 for Executive Action Center

## Context

The current schema has no approved canonical Opportunity, Activation, Assignment/Task, Notification, Financial Exception, Executive Projection, team-grant, or permission-bundle model. The active contracts also do not approve their exact fields, stages, statuses, transitions, or production role bundles.

Inventing those contracts would violate the do-not-improvise and additive-migration rules. Useful security and data-contract groundwork can still be completed without persisting new domain models.

## Decision

Wave 1 Foundation proceeds with no database migrations and no invented domain vocabulary. It may add application-level contracts and tests only within:

- `lib/enterprise-crm/auth/**`
- `lib/enterprise-crm/data/**`
- `lib/enterprise-crm/audit/**`
- `lib/enterprise-crm/fixtures/**`
- `tests/enterprise-crm/rbac/**`
- `tests/enterprise-crm/data/**`

This authorization is fully additive and reversible.

## Approved behavior

### Authorization

- Define canonical Executive permission-key constants/types from the active journey contract.
- Implement a fail-closed, server-only authorization boundary.
- Explicit grants must originate from server-resolved canonical membership/scope or a trusted internal adapter.
- Never trust grants, roles, scope, finance access, or permissions from request bodies, query parameters, cookies, client state, cached UI data, or control visibility.
- Unknown, missing, stale, malformed, cross-organization, or cross-team grants deny access.
- Do not create production role-to-permission bundles or imply that an existing role automatically grants an Executive capability.

### Data, scope, cache, and privacy

- Map Executive concepts to canonical existing sources or mark them missing, conflicting, or unsafe to reuse.
- Add types/helpers for permission-aware omission, scope identity, and cache isolation.
- Any cache identity must distinguish actor, organization, team/scope, permission fingerprint, and applicable filters/date window.
- Financial/private fields are omitted before payload construction for unauthorized callers; they are not delivered and cosmetically redacted.
- Do not add database queries, RPCs, mutations, fabricated projections, or preview values presented as production data.

### Audit

- Map, validate, and sanitize against the existing append-only `audit_logs` contract.
- Metadata must be allowlisted, safe, and free of restricted finance/private content.
- Do not add persistence writes or invent a final action/event-name vocabulary in this wave.

### Fixtures

- Add deterministic persona and scenario manifests for tests only.
- Fixtures must be non-production, rights-safe, and contain no copied private production data.
- They do not grant production access and are never production seed data.

## Explicitly prohibited

- Supabase migrations or schema changes.
- New persisted entities, columns, enum/status/stage/priority vocabularies, or transition graphs.
- Generated database type changes.
- Production role bundle mapping.
- Source reads/writes, RPCs, assignments, notifications, projections, or audit writes.
- Changes to `lib/organization/**`, `types/database.ts`, Supabase middleware, `app/**`, `components/**`, package/lock files, or root configuration.

## Required tests

Tests must prove:

- missing, unknown, malformed, and untrusted grants fail closed;
- organization and team scopes cannot cross;
- financial/private data is absent from unauthorized results;
- broad/narrow and permission-different callers cannot share cache identities;
- safe denial does not enumerate restricted records;
- audit metadata validation rejects restricted or unapproved fields;
- persona/scenario manifests are deterministic and rights-safe.

## Handoff and remaining gate

The Foundation handoff reports migrations and screenshots as `not applicable`, exact test results, canonical-source mappings, permission keys, enforcement assumptions, and unresolved models/statuses.

Opportunity, Activation, Assignment/Task, Notification, Financial Exception, Executive Projection, team-grant persistence, production permission bundles, and final event/status vocabularies remain blocking decisions for Feature launch. They are recorded as explicit gaps, not hidden TODOs.

