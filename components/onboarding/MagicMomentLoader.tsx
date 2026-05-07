"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { PipelineEvent, PipelineDraft } from "@/lib/pipeline/types";
import { cn } from "@/lib/utils";
import { BroadcastPanel, SourceChip } from "./BroadcastShell";
import { ArrowRight, Calendar, Home, Search, ShieldCheck, Trophy, Users, Video } from "lucide-react";

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
  scrape_hit: "Source hit",
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
    return undefined;
  }, []);

  const headline = done
    ? done.status === "complete" || done.status === "manual"
      ? "Here is what BLTZ found"
      : "We could not finish the sweep"
    : events.at(-1)?.phase
      ? PHASE_COPY[events.at(-1)!.phase]
      : "Searching your career";

  const draft = done?.draft ?? null;
  const sourceHits = events.filter((e) => e.phase === "scrape_hit");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-3 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">Career sweep</p>
        <h1 className="font-oswald text-4xl font-bold uppercase text-white md:text-5xl">
          {headline}
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-7 text-white/65">
          BLTZ searches public sports sources for birthdate, hometown, pro teams,
          biography, ESPN stats, YouTube videos, and candidate photo links.
        </p>
      </header>

      <BroadcastPanel className="p-5 md:p-6">
        {!done ? (
          <div className="grid min-h-72 place-items-center text-center">
            <div>
              <Search className={cn("mx-auto h-12 w-12 text-[#F5A623]", reduced ? "" : "animate-pulse")} />
              <p className="mt-5 font-mono text-sm uppercase tracking-[0.16em] text-white/58">
                Searching Wikipedia, ESPN, YouTube, rosters, and photo sources
              </p>
            </div>
          </div>
        ) : (
          <FoundData draft={draft} sourceHits={sourceHits} />
        )}
      </BroadcastPanel>

      <BroadcastPanel className="p-4">
        <div
          ref={liveRef}
          role="log"
          aria-live="polite"
          aria-label="Discovery activity"
          className="max-h-48 overflow-y-auto font-mono text-xs text-white/62"
        >
          {events.length === 0 ? (
            <p>Starting source search...</p>
          ) : (
            <ul className="space-y-2">
              {events.map((e, i) => (
                <li key={`${e.at}-${i}`} className="flex gap-2">
                  <span className="text-white/32">{String(i + 1).padStart(2, "0")}</span>
                  <span>{e.message}</span>
                  {e.source ? <span className="ml-auto uppercase text-white/36">{e.source}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </BroadcastPanel>

      {(done?.status === "complete" || done?.status === "manual") ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => router.push(`/onboarding/review?run=${encodeURIComponent(runId)}`)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-[#2952FF] px-6 font-bold text-white hover:bg-[#1f43d8]"
          >
            Review found data <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {done?.status === "error" || done?.status === "timeout" ? (
        <div className="space-y-3 border border-yellow-500/30 bg-yellow-500/5 p-5 text-sm text-yellow-100">
          <p>
            We couldn&apos;t complete the sweep. You can still finish your locker manually —
            we&apos;ll keep what we did find.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push(`/onboarding/review?run=${encodeURIComponent(runId)}`)}
              className="min-h-11 rounded bg-[#2952FF] px-4 py-2 font-bold text-white hover:bg-[#1f43d8]"
            >
              Finish manually
            </button>
            <button
              type="button"
              onClick={() => router.push("/onboarding")}
              className="min-h-11 rounded border border-white/20 px-4 py-2 text-white/80 hover:border-white/40"
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FoundData({
  draft,
  sourceHits,
}: {
  draft: PipelineDraft | null;
  sourceHits: PipelineEvent[];
}) {
  const sourceNames = Array.from(new Set(sourceHits.map((e) => e.source).filter(Boolean)));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-oswald text-3xl font-bold uppercase text-white">Found data</h2>
        <div className="flex flex-wrap gap-2">
          {sourceNames.length ? sourceNames.map((source) => (
            <SourceChip key={source} tone="blue">{source}</SourceChip>
          )) : <SourceChip tone="warn">No source hits yet</SourceChip>}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <FoundStat icon={<Calendar className="h-4 w-4" />} label="Birthdate" value={draft?.dob ?? "Not found"} />
        <FoundStat icon={<Home className="h-4 w-4" />} label="Hometown" value={draft?.hometown ?? "Not found"} />
        <FoundStat icon={<Users className="h-4 w-4" />} label="Pro teams" value={draft?.pro_teams?.length ? draft.pro_teams.join(", ") : "Not found"} />
        <FoundStat icon={<Trophy className="h-4 w-4" />} label="Awards" value={String(draft?.awards?.length ?? 0)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="border border-white/10 bg-black/24 p-4">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-white/42">Bio draft</p>
          <p className="mt-3 text-base leading-7 text-white/72">
            {draft?.bio || "BLTZ did not find enough biography data yet. You can still add or edit it on the next screen."}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <FoundStat icon={<ShieldCheck className="h-4 w-4" />} label="ESPN stats" value={[
            draft?.height_in ? `${Math.floor(draft.height_in / 12)}'${draft.height_in % 12}\"` : null,
            draft?.weight_lbs ? `${draft.weight_lbs} lbs` : null,
            draft?.games_played ? `${draft.games_played} GP` : null,
          ].filter(Boolean).join(" / ") || "Not found"} />
          <FoundStat icon={<Video className="h-4 w-4" />} label="Videos" value={`${draft?.youtube_urls?.length ?? 0} found`} />
        </div>
      </div>
    </div>
  );
}

function FoundStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-black/24 p-4">
      <div className="flex items-center gap-2 text-[#F5A623]">{icon}</div>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/42">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-white">{value}</p>
    </div>
  );
}
