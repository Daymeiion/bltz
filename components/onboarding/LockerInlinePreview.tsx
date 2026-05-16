"use client";

import * as React from "react";

interface Draft {
  full_name?: string;
  bio?: string;
  position?: string;
  level?: string;
  school?: string;
  hometown?: string;
  height_in?: number | null;
  weight_lbs?: number | null;
  games_played?: number | null;
  dob?: string | null;
  headshot_url?: string;
  awards?: { name: string; year?: string }[];
  youtube_urls?: string[];
  photos?: { url: string }[];
}

const LEVEL_LABEL: Record<string, string> = {
  hs: "High school",
  college: "College",
  pro: "Pro",
  former: "Former pro",
};

/**
 * Inline live locker preview — renders the athlete's draft locker
 * directly in the Review form (no iframe, no fixed-height scroll
 * container). The whole block scrolls with the page.
 *
 * Visual structure:
 *   - Hero: a found photo fills the background behind a centered
 *     headshot circle, big oswald name, and a mono subtext line
 *     (position · level · school + "From hometown").
 *   - Bio / Awards / Highlights sections stack below in plain blocks
 *     with no panel chrome — the preview is bare so it reads as the
 *     locker page rather than a windowed sub-view of onboarding.
 */
export function LockerInlinePreview({
  draft,
  onBioChange,
}: {
  draft: Draft;
  /** When provided, the Bio section becomes an editable textarea in
   *  place; the textarea is styled like the surrounding prose so the
   *  preview still reads as a locker page. */
  onBioChange?: (next: string) => void;
}) {
  // Hero background: prefer a found photo if any. Falls back to the
  // headshot itself (we blur/scale/dim it so the foreground circle
  // doesn't compete visually). The foreground headshot circle still
  // uses the highest-trust headshot in full clarity.
  const heroBg =
    draft.photos?.find((p) => p.url && p.url !== draft.headshot_url)?.url ??
    draft.photos?.[0]?.url ??
    draft.headshot_url ??
    null;
  const headshot = draft.headshot_url ?? draft.photos?.[0]?.url ?? null;

  const subtitle = [
    draft.position,
    draft.level ? LEVEL_LABEL[draft.level] : null,
    draft.school,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    // Tighter spacing so the bio sits closer to the hero. The hero
    // already provides its own internal padding + a fade-to-bg
    // gradient at the bottom, so we don't need a big gap.
    <div className="space-y-4">
      {/* Hero — centered name + subtext over a darkened/blurred photo.
          Bleed the background to the full page width by negating the
          parent padding with negative margins, so the hero feels like
          a band across the whole scaffold rather than a card. */}
      <section className="relative -mx-4 overflow-hidden sm:-mx-6 lg:-mx-8">
        {heroBg ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroBg}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-md"
            />
            {/* Two overlays. First: a flat dark layer for legibility
                (lighter than before — 35% — so the photo still reads
                through). Second: a bottom-to-top gradient that fades
                the hero into the page background color (#0B0E1A from
                BroadcastShell). The gradient is the visual "bleed"
                between the hero band and the bio section below it. */}
            <div className="absolute inset-0 bg-black/35" aria-hidden />
            <div
              className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-[#0B0E1A]"
              aria-hidden
            />
          </>
        ) : null}

        <div className="relative flex flex-col items-center px-6 pt-16 pb-20 text-center sm:pt-20 sm:pb-24">
          <div className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-white/25 bg-white/5 shadow-[0_0_0_4px_rgba(245,166,35,0.18),0_18px_40px_rgba(0,0,0,0.55)] sm:h-40 sm:w-40">
            {headshot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={headshot}
                alt={draft.full_name ?? "Athlete headshot"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-5xl">
                🏈
              </div>
            )}
          </div>

          <h1 className="mt-6 font-oswald text-4xl font-bold uppercase leading-[1.05] text-white sm:text-5xl md:text-6xl">
            {draft.full_name || "Your name"}
          </h1>

          <p className="mt-3 font-mono text-sm uppercase tracking-[0.18em] text-white/75">
            {subtitle || "Position · Level · School"}
          </p>

          {draft.hometown ? (
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.16em] text-white/55">
              From {draft.hometown}
            </p>
          ) : null}
        </div>
      </section>

      {/* Bio — when an onBioChange handler is passed in (the Review
          screen), this renders as an editable textarea styled exactly
          like the prose paragraph it replaces (no border chrome,
          transparent bg) so the locker preview still reads as a real
          locker page. Without a handler we fall back to read-only
          prose, e.g. if this component is reused on a public locker. */}
      <section className="space-y-3">
        <h2 className="font-oswald text-xl font-bold uppercase tracking-normal text-white">
          Bio
        </h2>
        {onBioChange ? (
          <textarea
            value={draft.bio ?? ""}
            onChange={(e) => onBioChange(e.target.value)}
            placeholder="Your bio will appear here once you've written your story."
            rows={6}
            className="block w-full resize-y border-0 bg-transparent p-0 text-base leading-7 text-white/85 placeholder:text-white/35 focus:outline-none focus:ring-0"
          />
        ) : (
          <p className="text-base leading-7 text-white/80">
            {draft.bio ||
              "Your bio will appear here once you've written your story."}
          </p>
        )}
      </section>

      {/* Awards */}
      {draft.awards && draft.awards.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-oswald text-xl font-bold uppercase tracking-normal text-white">
            Awards
          </h2>
          <ul className="space-y-1 text-sm text-white/80">
            {draft.awards.slice(0, 8).map((a) => (
              <li key={`${a.name}-${a.year ?? ""}`}>
                <span>{a.name}</span>
                {a.year ? (
                  <span className="text-white/40"> · {a.year}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Highlights */}
      {draft.youtube_urls && draft.youtube_urls.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-oswald text-xl font-bold uppercase tracking-normal text-white">
            Highlights
          </h2>
          <p className="text-sm text-white/60">
            {draft.youtube_urls.length} video
            {draft.youtube_urls.length === 1 ? "" : "s"} pulled from YouTube.
          </p>
        </section>
      ) : null}
    </div>
  );
}
