# Selected B direction: branded Intelligence Lab design

## Priority athlete list and search additions — October 4

Latest column refinement: increase the left athlete track by 20px at each desktop/tablet breakpoint. Use a shared 17px gap for workspace columns and the Signals/Opportunities/Activations stack; mobile retains its existing single-column layout and 15px spacing. Change only `shared.css`, report notes and review captures. Keep right-column widths, portrait sizing, folder alignment and 10px portrait-to-folder spacing.

Latest copy refinement: athlete rows show only their priority or Awaiting review label. Remove per-athlete signal/opportunity counts from the shared list/search row renderer. Preserve the scoring inputs, dots, list count and right-rail totals.

Replace the all-athlete directory with a local priority list, initially containing athletes with reviewed signals or opportunities. Global search still searches every canonical athlete. Each search result has a separate plus button that adds the athlete without changing the selected file; already-added rows show a disabled check. The user explicitly approved adding unreviewed athletes as **Awaiting review**. Do not invent scores, signals or organization membership for them.

Reuse Night/Navy/Cloud/Ink/Gold/Blue surfaces, existing display/body/utility fonts and compact roster geometry. Three status accents carry meaning: red High (71–100), yellow Mid (41–70), green Low (0–40). Neutral marks Awaiting review. Career priority is the highest valid reviewed signal score, independent of the open Moment. Labels and a legend accompany dots. Search results are a separate anchored panel; mobile top-nav search and a priority-list button open one dismissible panel at a time.

File plan: update `workspace.js` search/list behavior and guarded session storage of canonical IDs; add `watchlist.css` for sibling add/remove controls and results panel; load it in existing Athlete/Moment HTML; add a plus to shared icon helpers; document and capture browser verification. No database, application routes, permissions, provider requests or reviewed evidence changes.

Critique: replacing the left column with search results would hide the organizational research list. Keep search and the priority list separate. Color alone obscures uncertainty; unreviewed additions stay visibly Awaiting review. This concept has no organization membership data, so a local-list label avoids implying tenant-scoped production access.

## Objective and scope
Refine the user's selected Athlete B and Moment B: same three-column roster workspace, BLTZ dark/light themes, real sourced portraits where available, concise content, subtle motion, and mobile search in the top bar with portrait and identity first. This remains an isolated interactive design pass before live integration. Do not modify prior mockups, application routes, database, provider integrations, roles or onboarding.

## Shared design plan
Audience: BLTZ researchers and sports executives. Main job: select an athlete, recognize their career, inspect a sourced Moment, and follow the supported signal into a reviewable opportunity.

Six named brand colors: Night #080d17, Navy #141e30, Cloud #f5f7fc, Ink #1a263b, Gold #ffbb00, Blue #287be5. Theme tokens derive surfaces, text, rules and muted text from these values. Existing local Oswald provides restrained athlete/event headings; Geist provides readable body and forms; Roboto Condensed provides small utility captions. Keep B's rounded workspace geometry, not a new landing page or giant graph.

Signature: the athlete portrait remains the anchor while the evidence file changes below it. Gold denotes selected subject/navigation; blue denotes evidence. Quiet 160–200ms fade/4px settle on selections and tab panels, never ambient movement. Reduced-motion disables transitions and animations.

```
Desktop
BLTZ Intelligence Lab | Search athletes | Athlete / Moment | Theme
Athlete roster        | Portrait + identity               | Signals
                      | Moments / Media / Sources         | Opportunities
                      | selected evidence file            |

Mobile
BLTZ | Search athletes (results popover) | Theme
Portrait + athlete identity
Athlete / Moment navigation
Related-data or evidence tabs
Signals
Opportunities
```

