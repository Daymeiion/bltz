# Executive Wave 2 Gate 3C Accessibility Evidence

- Date: 2026-08-24
- Scope: Wave 2 shared CRM UI components and the isolated Executive component evidence board
- Browser: Headless Chrome 151 through Playwright CLI
- Environment: local Next.js development server; fictional, non-persisted evidence data

## Result

Gate 3C evidence is complete after the narrow dirty-confirmation correction requested by the integration review. All 25 original required lossless PNG files and two focused correction PNGs were captured and visually inspected. The focused component suite passes 42 tests, and the full/protected checks listed below pass. Five defects found during evidence and integration review were fixed test-first. No critical or high accessibility defect remains in this packet scope.

This report supports the Gate 3C decision; it does not claim whole-product WCAG conformance.

## Automated and semantic checks

- Component tests cover labels, roles, values, live/status messaging, disabled/restricted behavior, empty/error states, caller-supplied meanings, and keyboard-native callbacks.
- Headings and regions have stable accessible names. Lists retain list semantics, tables retain captions and column-header semantics, and form controls have programmatic labels.
- Status, priority, unread, intelligence meaning, and trend semantics include text; no reviewed meaning depends on color alone.
- Restricted intelligence does not expose hidden title, source, confidence, freshness, or signal existence.
- Error messages use alert semantics. Drawer submitting and success states expose status messaging.
- A clean fresh-browser pass recorded zero product console errors and zero warnings.
- No automated accessibility scanner was available in the repository (`axe-core` and `@axe-core/playwright` were absent). No dependency was added. The evidence combines component assertions, computed-style checks, browser keyboard checks, reflow/zoom checks, and visual inspection.

## Keyboard and focus evidence

- Opening the assignment drawer moves focus from the exact trigger to the owner selector.
- Forward Tab stays inside the drawer through owner, priority, date controls, notes, Cancel, Assign, and Close.
- Reverse Shift+Tab stays inside the drawer and wraps from the first control to Close, then Assign.
- Escape with a dirty draft opens the unsaved-changes warning without clearing the selected fictional owner.
- The dirty warning is a nested modal `alertdialog`. Focus enters **Keep editing**, while its accessible title and description announce “Discard unsaved changes?” and “Your assignment details have not been submitted.”
- Forward and reverse Tab wrap between **Keep editing** and **Discard changes** and cannot return to the underlying drawer while the confirmation is open.
- **Keep editing** closes the warning and restores focus to the owner selector.
- Escape closes only the confirmation, preserves the selected owner, and restores owner-selector focus.
- **Discard changes** closes the drawer and restores focus to the exact `Open assignment drawer` trigger.
- Submitting state disables mutation controls and places focus on an enabled in-drawer Close control.
- Success and restricted states retain an enabled in-drawer focus target; closing restores the exact trigger.
- Visible focus is a solid 2px BLTZ outline (`rgb(41, 82, 255)`).

## Contrast, motion, reflow, and touch

Computed text/background contrast samples:

| Meaning | Ratio |
| --- | ---: |
| Primary text | 17.41:1 |
| Secondary text | 7.52:1 |
| Muted text | 4.53:1 |
| BLTZ primary action | 5.61:1 |
| Positive | 4.87:1 |
| Attention | 4.92:1 |
| Blocked | 5.75:1 |
| Restricted | 5.22:1 |
| School accent (`#8b1e3f` on white) | 8.92:1 |

- At 320 CSS px, document and body scroll width are both 320 px. Long breadcrumb, filter, table-card, confidence, avatar, and recommended-action content reflows without horizontal document overflow.
- At 200% browser page scale from a 1280 x 1000 base, the document remains 1280 CSS px wide with no document overflow; the visual viewport scale is 2. The dedicated bitmap is 1280 x 1000.
- At 375 CSS px, document scroll width remains 375 px. Long labels wrap or truncate only where a full accessible name remains.
- Reviewed interactive touch targets are at least 44 CSS px in both dimensions, including selects, task/approval actions, comment textarea/action, and source action.
- Under `prefers-reduced-motion: reduce`, the portalled drawer and modal report 0.00001-second animation/transition durations and no transform movement.
- School theming changes presentation accents only. BLTZ primary action and semantic colors remain controlled by BLTZ tokens.

## Defects found and resolved

| Defect | Test-first evidence | Resolution |
| --- | --- | --- |
| Metric trend arrow lacked complete screen-reader direction/sentiment meaning | `21c562d` | Added direction and sentiment text; `6ab8fc3` |
| Drawer protected/submitting states could lose a reliable in-drawer focus target | `9e27769` | Restored focus across warning states and added enabled fallbacks; `2baa98d`, typed in `4e13e0b` |
| Component board overflowed at 320 px | `4098f10` | Added canonical responsive min-width, grid, breadcrumb, and filter reflow rules; `8bd086a` |
| Reduced-motion rule did not cover the portalled drawer/modal | `8f3a50d` | Extended reduced-motion behavior to the portalled UI root; `48f3714` |
| Dirty-draft `alertdialog` did not receive or contain focus and was not deterministically announced | `b017922` | Replaced the inline warning with the existing nested modal alert-dialog primitive, added deliberate entry/close focus, and preserved draft/opener behavior; `c3560fc` |

