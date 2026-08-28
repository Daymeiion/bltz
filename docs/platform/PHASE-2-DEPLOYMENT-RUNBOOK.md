# Phase 2 Deployment Readiness Runbook

Status: operator procedure only. No staging or production command is authorized or executed by this document.

Related documents:

- [Phase 2 foundation plan](./PHASE-2-FOUNDATION-PLAN.md)
- [Supabase production reconciliation and promotion](../stabilization/supabase-production-promotion.md)
- [Media Graph roadmap](../media/MEDIA-GRAPH-ROADMAP.md)
- [Phase 2 tenant RLS proof](../../supabase/tests/phase2_tenant_rls.sql)
- [Isolated Supabase validator](../../scripts/validate-supabase-foundation.mjs)
- [Staging Beta RLS harness](../../scripts/verify-staging-beta-rls.mjs)
- [Read-only deployment preflight](../../scripts/phase2-deployment-preflight.mjs)
- [Read-only staging SQL inventory](../../supabase/tests/phase2_deployment_inventory.sql)

## Safety invariants

- This runbook never runs remote commands automatically. Every staging or production command is an explicit operator action requiring the normal approval process.
- Never run `supabase db reset`, `supabase migration repair`, or destructive SQL against a linked staging or production project as part of validation.
- `db reset --local` is allowed only inside the disposable, isolated validator created by `scripts/validate-supabase-foundation.mjs`. The validator never uses a linked project.
- A local Supabase link is mutable state, not proof of the target. Independently compare the project reference with the approved environment inventory before every remote dry-run, push, type generation, or SQL session.
- Never print, commit, paste into tickets, or preserve in deployment logs any password, JWT, database URL, access token, publishable key, secret key, or production data dump.
- Stop on a dirty candidate, target ambiguity, schema drift, an unexpected migration list, an unreviewed legacy administrator, a skipped RLS role, type drift, a failed smoke test, or unavailable backup/PITR evidence.

## Immutable Phase 2 migration order

The following migrations are one ordered unit and must remain byte-for-byte unchanged after their first staging promotion:

1. `20260818000000_phase2_authorization_exposure_hardening.sql`
2. `20260818000001_phase2_tenant_authorization_foundation.sql`
3. `20260818000002_phase2_legacy_admin_super_admin_transition.sql`
4. `20260818000003_phase2_career_context_foundation.sql`

The short names `00000` through `00003` in this runbook always mean these full versions. Do not reorder, squash, rename, or apply only a suffix of this chain. Once any environment has accepted a version, corrections use a new forward migration.

Before staging, record the immutable Git SHA and SHA-256 checksum of each file. Recompute the same checksums before production and require an exact match with the staging deployment record.

## 1. Candidate preflight

Run local checks from the repository root on the exact candidate SHA:

```powershell
git status --short
git rev-parse HEAD
Get-FileHash -Algorithm SHA256 supabase/migrations/20260818000000_phase2_authorization_exposure_hardening.sql
Get-FileHash -Algorithm SHA256 supabase/migrations/20260818000001_phase2_tenant_authorization_foundation.sql
Get-FileHash -Algorithm SHA256 supabase/migrations/20260818000002_phase2_legacy_admin_super_admin_transition.sql
Get-FileHash -Algorithm SHA256 supabase/migrations/20260818000003_phase2_career_context_foundation.sql
npm test -- tests/database/phase2-authorization-hardening-migration.test.ts tests/database/phase2-tenant-foundation-migration.test.ts tests/database/phase2-legacy-admin-transition-migration.test.ts tests/database/phase2-career-context-migration.test.ts tests/database/migration-reproducibility.test.ts
npx tsc --noEmit
npm run lint
npm run build
node scripts/validate-supabase-foundation.mjs
```

The isolated validator requires Node, Docker, outbound access for the pinned Supabase CLI/container images, and enough local resources to start disposable Postgres. It copies the canonical chain into a temporary project, performs a local reset, runs `supabase/tests/phase2_tenant_rls.sql`, lints `public`, stops the local project, and removes the temporary workspace.

Do not substitute a linked reset when Docker is unavailable. Record the local validation blocker and use a separately approved disposable CI/local environment.

Preflight evidence must include:

