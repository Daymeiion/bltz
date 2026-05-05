# BLTZ Design System

The visual and interaction language for BLTZ. Every screen, every component, every
animation calibrates against this file. If a design decision isn't here, it isn't
the design.

## Brand Posture

**ESPN-meets-Patagonia. Athlete-as-icon, not user-as-customer.**

Football reverence. The athlete's career is the artifact, not a "profile." Every
surface should feel built by someone who knows what fourth-and-one feels like.

- **Loud where it matters:** athlete name, hero clip, peak-year stats.
- **Calm where it doesn't:** metadata, timestamps, navigation.
- **Premium without ornament:** typography and footage do the work. No decorative
  shadows, no glow effects, no blob backgrounds, no emoji.

## Color Tokens

```css
:root {
  /* Surface */
  --bg-base:       #0B0E1A;   /* Page background — near-black navy */
  --bg-elevated:   #14182B;   /* Cards, clip frames, modals */
  --bg-hover:      #1C2138;

  /* Foreground */
  --fg-primary:    #F5F5F5;   /* Body text */
  --fg-muted:      #8A8FA3;   /* Timestamps, metadata, captions */
  --fg-disabled:   #4A4F66;

  /* Accents — use sparingly */
  --accent-gold:   #F5A623;   /* Athlete name, peak-year stat highlights, badges */
  --accent-blue:   #2952FF;   /* CTAs, action buttons, links */

  /* Status */
  --error:         #FF4D4D;
  --success:       #2ECC71;
  --warn:          #F5A623;   /* Reuses gold */

  /* Borders */
  --border-subtle: rgba(255,255,255,0.08);
  --border-strong: rgba(255,255,255,0.16);
}
```

**Rules**
- Gold is for the athlete's name and peak-year stat call-outs. Nothing else.
- Blue is for actions only (buttons, links). Never decorative.
- Never use purple, violet, or indigo anywhere. Ever.
- Never use a flat solid color background on the locker page. Always navy + gradient
  + footage layer.

## Typography

```css
--font-display: 'Barlow Condensed', sans-serif;   /* 700, 900 */
--font-body:    'Barlow', sans-serif;             /* 400, 500 */
--font-mono:    'JetBrains Mono', monospace;      /* 500 */
```

**Usage**
- **Display (Barlow Condensed):** athlete names, section headers, hero copy.
  Always uppercase or title case, never lowercase.
- **Body (Barlow):** descriptions, paragraphs, form labels.
- **Mono (JetBrains Mono):** stats, jersey numbers, years, timestamps, scores,
  any numeric content.

**Loading**
- Self-host all three families. `font-display: swap`. Never fall back to
  `system-ui` or `-apple-system`. The "I gave up on typography" signal is a hard fail.

## Type Scale

1.25 ratio.

| Token | Size | Use |
|---|---|---|
| `--text-xs` | 12px | Captions, metadata |
| `--text-sm` | 14px | Secondary body |
| `--text-base` | 16px | Body (minimum) |
| `--text-md` | 20px | Subheaders, large body |
| `--text-lg` | 25px | Section headers |
| `--text-xl` | 32px | Page sub-titles |
| `--text-2xl` | 40px | Inline display |
| `--text-3xl` | 64px | Mid-size hero |
| `--text-4xl` | 96px | Hero (mobile) |
| `--text-5xl` | 120px | Hero (desktop) — athlete name |

Body text never below 16px. Touch targets never below 44px.

## Spacing

4px base. `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128`.

## Radius

| Token | Value | Use |
|---|---|---|
| `--r-sm` | 2px | Badges, chips |
| `--r-md` | 4px | Buttons, inputs |
| `--r-lg` | 8px | Clip frames, cards |

No pill buttons. No bubble-radius (≥16px) on anything. The brand is rectilinear.

## Motion

```css
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--dur-micro:  200ms;   /* hover, focus, button press */
--dur-macro:  400ms;   /* page transitions, modal in/out */
--dur-reveal: 1500ms;  /* magic-moment reveal sequence */
```

