# Selected Athlete B refinement

## Scope

The user selected Athlete B and Moment B. This pass refines the selected evidence-file approach in the same three-column workspace. Root owns search, athlete portraits/identity, dark/light themes, mobile navigation, signals and opportunities. This agent owns only the Athlete related-data renderer, its scoped styles and these notes. Existing concepts and production code remain unchanged.

## Pass one: design plan

Audience: a BLTZ researcher or sports executive. Main job: recognize the selected athlete, inspect a documented career Moment and follow its evidence. The portrait and identity above the content remain the visual anchor; the related-data file below it changes without introducing another hero.

Shared colors: Night `#080d17`, Navy `#141e30`, Cloud `#f5f7fc`, Ink `#1a263b`, Gold `#ffbb00`, Blue `#287be5`. All component colors inherit root theme variables derived from these six values. Geist carries readable body/control text; restrained Oswald is used for Moment titles; Roboto Condensed is a small date/source utility role.

```text
DESKTOP
Searchable roster | Portrait and selected athlete | Signals
                  | Moments / Media / Sources      | Opportunities
                  | USC–Washington                |
                  | date / performance / counts   |
                  | Buffalo–Chicago               |
                  | date / performance / counts   |
                  | Expand career connections     |

MOBILE
Root top-bar search → portrait/identity → navigation
Moments / Media / Sources
Two concise Moment files, then signals/opportunities
```

Signature: one stable athlete anchor with a quiet evidence-file transition below. Rounded file rows retain the chosen B direction. Motion is a short fade and small settle on category selection, with reduced-motion support and no ambient animation.

## Pass two: critique before implementation

The earlier B repeated the anniversary, retrospective, media warnings and confidence across multiple panels. Remove that repetition by giving each fact one main home. Moment cards show date and reported performance once, plus source/media counts and an evidence destination. Signal timing, score and reason live in the right rail. Opportunity gaps live in the Opportunity panel. Source claims, unknown dates and rights detail are revealed on demand.

Avoid another set of metric cards or a dashboard summary banner. Keep media references as concise title/publisher/date/type rows, not a wall of article paragraphs. A portrait supplied by root never changes the Moment's media count or usage permission.

## Truth and interaction

- Two real Keith Moments; no invented award, milestone, teammate, licensed media or signal.
- Fixed evaluation snapshot remains October 1, 2026.
- Keith's athlete verification remains separate from the verified external NFL match in the shared identity panel.
- Source claims and provenance remain accessible in disclosure; event, publication and fetch dates are distinct.
- Media references remain athlete context. Unknown video release dates remain unknown.
- Athletes without reviewed intelligence show only their own concise snapshot gap; the shared athlete search provides navigation to other files.
- Moment links use the root permalink helper and preserve athlete, event and theme.
- Tabs support keyboard arrows/Home/End, roving focus and focusable panels. Listeners are host-scoped and removable on remount.

## Validation

`node --check mockups/intelligence-lab/middle-athlete.js` passed. Root owns final dark/light/mobile screenshots and interaction QA. No app build, database migration, provider request or production deployment is part of this isolated design pass.

Build critique: removed the repeated signal summary, opportunity narrative, confidence badges, repeated athlete heading and paragraph-level source previews. Performance now appears once per Moment card, while source assertions are disclosed only on demand. Video-release uncertainty appears only on video or embedded-video newsletter references, not unrelated articles. Technical records and exact locators remain available in optional disclosure.

## Folder tab refinement — October 2

Pass one: attach Moments, Media and Sources to one shared folder body. Keep the six approved theme colors and existing type roles. Sloped folder shoulders provide the recognizable contour; the selected tab rises 6px and its surface joins the body without a bottom seam. A short gold marker identifies selection, while existing cards remain inside the folder.

```text
    / Moments \    / Media \    / Sources \
   / selected  \__/_________\__/___________\
  |  Shared folder body                         |
  |  Existing Moment, media or source files      |
  |_____________________________________________|
```

Pass two: the previous detached pill bar weakened the connection between category and records. Keep this refinement limited to contour and grouping, with no additional text, counts or evidence changes. Labels sit above the decorative layers; clipping applies only to those layers so keyboard outlines remain visible. All three tabs share available mobile width, with at least 44px height. The missing-intelligence state bypasses the folder and remains unchanged. Existing tab IDs, ARIA relationships, roving keyboard controls and disclosures remain intact.

Implementation critique: nested file borders add a little density, balanced by a soft folder surface and compact 11–14px inner padding. Selection uses a modest height difference and gold mark rather than large motion. Root owns visual checks across dark/light themes and mobile widths.

Validation: renderer syntax passed with `node --check`; PostCSS parsed all 73 top-level stylesheet nodes without errors. No application routes, schema, migrations, environment variables, permissions, image assets or production files changed. Browser verification is delegated to root.

## Shared rounded folders — October 2

