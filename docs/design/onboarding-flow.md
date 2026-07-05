# BLTZ Onboarding — Design Spec

A design-only description of the athlete onboarding flow for prototyping. No
backend, no data plumbing — just page architecture, the experience we want the
athlete to feel, and the purpose of every field and button.

---

## The big idea

Most sign-up flows make you fill out a long, boring form. BLTZ flips it: the
athlete tells us the bare minimum (name, school, position, level), and then we
go find the rest of their career for them and hand them a finished locker page
to confirm. The whole flow should feel less like "filling out a profile" and
more like "watching a broadcast crew build your highlight package."

Four screens, one job each:

| Step | Screen name | Athlete's job | Feeling |
|------|-------------|---------------|---------|
| 1 | **Suit up** — Verify the basics | Tell us who you are | Fast, confident, low effort |
| 2 | **Career** — Career sweep | Watch us find your career | Wonder, "how did they know that?" |
| 3 | **Sign off** — Confirm your career | Approve what we found | In control, proud |
| 4 | **Go live** — Locker setup complete | Celebrate, go see it live | Arrival, payoff |

The emotional arc: *low effort → surprise → pride → arrival.* Step 2 is the
magic moment the whole flow is built around.

---

## Visual language

This is a sports-broadcast aesthetic. Dark, electric, confident. Think the
graphics package on a primetime game, not a SaaS dashboard.

- **Brand color:** BLTZ gold `#F5A623`. Used for primary actions, active
  states, and "we found it" confirmations. Gold = energy and success.
- **Background:** near-black deep navy (`#0B0E1A`) with a faint grid texture
  and a soft blue glow in one corner. Always present behind every screen via a
  shared shell.
- **Surfaces:** translucent dark panels (`#14182B` at ~72% opacity) with a
  blur behind them, so the textured background shows through faintly. Panels and
  inputs use a medium corner radius (`rounded-md`). Switches and circular
  position bubbles use full pill/circle radius (`rounded-full`).
- **Typography:**
  - **Oswald** (condensed, bold, UPPERCASE) for all headlines and the athlete's
    name. This is the "scoreboard / jersey" font. It should feel athletic.
  - **Monospace** for eyebrows, field labels, button text, and small status
    lines. Mono reads as "data / stat line / broadcast lower-third."
  - Body copy is a clean sans, kept minimal.
- **Buttons:**
  - **Primary CTA:** solid gold fill, black text, ALL CAPS, medium radius. On
    hover it lifts up a few pixels with a soft gold shadow (a confident
    "press me" rise). The CTA is intentionally **narrower than the form** — 80%
    width on phones, ~half on tablet, ~a third on desktop — so it reads as a
    deliberate action, not a full-width bar.
  - **Secondary:** outlined ghost button, also all caps, white text, brightens
    on hover.
- **Motion:** restrained but alive. Headlines fade-and-rise in on mount. The
  magic-moment icons pop in. Active states slide (the gold thumb in a switch
  glides between options over ~300ms). Everything respects "reduced motion" —
  if the athlete's device asks for less animation, the pops and slides are
  removed and elements just appear.

### Shared chrome (on every screen)

- **BLTZ wordmark/logo**, centered at the top. The only branding until the
  locker is published.
- **Step indicator** directly below the logo: four equal segments labeled
  **Suit up · Career · Sign off · Go live**. The current step's bar glows gold;
  completed steps show a gold check next to their label; upcoming steps are
  dim. Labels are mono, uppercase.
- Headers across the flow are **centered, Oswald, uppercase**, with a single
  short mono subline underneath. No eyebrow labels (no "STEP 1"), no paragraph
  of explanatory text. The step indicator already says where you are.

---

## Screen 1 — Suit up · "Verify the basics"

**Purpose:** Collect the four facts we need to go find the athlete's career.
Nothing more. Every extra field here is friction that delays the magic moment,
so the screen is deliberately short.

**Layout:** A single centered panel, max width comfortable for one column.
Header "VERIFY THE BASICS" up top. Four labeled fields stacked vertically.
A gold submit CTA at the bottom, centered and narrower than the panel.

**Fields (top to bottom):**

1. **Full name** — text input. Auto-focused on load so the athlete can start
   typing immediately. Placeholder shows an example name. This is the primary
   key for finding them.
2. **School or club** — a search-as-you-type picker. The athlete types and
   sees matching schools/programs (ideally with logos) to choose from; they can
   also free-type a program that isn't listed. Purpose: pins down *which*
   athlete (lots of people share a name) and lets the locker show team colors.
