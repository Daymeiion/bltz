-- The existing GTM importer searches active contacts by lower(btrim(email)) for
-- each row. Keep this lookup indexed without treating shared email as identity.
-- Non-unique is intentional: duplicate emails must remain ambiguous for review.
create index gtm_contacts_active_email_normalized_idx
  on public.gtm_contacts (lower(btrim(email)))
  where archived = false;

comment on index public.gtm_contacts_active_email_normalized_idx is
  'Non-unique active normalized-email lookup for bounded GTM imports; preserves shared-email collision review.';

-- Recovery is a separately reviewed forward index migration, never automatic
-- batch deletion/reimport. Retain contacts, import jobs and audit history. Removing
-- this index restores the slower lookup and requires rechecking the import gate.