## Critique before build
The previous B duplicated the anniversary, game summary, media warning, confidence and retrospective reason in the center and right rail. Give each fact one main home. Identity appears in the shared header. Performance appears in Moment cards on Athlete, and in one event summary on Moment. Source reader supplies provenance and claim boundaries, not another statistic table. Signal timing/score/reason stays in the right rail; opportunity gaps stay in the opportunity panel. Long technical identifiers and uncertainty detail belong in disclosures. Keep essential missing-media wording beside a single media state, not every card.

Preserve the reference's proportions and soft corners. Brand color is limited to selection, key links and state accents. Do not add charts, speculative awards, cleared images, fake athletes, revenue, chat, CRM actions or new graph relationships. Portrait attribution/clearance is separate from Moment media.

## Shared APIs and ownership
Root owns `shared.js`, `workspace.js`, `theme.js`, `shared.css`, HTML pages, roster/evidence copy, portrait map, assets, server and review documentation. Agents own only their named middle renderer and stylesheet.

`window.LAB_CENTERS` is initialized in shared.js. Register `LAB_CENTERS.athlete` or `.moment` with `{render(state), mount(host,state)?}`. Cleanup may be returned from mount. Root replaces the center on athlete selection; agent listeners must remain host-scoped and clean up on remount.

State: `{data: BLTZ_DATA, athlete: rosterRow merged with reviewed data for Keith, hasIntelligence, view: 'athlete'|'moment', momentKey:'usc'|'nfl', moment, theme:'dark'|'light'}`. Never access Keith-specific data if hasIntelligence is false. New roster selections without intelligence display concise incomplete state.

Helpers: `LAB_UI.e(value)`, `.date(ISO)`, `.icon(name)`, `.url(view,state,overrides={athleteId,momentKey,theme})`, `.sourceLink(source)` (if convenient). Destination files are `athlete.html` and `moment.html`. Themes travel in URLs. Old A/B picker is gone; only approved B remains. Use `var(--frame)`, `--panel`, `--soft`, `--paper`, `--ink`, `--muted`, `--line`, `--accent`, `--blue`, `--body`, `--display`, `--utility`; no own hex palette. Use `.ui-icon` SVG icons from helper (search/arrow/chevron/file/people/link/check/close/calendar/grid/sun/moon).

### Athlete agent
Own `middle-athlete.js` and `middle-athlete.css`. Refine B's Moments / Media references / Sources tabs. Two concise Moment cards: title, date, performance, source count, media count and link. Remove full signal reason and opportunity summary from the card, since right rail owns them. Career connections and identity detail can be secondary disclosure/tab content, with truthful incomplete states. Media reference rows should be concise (title/publisher/date/type; details for assertion and unknown dates/rights), not six paragraphs. Source rows concise with readable assertion on demand. Avoid large empty padding.

### Moment agent
Own `middle-moment.js` and `middle-moment.css`. Refine B source inspection. One compact event summary/date/performance, no repeat anniversary/retrospective since right rail owns significance. Evidence / Connections / Media tabs, source selector and assertion reader. Source reader must not repeat game performance already above. Claim boundaries under concise disclosure. Related event is one quiet link. Preserve proof and provenance (event, publication, fetch date distinction); NFL must not become a milestone.

## Evidence truth
The copied data packet is immutable. Fixed Oct 1, 2026 evaluation, Keith profile unverified vs separate verified external NFL match. USC–Washington Oct 7, 2006: 12 tackles, 1 TFL, 2 deflections; two USC sources; anniversary Oct 7, 2026; priority92/confidence99 separate. NFL Sep 7, 2014: 3 tackles +1 assist=4 combined, 9 defensive plays, no signal/opportunity. No verified Moment media. Post-career references are athlete context; unknown video dates remain unknown. Root provides any verified sourced portrait separately from Moment media with attribution. No restricted ESPN record gets promoted.

## Validation and report
Root owns desktop/light/dark/mobile screenshots and interactions. Each agent runs node --check on its renderer and records concise design notes in its owned `athlete-notes.md` or `moment-notes.md`. No tests mirroring markup; browser checks are appropriate. No app build needed for isolated prototypes. Future integration must preserve existing server authorization, signal gates and loader contracts; portraits need a public-field adapter and current search is name-only, unlike local concept filtering.

