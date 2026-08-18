# BLTZ Media Graph Roadmap

**Status:** Phase 1.5 architecture freeze  
**Date:** August 18, 2026  
**Authoritative build order:** `docs/BLTZ_BUILD_ORDER.md`  
**This document is documentation only.** It does not authorize migrations, tables, routes, UI, packages, storage buckets, provider integrations, or product features.

---

## 1. Purpose

Phase 1.5 records repository decisions so Phase 2 can build shared identity and organization foundation without designing the future media system, and so Phase 5 can introduce a Media Graph without extending Phase One media models.

This document:

- Makes canonical identifiers and naming explicit.
- Maps current tables to future product language.
- Documents architectural conflicts in the live Phase One schema.
- Separates Media Graph work (Phase 5) from rights, attribution, and clearance (Phase 6).
- Defines a forward adaptation boundary for legacy `media` and `videos`.
- Requires a single conceptual permission API for later implementation.

## 2. Non-Goals

Phase 1.5 does **not**:

- Add or alter schema, generated types, RLS, or storage.
- Create `media_assets`, `athlete_media`, `rights_records`, `organizations`, `seasons`, or `sports_events`.
- Create a second `athletes` table.
- Extend `media` or `videos` with graph, rights-engine, or provider columns.
- Choose transcoding, CDN, Getty, or other provider vendors.
- Implement `resolveMediaPermissions`.
- Redesign Player Locker, CRM, or Admin UI.
- Rewrite `docs/BLTZ_MASTER_BUILD_ORDER_UPDATED.md` phase sequence.

Phase 2 must not use this document as a license to design Phase 5 tables.

---

## 3. Canonical Entity Decision Table

Product language may say “athlete,” “locker,” and “media asset.” Physical identifiers follow this table.

| Product concept | Canonical table / ID | Current evidence | Phase 2 / later rule |
| --- | --- | --- | --- |
| Authentication identity | `auth.users.id` | `profiles.id` FK to `auth.users(id)` | Keep Auth as identity. Do not store org or platform authorization only on the user row. |
| User profile | `public.profiles.id` (= `auth.users.id`) | `profiles.role` is a global enum: `player`, `fan`, `admin`, `publisher` | Profile data only. Organization and platform authorization must not depend on `profiles.role`. |
| Athlete | `public.players.id` | UUID PK; slug, claim, media, videos, lockers, and awards all FK here | **Canonical athlete identifier.** Do not create a second `athletes` table in Phase 2. |
| Athlete aliases / provider snapshots | `nfl_players`, `cfb_players`, and future adapter tables | `players.gsis_id`, `players.cfb_team_id`; NFL/CFB rows keyed by provider IDs | External IDs stay on adapter/source records. Do not add Getty or other provider IDs as core columns on `players`. |
| Locker | `public.player_lockers.id` with unique `player_id` | `player_lockers_player_id_key` UNIQUE; FK to `players.id` | One locker per athlete. Presentation and configuration only. Lockers consume media; they do not own media. |
| School (directory) | `public.schools.id` | Name, slug, logo, city, state | Directory/reference. Not a tenant. |
| Organization (tenant) | **Does not exist** | No `organizations` or `organization_memberships` table | Phase 2 introduces organizations as tenants. An organization may reference a school. |
| Team | `public.teams.id` | UUID PK; optional `school_id`; no `organization_id` | **Retain existing team UUIDs.** Phase 2 adds organization context. Do not recreate teams. |
| Season | **Does not exist as an entity** | `player_season_stats.season` is `smallint`; NFL/CFB `first_season` / `last_season` are year numbers | Phase 2 introduces a stable `seasons` entity. Do not treat year integers as the canonical season ID. |
| Sport event | **Does not exist** | Photo `content_context` includes `game`; no event table | Phase 2 introduces `sports_events` as career/context records. Phase 5 associates media to those IDs. |
| Athlete–team–season / roster | **Does not exist** | `players.team_id` is a single current-team FK; `player_teammates` is pairwise | Phase 2 introduces normalized roster relationships. Do not encode career history as a single `players.team_id`. |
| Phase One photo/document media | `public.media.id` | Required `player_id`; URL-centric; license eligibility columns | **Legacy.** Do not extend into the Media Graph. |
| Phase One video media | `public.videos.id` | Optional `player_id` and `owner_user_id`; `video_tags` for extra athletes | **Legacy.** Do not extend into the Media Graph. |
| Future media asset | Not created | PRD name `media_assets` | Phase 5 introduces the graph. Name is not a Phase 1.5 table. |
| Future athlete–media link | Not created | `media.player_id` (1:1 required); `video_tags` (video-only M2M) | Phase 5 join table. Association does not confer ownership or rights. |
| Future rights engine | Not created | `media.license_status`, `license_kind`, `license_request_*`, `public_locker_approved` | Phase 6. Legacy license columns are Locker eligibility fields only. |
| Migration authority | `supabase/migrations` | `supabase/config.toml` enables db migrations; tests read this directory | Only active migration directory. `lib/supabase/migrations` is legacy and receives no new files. |

