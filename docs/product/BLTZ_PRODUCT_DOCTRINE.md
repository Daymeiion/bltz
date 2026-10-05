# BLTZ Product Doctrine

**Version:** 1.2  
**Updated:** October 2026  
**Status:** Authoritative product direction

> This document is the authoritative source for BLTZ product direction.
> If an older PRD, implementation plan, issue, task, wireframe, or legacy feature conflicts with this doctrine, flag the conflict and follow this doctrine unless an explicit product decision overrides it.

---

## 1. Product North Star

**BLTZ is the career media and intelligence infrastructure for athletes.**

BLTZ gives athletes a permanent home for their career, continuously organizes the people, teams, moments, media, rights, and opportunities connected to that career, and turns those relationships into measurable discovery, attribution, activation, and long-term value.

BLTZ is not merely a profile page, media library, social network, NIL marketplace, or CRM.

The platform exists to make fragmented athlete history persistent, connected, measurable, and useful across the full life of an athlete.

---

## 2. Core Product Model

BLTZ should be understood as a connected system:

```text
Athlete Identity
    ↓
Locker
    ↓
Athlete Career Graph
    ↓
Moment Contribution Graph
    ↓
Media / Rights Relationships
    ↓
Discovery + Engagement Signals
    ↓
Attribution
    ↓
BLTZ Intelligence
    ↓
Activation / Opportunity / Revenue
```

The public Locker is the athlete-facing interface to this system.

The enterprise experience is the operating and intelligence layer for organizations that need to understand athletes, moments, media, rights, discovery, attribution, and opportunity.

---

## 3. Identity Is Permanent

An athlete identity must persist across:

- College
- Professional teams
- Free agency
- Retirement
- Alumni status
- Coaching or media careers
- Future organizations and opportunities

**Identity is not the same thing as a user account.**

An athlete may have a canonical Career ID before claiming an account. That unclaimed identity may accumulate verified career relationships, moments, media, attribution, and historical value until the athlete claims or manages it.

In the current BLTZ application, `public.players.id` remains the canonical athlete identifier. Do not create a second competing athlete identity table without an explicit architecture decision.

---

## 4. The Locker

The Player Locker is the permanent public interface for athlete identity, career history, media, moments, and verified context.

The Locker may contain:

- Athlete identity
- Career history
- Teams and seasons
- Statistics
- Awards and achievements
- Career moments
- Photos
- Video
- Interviews
- Articles
- Media provenance
- Teammate and organization relationships
- Approved brand or commercial activations

The Locker must not expose private organization notes, internal rights disputes, confidential contract terms, or sensitive information.

### New doctrine: the Locker is both a destination and a sensor

The Locker does not only display athlete information.

It also creates first-party behavioral signals that help BLTZ understand how athletes, moments, and media are discovered and used.

Examples include:

- Locker views
- Referral source
- Athlete-shared traffic
- Search traffic
- Social referrals
- Media impressions
- Image opens
- Video engagement
- Moment opens
- Shares
- Related-athlete navigation
- Licensing or usage-intent actions
- Repeat discovery
- Organization or commercial audience engagement where appropriately measured

These interactions must be collected with appropriate privacy, consent, data-retention, and access controls.

The goal is not surveillance. The goal is to measure how athlete identity and media create attention and opportunity.

---

## 5. Athlete Career Graph

The Athlete Career Graph connects the athlete to the people, teams, organizations, seasons, accomplishments, moments, media, and relationships that make up their career.

Conceptually:

```text
Athlete
  → Organizations
  → Teams
  → Seasons
  → Moments
  → Media
  → Teammates / Contributors
  → Rights / Sources
  → Campaigns / Activations
  → Distribution
  → Attribution
```

The graph exists to preserve persistent career context.

It should answer questions such as:

- What happened in this athlete's career?
- Who was involved?
- What media exists?
- Who owns or controls that media?
- Which moments matter?
- What is being rediscovered now?
- What opportunities are emerging around the athlete?

---

## 6. Moment Contribution Graph

A Moment is a meaningful unit of athlete history.

A Moment may include:

- Event
- Date
- Team
- Opponent
- Location
- Statistics
- Participants
- Contributors
- Media
- Source
- Rights
- Historical context
- Distribution
- Engagement
- Commercial or storytelling opportunity

The Moment Contribution Graph must distinguish:

- Appearance
- Participation
- Contribution
- Attribution
- Rights ownership
- Licensing rights
- Economic participation

Being visible in a moment does not automatically create ownership or revenue rights.

The graph should preserve collective contribution without inventing legal rights.

---

## 7. Media and Rights Infrastructure

Media is not an isolated DAM product inside BLTZ.

Media exists as relationship infrastructure around athletes and moments.

Each media asset should be capable of connecting to:

- Athlete
- Moment
- Team
- Organization
- Provider
- Photographer or creator
- Source
- Rights holder
- Usage rules
- Approval status
- Publication status
- Distribution surfaces
- Engagement signals
- Attribution records

Third-party providers such as Getty Images can remain the rights and licensing authority for their assets while BLTZ provides athlete identity, context, discovery, and downstream attribution around those assets.

BLTZ should not claim ownership of third-party media simply because the asset is connected to an athlete or moment.

---

## 8. Discovery and Engagement Layer

BLTZ must measure more than follower counts and article volume.

The platform should combine external signals with first-party behavioral signals.

### External signals may include

- Search visibility
- News coverage
- Social audience
- Public statistics
- Awards
- Performance
- Verified sources
- Media coverage

### First-party BLTZ signals may include

- Locker discovery
- Referral source
- Athlete-generated distribution
- Media impressions
- Media opens
- Shares
- Moment engagement
- Graph traversal
- Repeat visits
- Professional audience engagement
- Licensing or activation intent
- Downstream attributed actions

This layer turns the Locker and enterprise surfaces into a proprietary learning system.

---

## 9. Attribution

BLTZ should preserve lineage between:

```text
Media
→ Athlete
→ Moment
→ Distribution
→ Audience
→ Engagement
→ Activation
→ Transaction
```

Attribution should answer:

- Where did discovery originate?
- Which athlete or organization created distribution?
- Which media asset generated engagement?
- Which moment drove attention?
- Which downstream action occurred?
- Which entities materially contributed?

Attribution must remain factual and auditable.

Direct revenue, modeled value, estimated media value, and AI-inferred opportunity must remain separate.

---

## 10. Athlete Value Graph

The Athlete Value Graph represents the economic and activation relationships that can arise from athlete identity, moments, and media.

Conceptually:

```text
Media / Moment
    → Usage
    → Campaign / Activation
    → Transaction
    → Rights
    → Attribution
    → Allocation
    → Earnings
    → Payout
```

This graph must never imply that appearance automatically creates payment rights.

It exists to make legitimate economic relationships traceable.

---

## 11. BLTZ Intelligence

BLTZ Intelligence should interpret connected athlete, moment, media, discovery, attribution, and external data.

Its job is to identify meaningful changes and suggest actions.

Examples:

- An older career moment is suddenly being rediscovered.
- A specific media asset is receiving disproportionate engagement.
- An athlete is generating high commercial intent despite a smaller social following.
- A school archive contains media tied to athletes with rising discovery.
- A licensing opportunity exists around a resurfacing moment.
- A brand or organization should consider an activation around a measurable signal.

### Intelligence architecture principle

AI should interpret measured signals, not fabricate them.

Where possible:

1. Collect events.
2. Compute deterministic metrics and features.
3. Detect meaningful changes.
4. Use AI to explain the pattern, rank context, and suggest possible actions.
5. Keep human approval over rights, publishing, contracts, payouts, and material commercial decisions.

Measured data, modeled estimates, and AI recommendations must always be visually and structurally distinguishable.

---

## 12. Enterprise Product

The enterprise product is not a generic CRM.

It is the operating and intelligence layer built on the Athlete Graph, Moment Graph, Media Graph, Discovery layer, and Attribution layer.

Potential users include:

- Agents
- NIL directors
- Athletic departments
- Teams
- Leagues
- Conferences
- Media teams
- Brands
- Rights holders
- Content licensors
- Media providers

Enterprise users should be able to understand:

- What is happening around an athlete
- Why attention is increasing or decreasing
- Which moments are driving engagement
- Which media is being discovered
- Where discovery came from
- What rights or permissions govern an asset
- What activation opportunities may exist
- What changed over time
- What BLTZ recommends reviewing next

The product should help users act on connected intelligence rather than merely browse records.

---

## 13. Dormant Media Recovery

BLTZ should help recover and reconnect valuable media that is otherwise fragmented or difficult to discover.

Dormant-media recovery may include:

- Old team archives
- University media
- Historical photography
- Interviews
- Press coverage
- Retired-player content
- Forgotten career moments
- Licensed third-party archives

The goal is to reconnect media with verified athlete identity and context so it can be discovered, understood, licensed, activated, or preserved appropriately.

---

## 14. Everybody Eats

BLTZ should preserve the idea that sports moments are often collective.

Teammates, organizations, photographers, leagues, schools, rights holders, brands, and media partners may all contribute to the value of a moment.

**Everybody Eats** means BLTZ should preserve contribution and attribution so legitimate participants can be recognized and, where contracts and rights permit, economically included.

It does **not** mean automatic revenue splitting.

Rights, contracts, and permissions control economic participation.

---

## 15. Product Data Flywheel

The long-term BLTZ advantage is the proprietary dataset created as athletes, organizations, media, and audiences interact with the platform.

```text
Athlete
    ↓
Locker distributes identity + media
    ↓
Audience discovers athletes + moments
    ↓
BLTZ captures first-party engagement signals
    ↓
Graphs organize relationships + behavior
    ↓
BLTZ Intelligence detects changes and opportunities
    ↓
Athlete / Organization / Brand / Licensor takes action
    ↓
More media distribution and activation
    ↓
More attributable data
```

This flywheel should improve the intelligence layer over time.

---

## 16. Technical Doctrine

Preserve the existing architecture unless a documented architectural change is approved.

Current application stack remains centered on:

- Next.js
- TypeScript
- Supabase
- PostgreSQL
- Supabase Auth
- Object storage
- Vercel

Supabase/PostgreSQL should remain the transactional system of record for canonical product entities and permissions.

High-volume behavioral event data may use a separate event pipeline and analytics store when scale requires it.

Do not force high-volume event analytics, streaming aggregation, and heavy analytical queries into the same transactional database if doing so harms performance or maintainability.

Derived athlete and moment features may be written back into the product database for fast application reads.

The architecture should evolve incrementally.

---

## 17. Product Boundaries

BLTZ is **not** primarily:

- PFF-style player grading
- Teamworks-style organizational operations software
- Hudl-style coaching or film analysis
- A generic social feed
- A traditional NIL marketplace
- A generic CRM
- A full payment processor
- A generic DAM
- A real-time media-orchestration clone
- A large rights-acquisition marketplace
- An AI wrapper over public web data

Do not build these categories merely because adjacent competitors offer them.

Only add features that strengthen the BLTZ core:

- Permanent athlete identity
- Career graph
- Moment graph
- Media relationships
- Discovery
- Rights and provenance
- Attribution
- Intelligence
- Activation
- Long-term athlete and media value

---

## 18. Product Compass

When deciding whether to build something, ask:

1. Does this strengthen permanent athlete identity?
2. Does it add meaningful career or moment context?
3. Does it improve media discovery, provenance, or control?
4. Does it improve attribution?
5. Does it create proprietary first-party intelligence?
6. Does it help an athlete or organization identify a real opportunity?
7. Does it preserve rights and permissions correctly?
8. Does it make the Locker or enterprise intelligence layer more valuable?

If the answer is no to most of these questions, it is probably outside the BLTZ core.

---

## 19. Short Doctrine

**BLTZ builds permanent athlete career infrastructure.**

The Locker is the public home.

The Athlete Graph preserves the career.

The Moment Graph explains what happened and who contributed.

The Media Graph connects assets, sources, and rights.

The Discovery layer measures how athletes and media are found.

Attribution explains what created value.

BLTZ Intelligence turns those connected signals into opportunities.

The Locker is both a destination and a sensor.