## Desktop identity revision — October 2
The user's approved refinement gives the desktop Athlete identity two equal columns: portrait at left (image90% of the identity area's height), enlarged identity at right. Status precedes the name; school, position and sport remain readable; paired team/year pills communicate affiliations without inventing playing seasons. The mobile and Moment header retain their compact proportions. Contact controls sit over the image; selections reveal known details and offer copy/navigation only for supplied values. Photographer and rights icon pills reveal attribution on hover, keyboard focus or click. Rights ownership must not be inferred from hosting or authorship. Keep CC BY attribution, source, license and crop disclosure accessible.

Critique before this revision: the compact portrait underweights the athlete, tiny identity labels are hard to scan, attribution text takes space while contact actions have no home. The revised layout must avoid turning incomplete source context into verified canonical relationships. A source-backed, view-only `athlete-display-data.js` supplies season-level affiliations; the immutable intelligence packet stays unchanged. Center Identity & provenance, show the two identity IDs, and remove repeated photograph details from that disclosure. Unknown contacts/tenures remain explicit, and no contact messaging is sent.

### Square-portrait refinement
The latest direction supersedes the 90% portrait height: the desktop image is square, no larger than 400×400px, and scales down with its column. Keep the equal information/portrait column allocation, with attribution immediately below the square. Combine each team and season range in one pill; display two-digit years with a hyphen (`04-07`), keeping full years and source qualifiers in its accessible label. Retain the visible Dallas offseason qualifier and remove the divider above retirement. Critique: the prior tall portrait and separate name/year pills consumed too much vertical space. This revision compacts that area without reducing identity type size or changing evidence.

### Compact identity actions and brand type
Latest refinement: Locker navigation sits next to email over the portrait; use the reviewed authenticated Keith Preview Locker URL, and show an unavailable state where a selected athlete has no reviewed destination. Identity/provenance moves from its standalone disclosure to the third icon below the photo, beside photographer and ownership. Hover/focus reveals; click pins until toggled, dismissed outside, Escape, or athlete replacement. Pinned content survives pointer departure and keyboard focus changes. Keep unknown identity/contact fields explicit. Year ranges stay `04-07`; single seasons retain four digits (`2014`, `2015`).

Critique: the separate provenance row interrupts the flow, spacious info rows weaken grouping, and separate Lab fonts differ from the current Locker type system. Tighten info spacing and reduce pills to 12px. The Athlete identity panel now uses locally served Barlow for display/body and JetBrains Mono for metadata, matching `app/layout.tsx` and `app/player/[slug]/LockerView.tsx`. Keep the rest of the approved workspace and Moment type unchanged. The square max400px portrait and source relationships remain. On narrow screens, four portrait actions use a compact two-row grid to avoid clipping.

### 300px portrait and contextual navigation
The next refinement caps the desktop Athlete photo at 300×300px, retaining a 1:1 ratio and scaling down when its column is narrower. Preserve the approved equal column allocation, compact information, contact toolbar and attribution icons. Remove the Athlete/Moment switch from the shared desktop header and its mobile duplicate. Use the existing Moment cards and Back to athlete link for contextual navigation.

Critique before build: the larger portrait still dominates the identity block; the requested 300px square keeps the athlete recognizable while bringing related evidence higher on the page. The header switch duplicates links already available alongside relevant data. Keep mobile's existing compact identity layout and all evidence/data unchanged.

### Athlete career folders
Refine only the Athlete Moments / Media / Sources area beneath identity. Raised folder tabs attach to a single shared folder body containing the existing cards and disclosures. The selected tab joins that body without a seam, while inactive folders sit behind it. Keep the approved brand palette and fonts, using a restrained gold cue for selection. Folder shoulders and layered depth carry the visual idea; no extra labels or repeated data are needed.

