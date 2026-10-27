# Getty meeting views — visual revision, October 27, 2026

The current user direction supersedes the text-heavy layout below. Main meeting views must work at a glance during a 30-minute executive call.

```text
Original overview | Visual one-sheet | Image workflow | Commercial model (backup)

GETTY IMAGE SETS -> PLAYER LOCKERS -> PLAYER MARKETING -> BUYER INTEREST -> AGREED LICENSES
  Database icon     Athlete / 50       Megaphone          Tinybird +        Agreement
                                                         QStash events
                                                                          |
                    Editorial | Podcast | Print | Events / Camps / Speaking

                  GETTY                              BLTZ
         Image sets / Terms / Licenses    50 players / Locker marketing / Interest tracking
```

Primary user: presenter sharing a screen with Getty executives.
Primary action: narrate the visual workflow; each stage has a large icon and short label.
Secondary action: open the commercial model only for pricing/payout questions; download matching visual PDFs.
Critical information: the five stages, agreed uses, 50-player pilot and each side's role.
Mobile priority: large stacked stages; no scaled-down unreadable diagram or horizontal overflow.
Known exclusions: no implementation of Tinybird/QStash integrations, license delivery, pricing, payouts or an MOU. No new schemas or permissions. No small-text briefs, quote placeholders, financial assumptions or explanatory paragraphs in the two main meeting maps.

File plan: replace the two `PilotViews` documents and their copy/styles with one shared SVG diagram plus an equivalent mobile layout; generate both PDFs from that same diagram. Keep the original overview, commercial backup, sidebar, auth and download handler intact. Update the existing presentation tests, generator and release notes. Existing project typography, navy surfaces, gold connectors and icon library take priority over generic skill examples.

## Earlier layout reference (superseded)

Primary user: BLTZ admin presenting to Getty.
Primary action: switch between original overview, visual one-sheet and image workflow.
Secondary action: download matching one-page PDFs for the two new views.
Critical information: proposed uses, potential buyer, Getty revenue, approval/attribution, pilot scope and measures, blank quote spaces.
Mobile priority: tabs fit the viewport; document columns stack; normal page scrolling.
Known exclusions: no live licensing, sales, quote editor, analytics, database or permission changes.

```text
Admin sidebar | Original overview | Visual one-sheet | Image workflow
              -------------------------------------------------------
Overview      | Original presentation retained verbatim (default)
One-sheet     | Thesis                             Download PDF
              | Getty -> Athlete/moment -> Use -> Revenue/attribution
              | A Print       | Workflow + buyer | Getty revenue
              | B Podcast     | Workflow + buyer | Getty revenue
              | C Documentary | Workflow + buyer | Getty revenue
              | 50-player pilot: scope, stages, measures
              | Player quote space       | Player quote space
Workflow      | Connect -> Specify -> Approve/license -> Attribute
              | Three use briefs: approval, buyer, revenue, tracking
              | Getty / BLTZ responsibilities
```

Use existing Radix tabs and admin authorization. All presentation source and PDFs stay in the route directory. The PDF route separately checks server-side platform authorization. A narrow Next file-tracing entry packages the private PDFs; no public PDF copies are deployed. This discussion proposal demonstrates career/moment/use relationships without implementing future graph phases.