Plan: keep the attached folder grouping while moving its tabs to the right and softening their corners, per the latest direction. Root owns one shared `career-folder.css` treatment for both Athlete and Moment. This renderer adds shared folder, tab, label and body classes beside its existing classes; all local folder geometry and mobile folder overrides are removed. Cards, panels, IDs, evidence and keyboard behavior remain unchanged.

Critique: separate Athlete/Moment contour styles would drift and make later refinements harder. One shared folder design keeps both contexts consistent while preserving their distinct evidence files. Root owns the final shape, alignment, responsive behavior and browser verification.

Validation: renderer syntax passed; PostCSS parsed 60 top-level stylesheet nodes without errors, with zero remaining local folder selectors. Only the three owned Athlete files changed; application, data and permission boundaries remain untouched.

## Moment files with attached-media stacks — October 2

Plan: make the real event name the card anchor with uppercase, locally supplied Barlow Condensed 700 at 28–32px. Put its event date directly below. At sufficient card widths, the reviewed `moment.summary` sits beside the title, with a separate attached-media stack at the right. Performance and source/media counts stay in the text area, followed by a clear Inspect Moment button. Use the approved theme tokens; no palette, evidence or folder changes.

```text
| EVENT NAME     | Reviewed description |  attached media |
| Event date     |                      |  stacked cards  |
| Context / reported performance        |                 |
| Source / media counts  [Inspect Moment]                  |
```

Critique before build: a narrow card cannot support three compressed text columns. Use card-width breakpoints to move the description below the title and the media stack below the text. Empty stacks explicitly say No attached media, with only decorative blank backing cards. Never substitute athlete portraits or article references. For attached records supplied by the loader, show up to three titles and only explicit, CSP-compatible thumbnail URLs; this renderer does not determine usage clearance.

Implementation critique: the event summary is the reviewed description, so its statistics intentionally overlap the retained performance row rather than introducing unsupported narrative. At card widths below 540px the description moves below the title; below 410px the media stack moves below the main file. Empty stacks contain no image elements. Future attached-record previews accept only same-origin HTTP(S) or HTTPS `upload.wikimedia.org` thumbnails, matching the existing CSP. There are no provider fetches or usage-clearance decisions.

Validation: renderer syntax passed with `node --check`; PostCSS parsed 84 top-level stylesheet nodes without errors. Root owns visual/keyboard validation and supplies the local Barlow Condensed font. Both real Moment arrays are empty, so filled-stack visuals cannot be verified from this immutable snapshot without additional authorized data. No fixtures, routes, database, permissions, data packet or production files changed.

## Context above title and full-width card footer — October 2

Plan: place competition directly above the event name, with event date directly beneath. Keep the reviewed description beside that title block at wide widths. Move the existing source/media count and Inspect Moment footer outside the text/media grid, spanning the entire card below both columns.

Critique: keeping the footer inside the text column placed its action away from the card's lower-right edge and could leave it above attached-media previews. A full-width footer establishes one clear action position; the link's automatic left margin keeps it right-aligned even when mobile wrapping places it on another line. Tightened date, context and performance spacing removes the previous extra context row without shrinking the 44px action or changing evidence.

Validation: JavaScript syntax passed; PostCSS parsed 84 top-level stylesheet nodes without errors. Existing source/media counts, attached-media empty states, event links and tab behavior are preserved. Only the three owned Athlete files changed; root owns visual review and shared-tab refinements.

## Compact evidence and review meters — October 2

Plan: bring the reviewed description closer to the event name, separated by a visible dash, and increase its text to 14px. Preserve competition above and date below the title. Replace the card's performance row with two compact circular meters: Evidence confidence in percent and Review priority out of 100. Source assessment and editorial priority remain distinct; NFL priority is absent, so its ring stays neutral with a dash and Not scored. Performance remains in the immutable summary and Moment detail.

Critique before build: two circular scores can imply interchangeable meanings or fabricate a zero where data is missing. Label units and meanings explicitly; accept only finite numeric values from 0 through 100, keeping genuine zero distinct from missing or invalid values. Numeric text is always visible. Animate real arcs once after about 2.5 seconds from page navigation, filling over 1.2 seconds; reduced motion shows final arcs immediately. SVG presentation attributes and shared CSS avoid inline-style/CSP changes. Keep the media stack and full-width action footer intact.

Implementation critique: descriptions align with the name below the competition caption and use a 9px column gap plus a small dash. At narrow card widths they flow beneath the title. Blue evidence-confidence arcs and gold editorial-priority arcs have explicit units and captions. Missing scores produce no numeric arc and retain the neutral track. Animation is consumed once per page, and remounts show final arcs; pending/completion timers and the reduced-motion listener clean up on replacement. The existing reduced-motion CSS disables animation so SVG attributes provide the final state immediately.

Changing categories during a running fill settles it to the final state, preventing a hidden panel from replaying the animation when reopened.

