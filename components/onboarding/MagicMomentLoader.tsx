"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type {
  PipelineDraft,
  PipelineEvent,
  ScraperSource,
} from "@/lib/pipeline/types";
import { cn } from "@/lib/utils";
import { BroadcastPanel } from "./BroadcastShell";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  GraduationCap,
  Home,
  Shield,
  Trophy,
  Tv,
  Users,
  Video,
} from "lucide-react";

interface Props {
  runId: string;
}

interface DoneEvent {
  status: "complete" | "manual" | "error" | "timeout";
  draft?: PipelineDraft | null;
  error?: string | null;
}

// The pipeline runs scrapers serially in this order; we mirror that here so
// each card can derive its own state (idle / scanning / hit / miss) from the
// event stream without the pipeline needing to emit per-source "started".
const SOURCES: {
  source: ScraperSource;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { source: "nflverse", label: "NFL Roster", icon: Shield },
  { source: "cfbverse", label: "College Roster", icon: GraduationCap },
  { source: "wikipedia", label: "Wikipedia", icon: BookOpen },
  { source: "espn", label: "ESPN", icon: Tv },
  { source: "youtube", label: "Highlights", icon: Video },
];

const PHASE_COPY: Record<PipelineEvent["phase"], string> = {
  queued: "Lining up sources",
  scrape_started: "Scanning public film",
  scrape_hit: "Source confirmed",
  scrape_miss: "No match on that source",
  scrape_done: "Cross-referencing the facts",
  synthesis_started: "Drafting your locker bio",
  synthesis_done: "Story drafted",
  complete: "Scout report ready",
  manual_fallback: "Handing off to manual",
  error: "Hit a snag",
};

type CardState = "idle" | "scanning" | "hit" | "miss";

