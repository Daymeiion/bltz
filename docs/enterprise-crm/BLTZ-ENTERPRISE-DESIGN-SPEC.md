# BLTZ Enterprise CRM — Design Specification

**Status:** Approved implementation contract  
**Scope:** Enterprise organization CRM (`/organization/**`)  
**Does not apply to:** public Player Lockers, athlete-facing Locker experiences, or BLTZ internal Admin unless a later specification explicitly adopts these tokens

## 1. Authority and precedence

This document is the canonical visual and interaction contract for Enterprise CRM routes. Within `/organization/**`, it overrides conflicting presentation rules in root `DESIGN.md`, including dark-mode default, maximum 8px radii, and the ban on pill/folder navigation. Root `DESIGN.md` remains authoritative for Player Locker and other non-CRM surfaces.

Security, RBAC, data integrity, and product behavior remain controlled by `AGENTS.md`, the active build order, and journey specifications. Reference images define hierarchy and intent, not permissions, live values, or database contracts.

## 2. Product posture

BLTZ Enterprise is a data-driven sports operations environment. It should feel modern, calm, premium, precise, trustworthy, and efficient during long professional sessions. It shares BLTZ identity with Player Locker but must not look like a Locker expanded into a dashboard.

Design priority:

1. Signal
2. Status
3. Relationship
4. Ownership
5. Action
6. Performance

Use media contextually. Avoid cinematic hero layouts, oversized athlete imagery, decorative glow, gradients across operational surfaces, generic SaaS illustration, and unnecessary motion.

## 3. CRM token layer

Tokens resolve in this order:

```text
BLTZ enterprise base
→ enterprise semantic tokens
→ safe organization-theme accents
→ component tokens
```

### 3.1 Color

```css
[data-product="enterprise-crm"] {
  color-scheme: light;

  --crm-bg-app: #f3f5f7;
  --crm-bg-workspace: #f8f9fb;
  --crm-surface: #ffffff;
  --crm-surface-subtle: #f1f3f5;
  --crm-surface-hover: #eceff3;
  --crm-surface-selected: #eaf0ff;

  --crm-fg-primary: #171a21;
  --crm-fg-secondary: #4d5562;
  --crm-fg-muted: #6f7782;
  --crm-fg-disabled: #9aa1aa;
  --crm-fg-inverse: #ffffff;

  --crm-border-subtle: #e2e6ea;
  --crm-border-strong: #cbd1d8;
  --crm-border-selected: #8aa7ff;

  --crm-action-primary: #2952ff;
  --crm-action-primary-hover: #1f43db;
  --crm-action-primary-active: #1835b3;
  --crm-focus: #2952ff;

  --crm-positive: #16794b;
  --crm-positive-bg: #e8f6ef;
  --crm-info: #2457c5;
  --crm-info-bg: #eaf0ff;
  --crm-attention: #9a5b00;
  --crm-attention-bg: #fff3d6;
  --crm-review: #8a5700;
  --crm-review-bg: #fff0c2;
  --crm-restricted: #5d6470;
  --crm-restricted-bg: #eef0f2;
  --crm-blocked: #b42318;
  --crm-blocked-bg: #fdecea;
  --crm-destructive: #b42318;

  --crm-org-accent: #2952ff;
  --crm-org-highlight: #d6a500;
}
```

Rules:

- BLTZ blue owns primary actions and focus. Organization colors never replace it.
- Semantic colors are product-controlled and always include text/icon meaning.
- Do not use school colors as status colors.
- Main operational canvases are light/neutral. Dark surfaces are limited to restrained product chrome or media previews.
- Do not introduce purple/violet unless a later BLTZ-wide decision explicitly approves it.

### 3.2 Typography

- **Interface/body:** existing self-hosted Barlow, weights 400/500/600.
- **Display identity:** Barlow Condensed, weights 600/700, limited to BLTZ/product identity and selected page titles—not every card title.
- **Numeric/metadata:** JetBrains Mono for compact IDs, timestamps, dates, and KPI numerals when it improves scanning.
- Never add a new font family for one CRM page.

| Token | Size / line height | Use |
|---|---|---|
| `crm-text-xs` | 12 / 16 | captions, table metadata |
| `crm-text-sm` | 14 / 20 | controls, secondary data |
| `crm-text-base` | 16 / 24 | body and form content |
| `crm-text-md` | 18 / 26 | emphasized body |
| `crm-text-lg` | 20 / 28 | card/section title |
| `crm-text-xl` | 24 / 32 | page subsection |
| `crm-text-2xl` | 32 / 40 | page title |
| `crm-text-kpi` | 32 / 36 | KPI value; may reduce at compact widths |

Operational body text may be 14px in tables and dense metadata. Narrative body text remains at least 16px.

### 3.3 Spacing and density

Use a 4px base scale: `4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64`.

