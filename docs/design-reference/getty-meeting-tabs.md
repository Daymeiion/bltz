# Getty meeting views

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