export function MagicMomentLoader({ runId }: Props) {
  const router = useRouter();
  const [events, setEvents] = React.useState<PipelineEvent[]>([]);
  const [done, setDone] = React.useState<DoneEvent | null>(null);
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const fn = () => setReduced(m.matches);
    m.addEventListener?.("change", fn);
    return () => m.removeEventListener?.("change", fn);
  }, []);

  React.useEffect(() => {
    const es = new EventSource(
      `/api/onboarding/pipeline/${encodeURIComponent(runId)}`,
    );
    es.addEventListener("event", (e) => {
      try {
        const ev = JSON.parse((e as MessageEvent).data) as PipelineEvent;
        setEvents((prev) => [...prev, ev]);
      } catch {
        // ignore malformed payloads
      }
    });
    es.addEventListener("done", (e) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data) as DoneEvent;
        setDone(payload);
      } catch {
        setDone({ status: "error", error: "stream parse failed" });
      } finally {
        es.close();
      }
    });
    es.onerror = () => {
      es.close();
      setDone((d) => d ?? { status: "error", error: "stream interrupted" });
    };
    return () => es.close();
  }, [runId]);

  // Derive each scoreboard card's state + friendly message from the event
  // stream. The pipeline emits one scrape_hit/scrape_miss per source after
  // it runs; everything before the next pending source is therefore
  // resolved, and the first pending source is "scanning".
  const cards = React.useMemo(() => {
    const byHit = new Map<ScraperSource, PipelineEvent>();
    const byMiss = new Map<ScraperSource, PipelineEvent>();
    for (const e of events) {
      if (e.source && e.phase === "scrape_hit") byHit.set(e.source, e);
      if (e.source && e.phase === "scrape_miss") byMiss.set(e.source, e);
    }
    const scrapingStarted = events.some((e) => e.phase === "scrape_started");
    const scrapingDone = events.some(
      (e) => e.phase === "scrape_done" || e.phase === "synthesis_started",
    );

    let foundNextPending = false;
    return SOURCES.map((s) => {
      if (byHit.has(s.source)) {
        return {
          ...s,
          state: "hit" as CardState,
          message: byHit.get(s.source)!.message,
        };
      }
      if (byMiss.has(s.source)) {
        return {
          ...s,
          state: "miss" as CardState,
          message: byMiss.get(s.source)!.message,
        };
      }
      // Not yet resolved. If scraping is done (or we're past it) anything
      // still unresolved is treated as a miss for display purposes.
      if (scrapingDone || done) {
        return { ...s, state: "miss" as CardState, message: "No match found" };
      }
      // First unresolved source after start = currently scanning.
      if (scrapingStarted && !foundNextPending) {
        foundNextPending = true;
        return { ...s, state: "scanning" as CardState, message: "Scanning…" };
      }
      return { ...s, state: "idle" as CardState, message: "Queued" };
    });
  }, [events, done]);

  const lastEvent = events.at(-1);
  const headline = done
    ? done.status === "complete" || done.status === "manual"
      ? "Scout report ready"
      : "We couldn't finish the sweep"
    : lastEvent
      ? PHASE_COPY[lastEvent.phase]
      : "Searching your career";

  const subline = done
    ? done.status === "complete" || done.status === "manual"
      ? "Confirm what's right and we'll publish your locker."
      : done.error ?? "You can still finish your locker manually."
    : lastEvent?.message ?? "Lining up the sources we trust.";

  const draft = done?.draft ?? null;
  const hitCount = cards.filter((c) => c.state === "hit").length;

  const canAdvance =
    done?.status === "complete" || done?.status === "manual";
  const errored = done?.status === "error" || done?.status === "timeout";

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      {/* Headline only — eyebrow + subtitle removed to match step 1
          (Verify the Basics). The subline below the headline updates
          live to mirror what the pipeline is doing. */}
      <header className="space-y-3 text-center">
        <h1
          key={headline}
          className={cn(
            "font-oswald text-4xl font-bold uppercase leading-[1.05] text-white md:text-5xl",
            !reduced && "animate-in fade-in-0 slide-in-from-bottom-1 duration-300",
          )}
        >
          {headline}
        </h1>
        <p className="mx-auto max-w-xl font-mono text-xs uppercase tracking-[0.18em] text-white/55">
          {subline}
        </p>
      </header>

      {/* Source scoreboard — 5 cards, one per scraper. Each card narrates
          its own state. Staggered fade-in on mount gives the page a
          deliberate, broadcast-pre-show feel. */}
      <div
        role="status"
        aria-live="polite"
        aria-label="Source discovery progress"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4"
      >
        {cards.map((c, i) => (
          <SourceCard
            key={c.source}
            index={i}
            reduced={reduced}
            label={c.label}
            icon={c.icon}
            state={c.state}
            message={c.message}
          />
        ))}
      </div>

      {/* Found-data reveal once the pipeline lands. While loading, the
          space is reserved with a calm "still working" panel — keeps the
          page from snapping when the data arrives. */}
      {canAdvance ? (
        <FoundDataPanel draft={draft} hitCount={hitCount} reduced={reduced} />
      ) : !done ? (
        <BroadcastPanel className="px-5 py-8 text-center md:py-10">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-bltz-gold">
            Live sweep · {hitCount}/{SOURCES.length} confirmed
          </p>
          <p className="mt-3 text-base leading-7 text-white/65">
            We're checking the official rosters, the encyclopedia entry,
            the broadcaster profile, and the highlight feed — in that
            order — and stitching the facts into your draft locker.
          </p>
        </BroadcastPanel>
      ) : null}

      {/* CTA — gold pill matching the step 1 submit. Width grows from
          80% on phones to 1/2 tablet, 1/3 desktop. Hover-raise mirrors
          the rest of the onboarding interaction language. */}
      {canAdvance ? (
        <div className="pt-2">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/onboarding/review?run=${encodeURIComponent(runId)}`,
              )
            }
            className={cn(
              "mx-auto flex h-12 w-4/5 items-center justify-center gap-2 rounded-md bg-bltz-gold px-6 text-base font-bold uppercase tracking-wide text-black",
              "shadow-[0_8px_24px_rgba(245,166,35,0.25)] transition-all duration-200 hover:-translate-y-1 hover:bg-bltz-gold/90 hover:shadow-[0_12px_32px_rgba(245,166,35,0.35)]",
              "md:w-1/2 lg:w-1/3",
            )}
          >
            Review my locker <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {errored ? (
        <div className="space-y-3 rounded-md border border-bltz-gold/30 bg-bltz-gold/5 p-5 text-sm text-amber-100">
          <p>
            We couldn&apos;t finish the sweep. You can still build your
            locker manually — we&apos;ll keep whatever we did find.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/onboarding/review?run=${encodeURIComponent(runId)}`,
                )
              }
              className="min-h-11 rounded-md bg-bltz-gold px-4 py-2 font-bold uppercase tracking-wide text-black hover:bg-bltz-gold/85"
            >
              Finish manually
            </button>
            <button
              type="button"
              onClick={() => router.push("/onboarding")}
              className="min-h-11 rounded-md border border-white/20 px-4 py-2 text-white/80 hover:border-white/40"
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SourceCard({
  index,
  reduced,
  label,
  icon: Icon,
  state,
  message,
}: {
  index: number;
  reduced: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  state: CardState;
  message: string;
}) {
  const isHit = state === "hit";
  const isScanning = state === "scanning";
  const isMiss = state === "miss";
  return (
    <div
      className={cn(
        "group relative flex min-h-[7.5rem] flex-col items-center gap-2 rounded-md border bg-[#14182B]/72 px-3 py-4 text-center backdrop-blur",
        "transition-all duration-300 ease-out",
        isHit && "border-bltz-gold/60 shadow-[0_10px_28px_rgba(245,166,35,0.18)]",
        isScanning && "border-white/30",
        isMiss && "border-white/8 opacity-65",
        state === "idle" && "border-white/10",
      )}
      style={
        reduced ? undefined : { animationDelay: `${index * 90}ms` }
      }
      data-state={state}
    >
      {/* Stagger-in on mount. Skips when reduced motion is on. */}
      {!reduced ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-md opacity-0 animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-forwards"
          style={{ animationDelay: `${index * 90}ms`, animationDuration: "400ms" }}
        />
      ) : null}

      <StateIndicator state={state} reduced={reduced} />

      <Icon
        className={cn(
          "h-6 w-6 transition-colors duration-300",
          isHit && "text-bltz-gold",
          isScanning && "text-white",
          isMiss && "text-white/35",
          state === "idle" && "text-white/45",
        )}
      />
      <p
        className={cn(
          "font-mono text-[11px] uppercase tracking-[0.16em] leading-tight",
          isHit && "text-white",
          isScanning && "text-white",
          (isMiss || state === "idle") && "text-white/55",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "line-clamp-2 text-[11px] leading-snug text-white/55",
          isHit && "text-white/80",
        )}
        title={message}
      >
        {isHit ? message : isScanning ? "Scanning…" : isMiss ? "—" : "Queued"}
      </p>
    </div>
  );
}