---

## 4. Current Architectural Conflicts

These conflicts are observed in `supabase/migrations/20260701000000_production_schema_baseline.sql`, later `supabase/migrations` increments, and `types/database.ts`. Phase 1.5 records them; it does not resolve them in schema.

### 4.1 Dual migration directories

- Active chain: `supabase/migrations`.
- Legacy copies: `lib/supabase/migrations`.
- Some older docs still cite the legacy path.

**Decision:** new migrations go only to `supabase/migrations`.

### 4.2 Product “athlete” vs table `players`

`AGENTS.md` and the CRM PRD list an `athletes` entity. The database athlete PK is `public.players.id`. Creating `athletes` in Phase 2 would split identity, claims, lockers, and existing FKs.

**Decision:** keep `players.id`. Map product language “athlete” to that identifier.

### 4.3 Authorization collapsed onto `profiles.role`

`profiles.role` is a single global check constraint. There is no organization membership table and no specialized platform-role table.

**Decision:** `auth.users` authenticates; `profiles` stores profile data; Phase 2 adds membership and platform-role models. Do not grow `profiles.role` into that system.

### 4.4 Lockers vs media ownership

`player_lockers` is 1:1 with `players` and stores presentation fields (`headline`, `bio`, `colors`, `social`, `stats`, `media_counts`). `media.player_id` is `NOT NULL`, so Phase One photos are owned by one athlete row. Public Locker queries therefore treat athlete-owned rows as locker content.

**Decision:** lockers consume eligible media. They do not own the future graph. `media_counts` on the locker is a presentation cache, not an ownership model.

### 4.5 Schools vs organizations vs teams

- `schools` are directory rows.
- `teams.school_id` optionally points at a school.
- `players.school_id` and `players.team_id` are current-directory FKs.
- No organization tenant exists.

**Conflict:** tenancy is missing, and school is currently the closest grouping key. Phase 2 must not promote `schools` into tenants.

**Decision:** organizations are tenants and may reference a school. Existing `teams.id` values are kept and gain organization context.

### 4.6 Career context is not normalized

Missing: `seasons`, `sports_events`, athlete-team-season/roster. Present instead:

- `players.team_id` (one team)
- `player_season_stats.season` (year `smallint`)
- `media.competition_level` / `content_context` (photo sort labels)
- `cfb_players.first_season` / `last_season`

**Decision:** Phase 2 introduces stable season, event, and roster entities. Phase 5 attaches media to those IDs and does not invent a parallel career model.

### 4.7 Two legacy media models

