# BLTZ Player Dashboard — Plan + Review

**Source design doc:** `~/.gstack/projects/Daymeiion-bltz/Administrator-claude-busy-hellman-6b7937-design-20260501-131831.md`
**Status:** APPROVED (2026-05-01) — all 4 taste recommendations accepted
**Branch:** claude/busy-hellman-6b7937
**Date:** 2026-05-01

---

## Premises (locked from /office-hours)

| # | Premise | Decision |
|---|---|---|
| P1 | Freemium line: visual identity + analytics depth | Generous free, premium = colors/fonts/brand/analytics depth |
| P2 | North-star metric | Hybrid: analytics dopamine + content prompts |
| P3 | Customization scope | Preset themes free, hex picker + custom font premium |
| P4 | Edit pattern | Hybrid form editor + live iframe preview |
| P5 | Dashboard role | The SaaS engine. Locker is the artifact. |
| P6 | Mobile | Intentional, not stacked-desktop. Sheet pattern for editor. |

---

# CEO REVIEW

## Strategic premises challenged

**P1 (generous free) — STRONG.** Matches the brand voice and the 50-locker concierge launch model. Athletes won't pay for something they haven't experienced. Free has to feel complete or the upgrade prompt feels like extortion. Confirmed.

**P2 (hybrid north-star) — RISK.** Two reasons to come back is one too many to optimize for. Analytics is a known DAU driver (every social product has it). Content prompts are unproven (depends on pipeline quality). RECOMMENDATION: lead with analytics-first as the hero on Overview, treat content prompts as a secondary feed item for the first 90 days. Once the pipeline proves it surfaces signal-not-noise, elevate it.

**P3 (themes free, hex premium) — STRONG.** Standard SaaS pattern (Linktree, Beacons, Bento all do this). The 12 BLTZ-curated themes are a real moat — "every locker looks like BLTZ even at the free tier." Confirmed.

