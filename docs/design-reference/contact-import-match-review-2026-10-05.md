# Contact CSV matching: exception-first review

## Page intent

Primary user: BLTZ internal Admin.
Primary action: Confirm a bounded contact import without inventing Player identity.
Secondary actions: Review a candidate, keep a contact unlinked for later, download
or restore matching progress, inspect every excluded row.
Critical information: Original file identity and mapping; accepted/excluded row
counts; automatic suggestions versus explicit verification; unresolved/deferred
identities; truthful import receipt.
Mobile priority: One review group at a time, readable context, labeled actions,
keyboard-accessible controls and pagination.
Known exclusions: NFL directory replacement, name-based identity merging, raw
CSV persistence, automatic outreach, Organization UI, production deployment.

## Existing layout and bounded changes

Preserve the current Admin navigation, upload/map/validate flow and visual tokens.
The review section should show uncertain matches first with bounded pagination.
Automatic suggestions may be collapsed and are not marked manually verified.

```text
Upload original CSV (2 MB / 10,000 rows)
  -> Map -> Validate -> Row summary / full exception diagnostics
  -> Player identity review
       Uncertain / deferred counts
       [Keep remaining uncertain contacts unlinked for later]
       Paged candidates: select / reject / review later
       Collapsed automatic suggestions: remain unverified
       [Download progress] [Restore progress]
  -> Explicit confirmation of contacts, exceptions and identity decisions
  -> Atomic import via existing authorized RPC -> Truthful receipt
```

## Safety and state behavior

Two equal names never establish duplicate contact or athlete identity. Contacts
with distinct stable source/profile identities stay separate. Conflicting rows
sharing a stable identity are quarantined visibly; preserve the original file.

Review later retains the accepted contact without a Player link and preserves
possible/ambiguous review status. It is not rejection, deletion or verification.
The later standalone GSIS review workflow is not completed by this screen.

An optional progress download contains hashes, mapping, stable decision IDs and
candidate/context signatures, not CSV rows, names or emails. Restore requires
the same file/mapping and fresh compatible candidates. File/context changes
invalidate stale decisions. Every restoration/revalidation clears confirmation.
No raw contact data is automatically persisted in browser storage.

Every server action reauthorizes and validates current candidates/deferral IDs.
Current actor/file/row-bound database confirmation and founder locks remain.
No migration, new permission, Career ID or Locker is part of this UI change.
