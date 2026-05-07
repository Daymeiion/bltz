# Onboarding Broadcast Locker Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign BLTZ onboarding into a Broadcast Locker Reveal for self-serve athletes and a Claim-First Trust path for claim-token athletes.

**Architecture:** Keep existing Next.js routes and APIs. Add shared onboarding presentation components, restyle existing form/loader/review components, and add a verification gate UI state before public publish. Do not choose or integrate a third-party ID provider in this pass.

**Tech Stack:** Next.js App Router, React client components, Tailwind CSS, lucide-react, existing Supabase-backed onboarding APIs.

---

### Task 1: Shared Onboarding Presentation System

**Files:**
- Create: `components/onboarding/BroadcastShell.tsx`
- Modify: `app/onboarding/layout.tsx`

- [ ] Add a full-width dark navy onboarding shell with broadcast-safe background treatment, constrained content, and no card-inside-card layout.
- [ ] Add reusable `BroadcastPanel`, `BroadcastHeader`, `TrustRail`, and `SourceChip` primitives with 8px-or-less radii.
- [ ] Update the onboarding layout to use the shell without changing route behavior.

### Task 2: Identity Draft Screen

**Files:**
- Modify: `app/onboarding/page.tsx`
- Modify: `components/onboarding/IdentityForm.tsx`
- Create: `components/onboarding/LockerSilhouette.tsx`

- [ ] Replace the centered form card with a two-zone scout card plus live locker silhouette layout.
- [ ] Use blue for primary CTA and reserve gold for athlete identity emphasis.
- [ ] Keep existing validation and `/api/onboarding/start` submit behavior.
- [ ] Make mobile show form first with preview below.

### Task 3: Career Sweep

**Files:**
- Modify: `components/onboarding/MagicMomentLoader.tsx`
- Modify: `app/onboarding/loader/page.tsx`

- [ ] Replace the emoji pulse with a broadcast scouting rail.
- [ ] Show source events as timeline hits with source labels and subdued miss/error states.
- [ ] Keep SSE behavior, manual fallback behavior, and reduced-motion handling.
- [ ] Add copy for Wikipedia, ESPN, YouTube, roster, archive, and photo candidate discovery.

### Task 4: Claim-First Trust Screen

**Files:**
- Modify: `components/onboarding/ClaimRecap.tsx`
- Modify: `app/onboarding/claim/[token]/page.tsx`

- [ ] Redesign claim recap as a provenance reveal with counts, source groups, private/unconfirmed language, and claim status.
- [ ] Keep existing claim API call and active-run conflict handling.
- [ ] Add a calm conflict/error presentation for `claim_in_progress` and `already_claimed`.

### Task 5: Review Desk And Verification Gate

**Files:**
- Modify: `app/onboarding/review/page.tsx`
- Modify: `components/onboarding/ReviewForm.tsx`
- Create: `components/onboarding/VerificationRail.tsx`

- [ ] Turn the review page into an editorial Review Desk with edit/source/preview zones.
- [ ] Keep existing field state, source links, slug checks, headshot upload, and publish request.
- [ ] Add verification rail states: Claimed, Draft reviewed, Identity verified, Ready to publish.
- [ ] For claim-derived lockers, present "Verify identity to publish" before public publish; self-serve can still use the existing publish path until provider integration exists.

### Task 6: Deferred Next-Up List

**Files:**
- Modify: `TODOS.md`

- [ ] Add the spec's Not In Scope items under a dedicated onboarding redesign section so they can be picked up next.

### Task 7: Verification

**Files:**
- No production changes.

- [ ] Run `npm test`.
- [ ] Run targeted ESLint for changed onboarding files.
- [ ] Run `npm run lint` if targeted lint is clean.
- [ ] Start or reuse local dev server and inspect desktop/mobile onboarding screens if feasible.
