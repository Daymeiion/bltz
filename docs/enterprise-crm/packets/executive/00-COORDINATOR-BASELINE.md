# Executive Journey — Coordinator Baseline

**Issued:** 2026-08-24  
**Active build:** Phase 3A–3C foundations for Journey 1  
**Protected:** Phases 1, 1.5, and 2; public Player Locker; unrelated admin/product work

## Governing order

1. `AGENTS.md`
2. `docs/enterprise-crm/MASTER-BUILD-ORDER.md`
3. `docs/enterprise-crm/BLTZ-ENTERPRISE-DESIGN-SPEC.md`
4. `docs/enterprise-crm/journeys/EXECUTIVE-JOURNEY-SPEC.md`
5. This packet and the assigned role packet
6. Existing schema, migrations, authorization, route, component, and test conventions

The CRM design specification is the approved presentation authority for `/organization/**`. It overrides conflicting visual rules in root `DESIGN.md` only in that route scope. It does not override security, RBAC, data, or journey behavior.

## Repository baseline

- Source repository: `C:\Users\Administrator\bltz`
- Observed branch: `cursor/phase-1-5-media-graph-architecture`
- Observed commit before integration bootstrap: `f99f0965290302eaf47c10c3539cc10875a0a83c`
- The source worktree contains user-owned tracked and untracked changes. Agents must not use it as a shared implementation directory.
- Coordinator integration branch: `codex/crm-integration-executive`
- Integration worktree: `C:\Users\Administrator\bltz-worktrees\crm-integration-executive`
- Authorized immutable Wave 1 ref: `crm-executive-wave1-base` on `codex/crm-integration-executive`
- Agent worktrees are siblings under `C:\Users\Administrator\bltz-worktrees\`; never nest them in the source worktree.

## Verified protected baseline

The following existing suites passed before packet issuance:

```text
9 test files passed
72 tests passed
0 failed
```

Coverage included organization context/entry/layout/overview/shell and Phase 2 tenant, authorization-hardening, legacy-admin-transition, and career-context migration tests. The only output warning concerned future Vite native config loading.

## Existing canonical foundations

- `public.organizations`, `public.organization_memberships`, `public.platform_role_assignments`, and append-only `public.audit_logs`.
- `public.teams.organization_id`, seasons, team seasons, athlete team seasons, athlete statistics, and sports-event context.
- `public.players` remains the canonical athlete identity.
- Existing media, rights metadata/request, player Locker, beta intelligence, analytics, and revenue-era records must be mapped before extension; none is automatically the Executive domain model.
- Server organization resolution exists in `lib/organization/context.ts`; unauthorized organization access resolves without tenant enumeration.
- Current organization role vocabulary: owner, organization_admin, media_manager, rights_manager, analyst, viewer; platform super_admin remains separately resolved.
- Existing production route convention starts at `/organization/[organizationId]/dashboard`.

## Known contract gaps to resolve in Wave 1

- No approved permission-key registry yet covers the Executive capability domains.
- Organization membership is canonical, but explicit team-limited grants require mapping or an additive proposal.
- No approved canonical Opportunity, Activation, Assignment/Task, Notification, Financial Exception, or Executive Projection model has been confirmed.
- Domain stage/status vocabularies are not authorized by this packet. Foundation must submit a decision request instead of inventing them.
- Current organization shell code is pre-CRM work-in-progress and contains hard-coded visual values and earlier navigation labels. It is input to UI Systems, not an approved component contract.

## First durable outcome

Wave 1 establishes only what the first Executive vertical slice needs before feature composition:

1. A reviewed schema/RBAC/audit/fixture contract with explicit gaps and migration plan.
2. The CRM-scoped token layer, enterprise shell, exact primary navigation labels, scope chrome, `PillTabs`, and the minimum reusable states/components required to compose an Executive landing slice.
3. Integration evidence proving the protected baseline still passes.

Feature/Journey implementation is not authorized until the Coordinator integrates and accepts both Wave 1 handoffs.

## Launch authorization

- **Authorized now:** Foundation/DB packet `01-FOUNDATION-DB-TASK-PACKET.md`.
- **Authorized now, parallel with non-overlapping ownership:** UI Systems packet `02-UI-SYSTEMS-TASK-PACKET.md`.
- **Not authorized:** Feature/Journey coding, QA acceptance, or any later canonical journey.
- The integration and handoff procedure is controlled by `03-INTEGRATION-AND-LAUNCH-PLAN.md`.

## Gate for Feature launch

The Coordinator must record all of the following before creating the Feature worktree:

- integrated commit and clean integration status;
- approved schema mapping, permission keys, enforcement points, audit behavior, fixture contract, and any migration notes;
- stable UI component exports and states, with CRM token conformance;
- passing targeted tests and protected regression tests;
- required UI screenshots and accessibility evidence;
- no unresolved critical/high defect, authorization leak, shared-file collision, hidden TODO, or unapproved domain vocabulary.
