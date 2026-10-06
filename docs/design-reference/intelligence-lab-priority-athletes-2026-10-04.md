**Design-reference history.** Current application source and typography take priority; see [current design index](current-design-index.md). Prototype data and activations are concepts, not production metrics or approvals.

# Intelligence Lab priority athletes

Latest layout refinement, October 4: widened the athlete-list track by 20px at desktop/tablet breakpoints (250px standard, 268px wide, 215px compact desktop, 210px tablet). One shared 17px spacing token now controls horizontal workspace gaps and vertical Signals/Opportunities/Activations gaps. Mobile retains its single-column layout and 15px spacing. Changed `shared.css`, contract/report notes and the [unified-spacing capture](../../mockups/intelligence-lab/previews/athlete-wider-list-unified-spacing-dark.jpg). Existing local routes only; no database, migrations, environment or permission changes. CSS parsing, independent cascade review and browser checks pass at 1280/992/991/721/720/390px, with no page overflow. Wide layout retains its 268px left track and 17px gaps. Both Athlete and Moment show a 250px list and matching 17px gaps at 1280px; the 10px portrait-to-folder gap remains. Validation used a separate preview tab to preserve the open activation editor. No new limitations or deferred work; no graph relationship or product behavior changes.

Latest portrait spacing refinement, October 4: the shared center-content adds 10px above the file-folder container in Athlete and Moment concepts. Portrait size, folder width and horizontal alignment are unchanged; mobile retains its identity-first order with 10px additional space before the folder. Changed `career-folder.css`, this note and the [portrait-gap capture](../../mockups/intelligence-lab/previews/athlete-folder-10px-gap-dark.jpg). Existing local routes only; no database, migrations, environment or permission changes. CSS parsing and browser spacing verification pass. No additional limitations or deferred work; graph and product behavior are unchanged.

Latest spacing refinement, October 4: athlete-list name, context and priority text use line-height 1.2 for more compact cards. Search results and icon touch targets retain their existing styles. Changed `watchlist.css`, this note and the [compact-row capture](../../mockups/intelligence-lab/previews/athlete-list-compact-lines-dark.jpg). Existing local routes only; no database, migrations, environment or permission changes. CSS parsing and browser computed-style checks pass. No additional limitations or deferred work, and no graph or product behavior changes.

Latest icon refinement, October 4: athlete-list remove buttons have no border or background, including on hover. The X icon, existing touch targets and keyboard focus indicator remain. Changed `watchlist.css`, this note and the [plain-X capture](../../mockups/intelligence-lab/previews/athlete-list-plain-remove-dark.jpg). Existing local routes only; no database, migrations, environment or permission changes. CSS parsing and browser computed-style verification pass. No new limitations or deferred work, and no graph or product behavior changes.

Latest refinement, October 4: removed per-athlete signal/opportunity count copy from both the list and search rows. Priority dots, High/Mid/Low/Awaiting review labels, scoring and right-rail counts remain unchanged. Changed `workspace.js`, contract/report notes and [priority-only row capture](../../mockups/intelligence-lab/previews/athlete-list-priority-only-dark.jpg). Existing local routes only; no database, migrations, environment or permission changes. JavaScript syntax and browser verification pass: Keith shows High priority, Cameron shows Awaiting review, both dots remain, and the three right-rail totals remain 1. No limitations or deferred work beyond the concept integration boundaries below; no graph relationships or product scope change.

October 4, 2026. Existing [Athlete](http://127.0.0.1:3138/athlete.html?theme=dark) and [Moment](http://127.0.0.1:3138/moment.html?moment=usc&theme=dark) concepts.

The left column is now a **Priority athletes** list, initially populated from reviewed signals and opportunities. Each name has a priority dot, textual status and a High/Mid/Low legend. Priority is the highest valid reviewed career signal score: green Low 0–40, yellow Mid 41–70, red High 71–100. Keith is High from his 92-point anniversary signal, including when an unrelated Moment is selected.

Search retains all six canonical identities and displays separate results with a plus button. Adding does not select the athlete; selecting does not add them. Already-added results show a disabled check. The user approved adding unreviewed athletes as **Awaiting review**; their neutral outlined dot does not imply a score, signal or opportunity. Each local list row can be removed. Canonical IDs persist across Athlete/Moment navigation in this browser tab, with guarded storage and duplicate prevention.

Mobile keeps search in the top bar and adds a button to open the priority list. Search results and the priority picker are separate panels, with one open at a time. Escape, outside click and keyboard focus leaving the panel dismiss it. Selecting an athlete restores focus to its heading on desktop and mobile.

## Completion report

| Item | Result |
| --- | --- |
| Summary | Priority dots, a signal/opportunity research list, search additions and explicit Awaiting review states. |
| Files changed | `mockups/intelligence-lab/workspace.js`, `shared.js`, new `watchlist.css`, existing `athlete.html`/`moment.html`, `CONTRACT.md`; this report, latest pointers and priority preview captures. |
| Routes changed | Existing local concepts only. No application routes or deployment. |
| Database changes | None; reviewed `data.js` remains byte-identical by SHA-256. |
| Migrations | None. |
| Environment variables | None. |
| Permission changes | None. No organization membership or tenant access is inferred. |
| Tests run | Changed JavaScript syntax and CSS parsing pass. Independent checks of actual priority aggregation cover all six athletes, valid zero, score boundaries and invalid/missing scores. Scoped whitespace, HTTP response and screenshot checks pass. Application lint/type/test/build suites were not run for isolated static concepts. |
| Manual verification | Add Cameron leaves Keith selected; duplicate addition disabled; Cameron labeled Awaiting review. Removal and re-add work. Empty list and no search match provide recovery text. Search by reviewed Moment works. Keyboard ArrowDown/Enter selects without adding, restores heading focus and closes results. Tyson shows no invented intelligence. List persists across USC/NFL and Athlete/Moment navigation; Keith's career priority remains High on NFL. Light/dark and 390/320px mobile checks have no page or results-panel horizontal overflow; mobile Add is 44px and priority toggle 40px. Mobile list opens, removes and dismisses. No browser warnings/errors observed. Viewport override reset. |
| Known limitations | This is a local concept list, not a persisted organization roster. Only Keith has reviewed intelligence. Other additions remain Awaiting review. Priority scores guide editorial review, not probability, earnings or value. At 320px the top-bar input is compact while typing, with no overflow. |
| Deferred work | Production organization-scoped queries, permissions and persistent saved lists require a separate integration step. No work remains for this concept refinement. |

Product direction: improves access to career evidence and the Moment → signal → opportunity chain; no persisted Career, Moment Contribution or Value Graph relationship changes. Career priority remains useful after organizational departure. No generalized media workflow, real campaign action, rights claim or economic allocation is added. The authoritative Product Doctrine file remains absent; this follows the supplied product guardrails and explicit user direction.

## Captures

- [Priority list and search additions, dark](../../mockups/intelligence-lab/previews/priority-search-dark.jpg)
- [Search additions, light](../../mockups/intelligence-lab/previews/priority-search-light.jpg)
- [Desktop priority list](../../mockups/intelligence-lab/previews/priority-list-desktop-dark.jpg)
- [Mobile priority picker](../../mockups/intelligence-lab/previews/priority-list-mobile-dark.jpg)
