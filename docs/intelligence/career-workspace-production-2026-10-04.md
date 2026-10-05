# Intelligence Lab production integration

## Objective
Publish the approved Athlete B / Moment B workspace on the existing private `/admin/intelligence` route, reading canonical athletes, reviewed Moments, evidence, deterministic signals, opportunities and existing media metadata.

## Product reference
BLTZ Product Doctrine v1.2, the current production source at `output/merch-production-release/docs/product/BLTZ_PRODUCT_DOCTRINE.md`, and the approved concepts in `mockups/intelligence-lab/CONTRACT.md`.

## Included
- Shared three-column athlete / Moment file, dark and light themes, mobile search and portrait-first identity.
- Existing internal-admin authorization before every server data read.
- Bounded search, canonical IDs, traceable evidence and honest incomplete states.
- Read-only real data and existing explicitly linked private-preview portrait/contact metadata.
- Intelligence Lab navigation in the existing desktop and mobile admin sidebar.

## Excluded
No cohort/onboarding, CRM, authentication changes, new accounts, provider requests, schema changes, rights inference, activation editor/persistence, fictional brands or fabricated reach metrics.

## File plan
Add the client `CareerWorkspace` and scoped styles; add workspace reader/types reusing `lab-server`; switch the existing page to the approved workspace; add a protected read-only `/api/admin/intelligence` GET handler. Preserve the existing sidebar and theme shell with only the Intelligence route additions. Add focused reader, UI, page and endpoint tests.

## Data / permissions
`players.id` remains the Athlete Career ID. Existing graph tables and verified mappings supply facts. Source/fetch/publication/event dates remain separate. Athlete-level media is never presented as Moment media without a recorded link. The private Lab can inspect explicitly linked preview metadata without claiming public clearance. Every request requires `is_internal_admin`; no service credentials or raw provider payloads enter the browser.

## Acceptance criteria
- Production admin sidebar reaches the Lab; anonymous/non-admin requests fail closed.
- Real athlete search/selection, evidence disclosures, Moment navigation and signal → opportunity relationships work.
- Missing confidence, contacts, previews, Moment media and activations remain explicit.
- Mobile and desktop match the approved hierarchy, with accessible controls and reduced motion.
- Existing production Locker/authentication source remains unchanged in the isolated release.

## Validation / release
Focused and full available Vitest tests, TypeScript, lint and production build; authenticated desktop/mobile inspection; anonymous endpoint checks. Assemble only verified current production source plus the scoped Intelligence overlay. Build an unaliased production candidate, verify the live baseline has not changed, then promote. Retain previous deployment `dpl_GVu2mt6e6KG5Vk3yjBA7yzBY8PZp` for rollback.

## Product direction
This makes persistent athlete → career / Moment → evidence → signal → opportunity relationships inspectable. It creates no new graph facts or Value Graph transactions. It remains useful after an athlete leaves an organization and duplicates no third-party media workflow.

## Live data check
Read-only verification found Keith Rivers under the existing canonical Career ID: two reviewed Moment associations, 21 verified evidence records (eight content references, two performances and two occurrences among them), eight sources and eight ingestions with resolved source relationships, one verified external identity and eight legacy season-stat records. There are no normalized roster relationships or legacy media/video records for this athlete. One private Preview Locker is explicitly linked by `player_id` and supplies the existing ESPN portrait reference.

Article publication dates include 2006 and 2015; post-career interview references include 2021 and 2025. Three linked YouTube release dates are unknown and must remain unknown. Evidence capture dates are October 1 UTC; they are not event or publication dates. Production lacks optional legacy asset approval columns, so withheld asset previews remain distinct from real article/video reference links. No provider request, database write or merge was made for this integration.
