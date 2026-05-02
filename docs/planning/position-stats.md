# BLTZ Position-Driven Stats Spec

The locker page renders different stats depending on the player's primary position.
Each position has **3 hero stats** (the big gold callouts on the front of the locker)
and a **full set** that lives in the See Full Stats modal as season-by-season tables.

**Design principle:** hero stats = the impressive number that travels in screenshots
and conversations. Full stats = the receipts that live behind a modal.

---

## OFFENSE

### Quarterback (QB)
| Hero stats (top 3) | Full stats |
|---|---|
| Passing Yards · Passing TDs · QB Rating | Comp / Att · Comp% · INT · Rush Yds · Rush TDs · Wins as Starter · Sacks Taken · Long Pass · 300-yard Games · 4Q Comebacks |

### Running Back (RB)
| Hero stats | Full stats |
|---|---|
| Rushing Yards · Rushing TDs · Yards from Scrimmage | Att · YPC · Receptions · Rec Yds · Rec TDs · 100-yd Games · Long Run · Total TDs |

### Wide Receiver (WR)
| Hero stats | Full stats |
|---|---|
| Receiving Yards · Receiving TDs · Receptions | Targets · YPR · Long Rec · 100-yd Games · YAC (yards after catch) · Drops |

### Tight End (TE)
| Hero stats | Full stats |
|---|---|
| Receiving Yards · Receiving TDs · Receptions | Targets · YPR · Long Rec · Blocking Grade · 100-yd Games |

### Offensive Line (C / G / T)
> Stats don't tell this story — accolades and durability do.

| Hero stats | Full stats |
|---|---|
| Games Started · Sacks Allowed · All-Pro / All-Conference | Penalties · Pass-Block Win Rate · Run-Block Win Rate · Pancakes (college) · Pro Bowl selections |

---

## DEFENSE

### Defensive Line (DE / DT / NT)
| Hero stats | Full stats |
|---|---|
| Sacks · Tackles for Loss · Forced Fumbles | **Tackles** · QB Hits · QB Hurries · Pass Deflections · Fumble Recoveries · Safeties · Defensive TDs |

### Linebacker (LB / OLB / ILB)
| Hero stats | Full stats |
|---|---|
| Tackles · Sacks · Tackles for Loss | Solo / Assisted Tackles · Interceptions · Forced Fumbles · Pass Deflections · QB Hurries · Defensive TDs |

### Cornerback (CB)
| Hero stats | Full stats |
|---|---|
| Interceptions · Pass Deflections · Defensive TDs | Tackles · INT Return Yds · Long INT Return · **INT Touchdowns** · Forced Fumbles · Targeted Yards Allowed · Passer Rating Against |

### Safety (FS / SS)
| Hero stats | Full stats |
|---|---|
| Tackles · Interceptions · Forced Fumbles | Pass Deflections · Sacks · Solo Tackles · INT Return Yds · **INT Touchdowns** · Defensive TDs |

**Note on INT TDs vs Defensive TDs:** worth keeping both because they tell different stories.
- `int_touchdowns` = pick-sixes only (a specific moment of brilliance)
- `defensive_touchdowns` = pick-6s + fumble returns + safeties (career total of "I scored on defense")

A career like Charles Woodson would show `INT TDs: 11` and `Defensive TDs: 13` — both impressive, neither redundant.

---

## SPECIAL TEAMS

### Kicker (K)
| Hero stats | Full stats |
|---|---|
| FG% · Long FG · Career FG Made | XP Made / Att · 50+ FG Made · Game-Winning FGs · Total Points |

### Punter (P)
| Hero stats | Full stats |
|---|---|
| Avg Yards per Punt · Net Avg · Inside-20 % | Punts · Long Punt · Touchbacks · Punts Returned · Return Yds Allowed |

### Returner (KR / PR — dual-role)
| Hero stats | Full stats |
|---|---|
| Return TDs · Return Yards · YPR | Returns · Long Return · Fair Catches · Fumbles |

### Long Snapper (LS)
> No real stats. Lean on accolades + tenure.

| Hero stats | Full stats |
|---|---|
| Games Played · Pro Bowl selections · Bad Snaps (lower=better) | Total Snaps · Career Length |

---

## UNIVERSAL (shown for every position)
- Games Played / Games Started
- Awards & Honors (Heisman, MVP, All-American, Pro Bowl, HOF, etc.)
- Years Active
- Teams / Schools

---

## "Highest possible numbers" logic