- Page gutter: 32px desktop, 24px tablet, 16px mobile.
- Major section separation: 28–40px.
- Large container padding: 24–32px desktop, 20–24px tablet, 16–20px mobile.
- Control gaps: 8–12px. Related content gaps: 12–20px.

Density variants:

- **Comfortable:** executive cards, detail summaries, first-use states.
- **Standard:** default forms, lists, directories.
- **Compact:** high-volume tables and queues only.

Pages may select a density variant but may not invent padding values.

### 3.4 Radius, borders, and elevation

```text
crm-radius-sm: 8px     badges, compact controls
crm-radius-md: 12px   inputs, buttons, pill/folder tabs
crm-radius-lg: 18px   standard cards, drawers
crm-radius-xl: 24px   large section containers/workspaces
crm-radius-full: 999px avatar/status dots only
```

- File-style pill tabs use `crm-radius-md`; they are not bubble-shaped full pills.
- Large rounded boxes use `crm-radius-xl` and group a meaningful section, not every row.
- Default borders are 1px subtle. Selected/focus borders may strengthen without shifting layout.
- Shadows are restrained: none for flat rows; a small soft shadow for menus/drawers/modals; no glow.

### 3.5 Motion

- Micro interaction: 120–180ms.
- Drawer/modal: 180–240ms.
- No idle animation or delayed operational reveal.
- `prefers-reduced-motion` removes transforms and uses immediate state changes or short opacity transitions.

## 4. Layout contract

### Desktop (`≥1024px`)

- Sidebar: 264px expanded, 76px collapsed.
- Utility/header bar: 72px.
- Content is fluid with a readable maximum of 1600px where appropriate.
- Optional right rail: 320–360px; it may collapse below content when space is insufficient.
- Tables may span the workspace; executive cards use a responsive 12-column grid.

### Tablet (`768–1023px`)

- Sidebar collapses to an icon rail or accessible drawer according to available width.
- Scope and date controls may wrap below title without reordering meaning.
- Two-column cards become one or two columns based on minimum component widths.

### Mobile (`375–767px`)

- Navigation opens in a focus-trapped drawer and closes with Escape.
- Preserve organization/scope, page identity, primary action, urgent attention, then summaries—in that order.
- Tables use approved responsive rows, horizontal overflow inside the table region, or a focused list; never cause page-level horizontal overflow.
- Touch targets are at least 44×44px.

Canonical test widths: `375, 768, 1024, 1440`.

## 5. Enterprise shell

The persistent shell contains BLTZ identity, organization identity, primary navigation, organization/team scope, global search entry, Create menu, notifications, user/profile, role, system health, and collapse/drawer behavior.

- Primary navigation labels follow the active journey/build-order contract.
- Unimplemented destinations are visibly unavailable and not linked to missing pages.
- Scope is persistent and always visible. A scope change clears/re-authorizes prior data before rendering the next scope.
- School logo/mark is contextual; BLTZ remains the product owner.
- Dark shell chrome is permitted if it remains restrained and the workspace stays light/neutral. A light shell is also valid when implemented through the same tokens. Feature pages may not choose independently.

## 6. Navigation contract

### File-style pill subnavigation

Use the shared `PillTabs` component for Executive Overview, Athletics, Revenue, Engagement, Performance, and Pipeline.

- Visual: quiet neutral track or independent folder-style tabs, 12px radius, clear selected surface/border, no oversized bubble silhouette.
- Semantics: actual links for routes; ARIA tab pattern only for in-page tab panels.
- Keyboard: native link behavior or Left/Right/Home/End for true tabs.
- States: default, hover, active/current, focus-visible, disabled/unavailable, overflow.
- On narrow screens: controlled horizontal scroll with visible affordance or an accessible overflow menu. Do not silently truncate labels.

Breadcrumbs describe hierarchy, not history. Page tabs never replace primary navigation.

## 7. Action hierarchy

- **Primary:** BLTZ blue filled button. One dominant page/region action where possible.
- **Secondary:** neutral surface with strong border/text.
- **Tertiary:** text or quiet ghost action.
- **Destructive:** BLTZ destructive treatment plus explicit confirmation when impact is material.
- **Icon:** must have an accessible name and tooltip when meaning is not visible.

Primary actions include Create, Save, Approve, Publish, Submit, Continue, Confirm, Complete, and Assign. School accents never recolor them. Buttons use 12px radius and minimum 44px height; button groups do not become decorative pill clusters.

## 8. Component contracts

### Section container

Large 24px-radius surface used for a coherent module such as Executive Attention or Member Workload. It has a clear heading, optional description/count, body, and restrained action area. Nested surfaces use smaller radii and flatter hierarchy.

### KPI card

Label, value, timeframe/definition, optional delta and sparkline, last-updated/stale state. Never show fabricated zeroes while loading or unavailable. Financial values use permission-aware formatting.