Critique before build: the current rounded segmented bar appears detached from the records below it. The folder treatment should make category and contents read as one unit. Preserve three readable tabs on mobile, 44px targets, visible focus, roving keyboard behavior, existing unknown-data states, and truthful evidence. The Moment screen and athlete identity are outside this change.

### Right-aligned rounded folders and shared Moment identity
The user now extends the approved Athlete layout to the Moment page. Both views share the same 300px square desktop portrait, equal information columns, brand typography, team/year pills and portrait controls. Both use the same folder treatment, anchored at the right with rounded 16px tab shoulders and a 22px folder body. Moment retains Evidence / Connections / Media, with the event summary, performance and evidence inside that folder. Back to athlete remains in the Moment content, keeping the identity header identical between views.

Critique before build: the sharp clipped shoulders and left alignment feel rigid; rounded folder edges and right alignment match the requested softer direction. The compact Moment identity unnecessarily changes scale when inspecting an event. Reuse the shared identity renderer and folder styles rather than creating a parallel header. Preserve all Moment gates, source/date distinctions, incomplete states and accessible tab interactions. On narrow screens let tab widths follow their labels so Connections remains readable. This continues to change only the isolated concept.

### Smooth folder bases and editorial Moment cards
Round the folder tabs' lower corners as well as their upper shoulders, retaining the attached active-tab treatment and right alignment. Team/year pills become plain text on both shared headers; source-backed tenure notes remain view data. Athlete Moment cards use larger uppercase Barlow Condensed names with the event date immediately below. Place the reviewed description alongside the title on wide cards, with a stacked attached-media preview area at the right and a distinct Inspect Moment button. Narrow layouts let the text and media area flow vertically.

Critique before build: the square tab bases interrupt the softer folder shape; team links act like article navigation inside identity context. The small Moment title/date arrangement underweights the event and leaves no home for attached media. Keep the reviewed performance and source counts, use the actual Moment summary, and use only attached Moment media for previews. Current Moment media arrays are empty, so the stack must show a truthful empty state with decorative backing cards, never borrowed portraits or unrelated article thumbnails. This remains a concept and changes no evidence or provider relationships.

### Outward folder flares

The corrected direction supersedes convex lower corners. Each tab's vertical sides now sweep outward into the folder body through concave rounded feet. Reuse the shared stylesheet across Athlete and Moment; retain the existing palette, type, selection, right alignment and content. A 12px desktop curve and smaller mobile curve keep the base visibly wider without crowding labels.

Critique before build: simply rounding the button's lower corners makes the base narrower. Outward radial corner shapes must instead extend beyond the button edges, with sufficient spacing and an uninterrupted selected-tab connection to the folder. Keep decoration pointer-transparent and preserve keyboard outlines. No data or production changes.

### Closer tabs and full-card Moment actions

Tighten the shared tab gaps to 8px on desktop and 4px on mobile so only their decorative flared feet overlap. Keep the active tab and focus outline above adjacent contours. In Athlete Moment cards, place the competition label above the event name and retain the date immediately below the name. The description remains beside the title at wide widths. Move the source-count/action footer beneath both the information and media columns; Inspect Moment aligns to the far bottom-right of the entire card, including wrapped mobile layouts.

Critique before build: reserving a full curve width on both sides leaves the folders too far apart. The action is currently constrained to the text column, leaving unused space beneath media. Use existing shared styles and one full-width footer, preserving keyboard navigation, truthful media states and all evidence. No data or production changes.

### Centered mobile folders and reviewed score rings

Reduce the shared tab gaps to 5px on desktop and 2px on mobile. Increase desktop right inset by 5px to move the group left, and center the mobile group so labels fit cleanly. Preserve curved overlapping feet and accessible selection/focus. Athlete Moment descriptions sit closer to titles with a separating dash and slightly larger text; competition remains above the name and event date below it.

