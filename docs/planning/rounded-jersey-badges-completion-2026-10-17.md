# Rounded jersey number badges

## Summary

Deployed an 8px border radius on the shared jersey number badge component. Team colors, chronological order, size, labels, and numbers are preserved.

## Files changed

[JerseyNumberRow.tsx](C:/Users/Administrator/bltz/output/preview-merchandise-search/components/player/JerseyNumberRow.tsx): added `borderRadius: 8`.

## Routes changed

No new routes. Shared badge styling applies to `/player/[slug]` and `/preview-lockers/[slug]`.

## Database changes

None.

## Migrations

None.

## Environment variables

None.

## Permission changes

None. No protected operations or data persistence changed.

## Tests run

- Vitest: 196 files passed, 2 skipped; 1,613 tests passed, 24 skipped.
- TypeScript: passed.
- ESLint: 0 errors; existing 290 warnings.
- Production build: passed.
- Whitespace diff check: passed.

## Manual verification

Production commit `f7124758e066a2036d75958efa9e27a027d71887`, Vercel deployment `dpl_B41jXyXgxArvsiJGEsG9dsnJa1ZQ`, is READY and assigned to the BLTZ production domains.

Reloaded [Cason's Locker](https://bltz.vercel.app/preview-lockers/antoine-cason). All four badges display rounded corners and compute to an 8px radius on desktop and mobile. Chronological order and team colors are intact. Mobile page width matches viewport width without horizontal overflow.

![Rounded jersey badges](C:/Users/Administrator/bltz/output/rounded-jersey-desktop.png)

## Known limitations

None for this presentation change.

## Deferred work

None.

## Product direction

Improves presentation of the existing Athlete → Team jersey relationships, which persist after an athlete leaves a team. No new Career, Moment, or Value Graph relationships were introduced. No third-party workflow was duplicated and no media-management scope was added.
