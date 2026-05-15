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
  { source: "nflverse", label: "NFL", icon: Shield },
  { source: "cfbverse", label: "College", icon: GraduationCap },
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
      // First unresolved source = currently scanning. We don't gate this
      // on a `scrape_started` event having arrived — the pipeline begins
      // the moment the page mounts, so the first icon should already be
      // popping in by the time the user reads the headline. Waiting on
      // SSE for the first event introduces a ~100ms blank window that
      // reads as a separate "lining up sources" screen.
      if (!foundNextPending) {
        foundNextPending = true;
        return { ...s, state: "scanning" as CardState, message: "Scanning…" };
      }
      return { ...s, state: "idle" as CardState, message: "Queued" };
    });
  }, [events, done]);

  const lastEvent = events.at(-1);
  // Headline is the static page name — "Career sweep" — matching the
  // step indicator above. The subline below carries the live phase
  // copy that used to cycle through the headline. Only the error path
  // overrides the title, since users need that signaled prominently.
  const headline =
    done?.status === "error" || done?.status === "timeout"
      ? "We couldn't finish the sweep"
      : "Career sweep";

  const subline = done
    ? done.status === "complete" || done.status === "manual"
      ? "Confirm what's right and we'll publish your locker."
      : done.error ?? "You can still finish your locker manually."
    : // Before the first SSE event lands, leave the subline empty — the
      // first icon is already popping in as "scanning", which carries
      // the loading signal on its own. A "Lining up the sources we
      // trust" fallback here used to flash for ~100ms during the SSE
      // handshake and read as a separate transitional screen.
      lastEvent?.message ?? "";

  const draft = done?.draft ?? null;
  const hitCount = cards.filter((c) => c.state === "hit").length;

  const canAdvance =
    done?.status === "complete" || done?.status === "manual";
  const errored = done?.status === "error" || done?.status === "timeout";

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      {/* The earlier "popping up twice" was actually a stale browser
          bundle showing the old loader page before the new one mounted
          — not a strict-mode animation echo. With the old bundle out
          of the way, the headline + subline can carry their entrance
          animation again. `key={headline}` re-triggers the animation
          if the title switches (e.g. error path → "We couldn't finish
          the sweep"). */}
      <header className="space-y-3 text-center">
        <h1
          key={headline}
          className={cn(
            "font-oswald text-4xl font-bold uppercase leading-[1.05] text-white md:text-5xl",
            !reduced &&
              "animate-in fade-in-0 slide-in-from-bottom-1 duration-300",
          )}
        >
          {headline}
        </h1>
        <p
          className={cn(
            "mx-auto max-w-xl font-mono text-xs uppercase tracking-[0.18em] text-white/55",
            !reduced &&
              "animate-in fade-in-0 slide-in-from-bottom-1 duration-300 delay-100 fill-mode-backwards",
          )}
        >
          {subline}
        </p>
      </header>

      {/* Source scoreboard — 5 icons in a single row, no card containers.
          Each slot reserves its space so the row layout stays stable, and
          the icon+label pops in (zoom + fade) the moment its source
          starts scanning. On hit, a gold check badge animates in beneath
          the icon; on miss, the icon dims. */}
      <div
        role="status"
        aria-live="polite"
        aria-label="Source discovery progress"
        className="flex items-start justify-center gap-6 sm:gap-10 md:gap-14"
      >
        {cards.map((c) => (
          <SourceIcon
            key={c.source}
            reduced={reduced}
            label={c.label}
            icon={c.icon}
            state={c.state}
          />
        ))}
      </div>

      {/* Found-data panel only appears once the pipeline lands. While
          scanning, the page intentionally stays sparse — headline,
          subline, and the icon row narrate progress on their own. */}
      {canAdvance ? (
        <FoundDataPanel draft={draft} hitCount={hitCount} reduced={reduced} />
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

function SourceIcon({
  reduced,
  label,
  icon: Icon,
  state,
}: {
  reduced: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  state: CardState;
}) {
  const isHit = state === "hit";
  const isScanning = state === "scanning";
  const isMiss = state === "miss";
  const isIdle = state === "idle";

  return (
    // Outer slot reserves space so the row's centered layout doesn't
    // shift as icons pop in left-to-right. The contents only render
    // once the source's scan has begun (state ≠ idle), which is when
    // the `animate-in` mount animation runs.
    <div
      className="flex w-14 flex-col items-center sm:w-16"
      data-state={state}
      aria-label={`${label} ${state}`}
    >
      {!isIdle ? (
        <div
          className={cn(
            "flex flex-col items-center gap-2",
            !reduced &&
              "animate-in zoom-in-50 fade-in-0 slide-in-from-bottom-1 duration-500 ease-out",
          )}
        >
          <div className="relative">
            <Icon
              className={cn(
                "h-9 w-9 transition-all duration-300 sm:h-10 sm:w-10",
                isHit && "text-bltz-gold",
                isScanning && "text-white",
                isMiss && "text-white/30",
                !reduced && isScanning && "animate-pulse",
              )}
            />
            {/* Gold check badge — animates in only on hit. */}
            {isHit ? (
              <span
                aria-hidden
                className={cn(
                  "absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-bltz-gold text-black",
                  "shadow-[0_2px_10px_rgba(245,166,35,0.55)] ring-2 ring-[#0B0E1A]",
                  !reduced &&
                    "animate-in zoom-in-50 fade-in-0 duration-400 ease-out",
                )}
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
            ) : null}
          </div>
          <p
            className={cn(
              "font-mono text-[11px] uppercase tracking-[0.16em] leading-tight transition-colors duration-300",
              isHit && "text-white",
              isScanning && "text-white",
              isMiss && "text-white/35",
            )}
          >
            {label}
          </p>
        </div>
      ) : null}
    </div>
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
              className="flex flex-col items-center justify-center rounded-md border border-white/10 bg-black/24 p-4 text-center"
            >
              <s.icon className="h-9 w-9 text-bltz-gold sm:h-10 sm:w-10" />
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-white/55">
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
    </BroadcastPanel>
  );
}