| Concern | `media` | `videos` |
| --- | --- | --- |
| Identity | UUID | UUID |
| Athlete link | Required `player_id` | Optional `player_id` plus `owner_user_id` |
| Extra athletes | None | `video_tags.tagged_player_id` |
| Bytes | `url` / `source_url` text | `playback_url` / `thumbnail_url` text |
| Eligibility | `license_status`, `public_locker_approved`, request workflow | `visibility` enum only |
| Types | `photo`, `headshot`, `video`, `document` | Video rows only |

Additional URL bypasses on `players`: `video_url`, `highlight_url`, `youtube_urls`, `headshot_url`, `image_url`, `profile_image`.

**Decision:** both tables are Phase One legacy. Do not merge them by adding columns. Phase 5 defines a forward adaptation boundary.

### 4.8 Legacy license fields are not a rights engine

`media` carries `license_status`, `license_kind`, `rights_holder`, `usage_terms`, `public_locker_approved`, `license_checked_*`, and `license_request_*`. These gate public Locker photos. They do not model territory, term, commercial use, approvals, revocation history, or multi-party attribution.

**Decision:** keep them as Phase One eligibility fields until Phase 5/6 adaptation. Do not evolve them into Phase 6.

### 4.9 Provider identifiers already sit on core athlete rows

No Getty columns exist. NFL/CFB identifiers already do: `players.gsis_id`, `players.cfb_team_id`, `nfl_players` / `cfb_players` keyed by `gsis_id` / `espn_id`, plus additional NFL provider IDs (`espn_id`, `pfr_id`, `nfl_id`, `pff_id`, `smart_id`).

**Conflict:** the adapter rule is forward-looking and is already violated for NFL/CFB keys on `players`. Phase 1.5 does not invent a relocation. Phase 2 must not add new provider IDs to `players`, `player_lockers`, `teams`, or organizations. Relocating `gsis_id` / `cfb_team_id` is deferred.

### 4.10 Type contract is incomplete

`types/database.ts` is a handwritten subset, not `supabase gen types` output. It includes `Media` license fields and `Video` visibility, and omits most baseline tables.

**Decision:** Phase 1.5 does not regenerate types. Phase 2 and Phase 5 must regenerate after their own schema changes.

### 4.11 Historical vs authoritative phase numbers

`docs/BLTZ_MASTER_BUILD_ORDER_UPDATED.md` uses Phase 5/6 for Digital Intelligence. The authoritative file uses Phase 5 for **BLTZ Media Graph** and Phase 6 for **Media Rights, Attribution & Clearance Engine**.

**Decision:** follow `docs/BLTZ_BUILD_ORDER.md` only.

---

## 5. Normalized Future Media Graph Boundaries

Phase 5 owns the graph. The names below are conceptual boundaries, not approved `CREATE TABLE` statements.

```text
Athlete (players.id)
    → Career (roster / athlete-team-season)
        → Organization / Team (tenant + retained teams.id)
            → Season
                → Event (sports_events)
                    → Media asset (Phase 5 identity)
                        → Storage locator + derivatives
                        → Athlete associations (many-to-many)
                        → Rights / clearance (Phase 6, separate records)
                            → Distribution (Locker and other destinations)
                                → Analytics
                                    → Monetization
```

### In the graph

- One media-asset identity independent of a single `player_id`.
- Storage locator (provider, bucket/container, object key, checksum, MIME, size). Raw URLs are not the asset identity.
- Derivatives (original, thumbnail, transcode, cutout) as child locators, not overwrites.
- Many-to-many athlete associations with relationship type. Association ≠ rights.
- Optional FKs to Phase 2 organization, team, season, and `sports_events`.
- Provenance as source metadata, not permission.
- Distribution records that say where an asset is offered (Locker, later channels). Offering is not clearance.

### Out of the graph

- Rights, attribution, clearance, and approval state (Phase 6).
- Locker theme, bio, and branding (`player_lockers`).
- Organization membership and platform roles (Phase 2).
- Campaigns, analytics ledgers, and revenue allocations (later phases).
- Provider payload columns on `players`, lockers, teams, or organizations.

