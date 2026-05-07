# Onboarding Broadcast Locker Reveal Design

Date: 2026-05-06
Status: Approved design approach

Revision note: After implementation feedback, the visual direction was simplified. The active onboarding flow is now a calm four-screen player path: verification basics, web-scrape results, locker preview review, and completion handoff. The earlier "Broadcast Locker Reveal" language remains as brand flavor only, not a busy multi-panel production treatment.

## Active Four-Screen Flow

1. Verification basics: collect name, school or club, position, and level.
2. Web-scrape results: show birthdate, hometown, pro teams, Wikipedia bio, ESPN stats/data, YouTube videos, and photo candidates found online.
3. Review preview: show locker preview with found information for brief review and edits.
4. Completion: show a completion graphic with locker preview and two actions, "Go to locker" and "Go to dashboard".

## Goal

Redesign BLTZ onboarding so it feels like the product is actively building an athlete's locker, not asking the athlete to manually create a profile. The default path uses a Broadcast Locker Reveal. Claim-token entry uses Claim-First Trust behavior. Both paths converge on a source-backed Review Desk and require third-party identity verification before a claimed locker can publish publicly.

## Brand Principles

- Athlete-as-icon, not user-as-customer.
- Dark navy surfaces, rectilinear panels, no blobs, no decorative glow, no emoji.
- Gold is reserved for athlete identity and peak stat emphasis.
- Blue is reserved for action CTAs.
- Football vocabulary: locker, career, claim, publish, verify.
- Motion feels like a broadcast package: purposeful source hits, lower-third transitions, scouting rails, and live preview changes.

## Entry Modes

### Self-Serve Path: Broadcast Locker Reveal

The self-serve athlete path begins with a high-signal identity draft screen. The athlete provides only the minimum needed to start the sweep: full name, school or team, position, and level.

The screen is split into two responsive zones:

- Scout Card: a compact form with visible labels and 56px fields.
- Locker Silhouette: a live preview shell that fills in as the athlete types.

The CTA is blue and action-oriented: "Build my locker".

### Claim Path: Claim-First Trust

Claim-token entry skips the discovery theater because BLTZ already has a draft on file. It opens with a provenance reveal:

- Athlete name and known team/school context.
- Counts for awards, videos, photos, and source-backed facts.
- Source list grouped by provider such as ESPN, Wikipedia, YouTube, team roster, and BLTZ archive.
- Clear note that data remains private and unconfirmed until reviewed.

The CTA creates or reuses the private review run. If another account already has an active review run for the same claim token, show a calm conflict state instead of allowing a second active claim.

## Career Sweep

The Career Sweep is the emotional center of onboarding. It should make the athlete feel BLTZ is doing real work on their behalf.

The sweep attempts to find:

- Wikipedia, ESPN, and roster pages for stats, biography facts, school/team history, position, height, weight, awards, and career timeline.
- YouTube for highlights, interviews, game clips, podcasts, and relevant appearances.
- Search/photo source links for candidate headshots and action photos.
- Existing BLTZ archive material for founder-curated media.

The UI presents discoveries as a scouting rail:

- Source hits arrive as broadcast-style events.
- Each event names the source and the kind of data found.
- Misses and errors are visible but subdued.
- The main headline updates as the sweep progresses.
- The live locker preview starts blank and gains name, team, stats, video thumbnails, and image candidates as they are found.

Photo handling must be conservative. BLTZ may show candidate photo links and source provenance, but it should not silently republish images. The athlete must confirm media or upload a headshot before publish.

## Review Desk

The Review Desk turns found data into a calm verification workflow.

Layout:

- Left: editable career facts grouped by identity, stats, story, media, awards, and locker URL.
- Right: sticky live locker preview on desktop, tabbed or stacked preview on mobile.
- Bottom: sticky action bar with save draft, verification state, and publish/verify CTA.

Trust model:

- AI-derived numeric fields start as unconfirmed.
- Source-backed fields show source badges and confidence state.
- Athlete-confirmed fields show a confirmed state.
- Bio is labeled as draft copy until edited or accepted.
- Every source link remains inspectable from the Review Desk.

The Review Desk should feel editorial, not administrative. Avoid dense nested cards. Use full-width sections, tight headers, mono numerics, and compact source rails.

## Identity Verification Gate

Professional athlete identity must be protected. Claiming a locker creates private access to the draft, but it does not make the locker public.

The publish sequence is:

1. Claim locker.
2. Review and edit draft.
3. Verify identity with a third-party service.
4. Publish locker.

The product should not ask for ID before showing value. First BLTZ shows the found career artifact. Then it asks for verification when the athlete understands what is being protected.

Verification states:

- Claimed
- Draft reviewed
- Identity verified
- Ready to publish

If identity verification is missing, the primary CTA becomes "Verify identity to publish". The locker can be saved privately, but cannot go live.

Implementation should keep the verification provider behind an adapter so the UI and publish gate do not depend on one vendor's API shape.

## Responsive Behavior

Mobile is not desktop stacked.

- Identity Draft: scout card first, locker preview as a collapsible "locker view" panel.
- Career Sweep: vertical scouting rail with the latest source hit pinned near the top.
- Claim Recap: stats become a 2x2 grid, source groups become stacked rows.
- Review Desk: segmented control switches between Edit, Sources, and Preview.
- Sticky bottom CTA remains 44px minimum and never covers form content.

Desktop:

- Use a two-zone broadcast layout.
- Preview remains visible where it helps confidence.
- Source rail can be horizontal during sweep and side-mounted during review.

## Accessibility

- Respect prefers-reduced-motion by replacing animated source movement with fades and static progress.
- All source events are announced through an ARIA live region.
- Touch targets are at least 44px.
- Focus rings are visible and gold.
- Do not rely on color alone for confirmed/unconfirmed states.
- Candidate images need descriptive alt text or source-only treatment until confirmed.

## Error And Edge States

- Sweep fails: show partial findings and offer manual review, never dead-end.
- Wrong athlete ambiguity: ask for disambiguation with school, team, years, and position.
- Claim token already has an active run for another user: show claim-in-progress conflict with support path.
- Claim token already published by another verified user: show already-claimed state.
- Verification fails or is abandoned: preserve private draft and allow retry.
- Photo source uncertain: show as candidate only, not publishable media.

## Not In Scope

- Choosing the third-party identity verification provider.
- Full admin verification review tooling.
- Full rights management for all photo sources.
- Premium theme customization.
- Public locker redesign beyond the onboarding live preview needs.

## What Already Exists

- `DESIGN.md` defines the BLTZ brand posture, colors, typography, spacing, motion, and anti-patterns.
- Current onboarding pages exist at `app/onboarding`, `app/onboarding/loader`, `app/onboarding/review`, and `app/onboarding/claim/[token]`.
- Existing components include `IdentityForm`, `MagicMomentLoader`, `ClaimRecap`, `ReviewForm`, `StepIndicator`, `SlugInput`, `HeadshotUploader`, and `LivePreviewIframe`.
- Current APIs include onboarding start, pipeline SSE, claim, and publish routes.
- Claim-token race protection has been added so one claim link can only create one active review run at a time.

## Open Implementation Notes

- Replace gold CTAs with blue CTAs to match `DESIGN.md`.
- Remove emoji from loader and use brand-native broadcast motion.
- Replace pill-like badges with small rectilinear status chips.
- Add verification state to the publish gate before making claimed lockers public.
- Keep data provenance attached to all AI-found fields through review and publish.