**Reveal sequence** (athlete first-view, after pipeline completes):
1. `0ms` — page mounts with hero clip muted-autoplaying behind dark gradient
2. `0–600ms` — name fades in gold, scales from 0.95 → 1.0
3. `600–900ms` — position + school + jersey# slide up from below
4. `900–1500ms` — timeline rail draws left-to-right
5. `1500ms` — primary CTA "This is yours. Edit anything." appears

Respect `prefers-reduced-motion`: skip reveal sequence, fade in.

## Component Vocabulary

### Hero (locker page)
- Full viewport height (`100vh`), no exceptions
- Background: muted autoplaying HLS clip via Mux + dark gradient overlay
- Foreground: athlete name (gold, 120px desktop / 96px mobile, Barlow Condensed 900)
- Below name: position • school • jersey# (mono, 18px, fg-muted)
- Bottom-right: Share button + Claim CTA (if unclaimed)
- No play controls visible (clip is decorative; tap reveals controls)

### Highlight reel
- Editorial asymmetric grid: 1 large + 2-4 small
- Each clip: thumb + 1-line title + provenance badge bottom-left
- Provenance badge: small chip, color-coded by source
  - Cal archive → gold
  - NFL Films → blue
  - Personal → gray
  - Athlete-uploaded → green
- Never a carousel. Never a uniform 3-column grid.

### Career timeline
- Horizontal rail desktop, vertical rail mobile
- Year (mono) → team logo → role (body)
- Peak years get gold dot + stat call-out (mono numerics, 32px)

### Believer Since
- Plain list. Name + jersey number worn. No avatars unless claimed.
- "Believer since 2019" timestamp in mono, fg-muted.

### Buttons
- Primary: blue bg, white text, 4px radius, 44px min-height
- Ghost: transparent, 1px gold border, gold text
- Destructive: error bg
- Never: pill, gradient, shadowed, animated-on-idle

### Forms
- Labels always visible above field (never placeholder-as-label)
- Field 56px tall, 4px radius, transparent bg with border
- Error state: red border + red text below, never modal

## Anti-Patterns (NEVER ship)

1. Centered card grids ("3 features in a row")
2. Icon-in-colored-circle decorations
3. Decorative blobs, wavy SVG dividers, floating shapes
4. Emoji as design elements
5. Purple/violet/indigo anywhere
6. Default font stacks (`system-ui`, `-apple-system`, Inter as last resort)
7. Pill buttons, bubble-radius cards
8. Carousels for content discovery (acceptable only for testimonial walls)
9. Generic hero copy ("Welcome to BLTZ", "Unlock your athlete identity")
10. Light-mode default (BLTZ is dark by default; light mode is v2)

## Responsive

Breakpoints: `375 / 768 / 1024 / 1440`.

Mobile is not "desktop stacked." Each surface gets intentional design:
- Locker hero: `120px` name → `96px` name + tighter line-height on mobile
- Career timeline: horizontal rail desktop → vertical rail mobile
- Highlight reel: editorial 1+4 desktop → 1+2 with "see more" mobile

## Accessibility

- Body text contrast: ≥ 4.5:1 against bg-base. Verified.
- Interactive contrast: ≥ 3:1
- Touch targets: ≥ 44px
- Focus rings: 2px gold offset 2px, visible on every interactive element
- Keyboard nav: tab order = visual order; skip-to-content link on every page
- Screen readers: alt text on every clip thumb (athlete name + opponent + year);
  ARIA landmarks on hero, nav, main, footer
- Reduced motion: skip reveal sequence, autoplay clips become posters
- Captions: required on all hero clips (can be off by default, toggle visible)

## Voice & Copy

- Football vocabulary, not SaaS vocabulary. "Plays" not "items," "career" not
  "profile," "claim" not "import," "believer" not "follower."
- Never "Welcome to BLTZ." Never "Get started." Never "Unlock."
- First-person from the athlete: "My career, finally in one place."
- Numbers in mono. Years in mono. Time in mono.

## Source

Brand tokens originate from `BLTZ_Development_Kickoff_Brief.docx` (founder spec).
This file is the canonical extension and SHOULD be updated as design decisions
solidify. /design-consultation can extend this file with full component library
and logo system in v2.
