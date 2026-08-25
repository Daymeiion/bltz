# GTM Foundation V1 database and infrastructure

## Canonical integration decisions

- `public.players` remains the only canonical Player database. `public.gtm_contact_players` stores conservative links and never copies Player Master identifiers or profile fields into contacts.
- `public.organizations` remains the BLTZ tenant boundary. `public.gtm_organizations` is the existing external-account extension for non-tenant brands, agencies, media companies, collectives, investors, and sports-technology businesses. Its optional unique `canonical_organization_id` prevents a second identity when an account is already a BLTZ tenant.
- `public.schools` and `public.teams` remain canonical. GTM does not create school or team tables.
- `auth.users`, `public.platform_role_assignments`, and `public.is_internal_admin()` remain the identity and authorization source. GTM browser access is authenticated and limited by both grants and RLS.

## V1 records

The existing relationship-intelligence migrations define contacts, external accounts, Player links, notes, interactions, import jobs, the enterprise scoring trigger, and narrowly scaffolded opportunities/relationships. Migration `20260825150037_complete_gtm_foundation_v1.sql` adds:

- structured `gtm_customer_discovery` records with nullable boolean answers so unknown is distinct from no;
- missing update timestamps for Player links and interactions;
- the `discovery` note classification;
- import preview counts, potential-match counts, and approval provenance;
- audited child-record writes without copying private prose into `audit_logs`;
- a permission-checked metrics projection rather than a duplicate metrics store.

The foundation migration also gives the multi-column contact next-action and opportunity next-step invariants explicit non-colliding constraint names. PostgreSQL otherwise assigns the inline column checks those same default names, which prevents a clean migration replay. This is a pre-deployment reproducibility correction to the new GTM migration, not a change to an older production phase.

Enterprise scoring stays database-maintained and applies only to enterprise contacts: relationship strength 25%, BLTZ relevance 25%, buying authority 20%, network leverage 15%, and timing 15%. Five input factors on a 0–5 scale normalize to 0–100. Tiers are A 80–100, B 60–79, C 40–59, and D 0–39. The model is named `enterprise_v1`; athlete scoring is deliberately absent.

## Phase 2 investor and conversation addendum

Migration `20260825165631_extend_gtm_investor_conversation_foundation.sql` adds `investor` to the existing contact classification. Investor type, relationship stage, evidence needed, thesis feedback, historical signal, future trigger, prior outcome, and relationship source remain nullable and are constrained to investor contacts. They do not create a separate investor entity, dashboard, pipeline, or automation system. Enterprise priority scoring remains enterprise-only.

Each interaction can preserve zero or more universal outcomes in a constrained text array: user conversion, pilot opportunity, capital, referral, strategic insight, product validation, distribution opportunity, partnership, future follow-up, and no fit. A GIN index supports outcome filtering. `next_trigger` is recorded on the interaction for conversation history and projected onto the contact as the current condition for re-engagement. This keeps next trigger distinct from the scheduled `next_action` and `next_action_at` fields.

V2 contact-creation and interaction-logging RPCs accept the addendum fields while retaining the V1 RPCs for compatibility. Both remain security-invoker functions with explicit internal-admin checks and grants.

## CSV import state machine

The Admin server parses the uploaded CSV in memory, tolerates LinkedIn preamble text, suggests aliases instead of assuming one header shape, normalizes values, validates rows, and previews canonical contact and Player matches. It persists only filename, hash, mapping, counts, summary, and uploader—not raw CSV rows.

`prepare_gtm_import_job` creates a `preview_ready` job. A later `import_gtm_contacts` call must present the same idempotency key, filename, content hash, field mapping, summary, and counts. The locked job is then approved and moved to `committing`. Missing or changed previews are rejected.

Contact identity precedence is normalized LinkedIn URL, unique normalized email, then source-specific stable ID. Conflicting signals fail the row. Names are never used to merge contacts. When a row has none of the approved identity signals, its import identity is scoped to the content hash and row number so a repeated name, company, and title cannot silently merge two people. Player candidates use canonical Player records; name-only candidates remain unverified, while unique name-plus-team or name-plus-college context records a stronger but still unverified method and confidence.

## Security and audit boundary

All GTM tables enable RLS. Policies require the canonical internal-admin predicate, table grants exclude `anon`, and browser RPCs use `security invoker` plus explicit authorization checks. Public Locker and normal organization routes have no grants, policies, or services for GTM records. Notes, scoring, discovery, pipeline, interactions, and relationship context therefore remain inside the Admin boundary.

Audit triggers emit actor, target, action, timestamp, canonical organization where available, and safe structured metadata. They intentionally exclude note bodies, interaction summaries, discovery prose, and raw imports.

## Deployment and recovery

Apply migrations in timestamp order. The completion migration is additive and compatible with the existing GTM migrations. No production backfill is required; new counters default to zero and existing update timestamps default to migration time. If deployment fails, leave earlier GTM tables intact, correct the additive migration forward, and rerun it in a clean staging reset before production. Do not drop populated GTM tables as rollback.

`types/database.generated.ts` was regenerated from a clean local replay of the committed migration chain and retains the deployed PostgREST compatibility marker. After the migration is deployed to staging, regenerate it from staging with the repository's pinned Supabase CLI and review that schema diff before promotion. `types/database.ts` contains the application-facing V1 aliases; it is not a replacement for the authoritative generated snapshot.

## Verification

Run the GTM database, importer, matching, discovery, and Admin contract tests. Then run the full migration reset/validation, TypeScript, lint, and build gates. Staging acceptance must also verify:

- an internal admin can preview, approve, and idempotently commit a LinkedIn CSV;
- an unauthorized and ordinary organization user cannot select, mutate, aggregate, search, or execute GTM RPCs;
- ambiguous same-name contacts and Players are not automatically merged or verified;
- interaction logging updates `last_interaction_at` and optional next action atomically;
- discovery unknown/no answers remain distinct;
- audit entries exist and contain no private prose.
