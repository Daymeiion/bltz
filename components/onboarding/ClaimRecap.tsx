"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Eye, Lock, Pencil, ShieldCheck } from "lucide-react";
import { BroadcastHeader, BroadcastPanel, SourceChip, TrustRail } from "./BroadcastShell";

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
        setErr(messageForError(body.error));
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
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
        <BroadcastHeader
          eyebrow="Claim-first trust"
          title={
            <>
              This locker is already <span className="text-[#F5A623]">on file</span>
            </>
          }
        >
          <p>
            {player.full_name ? `${player.full_name},` : "Athlete,"} BLTZ built a
            private draft from career sources before you arrived. Review what we found,
            then verify identity before anything can publish.
          </p>
        </BroadcastHeader>

        <TrustRail
          items={[
            { label: "Awards", value: String(player.awards_count), tone: "gold" },
            { label: "Videos", value: String(player.videos_count), tone: "blue" },
            { label: "Photos", value: String(player.photos_count) },
            { label: "Visibility", value: "Private" },
          ]}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <BroadcastPanel className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/42">
                Provenance reveal
              </p>
              <h2 className="mt-1 font-oswald text-3xl font-bold uppercase text-white">
                What BLTZ gathered
              </h2>
            </div>
            <SourceChip tone="success">Private draft</SourceChip>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SnapshotStat label="Level" value={player.level ?? "--"} />
            <SnapshotStat label="Position" value={player.position ?? "--"} />
            <SnapshotStat label="School" value={player.school ?? "--"} />
            <SnapshotStat label="Review state" value="Unconfirmed" />
          </div>

          <div className="mt-5 border border-white/10 bg-black/22 p-4 text-sm leading-6 text-white/64">
            Numbers, bio copy, and media candidates stay unconfirmed until you sign off.
            Claiming gives private access; verification is required before public publish.
          </div>
        </BroadcastPanel>

        <BroadcastPanel className="p-5 sm:p-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/42">
            Source groups
          </p>
          {sourceTallies.length === 0 ? (
            <p className="mt-5 text-sm leading-6 text-white/60">
              No external sources are attached yet. This draft was hand-curated by BLTZ.
            </p>
          ) : (
            <ul className="mt-5 space-y-3 text-sm text-white/80">
              {sourceTallies.map((s) => (
                <li key={s} className="flex items-center justify-between gap-3 border border-white/10 bg-black/22 p-3">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#F5A623]" />
                    {SOURCE_LABEL[s] ?? s}
                  </span>
                  <SourceChip>Source</SourceChip>
                </li>
              ))}
            </ul>
          )}
        </BroadcastPanel>
      </div>

      <BroadcastPanel className="p-5 sm:p-6">
        <h2 className="font-oswald text-2xl font-bold uppercase text-white">What happens next</h2>
        <ol className="mt-4 grid gap-3 text-sm text-white/76 md:grid-cols-4">
          <NextStep icon={<Eye className="h-4 w-4" />} title="Review" text="Confirm what is yours and edit what is not." />
          <NextStep icon={<Pencil className="h-4 w-4" />} title="Shape" text="Add headshot, URL, story, awards, and media." />
          <NextStep icon={<Lock className="h-4 w-4" />} title="Verify" text="Third-party ID check protects athlete identity." />
          <NextStep icon={<ShieldCheck className="h-4 w-4" />} title="Publish" text="Go live only after verification succeeds." />
        </ol>
      </BroadcastPanel>

      {err ? (
        <div className="flex gap-3 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{err}</p>
        </div>
      ) : null}

      <div className="sticky bottom-0 -mx-4 border-t border-white/10 bg-[#050711]/86 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 md:static md:m-0 md:border-0 md:bg-transparent md:p-0">
        <Button
          onClick={accept}
          disabled={accepting}
          className="h-12 w-full rounded bg-[#2952FF] text-base font-bold text-white hover:bg-[#1f43d8] md:w-auto md:px-10"
        >
          {accepting ? "Loading..." : "Claim private review"}
        </Button>
      </div>
    </div>
  );
}

function SnapshotStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-white/10 bg-black/32 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/42">{label}</p>
      <p className="mt-1 truncate font-oswald text-2xl font-bold uppercase text-white">{value}</p>
    </div>
  );
}

function NextStep({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <li className="border border-white/10 bg-black/22 p-3">
      <div className="flex h-9 w-9 items-center justify-center border border-[#F5A623]/30 text-[#F5A623]">
        {icon}
      </div>
      <p className="mt-3 font-oswald text-lg font-bold uppercase text-white">{title}</p>
      <p className="mt-1 leading-6 text-white/58">{text}</p>
    </li>
  );
}

function messageForError(error?: string) {
  switch (error) {
    case "claim_in_progress":
      return "This claim link already has an active private review. If this should be yours, contact BLTZ support before trying again.";
    case "already_claimed":
      return "This locker has already been claimed. BLTZ support can help if this looks wrong.";
    case "expired":
      return "This claim link has expired. Ask BLTZ for a fresh private claim link.";
    default:
      return error ?? "Could not claim this locker.";
  }
}