## Screenshot inventory

All paths are under `output/enterprise-crm/ui-system-wave2/gate-3c-evidence/`.

| File | CSS viewport/state | Bitmap |
| --- | --- | ---: |
| `navigation-filters-search-default-1440-bltz.png` | 1440, BLTZ default | 1440 x 909 |
| `navigation-filters-search-long-labels-375-bltz.png` | 375, long labels | 375 x 900 |
| `data-table-default-focus-1440-bltz.png` | 1440, sort focus | 1440 x 909 |
| `data-table-loading-768-bltz.png` | 768, loading | 768 x 909 |
| `data-table-empty-375-bltz.png` | 375, empty | 375 x 900 |
| `data-table-filtered-empty-375-bltz.png` | 375, filtered empty | 375 x 900 |
| `data-table-error-768-bltz.png` | 768, error | 768 x 909 |
| `data-table-restricted-1440-bltz.png` | 1440, restricted | 1440 x 909 |
| `data-table-responsive-actions-375-bltz.png` | 375, action focus | 375 x 900 |
| `workflow-lists-actions-focus-1440-bltz.png` | 1440, action focus | 1440 x 1009 |
| `workflow-lists-responsive-375-bltz.png` | 375, responsive | 375 x 1445 |
| `assignment-drawer-tab-wrap-1440-bltz.png` | 1440, forward wrap | 1440 x 1000 |
| `assignment-drawer-shift-tab-wrap-375-bltz.png` | 375, reverse wrap | 375 x 900 |
| `assignment-drawer-unsaved-focus-375-bltz.png` | 375, dirty warning | 375 x 900 |
| `assignment-drawer-submitting-1440-bltz.png` | 1440, submitting | 1440 x 1000 |
| `assignment-drawer-error-1440-bltz.png` | 1440, recoverable error | 1440 x 1000 |
| `assignment-drawer-success-1440-bltz.png` | 1440, success | 1440 x 1000 |
| `assignment-drawer-restricted-375-bltz.png` | 375, restricted | 375 x 900 |
| `assignment-drawer-dirty-confirmation-focus-375-bltz.png` | 375, modal initial focus and wrap | 375 x 900 |
| `assignment-drawer-dirty-confirmation-announcement-1440-bltz.png` | 1440, labelled/described modal announcement | 1440 x 1000 |
| `domain-primitives-default-1440-bltz.png` | 1440, default | 1440 x 1009 |
| `domain-primitives-responsive-375-bltz.png` | 375, responsive | 375 x 1116 |
| `intelligence-meanings-provenance-1440-bltz.png` | 1440, four meanings | 1440 x 1214 |
| `intelligence-restricted-non-inference-375-bltz.png` | 375, restricted | 375 x 900 |
| `component-board-school-theme-1440.png` | 1440, fictional school accent | 1440 x 1009 |
| `component-board-reflow-320-bltz.png` | 320, reflow | 320 x 1471 |
| `component-board-zoom-200-percent-1280-bltz.png` | 1280 base, 200% page scale | 1280 x 1000 |

The capture scripts hide only the Next.js development indicator; they do not change product styles. All visible people, organizations, values, and statuses are fictional evidence labels.

## Reproduction

- `capture-gate3c-evidence.js` captures the 17 navigation, data, workflow, domain, intelligence, theme, and 320px files.
- `capture-drawer-focus-evidence.js` exercises focus behavior and captures the seven drawer files.
- `capture-dirty-confirmation-correction.js` asserts modal entry, labelled/described announcement, Tab/Shift+Tab containment, Escape, draft preservation, Keep Editing restoration, exact opener return, and captures the two correction files.
- `capture-zoom-device-evidence.js` uses a dedicated fresh browser session for the 200% page-scale file.
- `inspect-reflow.js` and `inspect-accessibility.js` assert reflow, zoom, focus, reduced motion, touch size, and computed accessibility evidence.

## Final validation

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | Pass |
| Focused changed-file ESLint | Pass, zero warnings/errors |
| `npm test -- tests/enterprise-crm/ui` | 7 files, 42 tests passed |
| `npm test -- tests/enterprise-crm tests/organization` | 19 files, 119 tests passed |
| Protected Phase 2 regression command | 13 files, 107 tests passed |
| `npm test` | 51 files/338 tests passed; 2 files/24 tests intentionally skipped |
| `npm run lint` | Pass with the unchanged repository baseline of 204 warnings and zero errors |
| `npm run build` | Turbopack cannot follow this worktree's external `node_modules` junction |
| `NODE_OPTIONS=--use-system-ca npm run build -- --webpack` | Pass; 82 static pages generated |

The Turbopack failure is an isolated-worktree dependency-layout limitation, not a source failure. The equivalent Next.js production build passes through webpack after using the Windows certificate store for the repository's configured Google fonts.

There are no migrations, server contracts, business rules, or public component additions in this evidence packet.