Replace the card performance row with separate Evidence confidence and Review priority circular bars. Values come from reviewed Moment confidence and the associated Signal's score. USC has 99% confidence and 92/100 review priority; NFL has 99% confidence and no reviewed priority, so display Not scored without an invented zero. Performance facts remain available in the reviewed summary and Moment detail. Numeric labels are immediately readable; arcs fill once after a 2.5-second delay, over 1.2 seconds. Reduced motion displays the final arcs immediately.

Critique before build: the description is visually detached from the event; the lower card should communicate reviewability without conflating confidence with priority. Keep ring semantics and unavailable values explicit, use existing BLTZ palette/type, and keep SVG decoration separate from accessible labels. Preserve the media stack and bottom-right action. This remains an isolated design; no graph, data, provider or production changes.

### Priority bands and source identity cards

Keep the approved Night #080d17, Navy #141e30, Cloud #f5f7fc, Ink #1a263b, Gold #ffbb00 and Blue #287be5 palette, Barlow Condensed event headings, Geist body and Roboto Condensed utility text. Existing numeric review rings gain explicit Low (0–40), Mid (41–70) and High (71–100) labels; missing scores remain Not scored. Share one classification helper with the Signals rail. Do not change score calculation or evidence confidence.

Use smaller 12px, single-sentence editorial descriptions for the two reviewed Moment cards; the complete source assertions and performance remain in evidence/detail. These are temporary view copy, not production summary-selection rules. Sources form a two-column desktop grid with a source logo above the subtitle and title, followed by the same expandable evidence. Mobile uses one column. Use explicit, verified source-logo assets and say Logo not provided for unknown marks. Source marks identify publishers, not asset ownership or cleared Moment media.

Critique before build: numeric priority alone omits the requested assessment, long descriptions repeat detail, and the one-column source list underuses desktop space. Keep the flared career folders as the signature; add no decorative categories or inferred media. A slight lift/fan motion belongs only to actual media references on hover or keyboard focus, with reduced motion respected. Moment Evidence remains its existing focused reader. This continues the isolated prototype and does not change production, schema, permissions or the immutable reviewed snapshot.

### Intelligence-first navigation and mobile career context — October 3

Retain the approved palette, fonts, portrait sizes and flared folder signature. Athlete folders become Intelligence / Moments / Media, with Intelligence selected on initial render and athlete replacement. The compact overview uses only the reviewed career packet and preserves source cards in a closed Source evidence disclosure. Keep Signals and Opportunities in their existing rail instead of repeating them in the overview. Source provenance is not removed with the old navigation label.

Athlete Moment cards use smaller uppercase titles and a single vertical text order: competition, title, one-sentence description, event date. Remove the separating dash. On mobile center the text and attached-media stack. Priority rings show High/Mid/Low inside, keeping the genuine numeric score only as the arc input; confidence retains its percentage. Unknown priority remains unscored. Start the one-shot card animation when Moments is first viewed, since the new default panel is Intelligence.

Shared header search is geometrically centered on Athlete and Moment. Its label/placeholder becomes Search athletes, teams and moments; local filtering includes the reviewed team/Moment context and still selects an athlete from the roster. No global entity index or external query is implied. School, position and sport become smaller. Mobile renders these identity fields beside the portrait, then a full-width team/season and retirement block underneath. All team/season source qualifications remain.

Critique before build: the side-by-side description competes with the event heading, a numeric score repeats its categorical label, and mobile hides the complete career context. Keep the research surface compact, make identity history responsive instead of hiding it, and preserve evidence/incomplete states. This is still an isolated static concept; no production, schema, provider or access changes.

### Compact identity line and fitted names — October 3

Remove the status badge above the athlete name. Replace labeled school, position and sport rows with one compact line ordered School · Sport · Position. Center Teams & seasons and the sourced career-status/date line; center team pills as a group to keep the career block balanced. Retain the mobile full-width career history, original portrait proportions, fonts, theme and contact/provenance controls.