### Data table/list

Supports sorting, filters, status, entity references, row actions, selection where authorized, pagination/progressive loading, and explicit loading/empty/error/restricted states. Bulk actions are permission-aware on the server.

### Status and priority badges

Map domain states into product semantic variants: positive, neutral, informational, attention, review, restricted, blocked, inactive. Badge text is mandatory; color alone never communicates status.

### Entity reference

Consistent avatar/logo, primary label, secondary context, and optional status. It behaves consistently in tables, cards, activity, assignment, search, and participant lists.

### Assignment drawer

Standard 420–480px desktop drawer; full-width mobile sheet. Contains source summary, eligible member picker, priority, optional due date/comment, validation, submit state, error recovery, success, close, and unsaved-change protection. Focus moves into the drawer and returns to its trigger.

### Menus and modals

Menus are for short action lists. Confirmation/warning/destructive/create/permission modals are concise. Long workflows use a page or drawer.

### Charts

Use line, bar, area, donut, trend, comparison, and progress only where visual comparison is materially clearer than text. Include accessible labels/summary, timeframe, source/last updated, and non-color distinction. Organization accent may join the palette only after contrast testing.

### Intelligence

AI surfaces distinguish detected, inferred, recommended, and verified information. Show confidence/coverage, source/provenance, freshness, reasoning, and human-controlled action. Do not use sparkle decoration as the only AI indicator or let AI styling overwhelm the enterprise hierarchy.

## 9. State contract

Every major surface implements applicable states:

- default;
- hover, active, selected, focus-visible;
- disabled;
- loading/skeleton with final geometry reserved;
- first-time empty with purpose and allowed next action;
- filtered empty with visible reset;
- permission/restricted without data inference;
- processing/queued/analyzing/review/completed/failed where applicable;
- partial data/stale data with timestamp;
- recoverable error with safe retry;
- success confirmation without relying only on toast.

Never use a centered full-page spinner when shell geometry is known. Never convert missing or failed data into a zero metric.

## 10. School theming

Theme source is the canonical Division I/II school identity dataset. The organization references that record; the CRM does not duplicate school identity fields.

Allowed organization influence:

- logo/mark and organization name;
- navigation selection accent;
- scope indicator and selected non-semantic filters;
- team marks;
- decorative rule/highlight used sparingly;
- accessible comparative chart series.

Prohibited influence:

- primary/destructive action color;
- success, warning, review, restricted, blocked, error, or permission states;
- typography, spacing, radius, layout, or interaction patterns;
- authorization, workflow, or data.

Theme resolution validates contrast. Unsafe or missing colors fall back to BLTZ tokens. Authorized admins can select School Theme or BLTZ Default; the change is presentation-only.

## 11. Accessibility

Meet WCAG 2.2 AA:

- 4.5:1 normal text and 3:1 large text/interactive boundaries;
- 2px visible focus indicator with sufficient contrast and no clipping;
- semantic headings/landmarks, labelled controls, and status text plus color/icon;
- keyboard-operable shell, tabs, menus, drawers, filters, tables, and dialogs;
- focus trap/return for overlays;
- screen-reader announcements for async results/errors without excessive interruption;
- 200% zoom and reflow without loss of function;
- reduced motion support;
- accessible chart summaries and table alternatives.

## 12. Content and data language

- Use sports-operations language without forcing Locker/fan vocabulary into enterprise tasks.
- Prefer direct labels: Assign owner, Review rights, Create Opportunity, View Activation.
- Never imply preview data is live. Preview values are explicitly labelled.
- Metrics include definition, timeframe, source/last updated, and denominator where relevant.
- AI copy states uncertainty. Permission states do not reveal the existence/value of restricted records.

## 13. Governance and acceptance

A new foundational pattern is allowed only when no approved component fits, a real requirement demands it, it is reusable, and it is added here/shared before duplication. Feature-only domain components may exist but still use these foundations.

Design acceptance for each CRM slice requires:

- screenshots at 375, 768, 1024, and 1440 where the route supports those widths;
- default, loading, empty, error, restricted, and processing/success states as applicable;
- keyboard/focus and automated accessibility evidence;
- School Theme and BLTZ Default evidence;
- no page-local token invention;
- no Locker-like media domination;
- no school override of BLTZ actions/semantics;
- component names aligned to the approved inventory;
- documented, Coordinator-approved deviations.

## 14. Reference relationship

- Root `DESIGN.md`: canonical for Player Locker and non-CRM surfaces.
- `docs/design-reference/crm-feature-surface-map.md`: approved CRM hierarchy and progressive-disclosure input.
- `docs/design-reference/crm-dashboard-wireframe.md`: earlier shell behavior reference; current navigation labels come from the active build order/journey.
- CRM reference images: hierarchy/interaction intent only; not canonical color, permission, or data contracts.
