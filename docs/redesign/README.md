# BLTZ landing redesign

## Live now (short-term launch)

Only the finished hero sections are live, so visitors never see an unfinished page.

| Route | Component | Sections |
| --- | --- | --- |
| `/` | `AthleteHeroPage` | Three.js locker hero, claim form, link to programs, footer |
| `/enterprise` | `EnterpriseHeroPage` | Hero, product demo with tabs (real CRM, BLTZ colors), book-a-demo form, privacy and copyright bar |
| `/privacy` | `app/privacy/page.tsx` | Plain-language privacy policy (have it reviewed) |

- `LiveRoutes` (in `SiteChrome.tsx`) makes the nav and footer link to the live
  routes; the mockups use `MOCKUP_ROUTES`.
- Demo requests post to `/api/demo-requests` and are saved in
  `landing_waitlist` with `source = 'enterprise_demo'` (organization in
  `school`; type, role and message in `current_content_gap`). No migration needed.
- These pages are public in `lib/supabase/middleware.ts`, and `enterprise`,
  `privacy` and `redesign` are reserved short-link names.
- The old homepage component (`components/landing/LandingJourney`) is kept
  but no longer routed.

To ship another section, add it to `AthleteHeroPage` or `EnterpriseHeroPage`.

## Full mockups (still in design)

- Athletes: `/redesign`
- Enterprise (athletic departments and NIL collectives): `/redesign/enterprise`

Both are `noindex` and viewable without signing in.

## Concept: lights on in the locker room

The product is called a locker, so the page is set in one. Athlete pages are
lit by floodlight gold, enterprise pages by signal blue. Both share one
material world: night, brushed steel, chalk-white type.

| Token | Hex | Use |
| --- | --- | --- |
| Night | `#050607` | Page background |
| Steel | `#16191D` | Panels, inputs |
| Chalk | `#EEECE6` | Text |
| Concrete | `#92979F` | Secondary text |
| Floodlight | `#FFC21A` | Athlete actions |
| Signal | `#3A63FF` | Enterprise actions |

Type: **Barlow Condensed Bold** for headings, **Barlow** for body text, and
**JetBrains Mono** for every number (years, steps, stats, UI figures). All are
self-hosted via `@fontsource`. Section titles are centered.

## Page structure

**Athletes** (`components/redesign/AthleteLanding.tsx`)

1. Hero (three.js): a row of lockers under one spotlight. The center nameplate
   shows whatever the visitor types. Scrolling opens the door to show a
   3D jersey (`three/jersey.ts`: a rounded torso with real thickness and drape
   folds, striped sleeves, collar ring, knit normal map, twill name and number,
   and a hanger tucked inside the shoulders) with the
   visitor's last name on the back.
2. Journey: the five app icons fly in and get pulled into a phone that holds a
   **real `LockerView`**, which scrolls itself as the page scrolls.
3. Career chapters (`StoryMotion.tsx`): a pinned section that scrolls photo
   chapters sideways along a timeline.
4. Three steps, with a play diagram whose routes draw in on scroll.
5. Audiences, connected channels with a moving photo wall, link to Enterprise,
   FAQ, final claim form, footer.

**Enterprise** (`components/redesign/EnterpriseLanding.tsx`) follows the
section layout of sponsorcx.com, one section at a time:

| # | sponsorcx.com | BLTZ |
| --- | --- | --- |
| 0 | Announcement bar and pill nav | Pilot announcement, Athletes/Enterprise switch, Sign in, Book a demo |
| 1 | Hero: copy left, product shots right | Copy left, floating CRM cards right, over the three.js roster wall |
| 2 | (product imagery) | **Product demo screen: the real organization CRM** (`CrmScreen.tsx`), with Overview, Intelligence and Launch a Locker tabs |
| 3 | "Trusted by" logo band | Sports band (placeholder for partner logos) |
| 4 | Centered problem statement with floating icons | Same |
| 5 | What it does: copy and quote left, four tabs right | Build, Flag, Share, Measure (quote is a placeholder) |
| 6 | Metrics band | 1 Locker, 0 approvals, 30 days ahead |
| 7 | One system, two perspectives (cards) | Athletic departments and NIL collectives |
| 8 | Rotating-word headline | "Every legend / captain / walk-on… deserves an encore." |
| 9 | Industries: stacked sticky cards | Program types |
| 10 | "Current tools vs. us" comparison | Same, from the real product |
| 11 | Statement card | Same |
| 12 | How it works: accordion with screenshots | Launch, Flag, Plan, Measure, each showing the real CRM |
| 13 | Testimonials | Placeholder cards (no invented quotes) |
| 14 | CTA band | Opens Calendly inline |
| 15 | Resource guides | Playbooks marked "Coming soon" |
| 16 | Footer | Shared footer |

`CrmScreen` renders the actual workspace components (`OrganizationShell`,
`ThisWeek`, `AthleteIntelligence`, `LaunchLocker`) with the existing preview
data in `components/organization/pilot/preview-data.ts`. It is scaled to fit,
display-only and mounts only when scrolled near, so product changes show up on
the landing page automatically.

## Before launch

- [ ] Replace stand-in photos (`components/redesign/assets.ts`, and the headshot,
      video and photos in `components/redesign/sampleLocker.ts`). Several show
      real team uniforms. Prompts are below.
- [x] Create `/privacy` (plain-language draft, needs review).
- [ ] Create `/terms`, then show the footer's legal column on live pages (`LIVE_ROUTES.legal`).
- [ ] Confirm product claims in the copy. The enterprise page now follows the
      real workspace: Lockers for former players, flagged moments (Act now is
      the next 7 days, Coming up is days 8 to 30), tracked links, BLTZ clearing
      media, and reach reporting. The athlete page still mentions usage-rights
      checks on photos.
- [ ] Replace placeholder testimonials, the sports band (partner logos) and the
      "Coming soon" playbooks.
- [ ] Add real testimonials or partner logos once you have permission (the
      SponsorCX-style layout has room for them after the pillars).
- [ ] Decide whether the Calendly link (`PREVIEW_CALENDLY_URL`) is the right
      calendar for enterprise demos.

## AI photo prompts

See [`ai-photo-prompts.md`](./ai-photo-prompts.md) for copy-paste prompts, file
names and sizes for every image slot.