The full name stays on one line with no clipping, ellipsis or truncation. Use the existing responsive heading size as the ceiling, measure the rendered name and available heading width, and shrink only when needed. Refit after athlete selection, container/viewport changes and font loading. The visible name and accessible heading remain the complete canonical display name. Do not invent an active or retired date for incomplete records.

Critique before build: the badge repeats the career date and separate field labels add visual weight. Wrapping names make the shared identity header change shape across roster selections. This is a scoped shared-header refinement across Athlete and Moment, preserving evidence and all graph/data boundaries; no new UI or production architecture is needed.

### Contact grid and portrait reference overlay — October 4

Root changes the shared `workspace.js` markup, `identity-controls.css` interaction layout and `athlete-identity.css` header placement. Keep the approved Night/Navy/Cloud/Ink/Gold/Blue tokens and Barlow/JetBrains Mono identity typography. The portrait and complete fitted name remain the signature. Layout: portrait with a small overlaid reference toolbar on the left; name, School · Sport · Position, then Email / Locker / Phone / Social in a two-column, two-row grid on the right. Keep the sourced career date, remove the rendered Teams & seasons section, and preserve the underlying team context for search.

Each contact cell shows its icon, field name and actual available value, or an explicit Not supplied state. Preserve copy actions for verified email/phone, the reviewed Preview Locker link and expandable social navigation. Move photographer, attribution/license and identity/provenance controls into a bottom overlay on the portrait. Keep the toolbar outside the clipped image element so hover/focus and pinned disclosures are not cut off. Reduce reference-disclosure body text to 11px and identity metadata to 10px. No contact examples become athlete data.

Critique before build: icon-only contacts obscure missing data while the separated reference row adds height. A compact labeled grid makes availability visible and the portrait toolbar keeps image context next to the image. Keep one shared header for both pages and both themes, responsive text wrapping, keyboard focus and existing reduced motion. This is still an isolated concept; no application routes, authentication, provider calls or data writes.

### Value-only contact controls and social account list — October 4

Root updates `workspace.js` and `identity-controls.css`. Keep the two-by-two arrangement, approved theme tokens, Barlow data text and existing portrait/identity layout. Each control is a small icon tile with a background and one-pixel border, followed by plain value text. Remove the visible field title and surrounding card background; retain descriptive accessible names and explicit missing values.

Social opens on hover, keyboard focus or click. Its disclosure contains a linked list of every supplied HTTPS account, with platform/handle labels; a multiple-account summary shows the account count. Preserve click-to-pin, Escape/outside dismissal and navigation. Pointer devices keep the social disclosure anchored below its control and connected by the downward hover bridge; touch devices retain the fixed mobile disclosure. Do not populate fictional accounts or alter the source packets.

Critique before build: full cards and repeated labels make four small references feel heavier than the athlete identity. Put the visual boundary around the icon, keep the data quiet and move the social detail into its existing disclosure. Apply the same rendering to both concepts and both themes, wrap long values and retain usable focus/target sizes. No production, schema, permissions or data changes.

### Tighter desktop identity and stacked mobile portrait — October 4

Root refines `workspace.js` and `athlete-identity.css`. Retain Night #080d17, Navy #141e30, Cloud #f5f7fc, Ink #1a263b, Gold #ffbb00 and Blue #287be5; Barlow identity text and JetBrains Mono metadata. The portrait and full fitted name remain the signature. Desktop uses 40% portrait / 60% information, a small 10px text inset and the existing square portrait capped at 300px. Put the compact sourced career date beside the name, outside the heading. Example format: Ret - Jul 15'. Preserve the full source date in the accessible label and hover title. For a year-only active start, show the known year without inventing a month; unknown status/date remains absent.

