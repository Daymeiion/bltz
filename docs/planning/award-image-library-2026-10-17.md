# Award Image Library

## Objective
Reuse BLTZ award artwork through the existing award catalog and allow reviewed per-Locker image overrides.

## Product reference and scope
The Product Doctrine permits persistent achievements and Locker enrichment. This is a small shared reference-artwork catalog, not the future Media Graph or a general media manager. Do not create athlete identities, infer award wins from artwork, or infer ownership from appearance.

## Layout reference
Admin → Award Image Library: upload/import controls, searchable image grid, editable image metadata and display approval; award catalog mapping list below. Existing styles and components apply.

Preview builder → Career → Awards → each award: detected or reviewed catalog match, automatic image preview, Choose library image dialog, existing player-photo/URL override, and explicit no-image choice. Public Locker → Career → Awards displays only the saved/eligible artwork with contain sizing; it exposes no management controls.

## Data and routes
Private Supabase bucket `award-library`, folder `images/`; small `award_image_assets` reference table; existing `award_catalog` gains a default image reference. Preview award JSON gains optional catalog/image selection metadata. Admin APIs remain server-authorized, revision-protected and audited. `/admin/award-images` manages assets/mappings; preview builder embeds the picker.

## Acceptance criteria
Existing bundled BLTZ graphics and existing uploaded award images can be imported without duplicate files. New PNG/JPG/WebP uploads persist. Catalog names and approved aliases suggest unambiguous matches. Manual image overrides survive refreshes and take precedence. Unknown/ambiguous awards stay reviewable. Unapproved/archived assets are withheld from public display. Admin-only management, bounded uploads, RLS, audit, save/reload, mobile and error states are verified. No external image scraping or new dependencies.

## Validation
Unit/integration tests, disposable PostgreSQL checks and generated types; lint, TypeScript, production build; production migration/deployment and real builder/Locker verification. Existing BLTZ artwork reuse was explicitly authorized by the user.