**P4 (hybrid editor) — RIGHT BUT COSTLY.** This is the hardest part of the build. iframe preview that re-renders on edit needs:
- Debounce (300ms after last keystroke)
- Postmessage protocol between editor and iframe (don't reload the iframe, send patch messages)
- Skeleton state while preview re-renders
- "View Live" button to break out of the preview into the real published locker

If the eng team treats this as "embed an iframe," it ships janky. Eng review covers this in detail below.

**P5 (dashboard = SaaS engine) — STRONG.** Reframes the success metrics correctly. Confirmed.

**P6 (intentional mobile) — UNDER-SPECIFIED.** "Sheet pattern" works for the editor. But what about Pipeline Queue on mobile? Analytics chart? Theme picker with hex picker? Each needs its own mobile pattern — defer to design review.

## Hidden strategic risks

**1. The "premium upgrade trap"** — generous free is the right brand call but the wrong revenue call IF premium doesn't deliver enough lift. Athletes need to see clear "I want THAT" moments while using free. Mitigation: the premium analytics geo heatmap should be visible-but-blurred for free users. Custom colors should show a "preview with this color" demo even before subscribing.

**2. Pipeline content drowning** — if auto-discovery surfaces 50+ candidates per athlete, the queue becomes a chore, not a delight. AT MVP we should cap at top-10-by-quality per week. The pipeline is part of the locker eng review (already specified) but the dashboard's queue needs a separate "incoming volume" budget.

**3. The "blank locker" problem** — the dashboard's onboarding state (just-claimed locker, mostly empty) is a different design surface than the dashboard's steady state (loaded locker, daily edits). MVP risks designing only the steady state. Mitigation: explicitly design the "first 5 minutes after claim" flow.

**4. Multi-locker coming soon** — the design doc names this as v2 but the data model decision is now. Lockers should belong to athletes (M:1 or 1:1?) — pick a side now or eat a migration later.

## Competitive landscape

Direct competitors (do similar jobs for similar users):
- **Linktree / Beacons / Bento** — generic creator dashboards. Not sport-aware.
- **Stan Store / Whop** — creator monetization dashboards. Heavier on commerce, lighter on analytics.
- **Stack Sports / Hudl** — sport-aware but coach-controlled. Not athlete-first.
- **The Players' Tribune** — athlete content but editor-curated, no self-serve dashboard.

BLTZ's positioning: **"The Linktree for athletes who actually have something to show"** — the locker is the asset (because it has REAL footage and stats, not just links), and the dashboard is the control panel.

## "What looks foolish in 6 months" pre-mortem

If we ship this and it fails, the most likely cause is:
1. **Athletes don't come back to the dashboard.** Analytics aren't compelling enough, content pipeline doesn't surface enough that they care about. They claim, edit once, never return. Defense: instrument DAU/WAU from day 1, treat <30% W4 retention as a fire alarm.
2. **The premium tier doesn't sell.** Custom colors aren't worth $X/mo to most athletes. Defense: bundle premium with a clear emotional hook — "your locker, your colors, your data" — and offer a 14-day free trial of premium so athletes feel the upgrade before paying.
3. **The live preview iframe creates a UX disaster** — slow, confusing, mobile-broken. Defense: dedicate eng time to this specifically; treat it as the hero technical work, not a "we'll figure it out."

---

# DESIGN REVIEW

## Information architecture (rated 8/10)

The sidebar IA is solid. One concern: 9 sidebar items is at the edge of acceptable. Combine where possible:

**Recommended IA:**
```
🏠 Overview
✏️  Locker          ← merge "Editor" into "Locker" (sub-tabs inside)
📊 Analytics
🎬 Pipeline         ← rename from "Pipeline Queue", add badge for new items
👥 Believers
🎨 Theme            ← could fold into Locker editor as a sub-tab actually
⚙️  Settings         ← Profile + Account + Billing all here
```

That's 6-7 items. Cleaner. "Theme" as a Locker sub-tab is a taste call — keep it standalone if you want to highlight it as the core upgrade feature, fold it in if you want a tighter sidebar.

## State coverage (rated 6/10)

The doc covers steady-state but skimps on these states:

| Surface | Loading | Empty | Error | Success |
|---|---|---|---|---|
| Overview | Skeleton | "Welcome back. Nothing new this week. Your locker is at marcusallen.bltz.app" | "Couldn't load activity" | — |
| Locker editor | Form skeleton + preview skeleton | N/A (always has data) | Inline field errors, never modal | Toast: "Saved" |
| Live preview iframe | Skeleton mirror of locker page | N/A | "Preview unavailable — your changes are saved. Click to retry." | — |
| Pipeline | Spinner | "Queue clear. We'll surface new clips as we find them." | "Pipeline temporarily unavailable" | Approve = card slides off |
| Theme | Skeleton swatches | N/A | "Couldn't apply theme" + revert | Toast |
| Analytics | Skeleton chart + counter shimmer | "No data yet — your locker just went live. Check back tomorrow." | "Analytics temporarily unavailable" | — |
| Billing | Skeleton plan card | N/A | Stripe error inline | "Welcome to BLTZ Premium ✦" celebration |

State coverage **must ship complete** — this is the table that prevents bugs at 2am Friday.

## User journey (rated 7/10)

The Overview page concept is right but the doc doesn't sketch the **first-session journey**. After claim, what's the dashboard's first impression?

Recommended first-session flow:
1. **Welcome card** — "Your locker is live at marcusallen.bltz.app. Here's what's there."
2. **Locker preview embed** — actual iframe of their locker, 60vh tall
3. **3-step onboarding checklist** —
   - ☐ Add a profile photo (links to Locker editor)
   - ☐ Pick your team colors (links to Theme — even if free presets only)
   - ☐ Approve your first highlight (links to Pipeline if there are candidates)
4. **Quick share row** — "Tell your network: [Copy link] [Share on X] [QR]"

This first-session flow is a separate thing from the steady-state Overview. Both need to exist. The dashboard should detect which to show.

## AI slop risk (rated 8/10)

The IA + the live preview pattern keep this from feeling like a generic SaaS. Risks to actively avoid:
- ❌ Centered card grids on the Overview ("3 features in a row")
- ❌ Generic "Welcome to your dashboard" hero
- ❌ Stock chart icons in the sidebar (use real glyphs from a curated set)
- ❌ Pastel pie charts on Analytics (use real data viz: line charts, geo heatmaps, bar charts)

## Premium gating UX (rated 5/10 — under-specified)

The doc says premium gates exist but doesn't specify the pattern. Three options:

| Pattern | Pros | Cons |
|---|---|---|
| **Locked feature with overlay** ("Custom colors — Premium only — Upgrade") | Clear, persistent | Feels nagging |
| **Disabled with tooltip** | Less aggressive | Athlete might not realize it's available |
| **Try-it-then-paywall** ("preview with these colors, save requires premium") | Best UX | Highest engineering complexity |

RECOMMENDATION: try-it-then-paywall for high-value features (custom colors), locked-with-overlay for analytics depth (the value is the data, not the action). Defer detailed UX to a Theme + Analytics design pass.

## Responsive (rated 4/10 — major gap)

Doc names "sheet pattern" but doesn't specify:
- Sidebar collapse behavior (drawer? bottom tabs? hamburger?)
- Editor-on-mobile (form first, preview button → full-screen iframe?)
- Pipeline-on-mobile (vertical scroll cards? swipe-to-approve?)
- Analytics-on-mobile (charts adapt? cards stack?)

Each of these needs an explicit pattern. Defer to mockup phase but document the rules in the design doc before building.

## A11y (rated 5/10 — under-specified)

Same issue as the locker page initially: doc doesn't mention keyboard nav, focus rings, ARIA, contrast. Reuse DESIGN.md from the locker work — every dashboard surface inherits the same a11y rules. Document explicitly that this applies to dashboard.

## Unresolved design decisions

1. **Color picker UX for premium** — native HTML color input, custom React component, or third-party (e.g., react-colorful)?
2. **Live preview "View as fan" toggle** — should the preview iframe also support previewing the LIVE/published view (vs the claim view)? Likely yes.
3. **Activity feed pagination** — load-more button, infinite scroll, or 30-day window?
4. **Pipeline batch actions** — "Approve all" risks junk content; "Reject all" is fine. Asymmetric defaults.

---

# ENG REVIEW

## Architecture diagram (proposed)

```
┌────────────────────────────────────────────────────────┐
│ Next.js App Router                                      │
│ ┌──────────────────────────────────────────────────┐   │
│ │ /dashboard/* (auth-gated via middleware.ts)       │   │
│ │  ├─ layout.tsx       (sidebar shell)              │   │
│ │  ├─ page.tsx         (Overview)                   │   │
│ │  ├─ locker/page.tsx  (Editor + Preview iframe)    │   │
│ │  ├─ analytics/page.tsx                            │   │
│ │  ├─ pipeline/page.tsx                             │   │
│ │  ├─ believers/page.tsx                            │   │
│ │  ├─ theme/page.tsx                                │   │
│ │  └─ settings/page.tsx                             │   │
│ └──────────────────────────────────────────────────┘   │
│                          │                              │
│         ┌────────────────┼─────────────────┐            │
│         ▼                ▼                 ▼            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ /api/locker/ │ │ /api/analytics│ │ /api/pipeline│   │
│  │   PATCH      │ │   GET         │ │   POST/GET   │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
│         │                │                 │            │
│         ▼                ▼                 ▼            │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Supabase (Postgres + Auth + RLS + Realtime)      │  │
│  │  - lockers, clips, photos, articles              │  │
│  │  - themes, custom_colors                         │  │
│  │  - believers, follows                            │  │
│  │  - analytics_events (event_type, ts, ip_geo)     │  │
│  │  - pipeline_candidates (status: new|approved|... │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Live preview iframe communication:                     │
│   Editor (parent) ──postMessage──▶ iframe(/locker/X)    │
│   iframe re-renders just the patched section            │
└────────────────────────────────────────────────────────┘
```

## The 5 hardest engineering problems

### 1. Live preview iframe (P0 — MUST GET RIGHT)

Naive: reload the iframe on every save. Result: full page flash, lost video state, slow, awful.

Right approach:
- Editor sends `postMessage({type: 'patch', section: 'profile', data: {...}})` to iframe
- Iframe has a listener that mutates the rendered DOM in place (via React state or vanilla DOM update)
- Debounce 300ms in the editor before sending the patch
- Iframe shows a "Saving..." pulse for 200ms after receiving a patch
- "View Live" button opens the published version in a new tab (bypasses the editor preview state)

Pre-build a small `useDashboardPreview()` hook + a corresponding `useDashboardListener()` in the locker page. This is the technical hero of the build.

### 2. Theme system that doesn't break the locker

Free themes = curated CSS variable bundles applied via `data-theme="cal-blue"` on `<body>`. Premium custom colors = athlete-specified hex stored in `lockers.custom_colors`, applied via inline style or CSS variable injection at SSR.

Risk: athlete picks 3 colors that all clash with the page bg. Mitigation: validate contrast at save time (WCAG AA against bg) and block save with helpful message.

### 3. Analytics events at scale

Each locker view is an analytics event. At 100 lockers × 10K views/mo each = 1M events/mo. Naive: write each to Postgres. Result: write amplification, slow page loads.

Right approach:
- Client-side `navigator.sendBeacon()` to a single `/api/track` endpoint
- Edge function (Vercel Edge) buffers events, writes batched to Postgres every 10s OR every 100 events
- Daily aggregation job rolls events into a `daily_locker_stats` table
- Dashboard queries the aggregated table, not raw events

Cost-aware from day 1.

### 4. Pipeline approval flow

The pipeline candidate cards need a state machine:
```
[new] → approve → [approved] → publish → [live]
[new] → skip → [skipped] (never re-shown)
[new] → flag → [flagged] (founder review)
[approved] → revert → [new] (athlete changes mind)
```

Atomic transactions for state changes. RLS so athletes can only mutate their own candidates.

### 5. Stripe integration (deferred but designed)

Even though we won't ship the upgrade button live until 1000 lockers, the data model needs to support it from day 1:
- `lockers.tier` enum: `'free' | 'premium'`
- `lockers.tier_expires_at` timestamp (for trials and expiry)
- `lockers.stripe_customer_id`, `lockers.stripe_subscription_id`
- Webhook endpoint stub at `/api/stripe/webhook` that no-ops in dev

Premium gate is enforced server-side via a `usePremium()` hook that reads `tier`. Even when there's no Stripe, you can manually set `tier='premium'` on test athletes.

## Test plan

| Surface | Critical tests |
|---|---|
| Auth gate | Unauthenticated → redirect to /login. Wrong athlete → 403. |
| Editor save | Patch is debounced. Save indicator shows then clears. Network failure shows toast and retains form state. |
| Live preview | Patch propagates within 500ms. iframe doesn't full-reload. Mobile sheet preview works. |
| Theme apply | Free user can apply preset. Premium user can use hex picker. Free user blocked from hex picker with upsell. |
| Pipeline approve | State transition is atomic. UI removes card optimistically with revert on failure. |
| Analytics | Events fire on locker page load. Aggregation pipeline produces daily roll-ups. Dashboard reads from roll-ups, not raw events. |
| Premium gate | Server-side enforcement (not just UI hide). Direct API hit returns 403 if not premium. |
| Mobile | Sidebar collapses to drawer at <768px. Editor switches to sheet pattern. All forms remain usable. |

## Edge cases to design for

- Athlete edits something while their locker is being viewed by a fan (live preview vs. live view conflict — eventual consistency is fine)
- Athlete deletes a video that's currently the OG card (regenerate OG on save)
- Theme changed but cached locker still serves old theme (CDN purge or short edge cache TTL)
- Athlete uploads a 4GB video (chunked upload via Mux Direct Upload, with progress UI)
- Athlete on slow connection (offline queue for edits, sync when reconnected — defer to v2)
- Athlete shares dashboard URL by accident (auth gate handles it, but the error page should be a graceful "this is the dashboard, here's the locker URL")

---

# CROSS-PHASE THEMES

Issues that surfaced in multiple review dimensions (high-confidence signals):

1. **Live preview iframe** — flagged as the #1 design risk AND the #1 eng risk. Treat as the hero technical/design pairing for the entire build.
2. **Premium gating UX** — flagged as under-specified in design AND as a server-side enforcement requirement in eng. Spec the pattern explicitly before mockup.
3. **Mobile pattern** — flagged as 4/10 in design AND named as needing dedicated patterns in eng. Don't ship dashboard until mobile is intentional, not stacked.

---

# WHAT'S NOT IN SCOPE (MVP)

- Multi-locker support (data model accommodates, UI doesn't)
- Athlete-to-athlete messaging (v2)
- Coach dashboard / team admin (v2)
- NIL deal disclosure / management (v2 — pre-money requirement only)
- Public scoreboard / leaderboards across athletes (v2)
- AI assistant for content suggestions (v2)
- Offline editing (v2)
- Native mobile app (v2)

---

# WHAT ALREADY EXISTS

- Locker page (`mockups/locker-page.html`) — feeds directly into the live preview iframe
- DESIGN.md brand tokens — apply to dashboard from day 1
- Position-stats config (`docs/planning/position-stats.md`) — drives the editor's stats fields
- Search architecture (`docs/planning/search-architecture.md`) — patterns reusable for any data-fetching in the dashboard
- Locker data model (planned, in `docs/planning/locker-design-doc.md`)

---

# SUCCESS CRITERIA

- **Week 4 post-launch:** 80% of claimed athletes log in, 50% make ≥1 edit
- **Week 12:** 30% W4-retained, 5-10% premium conversion among engaged users
- **Year 1:** Premium ARR > $X (TBD), avg locker has 12+ pieces of content, NPS > 50

---

# RISK REGISTER

| # | Risk | Phase | Mitigation |
|---|---|---|---|
| R1 | Live preview iframe ships janky | Eng | Treat as hero tech work, dedicate sprint to postMessage protocol |
| R2 | Athletes don't return | CEO | Instrument DAU/WAU from day 1, content prompt fallback if analytics insufficient |
| R3 | Premium tier doesn't sell | CEO | 14-day free trial, blurred-preview teasers for premium analytics |
| R4 | Mobile UX broken | Design | Mobile patterns specified before mockup phase, not after |
| R5 | Pipeline floods queue | Eng | Cap at top-10 candidates per athlete per week |
| R6 | Color clashes break locker | Eng | WCAG contrast validation at save time |
| R7 | Multi-locker migration painful | Eng | Data model supports M:N from day 1 even if UI is 1:1 |
| R8 | Analytics writes overwhelm DB | Eng | Edge function batching + daily aggregation tables |

---

# DECISION AUDIT TRAIL

| # | Decision | Rationale |
|---|---|---|
| 1 | Approach C (sidebar + live preview) | Scales, familiar, addresses athlete trust |
| 2 | 6-7 sidebar items (consolidated from 9) | Cognitive load — under 7±2 |
| 3 | Premium gating: try-then-paywall for colors, locked-overlay for analytics | Match pattern to value type |
| 4 | First-session vs steady-state Overview | Two distinct surfaces, different jobs |
| 5 | postMessage for iframe (not reload) | Performance, video state preservation |
| 6 | Theme = curated CSS variable bundles | Brand control + premium upgrade path |
| 7 | Analytics: edge buffer + daily aggregation | Cost-aware at 1M events/mo |
| 8 | Stripe data model day 1, billing UI later | Avoid migration when we ship payments |
| 9 | M:1 locker model (athletes own multiple) | Support multi-locker without future migration |
| 10 | Server-side premium enforcement | Don't trust the client; UI hide + API guard |