Mobile stacks the centered square portrait above the information. Its reading and focus order is name, the four contact controls, School · Sport · Position, then the compact career date. Keep contacts in their current two-by-two layout with plain values and social hover/focus/click behavior. Reuse one header across Athlete and Moment.

Critique before build: equal columns and information padding create a wide name-to-portrait gap; the separate date row adds height. A 40/60 split brings the identity closer and gives longer names more room. The date must never enter the fitted-name measurement or force name wrapping. Mobile should use the full width for identity and contacts rather than squeeze them beside a small portrait. This remains a view-only concept refinement with no application, provider, schema or permission changes.

### Mobile profile line under the name — October 4

Move the existing School/Team · Sport · Position line directly under the name and before contact controls in the shared header DOM. Mobile order becomes portrait → name → profile line → contacts → date. Retain the existing typography, 40/60 desktop grid, compact date and all four contact interactions. Critique: profile context should accompany the name before contact actions; changing source order also keeps screen-reader order aligned. No new team data or restored Teams & seasons section.

### Desktop portrait breathing room and folder alignment — October 4

Increase the desktop information inset from 10px to 18px, retaining the 40/60 split and 300px portrait cap. Remove the desktop identity's 15px bottom margin and the center renderer's 20px top padding, so the folder's top/tab edge meets the portrait's bottom. Keep folder tabs and content in normal flow with their existing geometry; do not overlap the portrait or its reference controls. Apply to both concepts at 991px and wider. Mobile spacing and its portrait/name/profile/contact/date order remain unchanged.

Critique before build: the portrait needs a small horizontal breathing space while two stacked vertical spacers delay the folder. Adjust these specific spacers rather than moving content with a transform or changing the data/layout structure. Only `athlete-identity.css` and `career-folder.css` change UI behavior; no application, provider, schema or permission changes.

### Status below the profile line — October 4

Place the sourced status/date immediately below School/Team · Sport · Position, followed by the four contact controls, on both desktop and mobile. Use full visible labels and month names: Retired July 15' or Active January 08'. Preserve the precise full source date in title/ARIA/datetime and the explicit year-only fallback; unavailable status/dates stay absent. Desktop information uses one column so the full-name heading is no longer sharing a row with the date. Keep the 40/60 split, 18px portrait gap, folder spacing, portrait references and contact interactions.

Critique: the status belongs with career context rather than beside the name or below contact actions. Move the existing element and update view formatting without duplicating data or creating status claims. Root changes only shared header markup/formatting and identity CSS; no application, provider, schema or permission changes.

### Folder width aligned to the desktop portrait — October 4

Remove the desktop center-renderer's right inset and align its left inset with the portrait's actual left edge. With the existing 40% portrait column and 300px cap, that offset is max(0px, 40% - 300px). This removes the extra 22px wrapper gutter at normal desktop widths and follows the capped portrait on larger screens. Keep the folder inside the center column, its content padding and right-anchored tabs intact, and preserve the existing top alignment. Mobile retains its approved full-width research layout and centered portrait.

Critique: the folder wrapper adds another horizontal gutter outside the already padded folder body. Remove the redundant wrapper inset rather than scaling the folder or spilling into the intelligence rail. Only the shared desktop rule in `career-folder.css` changes UI behavior; no markup, data, application, provider or permission changes.

### Compact desktop folder tabs with larger labels — October 4

At 991px and wider, reduce the folder tab basis from 132px to 120px, inactive height from 44px to 42px and selected/tab-bar height from 50px to 46px. Reduce internal padding from 12px 16px to 10px 12px while increasing labels from 12px to 13px. Retain the current font, right alignment, five-pixel gap, rounded flare, selection underline and visible focus. Mobile tab rules remain unchanged.

Critique: the tabs can occupy less space without reducing their readable labels. A modest width/height adjustment and one-pixel type increase preserve the folder signature and leave room for Intelligence and Connections. Only shared desktop CSS changes; no markup, data, provider, application or permission changes.