function StateIndicator({
  state,
  reduced,
}: {
  state: CardState;
  reduced: boolean;
}) {
  if (state === "hit") {
    return (
      <span
        className={cn(
          "absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-bltz-gold text-black",
          !reduced && "animate-in zoom-in-50 duration-300",
        )}
        aria-label="Source confirmed"
      >
        <svg viewBox="0 0 20 20" className="h-3 w-3">
          <path
            d="M4 10.5 L8.2 14.5 L16 6"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (state === "scanning") {
    return (
      <span
        aria-label="Scanning"
        className={cn(
          "absolute right-2 top-2 h-5 w-5 rounded-full border-2 border-white/20 border-t-bltz-gold",
          !reduced && "animate-spin",
        )}
      />
    );
  }
  if (state === "miss") {
    return (
      <span
        aria-label="No match"
        className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full border border-white/15 text-white/40"
      >
        <svg viewBox="0 0 20 20" className="h-2.5 w-2.5">
          <path
            d="M5 5 L15 15 M15 5 L5 15"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }
  return (
    <span
      aria-label="Queued"
      className="absolute right-2 top-2 h-5 w-5 rounded-full border border-white/12"
    />
  );
}

function FoundDataPanel({
  draft,
  hitCount,
  reduced,
}: {
  draft: PipelineDraft | null;
  hitCount: number;
  reduced: boolean;
}) {
  const stats = [
    {
      icon: Calendar,
      label: "Birthdate",
      value: draft?.dob ?? null,
    },
    {
      icon: Home,
      label: "Hometown",
      value: draft?.hometown ?? null,
    },
    {
      icon: Users,
      label: "Pro teams",
      value: draft?.pro_teams?.length ? draft.pro_teams.join(", ") : null,
    },
    {
      icon: Trophy,
      label: "Awards",
      value: draft?.awards?.length ? `${draft.awards.length}` : null,
    },
  ];

  const height = draft?.height_in
    ? `${Math.floor(draft.height_in / 12)}'${draft.height_in % 12}"`
    : null;
  const espnLine = [
    height,
    draft?.weight_lbs ? `${draft.weight_lbs} lbs` : null,
    draft?.games_played ? `${draft.games_played} GP` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <BroadcastPanel
      tone="strong"
      className={cn(
        "p-5 md:p-7",
        !reduced && "animate-in fade-in-0 slide-in-from-bottom-2 duration-500",
      )}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/55">
          What we found
        </p>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-bltz-gold">
          {hitCount}/{SOURCES.length} confirmed
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.25fr_1fr]">
        <div className="rounded-md border border-white/10 bg-black/30 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
            Bio draft
          </p>
          <p className="mt-3 text-base leading-7 text-white/80">
            {draft?.bio ||
              "We didn't find enough biography to draft anything yet — you can write or paste it on the next screen."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-md border border-white/10 bg-black/24 p-3"
            >
              <div className="flex items-center gap-2 text-bltz-gold">
                <s.icon className="h-4 w-4" />
              </div>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                {s.label}
              </p>
              <p
                className={cn(
                  "mt-1 text-sm font-semibold leading-6",
                  s.value ? "text-white" : "text-white/35",
                )}
              >
                {s.value ?? "Not found"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {(espnLine || (draft?.youtube_urls?.length ?? 0) > 0) ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/8 pt-5 font-mono text-xs uppercase tracking-[0.14em] text-white/60">
          {espnLine ? (
            <span className="inline-flex items-center gap-2">
              <Tv className="h-3.5 w-3.5 text-bltz-gold" />
              {espnLine}
            </span>
          ) : null}
          {(draft?.youtube_urls?.length ?? 0) > 0 ? (
            <span className="inline-flex items-center gap-2">
              <Video className="h-3.5 w-3.5 text-bltz-gold" />
              {draft!.youtube_urls.length} highlight
              {draft!.youtube_urls.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      ) : null}
    </BroadcastPanel>
  );
}
