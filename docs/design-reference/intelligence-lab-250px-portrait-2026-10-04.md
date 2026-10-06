**Design-reference history.** Current application source and typography take priority; see [current design index](current-design-index.md). Prototype data and activations are concepts, not production metrics or approvals.

# Intelligence Lab 250px desktop portrait

Latest revision: [Stable folder width across tabs](intelligence-lab-stable-folder-width-2026-10-04.md). This report records the preceding portrait adjustment.

October 4, 2026. [Athlete concept](http://127.0.0.1:3138/athlete.html?theme=dark) and [Moment concept](http://127.0.0.1:3138/moment.html?moment=usc&theme=light). [Plan and critique](../../mockups/intelligence-lab/CONTRACT.md#250px-square-desktop-portrait--october-4).

The desktop portrait now caps at 250 × 250px with a 1:1 aspect ratio. One inherited desktop size variable also controls the folder's left offset, preserving its alignment with the portrait. The approved 40/60 header tracks and mobile 300px portrait cap remain.

## Completion report

| Item | Result |
| --- | --- |
| Summary | Smaller square desktop portraits on both concepts, with matching folder alignment. |
| Files changed | `mockups/intelligence-lab/athlete-identity.css`, `career-folder.css`, `CONTRACT.md`; this report and latest pointers in selected-B/expandable-rail reports; four desktop captures and four refreshed comparison images in `mockups/intelligence-lab/previews/`. |
| Routes changed | Existing local HTML concepts only. No application routes or deployment. |
| Database changes | None. |
| Migrations | None. |
| Environment variables | None. |
| Permission changes | None. |
| Tests run | Both changed CSS files parse. Delegated read-only cascade/alignment review passed. Both updated CSS responses match saved files with no-store caching; scoped whitespace/capture checks passed. No application lint/type/test/build suites were run for this isolated CSS refinement. |
| Manual verification | At 1600px desktop, both concepts measure 250 × 250px with zero folder/portrait left-edge difference and no horizontal overflow. Both themes captured. At 992px, the square shrinks to its available track width and retains zero alignment difference. At 390px mobile, it remains 300 × 300px with no horizontal overflow. Viewport override reset, light Moment preview left open, and console has no warnings/errors. |
| Known limitations | Narrow desktop tracks shrink the square below the 250px cap to preserve the approved 40/60 layout and avoid overflow. |
| Deferred work | Production integration remains a separate step. No work remains for this concept adjustment. |

Product direction: no persisted Career, Moment Contribution or Value Graph relationships are added. Existing historical evidence remains available after an athlete leaves an organization. Attribution and contact behavior are preserved; no third-party workflow duplication or generalized media-management scope is introduced.

| Desktop view | Dark | Light |
| --- | --- | --- |
| Athlete | [Preview](../../mockups/intelligence-lab/previews/athlete-250px-portrait-dark.jpg) | [Preview](../../mockups/intelligence-lab/previews/athlete-250px-portrait-light.jpg) |
| Moment | [Preview](../../mockups/intelligence-lab/previews/moment-250px-portrait-dark.jpg) | [Preview](../../mockups/intelligence-lab/previews/moment-250px-portrait-light.jpg) |