Phase 2 may create seasons, `sports_events`, and roster tables because those are identity/career context. It may not create media-asset, derivative, or athlete-media graph tables.

---

## 6. Legacy `media` / `videos` Compatibility Strategy

Phase 5 must adapt Phase One rows forward. It must not keep growing those tables as the graph.

### Boundary

1. **Freeze as producers.** After Phase 5 starts, new graph-capable assets are created in the Media Graph, not by adding graph columns to `media` or `videos`.
2. **Map, do not merge in place.** Each legacy `media.id` and `videos.id` gets an adaptation record or equivalent mapping to a future asset identity. Do not require one physical table merge in Phase 2.
3. **Preserve IDs.** Legacy UUIDs remain stable so Locker photo/video URLs and dashboard rows do not break during adaptation.
4. **Split ownership from association.** `media.player_id` becomes one athlete association (likely `featured` or equivalent). `videos.player_id` / `owner_user_id` / `video_tags` become associations plus an owner actor; they do not become asset PK.
5. **Relocate bytes to locators.** `media.url`, `videos.playback_url`, and `players.*_url` fields become locators or distribution pointers. Player URL columns are compatibility shims until Locker reads the graph.
6. **Relocate eligibility.** `media.license_*` and `public_locker_approved` inform Phase 6 seed/backfill. They are not the runtime rights model. `videos.visibility` remains a Phase One display flag until the permission resolver replaces it.
7. **Do not dual-write indefinitely.** A compatibility window is allowed so public Locker can keep reading legacy tables. The window ends when Locker and CRM read the graph through the permission resolver.

Phase 2 and Phase 4 roster work continue to read legacy `media` / `videos` as they exist. They do not add Media Graph columns.

---

## 7. Storage-Locator and Derivative Requirements

Current storage is fragmented: public `headshots` bucket, `message-images` used without a matching baseline bucket migration, URL strings on `media`/`videos`/`players`, and external NFL/CFB URLs.

Phase 5 locators must record, at minimum:

- Storage provider (Supabase Storage or an approved object store)
- Bucket or container
- Object key
- Content type and byte size
- Checksum
- Visibility class (private original vs public derivative)
- Whether the object is original or derived

Derivative rules:

- Originals are immutable. Derivatives never overwrite originals.
- Thumbnails, transcodes, and claimed-Locker headshot cutouts are derivatives with their own locators and processing metadata.
- Paid derivative processing follows existing Locker policy: do not process unclaimed scraped candidates.
- Public Locker may receive signed or public derivative URLs only after `resolveMediaPermissions` allows that usage.

Phase 1.5 does not name new buckets or choose a transcoding vendor.

---

## 8. Provider-Adapter Boundary

External systems (NFL/CFB snapshots, future Getty, search, enrichment, transcoding) enter through adapters.

- Adapter input/output may store provider IDs, payloads, and sync cursors on adapter-owned tables.
- Core entities — `players`, `player_lockers`, `teams`, organizations, and future media assets — expose BLTZ identifiers only.
- Getty IDs and equivalent keys must not be added as core columns on athletes, Lockers, teams, or organizations.
- Existing `players.gsis_id` and `players.cfb_team_id` are legacy exceptions, not a pattern.
- Provider failure, rate limits, and licensing terms stay inside the adapter. The graph stores normalized locators and provenance, not vendor schemas.

---

## 9. Separate Rights Concepts

Do not collapse these into `media.license_status`.