### Expandable intelligence card lists and paired metrics — October 4

Keep the approved Night/Navy/Cloud/Ink/Gold/Blue palette, Geist reading text and Roboto Condensed metadata. Signals and Opportunities become semantic lists of native details cards, collapsed initially. Their summaries show the existing type/title/date or review state plus a chevron; clicking or pressing Enter/Space reveals reasoning, supporting context, missing assets and the existing Moment action. Keep links outside the summary. Only the existing reviewed signal/opportunity is supplied; all other athlete/event empty states remain truthful.

In the expanded Signal, put review priority and evidence confidence in matching circle graphs. Center each caption below its graph and use equal columns centered as a row. Gold remains priority; blue marks evidence confidence. Read the existing signal's confidence, never infer an Opportunity score, and preserve unavailable states. Opportunity reasoning keeps Moment → Signal → Opportunity traceability without repeating those scores. Native disclosure behavior and visible keyboard focus require no new state engine; a small chevron transition respects reduced motion.

Critique: always-expanded rail panels consume space and the lone confidence percentage lacks the requested visual balance. One card disclosure per item makes the rail scannable; matching graph/caption geometry separates evidence confidence from editorial priority. Root changes `workspace.js`, `shared.js` and `shared.css`, preserves full reviewed reasoning/data, and verifies Moment evidence/media actions inside expanded cards. No application, provider, schema, authentication or permission changes.

### 250px square desktop portrait — October 4

Reduce the shared desktop portrait cap to 250px by 250px at 991px and wider, retaining the 1:1 aspect ratio and approved 40/60 identity layout. Use one desktop size variable for the frame, image and folder offset so the folder still aligns with the actual portrait's left edge. Narrow desktop tracks may shrink the square to fit; mobile keeps its existing 300px cap. Preserve the current crop, attribution controls, colors, fonts and contact behavior.

Critique: reducing the portrait without updating the folder's 300px alignment calculation would separate their left edges on wide screens. Update both shared CSS files together; no data, markup, application, schema or permission changes.

### Stable folder width across tab changes — October 4

Reserve the page scrollbar gutter in the shared concept stylesheet. At the same viewport, the Moment folder and surrounding columns must retain their horizontal measurements when Evidence, Connections or Media has a different height. Keep responsive widths, portrait alignment, natural content height and the approved visual tokens.

Critique: the shorter Media panel removes the scrollbar and frees horizontal space, widening the center column by about 12.5px in the reproduced desktop case. Stabilize that viewport space rather than add per-tab dimensions. Only shared CSS changes behavior; no markup, data, application, schema or permission changes.

### Sample Activation card and editable inspection modal — October 4

Add an Activations container immediately below Opportunities on both approved concepts. Reuse the same collapsed native card list, title hierarchy and chevron behavior. Keith's USC example opens an editable modal with activation details, attached sample brands, release date, original sample image/video assets, local media attachment controls and illustrative reach/performance statistics. All sample associations and measurements stay explicitly labeled and separate from reviewed evidence. Other athletes and the NFL event receive truthful empty states.

Retain Night #080d17, Navy #141e30, Cloud #f5f7fc, Ink #1a263b, Gold #ffbb00 and Blue #287be5 with the existing display, reading and metadata fonts. The modal uses a clear overview, brand/media sections and deeper measurement panels, with one Save sample action, Cancel, native focus containment and Escape closing. Metadata saves within the local preview session; attached files are local temporary previews. Show meaningful metric denominators, platform/window breakdowns and no inferred revenue or permissions.

Critique: a visually complete activation could be mistaken for a real campaign supported by the graph. Prominent sample labels, original concept artwork and illustrative measurement captions preserve that distinction. Keep the scoped module, sample state and modal separate from source facts; implement no production campaign workflow, provider integration, upload service, schemas or permissions. Root integrates the module into the existing shell and loopback server; dedicated agents build/review the modal and original sample media.
