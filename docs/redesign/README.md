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

Type: **Big Shoulders Display** (based on Chicago street signage, tall and
condensed like locker nameplates) for headlines, and **Hanken Grotesk** for body
text. Headlines are sentence case and left-aligned. There are no all-caps labels.

## Page structure

**Athletes**

1. Hero (three.js): a row of lockers under one spotlight. The center nameplate
   reads whatever the visitor types in the name field. Scrolling pushes the
   camera in and swings the door open to show a jersey with their name.
2. Journey: the five app icons fly in, get pulled into a phone, and the phone
   holds a **real `LockerView`** that scrolls itself as the page scrolls, with
   captions for each part (hero, film, photos, bio).
3. Three steps, audiences (photo reveal), connected channels, a cross-link to
   Enterprise, FAQ, final claim form, footer.

**Enterprise**

1. Hero (three.js): a curved wall of lockers. The nameplates light up in a
   wave, one for every player on the roster.
2. Two audiences, staff capabilities, how a pilot works, book a demo (Calendly,
   loaded only on click), FAQ, cross-link back to athletes.

## Before launch

- [ ] Replace stand-in photos (`components/redesign/assets.ts`, and the headshot,
      video and photos in `components/redesign/sampleLocker.ts`). Several show
      real team uniforms. Prompts are below.
- [ ] Create `/privacy` and `/terms`. The footer already links to them.
- [ ] Confirm product claims in the copy: usage-rights checks on photos,
      staff approvals, engagement reporting, roster import, alumni lockers.
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