Validation: JavaScript syntax passed; PostCSS parsed 98 top-level nodes. Read-only in-memory checks passed for genuine zero, 0–100 bounds, decimals, missing/null, NaN/infinity, out-of-range numbers and numeric-string rejection; missing/invalid priority renders a dash/Not scored while zero remains 0/100. Real 99 and 92 inputs yield offsets 1 and 8. Checks also passed for the page-relative delay, 1.2-second completion, one-shot remount behavior, immediate reduced motion, preference changes and timer/listener cleanup. No test fixtures or app/browser data were written. Root owns actual visual timing and responsive QA.

## Priority bands, short descriptions and source cards — October 2

Plan: retain numeric priority arcs while the shared helper labels 0–40 Low, above 40 through 70 Mid, and above 70 through 100 High. Unknown remains Not scored. Include the category in the accessible numeric label. Use explicit one-sentence, 12px view-only descriptions for the two reviewed Moments; canonical data and detail statistics remain untouched. Sources become a two-column desktop grid with the root's verified-logo/Logo not provided markup, source subtitle, title and unchanged evidence disclosures; mobile uses one column.

Critique: category-only labels would hide the actual score, while numeric-only rings are harder to scan. Keep both. Short copy must be reviewed display text, not a new summarization engine. Avoid fictitious provider/source cards or replacing missing logos with invented brands. Subtle hover/focus motion applies only to attached-media preview records and athlete context media cards; empty stacks remain still. Preserve the existing one-shot score timing, keyboard tabs, unknown states and reduced-motion behavior.

Implementation critique: the two reviewed descriptions are explicit local display constants, with no source mutation or automated summarization. Logos use only the shared verified mapping and fallback; source claims, dates, fetch records and technical disclosures are unchanged. Nonempty attached stacks have a visible keyboard-focus target; context media cards respond to their existing links and disclosures. Motion is a small finite lift/fan, and reduced motion disables both transitions and transforms. Current empty stacks receive neither the focus target nor hover/focus movement.

Validation: JavaScript syntax passed; PostCSS parsed 106 top-level nodes. In-memory checks used the actual shared helper at 0, 40, 41, 70, 71, 100 and the fractional boundaries; Low/Mid/High and accessible numeric/category labels matched. Unknown, null, nonfinite, out-of-range and numeric-string values remained Not scored without an arc. Real snapshot rendering produced two one-sentence previews, four supplied source-logo blocks, six contextual media cards and two truthful empty attached-media states. Serialized canonical data remained identical before/after render. No browser automation, provider calls, fixtures, production routes, permissions or data writes occurred; root owns UI QA.

## Compact category-first cards — October 3

Plan: reduce uppercase Barlow Condensed Moment headings to 24px desktop and 22px mobile. Stack competition, title, explicit one-sentence description and date in that order, without a dash, at every width. On mobile center that text block and the actual or empty attached-media stack, while keeping Inspect Moment at the footer's lower-right corner. Priority rings show High/Mid/Low text and category-only accessible labels; their arc still derives from the real underlying score. Confidence retains its 99% numeric display. Unknown priority stays a dash with Not scored outside.

Critique: the earlier title/description columns and numeric priority duplicated detail and stretched compact cards. A stable vertical reading order handles narrow widths naturally; category text makes review status legible while retaining honest score-derived arcs. Do not turn absent priority into Low. Root is clarifying the new Intelligence/Moments/Media tabs; implement the independent card changes first and wait for that content decision before replacing navigation.

Root's content decision: Intelligence is the default first tab, followed by Moments and Media. Its compact review overview shows supplied Moment/source/media-link coverage, two evidence destinations, identity versus manual provider mapping, and missing normalized career context. Preserve the source-card grid in a closed Source evidence disclosure inside Intelligence, without a Sources navigation tab. Keep signals/opportunities in the existing right rail. Delay the one-shot rings until Moments first becomes visible, rather than consuming their animation in the default hidden panel.

Implementation critique: the overview derives 2 reviewed Moments, 4 source records and 0 Moment-media links from the unchanged packet; it does not infer career relationships. The source disclosure is closed initially and still preserves each claim/date/fetch record. Priority labels show categories without numeric text or numeric ARIA, but the SVG dashoffset remains score-derived. The first visible Moments activation starts the 2.5-second delay; leaving during the delay cancels without consuming, while leaving during fill settles once. Mobile centers only the requested metadata/content/media area, preserving the footer action's right alignment.

Validation: JavaScript syntax passed; PostCSS parsed 122 top-level nodes. In-memory checks passed for category-only display/accessibility, all priority thresholds and missing/invalid values, genuine numeric arcs, Intelligence-first/default state, closed source evidence with no Sources tab, real coverage counts, subtitle/title/description/date order and unchanged canonical data. Lifecycle checks passed for no hidden-default timers, visible activation delay, cancellation without consumption, one-shot completion/interruption, arrow-key activation, reduced motion and listener/timer cleanup. No browser, provider, production, schema, migration, environment or permission changes; root owns UI QA.
