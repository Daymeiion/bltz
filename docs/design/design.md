# BLTZ — Design Vision

The north star for how BLTZ should feel. Not a spec of what exists — a
description of what we're building toward. Design, experience, and brand only.

---

## The feeling we're chasing

An athlete who has never had a real online home for their career lands on BLTZ
and, four screens later, has a page that looks like the networks built it for
them. No long form. No "upload your résumé." They tell us almost nothing, and
we hand them everything.

The whole flow should feel like **getting drafted.** Someone official saw you,
knew your stats, pulled your tape, and put your name in lights. That's the
emotion. Every screen either builds anticipation toward that or delivers it.

If onboarding feels like work, we've failed. It should feel like a reveal.

---

## The arc

Four beats. Each one earns the next.

**Suit up.** *"This'll be quick."* The athlete gives us the bare minimum — who
they are. It's so short it feels almost too easy. That ease is the setup; the
brevity makes what comes next feel impossible.

**Career.** *"Wait — how do they already know that?"* The magic moment. We go
find their career and reveal it in front of them. This is the screen the whole
product is built around. (Its own section below.)

**Sign off.** *"That's me. That looks legit."* They see their locker the way
the world will, fix anything off, and put their name on it. Pride, ownership, a
sense of "this is mine now."

**Go live.** *"It's real."* The page is live and shareable. Arrival. A trophy
moment, then a door pointing straight at the thing they just made.

Low effort → wonder → pride → arrival. Protect that curve above all else.

---

## The magic moment (the centerpiece)

Everything else is in service of this screen.

The athlete has just told us four small things about themselves. Now, instead
of a spinner or a form, they watch a crew go to work. One by one, sources light
up — the league, the school, the encyclopedia, the broadcaster, the highlight
reel — each one popping into view and then landing a gold mark of confirmation
as it finds them. It's a performance. A countdown to their own reveal.

Then the page they didn't write assembles itself: their story, their hometown,
the teams they played for, the awards next to their name, their face in the
hero. They never typed any of it. They just watched it appear.

**Why this matters:** the moment a stranger's data shows up unprompted and
*correct* is the moment trust is born. The athlete stops thinking "is this
worth my time?" and starts thinking "they get me." A loading screen asks for
patience. This screen gives a gift. That inversion is the entire product
thesis, compressed into ten seconds.

**Design principles for the moment:**

- **Sparse while it works.** No clutter, no logs, no progress bars. Just the
  title, a live line of encouragement, and the sources doing their thing.
  Negative space makes the reveal feel premium.
- **Cascade, don't dump.** Sources arrive one after another, not all at once.
  Sequence creates suspense.
- **Confirmation is gold and physical.** A hit should feel like a stamp
  landing — a small, satisfying, weighty "got it."
- **Absence is quiet, never an alarm.** If a source has nothing, it simply
  dims. No red, no error, no apology. A gap is just a gap.
- **The payoff is earned.** The "here's what we found" reveal should feel like
  a curtain rising, not a div appearing.

If we ever get this screen to make someone say "wait, what?" out loud, we've
won.

---

## Brand & visual language

BLTZ looks like primetime sports television, not software.

**The mood:** dark arena, electric energy, gold spotlight. The athlete is the
star and the design is the broadcast graphics package around them. Confident,
a little loud, never corporate.

**Gold is meaning, not decoration.** BLTZ gold (`#F5A623`) is reserved for two
things: *the action you should take* and *the thing we got right.* When gold
appears, it means energy or success. Never use it as wallpaper — its power is
its scarcity.

**Dark, textured depth.** A near-black navy field with a faint grid and a soft
glow in the corner, like stadium light bleeding into a night sky. Surfaces are
translucent panels that let that depth show through. Nothing is flat white.
Nothing is a card on a card on a card.

**Two type voices.**
- **Condensed bold uppercase** (Oswald family) is the *jersey and scoreboard*
  voice — names, headlines, the big moments. It should feel athletic and
  certain.
- **Monospace** is the *broadcast lower-third / stat-line* voice — labels,
  eyebrows, buttons, status. It reads as data, as official.

**Buttons are invitations.** The primary action is a gold pill, all caps, that
*lifts toward you* on hover like it wants to be pressed. It's deliberately
narrower than its container so it reads as a decision, not a form bar. Its
words name the prize ("Search my career," "Publish my locker"), never the
mechanic ("Submit," "Next").

**Motion is alive but disciplined.** Things rise into place, slide between
states, and confirm with a pop. Never gratuitous, never slow. And it always
yields — an athlete who asks for reduced motion gets a calm, instant version
with the soul intact.

---

## Voice

We speak football, not software.

Claim. Career. Locker. Believer. Suit up. Sign off. Go live.

Not: profile, import, follower, get started, welcome, unlock, dashboard-speak.

First person when it's theirs ("my career," "my locker"). Outcomes, not steps.
And we never make an athlete read an error — when something's missing, the
design shows it gently and the words stay warm.

---

## Design principles (the rules behind the rules)

1. **Minimal in, maximal out.** The athlete types the least possible; we return
   the most possible. That ratio *is* the product. Guard it on every screen —
   any new required field is a tax on the magic.
2. **Show, don't ask.** Whenever we can find something, we find it and let them
   confirm, instead of asking them to provide it.
3. **Every screen has one job.** If a screen is doing two things, it's doing
   neither well. Suit up gathers. Career reveals. Sign off confirms. Go live
   celebrates.
4. **Trust is built by being right, out loud.** Show where things came from.
   Correct data, shown unprompted, is the strongest trust signal we have.
5. **The athlete is the star.** The design is the lighting rig. When in doubt,
   make their name bigger and the chrome quieter.
6. **Pride is the goal, not completion.** Success isn't "they finished
   onboarding." It's "they screenshotted their locker and sent it to their
   group chat."

---

## Where this could go (delight, later)

Vision room — not required, but the kind of touches that would make the flow
sing:

- The reveal moment scored with a subtle sound cue, like a broadcast sting.
- A shareable "I just claimed my locker" card auto-generated at Go live.
- The hero photo subtly parallaxing, so the athlete's page feels in motion.
- Team colors bleeding into the locker the instant the school is chosen.
- A "believers" counter that starts ticking the moment the page goes live, so
  arrival immediately points to an audience.

None of these are the point. The point is the reveal. But each one deepens the
same feeling: *you matter, and now the world can see it.*