| Concept | Meaning | Current stand-in | Owner |
| --- | --- | --- | --- |
| Provenance | Where the file came from | `media.provenance` | Phase 5 metadata |
| Storage eligibility | Whether bytes are private, signed, or public | Public `headshots` bucket; URL strings | Phase 5 locators |
| Legacy Locker gate | Phase One photo display check | `license_status`, `public_locker_approved` | Compatibility only |
| Rights record | Who owns/licenses what use, where, and when | Missing | Phase 6 |
| Attribution | Who must be credited and who shares proceeds | `media.credits`; `video_tags` comment about revenue | Phase 6 |
| Clearance | Whether a specific use is allowed now | Missing | Phase 6 |
| Approval | Athlete/org/rights-holder response | Missing | Phase 6 / Phase 7 |
| Distribution | Whether the asset is offered on a surface | `players.visibility`; `videos.visibility` | Phase 7 uses Phase 5 distribution records |
| Publication | Locker (or channel) publish/unpublish action | Missing formal publication entity | Phase 7 |

Rules carried forward from product docs, to be enforced by the resolver rather than by column checks in UI:

- Association does not establish ownership or rights.
- Unverified content cannot be monetized.
- Expired or revoked rights cannot remain commercially published.
- Public Lockers must not expose internal rights records, disputes, or confidential terms.

---

## 10. Conceptual Permission API

Every later media read or mutation that depends on eligibility calls one function:

```text
resolveMediaPermissions(asset, usageContext) → PermissionDecision
```

This is a conceptual contract. Phase 1.5 does not specify tables, RPC names, or TypeScript modules.

### Inputs

- `asset`: canonical future media-asset identity (during compatibility, a mapped legacy `media` or `videos` row).
- `usageContext`:
  - `surface`: `locker` | `athlete_dashboard` | `organization_crm` | `admin` | `campaign` | other registered channel
  - `action`: `display` | `download` | `edit` | `publish` | `unpublish` | `monetize` | `distribute`
  - `actor`: authenticated user, athlete (`players.id`), organization member, or platform admin
  - `organizationId` when the action is tenant-scoped
  - `territory` / `atTime` when Phase 6 records exist

### Output (conceptual)

- `allowed`: boolean
- `reasons`: stable codes (missing rights, expired, revoked, approval pending, actor unauthorized, surface not cleared)
- `constraints`: display-only, no download, no commercial use, watermark, expiry
- `provenanceLabel`: public-safe label when `surface` is Locker

### Guardrail

Do not implement parallel checks such as `if (media.license_status === 'approved')` on Locker, CRM, Admin, or campaign surfaces once the resolver exists. Legacy Locker photo gating may remain until Phase 5/6 adaptation lands.

---

## 11. Phase 2 Requirements

Phase 2 builds shared platform foundation. It consumes this freeze; it does not design the Media Graph.

**Required**

- Treat `auth.users` as authentication identity and `profiles` as profile data.
- Add organizations and `organization_memberships`. Do not authorize from `profiles.role`.
- Keep `public.players.id` as the athlete PK. No `athletes` table.
- Keep `player_lockers` 1:1 with `players` as presentation/configuration.
- Keep `schools` as directory entities. Organizations may reference a school.
- Retain existing `teams.id` values and add organization context.
- Introduce stable `seasons`, `sports_events`, and normalized athlete-team-season/roster relationships.
- Protected layouts, organization switcher, server-side authorization, RLS review, audit-log foundation.

**Forbidden**

- Media Graph tables, derivative tables, or athlete-media join tables.
- Extending `media` / `videos` toward the graph or rights engine.
- New provider IDs on `players`, `player_lockers`, `teams`, or organizations.
- New storage buckets or Getty/provider integrations.
- Implementing `resolveMediaPermissions`.

Phase 2 may document FK placeholders in prose (“media will later reference `sports_events.id`”). It may not create those media FKs.

---

## 12. Phase 5 and Phase 6 Responsibilities

### Phase 5 — BLTZ Media Graph

- Canonical asset identity, locators, and derivatives.
- Library/detail UX against the new graph.
- Upload or authorized URL ingest through locators.
- Many-to-many athlete associations.
- Attach assets to Phase 2 organization, team, season, and event IDs.
- Provenance metadata.
- Distribution records and activity history.
- Adapter boundary for external media sources.
- Forward adaptation of legacy `media` and `videos`.
- Wire reads that need eligibility through `resolveMediaPermissions` (decisions still come from Phase 6 records once they exist; until then, documented compatibility rules).

