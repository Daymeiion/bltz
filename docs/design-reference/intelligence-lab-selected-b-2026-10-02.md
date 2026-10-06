# Intelligence Lab: selected B refinement

> Historical concept report. Current application source and
> [the current design index](current-design-index.md) supersede this report.
> Intermediate screenshots below were retired from active source; recover them
> from the reconciliation snapshot when needed. Prototype completion does not
> establish hosted integration, verified records, rights or measured outcomes.

Design date: October 2, 2026. Evidence evaluation stays **October 1, 2026**. Status: interactive design refinement complete; live integration remains a separate step.

Latest revision: [Priority athletes and search additions](intelligence-lab-priority-athletes-2026-10-04.md). The report below records the preceding branded B pass; the latest revision report defines current screenshots and validation.

## Plan and scope

Refine the selected Athlete B evidence workspace and Moment B source inspection within the same three-column roster composition. [Contract](../../mockups/intelligence-lab/CONTRACT.md) defines the shared shell, scoped center renderers and evidence limits. [Athlete prototype](http://127.0.0.1:3138/athlete.html?theme=dark), [Moment prototype](http://127.0.0.1:3138/moment.html?theme=dark), and [theme comparison](http://127.0.0.1:3138/) are local review destinations, not new application routes.

| View | Dark | Light |
| --- | --- | --- |
| Athlete desktop | [Preview](../../mockups/intelligence-lab/previews/athlete-priority-bands-dark.jpg) | [Preview](../../mockups/intelligence-lab/previews/athlete-priority-bands-light.jpg) |
| Sources desktop | [Preview](../../mockups/intelligence-lab/previews/athlete-source-grid-dark.jpg) | [Preview](../../mockups/intelligence-lab/previews/athlete-source-grid-light.jpg) |
| Moment desktop | [Preview](../../mockups/intelligence-lab/previews/moment-priority-bands-dark.jpg) | [Preview](../../mockups/intelligence-lab/previews/moment-priority-bands-light.jpg) |
| Athlete mobile | [Preview](../../mockups/intelligence-lab/previews/athlete-priority-bands-mobile-dark.jpg) | [Preview](../../mockups/intelligence-lab/previews/athlete-priority-bands-mobile-light.jpg) |
| Sources mobile | [Preview](../../mockups/intelligence-lab/previews/athlete-source-grid-mobile-dark.jpg) | [Preview](../../mockups/intelligence-lab/previews/athlete-source-grid-mobile-light.jpg) |
| Moment mobile | [Preview](../../mockups/intelligence-lab/previews/moment-centered-tabs-mobile-dark.jpg) | [Preview](../../mockups/intelligence-lab/previews/moment-centered-tabs-mobile-light.jpg) |

Primary user: BLTZ researcher or sports executive. Primary action: select an athlete and inspect a supported career event. Secondary actions: compare evidence, follow a signal to its reviewable opportunity, and switch theme. Critical information: identity, event/date, performance, source assertion and missing evidence. Mobile priority: top-bar search, portrait and identity first, then research tabs and intelligence. No CRM, production integration, onboarding changes or speculative intelligence.

Six brand colors (Night/Navy/Cloud/Ink/Gold/Blue), local Oswald/Geist/Roboto Condensed and rounded B geometry support dark/light themes. Gold marks selection; blue marks evidence. Quiet 160–200ms selection/tab motion respects reduced-motion. Pre-build critique: repeated anniversary, confidence, performance and media warnings obscured the reading flow. Identity belongs in its header; performance in one event summary; source assertions in the reader; signal reasoning and opportunity gaps in their respective right-rail panels.

Athlete retains Moments / Media references / Sources tabs. Moment retains Evidence / Connections / Media tabs and selected-source inspection. Links preserve athlete, event and theme. Other roster athletes show directory context and explicit missing intelligence; Keith's data must never follow their selection.

## Real images and provenance

[Portrait map](../../mockups/intelligence-lab/portraits.js) supplies only Keith Rivers and Cameron Jordan from Commons CC BY 3.0 photo metadata. [Portrait notes](../../mockups/intelligence-lab/portraits-notes.md) record primary file pages, creators, source dates, API verification and attribution/crop requirements. Portrait references are separate from Moment media; no production rights status or Moment association is created. Four remaining roster entries have no supplied portrait.

[Copied evidence packet](../../mockups/intelligence-lab/data.js) retains Keith's real USC 2006 and NFL 2014 observations. Only USC has the supported anniversary and retrospective opportunity. Priority 92/100 and confidence 99% remain separate, with six days measured from the fixed October 1 snapshot. No verified Moment media, complete career roster, teammate contribution or economic entitlement is supplied. Application identity verification is separate from the reviewed external NFL match. Video upload dates remain unknown where not established.

[Roster provenance](intelligence-roster-concepts-2026-10-02.md#roster-provenance) applies unchanged: Keith and Cameron canonical IDs have saved artifact references; Chidi, Ted, Lorenzo and Tyson UUIDs derive from the prior authorized read-only audit. The public workbook corroborates their names/positions, not IDs or explicit school labels. This refinement does not re-query the database. `docs/product/BLTZ_PRODUCT_DOCTRINE.md` was absent in the preceding audit; no replacement doctrine is inferred.

## Future integration contract gaps

Existing `LabView` consumes `LabResult` from `lib/intelligence/lab-types.ts`, loaded by `loadIntelligenceLab`. Reuse these contracts and existing shared authentication; never ship the fixed mockup roster as the live data source.

- `AthleteSummary` supplies ID, name, slug, school and position. It has no portrait field; the loader also omits portrait URLs. Future integration requires a narrowly scoped public portrait/attribution adapter and permission handling rather than inferred approval or core provider columns.
- Production search currently filters names, caps results at 25 and preserves `q`, `athlete`, `asOf`. Local school/position filtering must not be advertised as an existing production capability.
- `LabSection` preserves ready/unavailable and truncated states. `LabAthlete` exposes relationships, statistics, legacy media metadata, external identities, moments, evidence and computed intelligence. A redesigned layout must retain these distinctions.
- Server authorization checks `getUser` and `is_internal_admin` before creating the service client. Keep unauthorized redirects and connection-error recovery; a local static concept does not replace authorization.
- Signals require the complete ready/untruncated supporting graph. Preserve the gate, actual evaluation timestamp and computed human-review status. Theme/portrait changes cannot make missing intelligence eligible.
- Current production views are findings/athlete/example under `/admin/intelligence`; there is no dedicated Moment route. Detail navigation and selection persistence require an explicit integration decision without competing graph structures.

## Completion report

1. **Summary:** selected B refined with both BLTZ themes, concise evidence, real credited portraits, subtle selection/tab/theme transitions and profile-first mobile with top-bar athlete search. Live application layouts and data remain unchanged.
2. **Files changed:** new `mockups/intelligence-lab/` only: `athlete.html`, `moment.html`, `index.html`; `shared.js`, `workspace.js`, `theme.js`, `shared.css`, `review.css`; `middle-athlete.js/.css`, `middle-moment.js/.css`; copied `data.js` and `roster-data.js`; `portraits.js`; `serve.cjs`; contract and three agent/portrait notes; local font/logo assets and generated previews. This new report. Earlier prototypes are preserved.
3. **Routes changed:** no application routes. Three local HTML pages served on loopback at `http://127.0.0.1:3138/`; theme and selected athlete/event travel in review URLs.
4. **Database changes:** none. No database requests during this refinement.
5. **Migrations:** none.
6. **Environment variables:** no application changes, keys or environment-file reads. Optional `BLTZ_LAB_DESIGN_PORT` changes the local preview port; no environment file is added.
7. **Permission changes:** none. Loopback server allows only the mockup subtree, local scripts/fonts and image requests to `upload.wikimedia.org`; `connect-src 'none'` prevents API requests. Future integration must preserve existing internal-admin authorization. Photo CC licenses are reference metadata, not BLTZ rights-engine decisions.
8. **Tests run:** `node --check` passed for all eight JavaScript files plus `serve.cjs`; scoped whitespace check passed. Static/HTTP verification passed for all three HTML pages and 20 linked pages/assets, CSP, blocked paths/files (404) and unsupported POST (405). SHA-256 confirms `data.js` is unchanged from the earlier reviewed packet. Portrait metadata verified through the primary Commons API. Source-link contrast corrected from 4.03:1 to approximately 4.80:1 in light mode; the dark token is approximately 6.67:1. Browser warning/error log was empty. App lint, TypeScript, unit/integration and production build were not run: this static design folder has no application imports, dependency changes or database changes.
9. **Manual verification:** both desktop themes inspected for both views; all comparison previews load. Real Keith/Cameron photos load with linked creator/license and crop credits; other athletes display initials. All six selections update profile and signal/opportunity counts (Keith 1/1, others 0/0). Name and position search, empty-search recovery, Escape dismissal, Enter selection and clear passed. Mobile search opens a top-bar results dialog and closes after selection, leaving the profile first. Theme persistence without a URL override and theme propagation into Moment navigation passed. Athlete Media/Sources and Moment Evidence/Connections/Media tabs passed with arrow/Home keyboard navigation; source selection and event/publication/fetch-date disclosure passed. Sidebar View evidence/Check media switches tabs without a page reload. USC shows the anniversary; NFL shows no generated intelligence. At 390×844 both views/themes fit without horizontal overflow, including expanded source identifiers. Temporary viewport override reset. Reduced-motion overrides and image-error handler reviewed in code; system reduced-motion and forced image network failure were not simulated. Mobile Moment full-page screenshot capture timed out in the browser tool; accurate viewport captures succeeded and layout/function checks passed. Full assistive-technology and executive usability sessions remain deferred.
10. **Known limitations:** fixed snapshot, one intelligence-bearing athlete, only two photo references, incomplete career/media relationships, four prior-audit UUIDs without saved roster export, missing Doctrine reference and unresolved production portrait/search/detail contract gaps.
11. **Deferred work:** approved live integration with current graph/server contracts; broader reviewed roster/portrait data; Moment media and clearance; live refresh and additional deterministic intelligence. No deployment in this pass.

**Product direction:** improves recognition and inspection of existing athlete–event–performance–source and Moment → Signal → Opportunity relationships; persists no new Career, Moment or Value Graph relationship. Career recovery remains useful after retirement. Portrait licenses imply no economic participation. No mature DAM, social publishing or CRM workflow is duplicated, and no generalized media-management scope is introduced.

## Implementation handoff

1. Build the approved shell and reusable identity/evidence/intelligence panels inside the existing `/admin/intelligence` surface; reuse `LabResult` and actual graph sections. Preserve findings/example access and sidebar navigation.
2. Bind top-bar search to the authorized server loader, maintaining loading/error/unavailable/truncated states. Add client selection/detail state without inserting the prototype roster or creating a second graph backend.
3. Add a scoped public portrait/attribution adapter using approved existing fields and media permissions. Do not inherit the Locker's unrelated Dante image fallback or turn portrait appearance into Moment evidence.
4. Render Moment detail from the selected athlete's existing Moment/evidence rows within the same route. Preserve canonical IDs, real evaluation dates and signal-completeness gates.
5. Validate authorized/unauthorized behavior, no private-data leakage, loading/error/empty states, responsive layout, keyboard/reduced-motion and relevant existing Lab tests before any production promotion.
