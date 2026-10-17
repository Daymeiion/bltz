# Merchandise discovery in Media

Primary user: internal Preview Locker Admin.
Primary action: Search merchandise for the saved player identity.
Secondary actions: inspect seller, review a listing, add to draft, dismiss, edit and save existing merchandise.
Critical information: product title, category, seller link, matched college/team, source price and availability when present.
Mobile priority: one-column results; controls wrap; seller links and text stay within the editor.
Known exclusions: checkout, inventory, automatic publication, bulk crawling, inferred endorsements/rights/earnings.

Media → Merchandise
  Search merchandise [disabled for unsaved identity/unsaved edits]
  Discovery status / errors / honest empty state
  Results for review (separate from Locker products)
    Product metadata + matched college/team + seller link
    [ ] I reviewed this listing for the player
    Add to draft / Dismiss
  Locker merchandise (existing editable products)
  Add merchandise manually

Search results stay in this editor session. Only explicit additions enter the existing draft merchandise array; normal Save draft persists them. No schema change or automatic Locker write.

File plan: shared metadata parser and product extractor; bounded affiliation-scoped discovery; Admin POST merchandise endpoint using existing discovery admission; Media form/results components; parser/discovery/API/form regression tests. Preserve current news, statistics and access-window behavior.
