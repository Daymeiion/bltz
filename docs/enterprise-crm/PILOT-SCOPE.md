# School workspace — pilot scope (2026-11-02)

Replaces the large-enterprise journey plan (`MASTER-BUILD-ORDER.md`) for the NCAA and NIL-operator pilots. The rest of the plan is parked, not deleted.

## What the product is during the pilot

**Each school gets its own version of the BLTZ Intelligence engine for its former players, connected to their fan-facing Lockers.**

Schools see the moments worth sharing, launch Lockers for former players, connect their media and businesses, and track what they posted and how far it went.

## Positioning

Built as an extension that platforms like Teamworks or Hudl could plug in, not a competitor:

| Teamworks / INFLCR / Hudl cover | BLTZ adds |
|---|---|
| Current-roster operations, comms, film | Former players |
| Content distribution *to* athletes | A public Locker *fans* visit and interact with |
| Internal staff tools | Dated reasons to re-engage alumni and fans, and the reach that comes back |

## Pages

| Page | What it does |
|---|---|
| **Overview** | Moments in the next 7 days (act now) and 8–30 days (coming up), the count of live Lockers, and **Activity and reach**: everything posted or planned with reach, engagements and Locker visits. |
| **Intelligence** | Every former player, soonest moment first. Each opens an **athlete page**: signals with priority and confidence, suggested plays, activations, social reach, school-connected media and businesses, career moments and seasons. It uses the same engine as the admin Intelligence Lab, scoped to the school's own players. |
| **Launch a Locker** | Pick a player already on BLTZ or add a new one, attach highlights, images, archive links and businesses, add the player's email and a note, then launch. Progress shows as Launched → BLTZ building → Invite sent → Live. |

## Activations and reach

- An **activation** is a post, video, article, campaign or event about a player, usually planned from a signal.
- Each activation has a **tracked link**. Fan visits through it are counted automatically, then the fan lands on the player's Locker.
- After posting, staff mark it posted (channel + post link) and enter the **reach** and **engagements** the platform shows them. Pilot reach is entered by staff; there are no social-platform integrations yet.
- **Social reach** is follower counts per platform that staff record on the athlete page.

## Launching Lockers, media and businesses

- A launch is a request to BLTZ. BLTZ builds the Locker with the existing one-click batch builder, clears the media and sends the claim invite. Schools never send invites or publish media themselves.
- School-connected media and businesses show as "With BLTZ for review" until BLTZ approves them, then "On Locker".
- Items with a date become **school signals**: "Hale Performance Training turns 3", "10 years since the title game". They use the engine's act now / prepare / plan scale and appear on the athlete page and the Overview.
- Pilot media is links (YouTube, Hudl, Getty, archive pages). File uploads come later.

## Rights and media approval

- **BLTZ clears all media.** Nothing a school adds appears on a Locker until BLTZ approves it.
- **Schools approve nothing.** There is no rights queue for staff.
- **Takedowns** go to the BLTZ contact by email.

## Out of scope (parked)

Executive dashboard KPIs, opportunity pipeline, rights and approvals engine, file uploads, revenue and finance, social-platform API integrations, notifications, global search, team-level scope, and current-player mode.

The shared component library in `components/enterprise-crm/` is kept for when these return.

## How former players are matched to a school

A player's recorded school must match the organization's name or its linked school name, after normalizing ("University of X Athletics" = "X"). Only players with a public Locker (`/player/{slug}`) are listed, and only players we've already built Lockers for are covered. Every athlete page and write is checked against this list, so a school can never open or act on another school's player.

## Next candidates (decide after first pilot feedback)

1. Show approved school media and businesses on the public Locker itself.
2. A weekly Overview email to staff.
3. File uploads for highlights and archive images.
4. Pull reach automatically from Instagram/X once a pilot asks for it.