- clean worktree and immutable SHA;
- four migration checksums;
- passing migration contracts and reproducibility tests;
- passing typecheck, lint, build, isolated reset, SQL RLS proof, and database lint;
- the exact Node, Supabase CLI, and Postgres versions;
- no new migration with the same timestamp/version;
- reviewed schema lock/constraint impact and a maintenance-window estimate.

## 2. Legacy-admin approval gate

Migration `00002` converts every row that still has `profiles.role = 'admin'` into an active `super_admin` assignment, unless that user already has historical `super_admin` assignment history. This is intentionally a one-time compatibility transition, not an open-ended authorization fallback.

Before promoting `00002` to any remote environment:

1. Add these uncommitted values to the protected target environment file:

   ```text
   PHASE2_EXPECTED_PROJECT_REF
   PHASE2_EXPECTED_SUPER_ADMIN_USER_ID
   ```

2. Run the read-only gate:

   ```powershell
   npm run phase2:preflight -- --env .env.staging.local
   ```

   The script performs only Data API `SELECT` requests. It refuses a project-reference mismatch, more or fewer than one reviewed legacy admin, an unexpected active `super_admin`, or historical revoked `super_admin` state that migration `00002` intentionally will not reactivate.

3. Match each UUID to the approved staff inventory without copying email addresses or credentials into the deployment record.
4. Record an explicit approve/reject decision for every row.
5. If any row is unrecognized or rejected, stop. Correct the legacy role state through the approved account-governance process before applying the migration.
6. Record only counts and approved UUID references in the access-controlled deployment evidence.

After deployment, verify all of the following with read-only SQL:

```powershell
npm run phase2:verify -- --env .env.staging.local
```

```sql
select count(*) as legacy_admin_count
from public.profiles
where role = 'admin';

select count(*) as active_super_admin_count
from public.platform_role_assignments
where role = 'super_admin'
  and revoked_at is null;

select profile.id
from public.profiles profile
where profile.role = 'admin'
  and not exists (
    select 1
    from public.platform_role_assignments assignment
    where assignment.user_id = profile.id
      and assignment.role = 'super_admin'
      and assignment.revoked_at is null
  );

select pg_get_functiondef('public.is_internal_admin()'::regprocedure);
```

Expected result: the missing-assignment query returns zero rows, each assignment inserted by migration `00002` has a matching `platform_role.backfilled` audit row, and a reviewed assignment that predates `00002` remains active without requiring a backfill audit. The function definition must authorize only an active `super_admin` assignment and must not consult `profiles`, JWT metadata, email, or a browser-supplied role.

Finally, authenticate through the normal staging application flow as the approved platform admin and verify the protected admin path. SQL-editor execution has no end-user `auth.uid()` and is not a substitute for this test.

## 3. Staging promotion

Staging promotion is manual:

