# GTM Relationship Intelligence Addendum

## Scope

This additive change extends the existing private `gtm_contacts` model. It does not create a second contact system, change canonical Player data, replace pipeline stages, alter priority-score weights, or add automated outreach.

## Contact fields

- `contact_type` accepts the relationship-intelligence taxonomy while retaining the legacy `enterprise`, `multiplier`, and `unclassified` values.
- `contact_type_other` optionally clarifies only the `other` contact type.
- `potential_roles` stores zero or more approved strategic roles as a nullable text array.
- `relationship_objective` stores one current primary objective.
- `relationship_priority` stores `critical`, `high`, `medium`, or `low` independently from the existing score and tier.
- `relationship_context` stores concise strategic context.

All new columns are nullable. Existing rows require no backfill and continue to render as “Not recorded.” Existing `create_gtm_contact_v2` and `update_gtm_contact_v1` functions remain available; the Admin workflow uses the versioned V3 create and V2 update functions.

## Security and data access

The existing `gtm_contacts` RLS policies remain authoritative. New database functions use `security invoker`, verify `public.is_internal_admin()`, and revoke default function access before granting execution to the existing authenticated/service roles. The canonical GTM server read model includes the new metadata for future authorized next-action, summary, and recommendation features.

## Deployment and recovery

Apply `20260826191933_extend_gtm_relationship_intelligence.sql` after the existing GTM Foundation V1 migrations, then regenerate `types/database.generated.ts` from the deployed schema. No data backfill or environment-variable change is required.

The migration is backward compatible. If the UI must be rolled back, older code ignores the nullable columns and the preserved older functions continue to work. Avoid dropping the columns during an emergency rollback because newly captured relationship context would be lost; prefer a forward fix.

## Deferred by design

- final role-based scoring weights;
- autonomous outreach or next-action generation;
- investor- or university-specific dashboards;
- changes to conversation outcomes, next triggers, pipeline stages, or Player matching rules.