The hero stats default to the player's **career bests**, computed at locker render time:

```
hero_stat.value = max(season.value across all seasons) — for single-season records
                  OR sum(season.value across all seasons) — for career totals
```

Each hero stat gets a `mode` flag:
- `total` → sum across seasons (rushing yards, sacks, INTs)
- `peak` → max single-season (longest run, FG%, single-season TDs)
- `count` → derived count (100-yard games, 50+ FG made, defensive TDs)
- `rate` → divided (YPC, QB rating, pass completion %)

This gives every player the most flattering possible front-page number without
requiring the athlete to think about which stat to feature.

---

## Suggested data shape (TypeScript)

```ts
type Position =
  | 'QB' | 'RB' | 'WR' | 'TE' | 'OL'
  | 'DL' | 'LB' | 'CB' | 'S'
  | 'K' | 'P' | 'KR' | 'LS';

type StatMode = 'total' | 'peak' | 'count' | 'rate';

interface StatDef {
  key: string;        // e.g. 'rushing_yards'
  label: string;      // e.g. 'Rushing Yards'
  mode: StatMode;
  unit?: string;      // optional, e.g. 'yds', '%'
  format?: 'integer' | 'decimal-1' | 'percent';
}

interface PositionConfig {
  hero: StatDef[];    // exactly 3 entries — front-of-locker callouts
  full: StatDef[];    // shown in the See Full Stats modal
}

export const POSITION_STATS: Record<Position, PositionConfig> = {
  QB: {
    hero: [
      { key: 'pass_yards',  label: 'Passing Yards', mode: 'total',  format: 'integer' },
      { key: 'pass_tds',    label: 'Passing TDs',   mode: 'total',  format: 'integer' },
      { key: 'qb_rating',   label: 'QB Rating',     mode: 'peak',   format: 'decimal-1' },
    ],
    full: [
      { key: 'completions', label: 'Completions',   mode: 'total',  format: 'integer' },
      { key: 'attempts',    label: 'Attempts',      mode: 'total',  format: 'integer' },
      { key: 'comp_pct',    label: 'Completion %',  mode: 'rate',   format: 'percent' },
      { key: 'interceptions', label: 'INT',         mode: 'total',  format: 'integer' },
      { key: 'rush_yards',  label: 'Rush Yards',    mode: 'total',  format: 'integer' },
      { key: 'rush_tds',    label: 'Rush TDs',      mode: 'total',  format: 'integer' },
      { key: 'wins',        label: 'Wins as Starter', mode: 'total', format: 'integer' },
      { key: 'sacks_taken', label: 'Sacks Taken',   mode: 'total',  format: 'integer' },
      { key: 'long_pass',   label: 'Long Pass',     mode: 'peak',   format: 'integer' },
      { key: 'three_hundred_yd_games', label: '300-yd Games', mode: 'count', format: 'integer' },
      { key: 'fourth_quarter_comebacks', label: '4Q Comebacks', mode: 'total', format: 'integer' },
    ],
  },
  // ... RB, WR, TE, OL, DL, LB, CB, S, K, P, KR, LS follow the same shape
};
```

---

## Implementation plan

1. **Phase 1 (mockup):** Add `POSITION_STATS` as a JSON config in `mockups/locker-page.html`.
   Add `?position=QB|RB|WR|...` query param so we can preview each position's locker.
2. **Phase 2 (data):** Move `POSITION_STATS` to `lib/position-stats.ts` as a typed config.
   The Supabase `players` table has `position` column. The locker page reads the position
   and feeds the matching config to the `<PlayerStats>` component.
3. **Phase 3 (ingestion):** Stat scraping pipeline maps source data
   (Sports Reference, ESPN, school sites, Pro Football Reference) onto the `StatDef.key`
   schema. Each position config knows which keys it cares about; stats outside the position's
   config are stored but not displayed.
4. **Phase 4 (multi-position):** Some athletes play multiple positions over a career
   (e.g., Devin Hester WR/KR, Troy Polamalu S w/ rush snaps). Add `secondary_positions`
   support — secondary positions get an additional collapsed stats card below the primary.

---

## Open questions

- How do we handle players whose stats only exist as accolades (HOF coaches, position
  coaches with no playing stats)? Likely a separate `coach` profile type.
- College stats coverage varies by era — Marcus Allen's 1979 freshman year vs. modern
  PFF tracking. Acceptable to show "—" for missing stats.
- Should multi-position be a UI surfaced choice (athlete edits) or auto-detected from
  source data?