3. **Position** — a two-part control:
   - An **Offense / Defense switch** at the top (a pill with a gold thumb that
     slides to the selected side).
   - Below it, a **grid of circular position bubbles** for the selected side
     (e.g. Offense: QB, RB, FB, WR, TE, C, T, G, K, P, LS, ATH; Defense: DT,
     NT, DE, EDGE, MLB, ILB, OLB, CB, SS, FS, DB). Tapping a bubble selects it
     (fills gold). Bubbles are mono text, jersey-patch feel, and lift on hover.
   - Purpose: position is core identity and helps disambiguate.
4. **Level** — a three-option switch (College / Pro / Former pro) with the same
   sliding gold thumb. Purpose: tells us where to look and how to frame their
   career.

**Labels:** centered above each field, mono, uppercase, white. Inline error
text appears in red under a field if it's missing on submit.

**Primary button:** "SEARCH MY CAREER" — gold, all caps, narrower than the
panel. While working it reads "SEARCHING…". This button is the doorway to the
magic moment, so its copy is about *their career*, not "submit" or "next."

**UX intent:** Feel fast and effortless. The athlete should be able to finish
this screen in under 20 seconds. No optional fields, no "tell us about
yourself" prose. Tall, tappable inputs; mobile-first.

---

## Screen 2 — Career · "Career sweep" (THE MAGIC MOMENT)

**Purpose:** This is the heart of BLTZ. Instead of making the athlete type out
their bio, hometown, teams, stats, and highlights, we go *find* all of it from
public sports sources and reveal it live. The athlete watches their own career
assemble itself. The job of this screen is to create the feeling of *"wait, how
did they already know all this?"*

**Layout (top to bottom):**

1. A small ghost **"← Back to verify"** link, top-left. Escape hatch if the
   search latched onto the wrong person (e.g. a name collision) — they can go
   fix the basics and re-run.