1. Confirm the approved staging project reference from the environment inventory.
2. Compare it with the URL host in the protected staging environment file and with any local link metadata. Stop on disagreement.
3. Capture a read-only migration-history list and schema snapshot in controlled evidence storage.
4. Reconcile every earlier canonical migration using [the production reconciliation classifications](../stabilization/supabase-production-promotion.md#phase-2--reconcile-schema-state-before-history). Do not use history repair to conceal missing objects.
5. Run a linked `db push --dry-run` only after target verification. Require the pending tail to be exactly `00000`, `00001`, `00002`, and `00003`, in that order, unless the deployment record proves an exact prefix is already applied.
6. Obtain approval for the reviewed dry-run output.
7. Apply the pending migrations to staging with the pinned CLI and capture sanitized output.
8. Re-read migration history and confirm all four versions are present once and in order.
9. Run the admin backfill, RLS, generated-type, and smoke-test gates below.

Never run a linked reset before or after the staging push. An unexpected version, baseline replay, checksum difference, or schema error is a stop condition, not permission to repair history interactively.

## 4. RLS credentials and evidence

### Isolated Phase 2 proof

`supabase/tests/phase2_tenant_rls.sql` creates deterministic transactional fixtures, switches among database/JWT role contexts, verifies tenant and cross-tenant behavior, and rolls the transaction back. It is executed by the isolated validator; do not run that fixture file against a linked project.

### Staging identities

Use dedicated non-production identities for:

- organization A active member;
- organization B active member;
- authenticated non-member;
- suspended member;
- approved platform `super_admin`;
- legacy `profiles.role = 'admin'` user with no platform assignment, to prove the fallback is gone.

Obtain short-lived sessions through normal Auth login. Do not manufacture JWTs, reuse production accounts, or commit fixture credentials. The Phase 2 career policies deliberately allow an active `super_admin` cross-tenant reads through `is_internal_admin()`; test that database path and the protected Admin application route separately.

For the existing analytics/Beta regression harness, keep these values only in the protected `.env.staging.local` file:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
PHASE2_EXPECTED_SUPER_ADMIN_USER_ID
```

Then an approved operator may run:

```powershell
node scripts/verify-staging-beta-rls.mjs
```

That script validates the approved staging project reference, creates disposable athlete/non-admin fixtures, generates and consumes a one-time magic-link session for the pre-assigned platform-admin UUID without sending email or changing its password, runs `tests/database/beta-rls-live.test.ts`, revokes only that test session, and attempts fixture cleanup. It never logs the generated token. It is a regression proof for the existing Beta data boundary, not a substitute for the Phase 2 tenant-role matrix.

The staging harness also checks table-level anonymous denial, empty results for unassigned users, profile-only-admin denial, the assigned-super-admin predicate, and successful assigned-super-admin queries for the Phase 2 career tables. Empty career tables cannot prove row-level visibility or isolation. The harness does not create disposable organizations because organization hard deletion is intentionally forbidden. Until approved persistent staging organizations, memberships, identities, and protected canary rows exist for organization A, organization B, owner, `organization_admin`, suspended-member, and cross-tenant checks, the full remote tenant-role matrix remains a deployment blocker rather than a skipped success.

Required staging evidence:

- `anon` cannot read organizations, memberships, platform roles, audit logs, seasons, rosters, stats, or events;
- each active member sees only its organization-owned rows and shared events in which that organization participates;
- suspended members and non-members see no tenant rows;
- organization A cannot read organization B membership, season, roster, stats, or event-association rows;
- browser roles cannot directly mutate tenant, platform-role, audit, or career-context tables;
- the legacy admin-only identity is denied protected admin behavior;
- the active assigned `super_admin` passes approved Admin application-route checks;
- public visible-player and Locker reads still work anonymously;
- every required identity was actually executed; skipped tests are failures, not evidence.

## 5. Authoritative type generation and diff

After all four migrations are present in staging, generate a fresh schema contract from the explicitly approved staging project. Write it to a temporary review file; do not overwrite `types/database.ts` directly.

```powershell
$phase2GeneratedTypes = Join-Path $env:TEMP 'bltz-phase2-database.generated.ts'
npx supabase@2.114.0 gen types typescript --project-id <APPROVED_STAGING_PROJECT_REF> --schema public | Set-Content -LiteralPath $phase2GeneratedTypes
git diff --no-index -- types/database.ts $phase2GeneratedTypes
```

Review at minimum:

- `organizations`, `organization_memberships`, `platform_role_assignments`, and `audit_logs`;
- nullable `teams.organization_id`;
- `seasons`, `team_seasons`, `athlete_team_seasons`, and `athlete_season_stats`;
- `sports_events`, `sports_event_teams`, and `sports_event_athletes`;
- RPC/function signatures used by checked-in application code;
- relationship nullability, insert/update shapes, and composite-FK relationships.

The checked-in file contains application-facing aliases and may not be structurally identical to raw CLI output. Reconcile differences deliberately, run typecheck/tests/build again, and commit any accepted type correction as a new immutable candidate. If generation fails twice for the same transport/TLS condition, stop repeating it, record the blocker, and do not claim authoritative types are current.

### 2026-08-18 staging type evidence

Authoritative generation completed after migrations `20260818000000` through
`20260818000003` were applied and the target-bound post-deployment check reported
project reference `yevihzsgqagvuulymqum`. The raw CLI output is checked in as
`types/database.generated.ts`; `types/database.ts` re-exports its schema types
and retains application-facing domain aliases. Do not hand-edit the generated
snapshot.

The reviewed snapshot includes all Phase 2 authorization and career tables,
nullable `teams.organization_id`, the composite tenant foreign-key relationships,
and the deployed `is_internal_admin`, `consume_analytics_rate_limit`, and
`get_beta_intelligence_dashboard` function signatures.

The shared legacy Supabase client factories remain unparameterized for this
release. A trial global `Database` generic correctly exposed pre-existing drift:
legacy routes reference `moderations`, `daily_quotes`, and
`get_video_revenue_stats`, which are absent from the approved staging schema,
and several revenue/media consumers assume nullability or numeric shapes that
do not match the generated contract. Resolve those callers incrementally before
enabling the generated type across every shared client; do not weaken or
hand-augment the authoritative snapshot to silence the errors.

```text
types/database.generated.ts SHA-256
EF1C5EAB3343AA9191956B60DC284A1860FE46F0CC38E02C2E6CCD3F61ACAE9C
```

For the next schema change, regenerate from the independently verified linked
project and review the snapshot before replacing it:

```powershell
npx supabase@2.114.0 gen types typescript --linked --schema public | Set-Content -Encoding utf8 types/database.generated.ts
npx tsc --noEmit
npm test -- tests/database/generated-types-contract.test.ts
```

## 6. Staging smoke tests

Run after migration, admin verification, and type review:

1. Anonymous public Locker and visible-player routes load without private tenant data.
2. An authenticated user can read and update only permitted profile presentation fields; `role` and `player_id` remain server-controlled.
3. Messaging participant reads/writes still work and anonymous direct writes fail.
4. An active organization member can read its approved organization and current membership.
5. Cross-organization and suspended-member reads fail closed.
6. An unmapped legacy team with `organization_id IS NULL` remains readable only through intended compatibility behavior and cannot be used to create tenant-owned career rows.
7. A mapped team can participate in a same-organization `team_season` and roster stint.
8. A shared event can include reviewed team-season participants from two organizations; each member sees the event through its own association.
9. Event-athlete participation is explicit and does not expose the other organization's full roster.
10. Direct browser mutation of organizations, memberships, platform roles, audit logs, seasons, rosters, stats, and events fails.
11. Approved admin routes work for active `super_admin`; legacy profile-role fallback does not.
12. Existing analytics ingestion, Beta dashboard, onboarding, and production build regressions pass.

## 7. Team mapping and staged constraints

Phase 2 deliberately leaves `teams.organization_id` nullable. It does not infer a tenant from every `schools` row and does not apply a production mapping automatically.

Use this later, separately approved sequence:

1. Produce a read-only inventory of mapped and unmapped team UUIDs.
   - Run `npm run phase2:team-report -- --env .env.staging.local` for the reviewable CSV output.
   - Run `supabase/tests/phase2_deployment_inventory.sql` through approved read-only SQL access after `00003` for database migration, authorization, organization, team, player, duplicate, and career-table reports.
2. Prepare a mapping artifact containing team UUID, proposed organization UUID, evidence, reviewer, and decision. Keep it in controlled deployment evidence, not in public application data.
3. Obtain product/data-owner approval for every mapping.
4. Implement approved values in a new forward migration or reviewed server-side data operation; never hand-edit rows opportunistically in production.
5. Verify all mapped organizations exist and preserve every `teams.id` and `teams.school_id`.
6. Verify composite organization/team constraints and all compatibility queries.
7. Report remaining `organization_id IS NULL` rows. Do not silently assign or delete them.
8. Create `team_seasons` and other tenant-owned children only for mapped teams.
9. In a later release, only after the unmapped count is zero and application compatibility is proven, add a `CHECK (organization_id IS NOT NULL) NOT VALID`, validate it, then convert the column to `NOT NULL` in a separately reviewed migration.
10. Remove the temporary check only after the catalog-level `NOT NULL` constraint is confirmed.

The nullable-to-required sequence is not part of the initial Phase 2 deployment.

## 8. Production rollout

Production requires a separate change-window approval after staging sign-off:

1. Freeze and record the candidate SHA and migration checksums proven in staging.
2. Reconfirm the production project reference from the approved inventory; do not infer it from staging or a local link.
3. Confirm backup and PITR health, responsible operators, monitoring owner, incident channel, and maintenance window.
4. Collect read-only production migration history and schema evidence, then reconcile it using [the production promotion runbook](../stabilization/supabase-production-promotion.md).
5. Review the legacy-admin UUID inventory and obtain explicit approval before `00002` can run.
6. Run a fresh production dry-run. The pending list and checksums must exactly match the approved staging record.
7. Apply only the reviewed pending migrations, in order, during the approved window.
8. Re-read migration history and schema state.
9. Run the admin-backfill checks, least-privilege production smoke tests, public Locker canary, API health checks, and application monitoring.
10. Preserve sanitized output, checksums, timings, and sign-offs in access-controlled deployment evidence.

Do not provision broad test data in production. Use existing approved identities and read-only checks wherever possible. Any production mutation beyond the four reviewed migrations requires its own authorization.

## 9. Failure, rollback, and forward-fix policy

- If a migration fails transactionally, preserve the error and inspect actual schema/history state before retrying. Do not assume either full application or full rollback.
- Never edit or remove a migration already accepted by staging or production.
- Prefer a new reviewed forward migration that restores compatible behavior and preserves data/history.
- Do not use `migration repair` to mask a failed or partially different schema. History-only repair is allowed solely through the reconciliation procedure when object-level proof shows schema equivalence.
- Do not run destructive reset, ad hoc down migrations, table drops, or broad data deletion as rollback.
- If an application release must be reverted, confirm the previous application remains compatible with the newly applied additive schema. Database rollback is not implied by an application rollback.
- Use PITR only through the incident process when a forward fix cannot safely restore service. Record the recovery point, data-loss window, and authorization.
- Security regressions, cross-tenant access, loss of all admin access, or unexpected anonymous exposure are stop/incident conditions. Disable the affected application path if necessary while preparing the reviewed fix.

## 10. Break-glass platform-admin recovery

Use only when no approved active `super_admin` can authenticate and normal role-assignment tooling is unavailable. This is an incident operation requiring target verification, a second reviewer, a reason, an approved existing Auth user, and controlled SQL access. The example contains only a zero placeholder UUID and no credentials.

Replace the placeholder locally before execution. The block intentionally rejects it if unchanged:

```sql
begin;

do $$
declare
  target_user_id uuid := '00000000-0000-4000-8000-000000000000';
  new_assignment_id uuid;
  recovery_reason constant text :=
    'Break-glass recovery: approved incident reference must be recorded outside this example';
begin
  if target_user_id = '00000000-0000-4000-8000-000000000000'::uuid then
    raise exception 'Replace the placeholder with the reviewed existing Auth user UUID';
  end if;

  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'Reviewed Auth user does not exist';
  end if;

  if exists (
    select 1
    from public.platform_role_assignments
    where user_id = target_user_id
      and role = 'super_admin'
      and revoked_at is null
  ) then
    raise exception 'User already has an active super_admin assignment';
  end if;

  insert into public.platform_role_assignments (
    user_id,
    role,
    assigned_by,
    assignment_reason
  )
  values (
    target_user_id,
    'super_admin',
    null,
    recovery_reason
  )
  returning id into new_assignment_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    actor_role,
    actor_role_scope,
    reason,
    risk_level,
    new_values,
    request_metadata
  )
  values (
    null,
    'platform_role.break_glass_assigned',
    'platform_role_assignment',
    new_assignment_id::text,
    'break_glass_operator',
    'system',
    recovery_reason,
    'critical',
    jsonb_build_object('user_id', target_user_id, 'role', 'super_admin'),
    jsonb_build_object('procedure', 'phase2-deployment-runbook')
  );
