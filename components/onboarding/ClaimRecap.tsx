"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Eye, Pencil } from "lucide-react";

interface PlayerSnapshot {
  id: string;
  full_name: string | null;
  position: string | null;
  level: string | null;
  school: string | null;
  awards_count: number;
  videos_count: number;
  photos_count: number;
}

interface Props {
  token: string;
  player: PlayerSnapshot;
  sources: { source: string; url: string | null }[];
}

const SOURCE_LABEL: Record<string, string> = {
  founder_archive: "BLTZ founder archive",
  cal_archive: "Cal alumni archive",
  wikipedia: "Wikipedia",
  espn: "ESPN",
  youtube: "YouTube",
  athlete_uploaded: "Athlete uploads",
};

export function ClaimRecap({ token, player, sources }: Props) {
  const router = useRouter();
  const [accepting, setAccepting] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function accept() {
    setAccepting(true);
    setErr(null);
    try {
      const r = await fetch("/api/onboarding/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        setErr(body.error ?? "Couldn't claim this locker.");
        setAccepting(false);
        return;
      }
      const { runId } = (await r.json()) as { runId: string };
      router.push(`/onboarding/review?run=${encodeURIComponent(runId)}`);
    } catch {
      setErr("Network error — try again.");
      setAccepting(false);
    }
  }

  const sourceTallies = Array.from(
    new Set(sources.map((s) => s.source)),
  ).filter(Boolean);

  return (
    <div className="space-y-8">
      <header className="space-y-3 text-center">
        <h1 className="font-oswald text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
          You&apos;ve already got a locker
        </h1>
        <p className="text-base text-white/70">
          {player.full_name ? `${player.full_name},` : "Athlete,"} we built a draft from your career
          before you got here. Take a look at what&apos;s on file.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="font-oswald text-lg font-bold uppercase text-white">
          What we&apos;ve gathered
        </h2>
        <ul className="grid grid-cols-2 gap-3 text-sm text-white/80 sm:grid-cols-4">
          <SnapshotStat label="Awards" value={player.awards_count} />
          <SnapshotStat label="Videos" value={player.videos_count} />
          <SnapshotStat label="Photos" value={player.photos_count} />
          <SnapshotStat label="Level" value={player.level ?? "—"} />
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="font-oswald text-lg font-bold uppercase text-white">
          Where it came from
        </h2>
        {sourceTallies.length === 0 ? (
          <p className="text-sm text-white/60">No external sources — everything was hand-curated.</p>
        ) : (
          <ul className="space-y-2 text-sm text-white/80">
            {sourceTallies.map((s) => (
              <li key={s} className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-bltz-gold" />
                {SOURCE_LABEL[s] ?? s}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-white/50">
          Numbers and bio drafts are flagged unconfirmed until you sign off on each row.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="font-oswald text-lg font-bold uppercase text-white">What&apos;s next</h2>
        <ol className="mt-3 space-y-2 text-sm text-white/80">
          <li className="flex items-start gap-2">
            <Eye className="mt-0.5 h-4 w-4 text-bltz-gold" />
            Review every line — confirm what&apos;s right, edit what isn&apos;t.
          </li>
          <li className="flex items-start gap-2">
            <Pencil className="mt-0.5 h-4 w-4 text-bltz-gold" />
            Add a headshot and lock in your locker URL.
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-bltz-gold" />
            Publish to flip your locker live and own the page.
          </li>
        </ol>
      </section>

      {err ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:justify-center">
        <Button
          onClick={accept}
          disabled={accepting}
          className="h-12 w-full bg-bltz-gold text-base font-bold text-black hover:bg-yellow-400 md:w-auto md:px-10"
        >
          {accepting ? "Loading…" : "Take me to my locker"}
        </Button>
      </div>
    </div>
  );
}

function SnapshotStat({ label, value }: { label: string; value: number | string }) {
  return (
    <li className="rounded-lg border border-white/10 bg-black/40 p-3">
      <p className="text-xs uppercase tracking-wider text-white/50">{label}</p>
      <p className="mt-1 font-oswald text-2xl font-bold text-white">{value}</p>
    </li>
  );
}