2. Centered header **"CAREER SWEEP"** (Oswald), with a single mono subline
   underneath that updates live with encouraging progress copy ("Found a
   Wikipedia bio.", "Drafting your locker bio…"). The subline never shows
   technical errors — failures are shown by the icons, not words.
3. A **single centered row of five source icons** — NFL, College, Wikipedia,
   ESPN, Highlights. These are the public sources we check. No card containers,
   just the icons with a short mono label under each.
4. Once the sweep lands, a **"What we found" panel** reveals below: a bio
   paragraph on the left, and four stat cards on the right (Birthdate,
   Hometown, Pro teams, Awards), each a centered icon + label + value.
5. A gold **"REVIEW MY LOCKER"** CTA appears when the sweep is complete.

**The reveal animation (this is the whole point):**

- As the sweep begins, each source icon **pops into the row** (a quick
  zoom-and-fade) — they don't all appear at once, they cascade in as each
  source is checked. This is the "the crew is working" beat.
- While a source is being checked, its icon **pulses** and is white.
- When a source comes back with a hit, a **gold checkmark badge animates onto
  the icon** (a little sticker landing). Gold = "got it."
- If a source has nothing for this athlete, its icon simply **dims** with no
  check. No error text, no alarm — just quietly absent. (Example: a college
  player who never went pro shows a dimmed NFL icon, gold checks on the rest.)
- When everything settles, the **"What we found" panel fades up** from below,
  and the gold CTA appears.

**Why it's built this way:** The staggered pops + landing checkmarks turn a
loading screen into a *performance.* The athlete isn't waiting, they're
watching a highlight reel of their own data being discovered. By the time the
"What we found" panel arrives, they already feel BLTZ "gets" them — which makes
the next screen feel like confirming a gift, not doing data entry.

**Information surfaced here (read-only preview):** bio, birthdate, hometown,
pro teams, awards count, and a sense of how many highlights/photos were found.
Full editing happens on the next screen.

**UX intent:** Wonder and momentum. Keep the screen sparse while searching —
just the headline, the live subline, and the popping icons. Don't clutter it
with progress bars or logs. The payoff (the data panel) should feel earned.

---

## Screen 3 — Sign off · "Confirm your career"

**Purpose:** Let the athlete see their locker exactly as the public will see
it, fix anything that's off, claim their URL, and publish. They are signing off
on *their* page. The feeling is ownership and pride, not form-filling.

**Layout (top to bottom, single column, scrolls with the page):**

1. Centered header **"CONFIRM YOUR CAREER"** with a mono subline ("Edit
   anything that looks off, then publish."). Same position/size as the Career
   sweep header so the transition between screens feels like the title is
   *staying put and just changing words*, not a hard page swap.
2. A small status chip (top-right area): **"PUBLISH-READY"** in green (or
   "PRIVATE" if the locker needs verification first).
3. **The live locker preview — the hero.** This is the athlete's actual locker
   page rendered inline (it scrolls with the rest of the form, it is not a tiny
   boxed preview):
   - A **hero band** that bleeds edge-to-edge. A found photo of the athlete
     sits blurred and darkened in the background; a circular **headshot** is
     centered on top with a subtle gold ring; below it their **name** in large
     Oswald caps, then a mono line of **position · level · school**, then
     **"From {hometown}"**. A soft gradient fades the bottom of the hero into
     the page background.
   - Directly under the hero, an **editable Bio** section. It looks like the
     finished bio paragraph but is editable in place (click and type). This is
     the one piece most athletes will want to tweak in their own voice.
   - Awards and Highlights sections appear below if we found any.
4. **Locker URL** — the athlete picks their public web address
   (bltz.com/their-name). Shows live whether the name is available. Purpose:
   their permanent, shareable identity.
5. **Identity fields** — name, position, level, school/club, hometown — all
   editable, pre-filled from what we found. Purpose: final corrections.
6. **Sources we pulled** — a short, transparent list of where the info came
   from (NFL roster, College roster, Wikipedia, ESPN, etc.). Purpose: trust.
   "We didn't make this up, here's where it's from."
7. A sticky bottom action bar: a ghost **"Start over"** and the gold primary
   **"PUBLISH MY LOCKER"** (reads "PUBLISHING…" while working). If the locker
   needs identity verification first, the primary reads "VERIFY IDENTITY TO
   PUBLISH" instead.

**UX intent:** The athlete should look at the hero and think *"that's me, that
looks legit."* Editing should feel optional and light — most fields are already
right, so the screen rewards a quick scan and a confident publish, not a long
correction session. Keep the preview honest: what they see is what publishes.

---

## Screen 4 — Go live · "Locker setup complete"

**Purpose:** The payoff. Confirm the locker is live and send them to it. Pure
celebration and a clear next step.

**Layout:**

1. Centered header **"LOCKER SETUP COMPLETE"** with a one-line mono subline
   ("Your locker is live. Share it or keep editing from the dashboard.").
2. A panel with a success treatment: a green check with a soft pulsing ring,
   the athlete's **name in large gold Oswald**, a "LOCKER READY" label, and
   their public path shown small (e.g. `/player/their-name`).
3. Two buttons, side by side: gold primary **"GO TO MY LOCKER"** (takes them to
   their live public page) and ghost secondary **"GO TO DASHBOARD"** (where
   they keep editing / manage things). Both all caps.

**UX intent:** Arrival. Short, triumphant, no friction. The gold name + the
green check + the pulse should feel like a "you made it" moment. The primary
action points outward to the thing they just built.

---

## Information gathered across the flow

| Info | Where the athlete provides / confirms it | Why we need it |
|------|------------------------------------------|----------------|
| Full name | Step 1 (type) | Identity; the locker's headline |
| School / club | Step 1 (pick) | Disambiguation + team colors |
| Position | Step 1 (pick) | Identity + disambiguation |
| Level (college/pro/former) | Step 1 (pick) | Framing + where to look |
| Bio | Step 3 (edit, pre-filled) | The athlete's story |
| Birthdate, hometown | Step 3 (confirm, pre-filled) | Locker facts |
| Pro teams, awards | Step 3 (confirm, pre-filled) | Career history |
| Headshot / photos | Step 3 (shown, can replace) | The hero image |
| Highlights | Step 3 (shown) | Video proof |
| Locker URL | Step 3 (choose) | Public shareable identity |

The key design principle: **Step 1 is the only place the athlete *types*
required info. Everything else is pre-filled and just confirmed.** That ratio —
minimal input, maximal payoff — is the product.

---

## Voice & copy conventions

- Football/broadcast vocabulary: **claim, career, locker, believer, suit up,
  go live, sign off.** Avoid generic SaaS words: profile, import, follower,
  get started, welcome, unlock.
- First person where it fits the athlete's voice ("Search **my** career,"
  "Review **my** locker," "Go to **my** locker").
- Buttons name the *outcome*, not the mechanic ("Search my career," not
  "Submit"; "Publish my locker," not "Finish").
- Never show the athlete a technical failure. Absence is shown visually (a
  dimmed icon), and the worst case is a friendly "give it a minute and try
  again," never an error code.

---

## Quick prototyping checklist

- [ ] Shared shell: dark textured bg + glow, centered logo, 4-step indicator.
- [ ] All headers: centered Oswald caps + one mono subline, fade-rise on mount.
- [ ] Step 1: 4 fields (name, school picker, position switch+bubbles, level
      switch), narrow gold CTA.
- [ ] Step 2: back link, live subline, 5 source icons that pop in + land gold
      checks (or dim on miss), "What we found" panel reveal, gold CTA.
- [ ] Step 3: edge-bleed hero (bg photo + headshot + name + meta), editable
      bio, locker URL picker, identity fields, sources list, sticky publish bar.
- [ ] Step 4: success panel (gold name + green check pulse), two CTAs.
- [ ] Gold primary buttons everywhere, hover-raise, all caps, narrower than
      their container.
- [ ] Respect reduced-motion: drop the pops/slides, just appear.