end
$$;

commit;
```

After execution:

1. Verify exactly one active assignment exists for the target UUID.
2. Authenticate through normal Auth and verify only the minimum required admin recovery path.
3. Preserve the assignment UUID and audit ID in the incident record.
4. Restore normal administration tooling.
5. Revoke the break-glass assignment through the normal audited role workflow as soon as recovery is complete; never delete its history.
6. Review why normal admin access failed and ship any required forward fix.

Break-glass SQL is never a routine provisioning mechanism and must never be embedded in application code, CI, migrations, or reusable credentials.

## Deployment sign-off

Phase 2 is deployment-ready only when all boxes are true:

- [ ] Immutable SHA and all four checksums recorded.
- [ ] Local migration, typecheck, lint, build, isolated reset, SQL RLS, and database lint gates pass.
- [ ] Legacy admins are individually reviewed and approved.
- [ ] Staging dry-run and applied migration order exactly match `00000`–`00003`.
- [ ] Admin backfill and removal of the legacy authorization fallback are verified.
- [ ] All staging RLS identities execute with no skipped role.
- [x] Generated types are reviewed and reconciled (staging snapshot, 2026-08-18).
- [ ] Staging smoke tests and existing Locker/Beta/onboarding regressions pass.
- [ ] Team mapping remains nullable and no unapproved production mapping is applied.
- [ ] Production schema/history reconciliation, backup/PITR, operators, and change window are approved.
- [ ] Forward-fix and break-glass owners are named in the controlled deployment record.
