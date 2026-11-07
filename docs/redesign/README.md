# BLTZ landing redesign (mockup)

Preview routes. The production homepage at `/` is unchanged.

- Athletes: `/redesign`
- Enterprise (athletic departments and NIL collectives): `/redesign/enterprise`

Both routes are `noindex`. To ship, point `app/page.tsx` at `AthleteLanding`,
move the enterprise page to `/enterprise`, and update `ROUTES` in
`components/redesign/SiteChrome.tsx`.

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
   realistic jersey (`three/jersey.ts`: draped cloth mesh, knit normal map,
   twill name and number, collar trim, sleeve stripes, metal hanger) with the
   visitor's last name on the back.
2. Journey: the five app icons fly in and get pulled into a phone that holds a
   **real `LockerView`**, which scrolls itself as the page scrolls.
3. Career chapters (`StoryMotion.tsx`): a pinned section that scrolls photo
   chapters sideways along a timeline.
4. Three steps, with a play diagram whose routes draw in on scroll.
5. Audiences, connected channels with a moving photo wall, link to Enterprise,
   FAQ, final claim form, footer.

**Enterprise** (`components/redesign/EnterpriseLanding.tsx`), modeled on the
depth of sponsorcx.com

1. Hero (three.js roster wall) and a product dashboard mockup that flattens as
   it scrolls in (`EnterpriseUI.tsx`, all sample data).
2. Sports strip, problem statement, four pillars (Launch, Approve, Activate,
   Report) with auto-advancing tabs and a UI panel for each.
3. Facts band, two audiences, a "today vs. with BLTZ" comparison, how a pilot
   works, a photo wall, a demo CTA, Calendly booking, FAQ.

## Before launch

- [ ] Replace stand-in photos (`components/redesign/assets.ts`, and the headshot,
      video and photos in `components/redesign/sampleLocker.ts`). Several show
      real team uniforms. Prompts are below.
- [ ] Create `/privacy` and `/terms`. The footer already links to them.
- [ ] Confirm product claims in the copy: usage-rights checks on photos,
      staff approvals, engagement reporting, roster import, alumni lockers,
      activation suggestions.
- [ ] Add real testimonials or partner logos once you have permission (the
      SponsorCX-style layout has room for them after the pillars).
- [ ] Decide whether the Calendly link (`PREVIEW_CALENDLY_URL`) is the right
      calendar for enterprise demos.

## AI photo prompts

Generate at 1600×2000 (4:5), save to `public/images/redesign/`, then update
`assets.ts`. Shared style suffix for every prompt:

> editorial sports photography, night game, single hard key light, deep
> shadows, shallow depth of field, 35mm, subtle film grain, **plain uniforms with
> no logos, no team names, no real brands**, navy and gold color accents

| File | Prompt |
| --- | --- |
| `high-school.jpg` | High school football player on a small-town field under stadium lights, helmet in hand, steam from breath, bleachers blurred behind |
| `college.jpg` | College wide receiver mid-stride catching a pass, crowd as bokeh, sweat and motion |
| `pro.jpg` | Professional linebacker walking out of a concrete tunnel toward bright field lights, seen from behind at shoulder height |
| `former.jpg` | Former player in his 40s in a plain hoodie, sitting on a locker room bench holding an old game ball, warm light |
| `coaches.jpg` | Football coach with headset on the sideline, focused on the field, clipboard under arm |
| `sample-headshot.png` | Studio headshot of a 22-year-old Black college defensive back, plain navy jersey #1, neutral grey background, transparent cutout |
| `sample-hero.mp4` (optional) | 6–8s slow-motion loop: player celebrating after a play under lights, plain navy uniform |
