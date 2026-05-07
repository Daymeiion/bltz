# TODOS

Design and product debt deferred from /plan-design-review on 2026-04-24.

## Design

### Onboarding redesign follow-ups
- **What:** Complete the deferred items from the Broadcast Locker Reveal onboarding redesign: choose a third-party identity verification provider, design admin verification review tooling, define full photo rights management, revisit premium theme customization, and redesign the public locker beyond the onboarding preview.
- **Why:** The approved onboarding redesign protects professional athlete identity and creates the first-run magic moment, but these adjacent systems need separate product and engineering passes.
- **Pros:** Keeps this redesign focused while preserving the next set of high-trust athlete workflow needs.
- **Cons:** Public publishing for claimed lockers remains provider-gated until verification integration is selected and implemented.
- **Context:** Spec lives at `docs/superpowers/specs/2026-05-06-onboarding-broadcast-locker-reveal-design.md`; Not In Scope items were explicitly deferred by approval.
- **Depends on:** Third-party ID verification provider decision, media rights policy, and a follow-up public locker design pass.
- **When:** Next onboarding/security slice after the visual redesign lands.

### Logo / wordmark system
- **What:** Commission or design a real BLTZ wordmark + glyph mark system.
- **Why:** MVP ships with "BLTZ" set in Barlow Condensed 900 gold. Functional but
  not a brand mark. Real wordmark needed before press / scaled launch.
- **Pros:** Brand becomes recognizable as a glyph (favicon, app icon, share avatars).
- **Cons:** Real logo work is 1-2 weeks; not Week-1 critical for concierge MVP.
- **Context:** Brand voice = ESPN-meets-Patagonia, athlete-as-icon. Some great
  brands stay type-only forever (Patagonia, Supreme). Decide direction in
  /design-consultation before commissioning.
- **Depends on:** Running /design-consultation first to lock voice and visual system.
- **When:** After 50 lockers live, before any paid acquisition.

### Founder queue power-user UX (post-MVP)
- **What:** Keyboard shortcuts (J/K to navigate, A to approve, R to reject),
  batch actions, side-by-side draft preview, source-citation jump links.
- **Why:** At MVP scale (50 lockers) the founder approves with mouse. At 500
  lockers the throughput becomes the bottleneck.
- **Pros:** 5x faster review; less founder fatigue; better catch rate for
  hallucinated stats.
- **Cons:** 2-3 days of work that doesn't move the metric until volume hits.
- **Trigger:** Revisit when founder reports queue fatigue OR throughput >25/day.
- **Note:** Plan-design-review answered "design properly now" — initial spec
  goes in MVP plan. This TODO is for the v2 power-user pass.

### Light-mode theme
- **What:** Light variant of the locker page.
- **Why:** Some athletes will share in contexts where dark feels heavy.
- **Cons:** Doubles design surface; brand is intentionally dark-first.
- **When:** v2, only if athletes ask for it.

## Engineering

### OG card template
- **Status:** SCOPED FOR MVP (week 1) — moved out of TODOs into design doc.

### Automated nflverse + cfbverse data sync (V2)
- **What:** Schedule the existing manual sync endpoints
  (`/api/dev/nflverse-sync`, `/api/dev/cfbverse-sync`) to run weekly
  via Vercel cron. Use the `*_SYNC_TOKEN` env vars already plumbed
  in the route handlers for prod auth.
- **Why:** Keep cached NFL roster + college team data fresh without
  manual intervention. During NFL season, rosters change weekly
  (trades, injuries, practice squad churn). College team data is
  more static, but conferences realign and new programs occasionally
  appear.
- **Pros:** Locker pages always show current team + status. No
  founder labor. Sub-30-min one-time setup.
- **Cons:** None functional. Vercel cron costs (~$0/month at our
  volume).
- **Trigger:** V2, after the manual flow has been validated under
  real onboarding traffic. The current weekly cadence (you run sync
  manually if a known player's data looks stale) is fine for the
  MVP cohort. Move to cron once we have >50 lockers or the next time
  someone reports out-of-date team info.
- **Context:** Architecture already supports this. Each sync route
  accepts an `x-*-sync-token` header for production auth. Just need
  a `vercel.json` cron entry pointing at the routes with the token
  set as a header.

### Auto-highlight ML (player tracking from raw game film)
- **What:** Train or integrate a model that auto-cuts highlight clips from full
  game footage by tracking jersey numbers.
- **Why:** Currently MVP requires manual cuts. Doesn't scale past Berkeley pilot.
- **Cons:** Real ML problem at production quality; multiple weeks of work.
- **When:** v2, after Berkeley archive deal closes and footage volume justifies it.

### Mobile native app
- **What:** iOS/Android native experience.
- **Why:** Web-first works for browse + share, but content creation feels native.
- **When:** After 1,000 lockers + signal that athletes want to record/upload from phone.

### Coach dashboard
- **What:** UI for coaches to manage their team's locker collection.
- **Why:** Pulls coaches into the loop, opens B2B school pilot motion.
- **When:** Post-Berkeley pilot signed.

## Strategy

### NIL compliance engine
- **What:** Workflow for collegiate athletes to disclose NIL deals through BLTZ.
- **Trigger:** Only if collegiate athletes start pulling sponsor money via the
  platform. Not until P5 unlocks (1,000 lockers, payments live).

### Fan-side scout economy
- **What:** Believer Since money mechanic, points, ranks, fan tiers.
- **Trigger:** Audience density first. Money second. P5 unlock.