### Phase 6 — Media Rights, Attribution & Clearance Engine

- Rights records and statuses.
- Attribution of rights holders and revenue stakeholders.
- Clearance: territory, term, permitted use, commercial/edit/download constraints.
- Supporting documents.
- Athlete, organization, and rights-holder approvals.
- Publication-blocking rules.
- Audit history for rights and clearance changes.
- Backfill from legacy `media.license_*` where those fields are trustworthy, without keeping them as the engine.

Phase 7 (Locker publishing) remains a separate workflow: select asset → associate athletes → record rights → request approvals → athlete responds → publish → appear in the correct Locker → show provenance → unpublish. Phases 5 and 6 make that workflow enforceable; they do not replace it.

---

## 13. Canonical Product Flow

```text
Athlete
    → Career
        → Organization / Team
            → Season
                → Event
                    → Media
                        → Rights
                            → Distribution
                                → Analytics
                                    → Monetization
```

| Step | Canonical meaning | When it becomes real |
| --- | --- | --- |
| Athlete | `players.id` | Exists |
| Career | Normalized roster / athlete-team-season history | Phase 2 |
| Organization / Team | Tenant organization plus retained `teams.id` | Phase 2 |
| Season | `seasons` entity, not a year integer | Phase 2 |
| Event | `sports_events` | Phase 2 |
| Media | Media Graph asset + locators + associations | Phase 5 |
| Rights | Rights, attribution, clearance, approvals | Phase 6 |
| Distribution | Publish to Locker and later channels | Phase 7 |
| Analytics | Measured engagement on distributed assets | Phase 11 in `docs/BLTZ_BUILD_ORDER.md` |
| Monetization | Revenue records and allocations | Phase 12 in `docs/BLTZ_BUILD_ORDER.md` |

Do not start campaigns or advanced analytics until the publishing workflow works.

---

## 14. Phase 1.5 Acceptance Criteria

| Criterion | Result |
| --- | --- |
| No schema or application code changed | Met. Only `AGENTS.md`, `docs/BLTZ_BUILD_ORDER.md`, `docs/BLTZ_MASTER_BUILD_ORDER_UPDATED.md`, and this file. |
| Canonical IDs and naming decisions are explicit | Met. Section 3. |
| Legacy media conflicts are documented | Met. Section 4 and Section 6. |
| Phase 2 can proceed without designing Phase 5 tables | Met. Section 11. |
| No provider-specific dependency is introduced | Met. No packages, columns, or vendor integrations added. Adapter rule recorded. |
| Authoritative build-order document is unambiguous | Met. `docs/BLTZ_BUILD_ORDER.md` is marked authoritative; the updated master file is historical. |

---

## 15. Conflicts Reported, Not Invented

The following are unresolved on purpose. Phase 1.5 does not pick a schema design where the repository does not already decide one.

1. How existing `teams` without an organization are backfilled when organization context is added.
2. Whether `teams.school_id` remains after organizations reference schools.
3. Whether legacy `players.gsis_id` and `players.cfb_team_id` move off `players` onto adapter tables.
4. Physical table names and column lists for the Phase 5 graph and Phase 6 rights engine.
5. Whether adaptation is a side-by-side mapping table, a view, or a later rewrite of Locker queries.
6. Storage bucket names, private-vs-public policy for new originals, and transcoding vendor.
7. Exact TypeScript module path for `resolveMediaPermissions`.
8. Remaining Player Locker gaps marked `partially_complete` or `blocked` in `docs/player-locker-gap-analysis.md` (explicitly deferred; not reopened here).
9. `AGENTS.md` expected-entity list still uses product names `athletes` and `lockers`; canonical tables are `players` and `player_lockers`.
10. CRM PRD data-model names (`athletes`, `lockers`, `media_assets`) remain product language, not Phase 2 DDL.
