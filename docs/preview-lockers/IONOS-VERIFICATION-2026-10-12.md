# IONOS controlled verification — 2026-10-12

Final verification from existing receipts and the release owner's UI observations; no additional provider checks performed.
The final Admin reload confirmed both email controls disabled, one attempt, and one SMTP-accepted attempt.

## Scope and outcome

- The user approved one email to BLTZ's own mailbox, `dante@bltz.me`, and confirmed receipt.
- The test used synthetic preview `17373e7a-5dec-4c0a-be02-77cd4ee13430`.
- No real player invitation, cohort enrollment, or automatic sending was authorized or performed.
- One attempt was observed: `ae699ec9-d19a-4b08-b8ab-891b5bd3b571`.
- State: `smtp_accepted`; failure code: null.
- SMTP acceptance: `2026-10-12T15:45:00.763444Z`.
- User receipt confirmation is independent of the ledger's transport state; it does not create a DSN receipt.

## Mailbox and idempotency evidence

- The release owner reported the signed QStash mailbox-check job delivered with HTTP 200.
- The scoped ledger shows `last_checked_at = 2026-10-12T15:46:26.243891Z`.
- At the final scoped observation (`2026-10-12T15:50:27.795404Z`), attempt count was 1 and DSN receipt count was 0.
- No delivery report timestamp or bounce was present; state remained `smtp_accepted`.
- The release owner used the existing-attempt check for the repeat check, rather than preparing another invitation.
- The final Admin reload still showed one attempt and one SMTP-accepted attempt after the existing-attempt check; no new invitation was prepared.
- Mailbox content, recipient snapshots, message IDs, raw SMTP errors, and secret values are excluded from this document.

## Analytics evidence

- Event: `85249e0f-0ac5-4e0e-85fe-efc484fbb2ad`.
- Name/kind: `preview_email_smtp_accepted` / `email_smtp_accepted`.
- Payload hash: `8640d4e907d811147c880975ac31c6d0`.
- The release owner dispatched the existing metadata event once at `2026-10-12T15:49:08.461Z`: HTTP 200, published, event count 1; SMTP was not called.
- Batch: `1923a2df-f9dd-45de-9dc0-92e4205cc41c`.
- Batch acknowledgment: `2026-10-12T15:49:08.658344Z`.
- The production reconciliation pipe returned exactly one matching event and one physical row, with the expected payload hash.
- Exported properties were metadata only. No recipient, email body, or mailbox content was queried or exported by the observer.
- Read-only database observations checked system ID `7537636994966709920`, migration count 80, and latest migration `20261011213800`.

## Deployment and safety state

- Source: `796db7f0a269d7f6327a3c52c46f6e613b10413d`; only handoff documentation differs from code baseline `d06a52d68d43e7a6c4d3f537e1e64087bed36c2f`.
- Controlled TRUE-flags deployment: `dpl_3sRZ7PprFcjS2pKy3saJyF3yAps4`, promoted `2026-10-12T15:41:45.110Z`.
- Final OFF deployment: `dpl_9qXq6HjtAYrAY5DT7zVNAZoJC9QS`, READY and promoted `2026-10-12T15:53:50.735Z`.
- Both `BLTZ_PREVIEW_EMAIL_ENABLED` and `BLTZ_PREVIEW_EMAIL_BOUNCE_SYNC_ENABLED` are FALSE on the final deployment at build and runtime.
- Production project credentials were retained; no environment dashboard values were rewritten by the deployment helper.
- Final candidate checks: public Keith preview 200, unsigned mailbox worker 401, unauthorized invitation endpoint 401.
- No application source, schema, migration, permission, route, or new environment-variable definition changed in this verification.

## Cleanup and limitations

- Synthetic preview unpublishing succeeded. The release owner's UI showed `Unpublished draft` / `Unpublished`; visitor access stopped, and the draft was retained.
- Retain the test contact and attempt/audit history. Do not enroll the contact or automate follow-up.
- The local connection-only probe failed on the AVG-intercepted certificate chain; IMAP reported `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. This was a local TLS limitation, not evidence of invalid hosted credentials.
- A real bounce/DSN was not tested. No recurring bounce-check schedule was created.
- The prior implementation test suite was not rerun; validation here covered the existing hosted flow, authorization checks, controlled transport, and scoped analytics.
- No Career, Moment, or Value Graph relationship was added by this transport verification; no mature media workflow was duplicated.

## Durable evidence

- `test-deployment-receipt.json` and `off-deployment-receipt.json`: deployment source, flags, promotion times, and HTTP smoke checks.
- `analytics-dispatch-receipt.json`: one metadata-only dispatch, with no SMTP call.
- `scoped-analytics-final-receipt.json`: exact attempt/event/hash, acknowledgment, DSN count 0, and one Tinybird physical row.
- `connection-verification.json`: local connection-only failure with no message sent, body read, or mailbox change.
- `production-email-disabled.png`: final Admin reload showing disabled email controls and one accepted attempt.
- `synthetic-locker-unpublished.png`: retained unpublished draft and stopped visitor access.
- Mailbox delivery, user receipt confirmation, repeat-check UI, and synthetic cleanup were observed/reported by the release owner.

## Completion record

- Files changed: this verification handoff only; ignored helpers, receipts, and screenshots remain in `output/ionos-verification-2026-10-12/` in the primary checkout.
- Routes, database schemas, migrations, and permission rules: unchanged by this verification.
- Environment: existing server-only Production keys `BLTZ_PREVIEW_EMAIL_FROM`, `BLTZ_PREVIEW_EMAIL_PASSWORD`, `BLTZ_PREVIEW_EMAIL_ENABLED`, `BLTZ_PREVIEW_EMAIL_BOUNCE_SYNC_ENABLED`, and `BLTZ_PREVIEW_EMAIL_BOUNCE_WORKER_URL` were verified present. No key values are committed.
- Validation: hosted SMTP send, user-confirmed receipt, signed QStash mailbox check, exact Tinybird event/hash/physical-row reconciliation, existing-attempt repeat check, and unauthorized endpoint checks passed.
- Manual verification: one accepted invitation remained after repeat check; both controls disabled after promotion; synthetic locker returned to an unpublished draft. Keith's locker was not edited.
- Product direction: verifies transport and attribution for the existing Locker invitation/claim loop; no new Career, Moment, Value, CRM, or media-management model introduced.
- Deferred: a controlled real bounce/DSN test, recurring mailbox-check schedule, and resolution of local AVG certificate interception. Sending remains disabled pending the next approved rollout.
