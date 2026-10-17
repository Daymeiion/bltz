# Page intent

Primary user: BLTZ staff editing a saved preview Locker.
Primary action: curate news and merchandise, then save the existing draft.
Secondary actions: refresh scraped news, add an article, hide/restore a scraped result, add/edit/hide/remove a product, manage existing social posts.
Critical information: source, exact destination, headline/title, image, summary/date or category/retailer/price label, visibility, unsaved state.
Mobile priority: one-column labeled forms; full-width controls; no wide tables.
Known exclusions: checkout, inventory, inferred endorsement, commissions/earnings, generalized product scraping, article bodies, Media Graph schemas.

```text
Info | Career | Stats | Images | Videos | Media

Media
  News articles
    [Reload saved articles] [Refresh scraped news] (save pending edits first)
    Scraped results: source + headline + exact link
      [Edit details] [Show/Hide in Locker] [Reset to scraped details]
    Added articles
      headline / publisher / URL / image / short summary / date / visibility
      [Add article] [Remove added article]
  Merchandise
    title / category / retailer / product URL / image URL / price label / visibility
    [Add merchandise] [Remove merchandise]
  Social posts and shorts (existing controls)

Existing Save draft / review / Save changes controls
```

File plan: extend preview validation and generated types with bounded article edits and merchandise; add an additive migration preserving RLS, revisions, audit and enrollment; implement reusable Media-tab sections; expose authorized saved news in the existing news route; merge editorial settings when mapping the preview into the existing Locker cards. Scraped records remain the discovery evidence; preview article edits are presentation overrides and manual additions, not a new canonical article store.
