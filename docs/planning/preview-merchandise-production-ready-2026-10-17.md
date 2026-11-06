# Merchandise discovery — production release

## Summary and source

Implementation is complete in isolated branch `codex/preview-merchandise-search-2026-10-17`, commit `9986330d8f8f612fb770a51622da013e264d693c`, checkout `output/preview-merchandise-search`. It is based on the preceding news/Media release `884754b`. The root's unrelated uncommitted work is preserved. The user explicitly approved deployment of the tested commit with “Deploy to production.” A guarded normal fast-forward pushed that exact commit to `main`, triggering Vercel production deployment `dpl_GiYq6ZLdDznEG5htgpJDhMkfc4x4`.

An earlier automatic approval review rejected a combined commit/production-push command for lack of explicit publication authorization. That command did not run. The local checkpoint and validation were completed, and the user then approved this exact release. The subsequent production push was approved and succeeded. Deployment acceptance checks are recorded below.

## Files and routes

Sixteen committed files. Exact names are in `output/merchandise-release-files.json` and `git show --name-only 9986330`:

- Builder: `MerchandiseSection.tsx`, new `MerchandiseResults.tsx`, `PreviewLockerForm.tsx`.
- New Admin POST `/api/preview-lockers/[id]/merchandise`.
- Discovery/extraction: `lib/enrichment/merchandise.ts`, `product-metadata.ts`.
- Reused boundaries: `article-metadata.ts`, `news.ts`, `safe-fetch.ts`, `lib/preview-lockers/enrichment.ts`, `lib/search/errors.ts`.
- Three metadata/discovery/API/form regression-test files and two workflow/design documents.

Admin new/edit pages gain on-demand merchandise search in Media. The public/private Locker renderer remains limited to saved visible products. Queries pair a quoted player name with saved colleges and teams for trading cards and jerseys. Seller metadata, rather than search snippets, corroborates name, football and affiliation. Results remain separate until explicit per-listing review, Add to draft and Save draft. Failed searches preserve the draft and earlier results. Identity/revision changes disable stale results. Duplicates are blocked; existing merchandise is retained.

## Database, migrations, environment and permissions

Database/schema changes: none. Migrations: none. Generated-type changes: none. Environment changes: none; existing server-only `TAVILY_API_KEY` is reused. Dependencies: unchanged.

The new endpoint requires existing Admin authorization and same-origin JSON, accepts only a saved revision, and reads the RLS-scoped identity. It uses existing per-Admin discovery admission/finalization, daily budget and cooldown, checks the revision again before returning, and cannot save products. It returns private/no-store responses with sanitized errors. Selected products use existing server validation, revision guards, RLS and editorial audit snapshots on save. No new role, policy, public exposure, credential or service-role browser access.

## Tests and manual verification

- Final complete suite: **1,523 passed, 24 skipped, zero failures**, 187 passed/two skipped files.
- Focused metadata/discovery/API/news regression run: 81 passed. Focused merchandise/current Media form run: ten passed.
- TypeScript and final production build passed. Build includes the final stale-revision safeguard.
- Full lint: zero errors, 290 warnings; 289 inherited plus direct seller-image rendering. Final changed-file lint: zero errors.
- Source whitespace checks passed. Local checkpoint is clean; temporary network-test source was removed before validation/publication preparation.
- Live Tavily and safe metadata extraction for Antoine Cason using Arizona and San Diego Chargers returned a signed football trading-card listing on Amazon and an NFL Chargers game-issued jersey listing. Some sellers blocked extraction; the result correctly reported partial. Missing price/availability remained unknown. Unresolved image-template metadata is filtered out. This probe saved no products.
- Browser QA used the actual new React components in a clearly labelled local-only harness with public metadata from that probe. Both Add to draft buttons started disabled. Reviewing one enabled it; adding populated the correct editable merchandise fields and disabled the duplicate. The other unreviewed product stayed disabled. The harness has no live save endpoint, and no athlete record changed.
- At an actual 390px viewport, document width stayed 390px. Temporary browser sizing was restored. Local UI screenshots: `output/merchandise-ui-proof/review-desktop.png` and `review-mobile.png`. Test/build/lint/live-search evidence: `output/merchandise-*`.

### Production acceptance

Vercel reports **READY**, production target, exact commit `9986330d8f8f612fb770a51622da013e264d693c`, deployment `dpl_GiYq6ZLdDznEG5htgpJDhMkfc4x4`, URL `https://bltz-q1vgvtjvs-daymeiions-projects.vercel.app`. The deployment owns `bltz.me`, `www.bltz.me` and `bltz.vercel.app`. Production build compiled, type checked and generated all 98 static pages successfully.

- `https://bltz.me/`: HTTP 200.
- Anonymous Admin builder request: HTTP 307 to Admin sign-in, private/no-store.
- Anonymous POST to the new merchandise endpoint: HTTP 401, private/no-store.
- An authenticated fresh Antoine Cason editor displayed Media, five existing news articles and zero saved merchandise. Media → Merchandise displayed the new search controls. A real production search ran to completion and returned an explicit partial/empty state: some seller pages could not be checked, and no matching listings were verified. Existing merchandise remained zero. No review, Add to draft or Save draft action was taken on the athlete's behalf.
- The production search did not reproduce the two accepted listings from the earlier local live probe. Production listing-card rendering could therefore not be verified in this run; review gating and save behavior are covered by the actual-component local browser checks and regression suite above. Seller/metadata availability remains a coverage limitation and the empty live result must not be described as successful listing discovery.
- Production mobile viewport and document width both measured 390px, with browser sizing restored afterward. Desktop and mobile screenshots are under `output/merchandise-ui-proof/production-*.png`. The authenticated editor tab was left open in Media → Merchandise for the user.
- No browser warnings/errors were captured. Bounded Vercel error-log checks returned no entries, including after the production search. The exact release checkout remains clean.

## Limitations and deferred work

Search results live in the editor session until reload; only chosen products persist through the existing Save draft path. Discovery is bounded to 12 category/affiliation queries, 16 metadata fetches and 12 results under a 45-second deadline, using the current cooldown/daily budget. Seller blocks, stale listings and absent metadata limit coverage. Users review the current seller listing; metadata is not proof of stock, authenticity, endorsement or licensing. Product-candidate persistence, inventory, checkout, automated purchases and financial allocations are deferred. No product is automatically added to a Locker.

## Product-direction check

Strengthens athlete → college/team identity context → sourced merchandise references and keeps them useful after organizational departure. Existing news, stats, private access windows and claim behavior are preserved. No Moment, rights-ownership or Value Graph entitlement is inferred. External seller workflows are integrated through links; no generalized media-management, marketplace backend or mature commerce workflow was duplicated.
