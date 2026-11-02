# Executive Wave 2 — Gate 3C Evidence Integration Report

**Date:** 2026-08-24  
**Integration branch:** `codex/crm-integration-executive`  
**Evidence base:** `crm-executive-wave2-gate3c-evidence-base` / `11ff4d9a0e067b6bb2cf77e350b35f4c1338a9fb`  
**Evidence source head:** `36866245a64f362768a5fd978bb7c2ce0a16d55b`

## Decision

**Gate 3C: FAIL — one high keyboard/screen-reader confirmation defect remains.**

The component inventory, per-export/state tests, responsive evidence, reduced-motion repair, and production build are otherwise acceptable. Gate 3B remains unchanged and blocked on user approval. No migration or Feature packet is authorized.

## Integration and allowlist

The evidence branch was a clean linear series from the immutable evidence base and was fast-forwarded in full:

1. `21c562d` test — exposed incomplete metric-delta semantics
2. `6ab8fc3` fix — added direction/sentiment text
3. `9e27769` test — exposed drawer protected-state focus gaps
4. `2baa98d`, `4e13e0b` fix — added enabled focus fallback and deterministic Keep Editing return
5. `4098f10` test — exposed 320-pixel reflow overflow
6. `8bd086a` fix — corrected CRM-scoped responsive min-width/reflow behavior
7. `8f3a50d` test — exposed reduced-motion gap for the portalled drawer
8. `48f3714` fix — extended the CRM reduced-motion rule to the portal surface
9. `3686624` evidence — added isolated preview scenes, report, scripts, tests, and 25 named PNGs

All files are inside the primary or conditional test-first allowlists from packet 04. No component was added. No business, server, RBAC, schema, migration, package, generic UI, production route, or later-journey file changed.

## Verification rerun

- `npx tsc --noEmit` — **PASS**.
- Exact changed-code/test ESLint — **PASS**, zero findings. (`app/globals.css` is not an ESLint input and reports only the expected ignored-file notice when passed directly.)
- `npm test -- tests/enterprise-crm/ui` — **PASS**, 7 files / 41 tests.
- `npm test -- tests/enterprise-crm tests/organization` — **PASS**, 19 files / 118 tests.
- Protected organization/Phase 2/middleware command — **PASS**, 13 files / 107 tests.
- `npm test` — **PASS**, 51 files passed and 2 skipped; 337 tests passed and 24 skipped.
- `npm run build` — **PASS** on the clean integration worktree with Turbopack; 82 static pages generated. Only the two known parser warnings for `@custom-variant` and `@theme` remain.

The evidence worktree's external-`node_modules` Turbopack limitation is therefore confirmed as worktree layout, not source behavior. Its webpack build and the integration worktree's Turbopack build both pass.

## Accessibility report and visual evidence

The submitted report documents browser/version, the absence of an installed axe dependency, semantic assertions, contrast measurements, touch sizes, 320-CSS-pixel reflow, 200% page scale, reduced motion, focus order, and reproduction scripts. It correctly avoids claiming whole-product WCAG conformance.

All 25 required named screenshots exist and were independently inspected:

- navigation/search/filter default and long-label mobile;
- table default/focus, loading, empty, filtered-empty, error, restricted, and responsive actions;
- workflow desktop/mobile;
- drawer Tab, Shift+Tab, dirty warning, submitting, error, success, and restricted;
- domain desktop/mobile;
- intelligence meanings/provenance and restricted non-inference;
- school theme, 320-pixel reflow, and 200% page scale.

They are clearly labelled fictional evidence, match the light/neutral CRM direction, retain BLTZ-controlled primary/semantic action colors, keep school theming presentation-only, reflow without document overflow at 320 CSS pixels, expose non-color states, and show visible focus.

## Blocking defect

`AssignmentDrawer` renders the dirty-draft confirmation as `role="alertdialog"`, but opening it through Escape/close does not move focus into that alert dialog. The submitted `assignment-drawer-unsaved-focus-375-bltz.png` visibly leaves focus on the owner select outside the confirmation. The component test asserts that the alert dialog exists but does not assert initial focus or a contained focus cycle.

This conflicts with alert-dialog keyboard semantics: a confirmation dialog must receive focus within itself when opened. For keyboard and screen-reader users, the close request can appear to do nothing because the warning is not reliably announced and focus remains earlier in the form. The warning's Keep Editing/Discard choices are therefore not presented in a deterministic focus order. This is **high** within the Gate 3C accessibility contract, which requires no open high defect and explicit focus-trap evidence.

## Required narrow follow-up

UI Systems should add a failing real-browser/component assertion first, then make the smallest existing-component repair so:

1. dirty close/Escape moves focus to a deliberate control inside the confirmation;
2. the declared semantics match the interaction pattern;
3. Tab and Shift+Tab cannot bypass a modal confirmation if `alertdialog` remains the role;
4. Keep Editing returns focus to the owner field with the draft preserved;
5. Discard closes the drawer and returns focus to the exact opener;
6. screen-reader announcement and visible focus are recorded at 375 and 1440.

Authorized repair scope should remain `AssignmentDrawer.tsx`, its CRM-scoped CSS if necessary, the drawer tests/evidence script, accessibility report, and replacement dirty-warning screenshots only. Do not alter generic UI primitives or introduce business/server/schema work.

After that repair, rerun focused UI, protected, full, lint, and production build checks and re-review only the changed confirmation evidence. Gate 3C may then be reconsidered. Gate 3B and Feature remain blocked independently.
