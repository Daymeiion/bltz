"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { PipelineEvent, PipelineDraft } from "@/lib/pipeline/types";
import { cn } from "@/lib/utils";

interface Props {
  runId: string;
}

interface DoneEvent {
  status: "complete" | "manual" | "error" | "timeout";
  draft?: PipelineDraft | null;
  error?: string | null;
}

const PHASE_COPY: Record<PipelineEvent["phase"], string> = {
  queued: "Lining up sources",
  scrape_started: "Scouting public film",
  scrape_hit: "Pulled a confirmed source",
  scrape_miss: "Source came up dry",
  scrape_done: "Wrapped scout report",
  synthesis_started: "Drafting your story",
  synthesis_done: "Story drafted",
  complete: "Locker draft ready",
  manual_fallback: "Switching to manual locker draft",
  error: "Hit a snag",
};

export function MagicMomentLoader({ runId }: Props) {
  const router = useRouter();
  const [events, setEvents] = React.useState<PipelineEvent[]>([]);
  const [done, setDone] = React.useState<DoneEvent | null>(null);
  const [reduced, setReduced] = React.useState(false);
  const liveRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const fn = () => setReduced(m.matches);
    m.addEventListener?.("change", fn);
    return () => m.removeEventListener?.("change", fn);
  }, []);

  React.useEffect(() => {
    const es = new EventSource(`/api/onboarding/pipeline/${encodeURIComponent(runId)}`);
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

  React.useEffect(() => {
    if (!liveRef.current) return;
    liveRef.current.scrollTop = liveRef.current.scrollHeight;
  }, [events.length]);

  React.useEffect(() => {
    if (!done) return;
    if (done.status === "complete" || done.status === "manual") {
      const t = setTimeout(() => router.push(`/onboarding/review?run=${encodeURIComponent(runId)}`), 700);
      return () => clearTimeout(t);
    }
  }, [done, router, runId]);

  const lastPhase = events[events.length - 1]?.phase;
  const headline =
    done?.status === "manual"
      ? "We'll finish this together"
      : done?.status === "error" || done?.status === "timeout"
        ? "Pipeline hit a wall"
        : lastPhase
          ? PHASE_COPY[lastPhase]
          : "Warming up the scout";

  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <div
          className={cn(
            "mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-bltz-gold/40 bg-bltz-gold/10",
            reduced ? "" : "animate-pulse",
          )}
          aria-hidden
        >
          <span className="text-3xl">🏈</span>
        </div>
        <h1
          className="font-oswald text-3xl font-bold uppercase tracking-tight text-white md:text-4xl"
          aria-live="polite"
        >
          {headline}
        </h1>
        <p className="text-base text-white/70">
          Pulling tape, awards, and headshots. You&apos;ll review every line in a moment.
        </p>
      </div>

      <div
        ref={liveRef}
        role="log"
        aria-live="polite"
        aria-label="Discovery activity"
        className="h-72 overflow-y-auto rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-sm md:p-6"
      >
        {events.length === 0 ? (
          <p className="text-white/50">Booting scrapers…</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e, i) => (
              <li
                key={`${e.at}-${i}`}
                className={cn(
                  "flex items-start gap-3",
                  e.phase === "scrape_miss" || e.phase === "error"
                    ? "text-white/40"
                    : "text-white/85",
                )}
              >
                <span className="text-white/30">{i + 1}</span>
                <span>{e.message}</span>
                {e.url ? (
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto text-bltz-gold hover:underline"
                  >
                    source
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {done?.status === "error" || done?.status === "timeout" ? (
        <div className="space-y-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-5 text-sm text-yellow-100">
          <p>
            We couldn&apos;t complete the sweep. You can still finish your locker manually —
            we&apos;ll keep what we did find.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push(`/onboarding/review?run=${encodeURIComponent(runId)}`)}
              className="rounded-md bg-bltz-gold px-4 py-2 font-bold text-black hover:bg-yellow-400"
            >
              Finish manually
            </button>
            <button
              type="button"
              onClick={() => router.push("/onboarding")}
              className="rounded-md border border-white/20 px-4 py-2 text-white/80 hover:border-white/40"
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
