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

export default function PreviewLocker() {
  const [draft, setDraft] = React.useState<Draft | null>(null);

  React.useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data?.type === "bltz:preview:draft") {
        setDraft(e.data.draft as Draft);
      }
    }
    window.addEventListener("message", onMsg);
    window.parent?.postMessage({ type: "bltz:preview:ready" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  if (!draft) {
    return (
      <div className="flex h-screen items-center justify-center text-white/60">
        Loading preview…
      </div>
    );
  }

  const heightFt = draft.height_in ? Math.floor(draft.height_in / 12) : null;
  const heightIn = draft.height_in ? draft.height_in % 12 : null;

  return (
    <main className="mx-auto max-w-3xl space-y-6 bg-gradient-to-br from-[#0b1320] via-black to-black p-6 text-white">
      <header className="flex flex-col items-center gap-4 text-center md:flex-row md:items-end md:text-left">
        <div className="relative h-28 w-28 overflow-hidden rounded-full border border-white/10 bg-white/5">
          {draft.headshot_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.headshot_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl">🏈</div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="font-oswald text-3xl font-bold uppercase">
            {draft.full_name || "Your name"}
          </h1>
          <p className="text-sm text-white/70">
            {[draft.position, draft.level ? LEVEL_LABEL[draft.level] : null, draft.school]
              .filter(Boolean)
              .join(" · ") || "Position · Level · School"}
          </p>
          {draft.hometown ? <p className="text-xs text-white/50">From {draft.hometown}</p> : null}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Height" value={heightFt != null ? `${heightFt}'${heightIn}"` : "—"} />
        <Stat label="Weight" value={draft.weight_lbs ? `${draft.weight_lbs} lbs` : "—"} />
        <Stat label="Games" value={draft.games_played?.toString() ?? "—"} />
        <Stat label="DOB" value={draft.dob ?? "—"} />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-2 font-oswald text-lg font-bold uppercase">Bio</h2>
        <p className="text-sm leading-relaxed text-white/80">
          {draft.bio || "Your bio will appear here."}
        </p>
      </section>

      {draft.awards && draft.awards.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-2 font-oswald text-lg font-bold uppercase">Awards</h2>
          <ul className="space-y-1 text-sm text-white/80">
            {draft.awards.slice(0, 6).map((a) => (
              <li key={`${a.name}-${a.year ?? ""}`}>
                <span>{a.name}</span>
                {a.year ? <span className="text-white/40"> · {a.year}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {draft.youtube_urls && draft.youtube_urls.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-2 font-oswald text-lg font-bold uppercase">Highlights</h2>
          <p className="text-sm text-white/60">
            {draft.youtube_urls.length} video{draft.youtube_urls.length === 1 ? "" : "s"}
          </p>
        </section>
      ) : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/40 p-3">
      <p className="text-xs uppercase tracking-wider text-white/50">{label}</p>
      <p className="mt-1 font-oswald text-xl font-bold">{value}</p>
    </div>
  );
}
