"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { nflLogo, nflTeamColor } from "@/lib/player/locker-format";
import { slugify } from "@/lib/preview-lockers/slug";
import type { PipelineDraft, PipelineEvent, PlayerIdentityInput } from "@/lib/pipeline/types";
import type { PreviewAward, PreviewPhoto, PreviewTeamPill, PreviewVideo } from "@/lib/preview-lockers/types";

type Step = "form" | "scraping" | "review" | "saving";

type Identity = {
  full_name: string;
  school: string;
  position: string;
  level: PlayerIdentityInput["level"] | "";
  cohort_year: string;
};

type ReviewState = {
  slug: string;
  full_name: string;
  position: string;
  level: PlayerIdentityInput["level"] | "";
  school: string;
  hometown: string;
  height_in: string;
  weight_lbs: string;
  dob: string;
  games_played: string;
  headshot_url: string;
  bio: string;
  athlete_quote: string;
  athlete_quote_author: string;
  awards: (PreviewAward & { included: boolean })[];
  photos: (PreviewPhoto & { included: boolean })[];
  videos: PreviewVideo[];
  proTeams: PreviewTeamPill[];
};

function youtubeThumb(url: string): string | null {
  const m =
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{6,})/.exec(url);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}

function draftToReview(identity: Identity, draft: PipelineDraft): ReviewState {
  return {
    slug: slugify(draft.full_name || identity.full_name),
    full_name: draft.full_name || identity.full_name,
    position: draft.position || identity.position,
    level: draft.level || identity.level,
    school: draft.school || identity.school,
    hometown: draft.hometown || "",
    height_in: draft.height_in ? String(draft.height_in) : "",
    weight_lbs: draft.weight_lbs ? String(draft.weight_lbs) : "",
    dob: draft.dob || "",
    games_played: draft.games_played ? String(draft.games_played) : "",
    headshot_url: draft.photos[0]?.url || "",
    bio: draft.bio || "",
    athlete_quote: "",
    athlete_quote_author: "",
    awards: draft.awards.map((a) => ({
      year: a.year || "",
      label: a.name.toUpperCase(),
      included: true,
    })),
    photos: draft.photos.map((p, i) => ({
      id: `photo-${i}`,
      url: p.url,
      title: `Photo ${i + 1}`,
      credits: p.credits ?? null,
      sourceUrl: null,
      level: identity.level === "hs" ? "hs" : identity.level === "college" ? "cfb" : "pro",
      season: null,
      included: true,
    })),
    videos: draft.youtube_urls.map((url, i) => ({
      id: `video-${i}`,
      title: `Highlight ${i + 1}`,
      thumb: youtubeThumb(url),
      url,
    })),
    proTeams: (draft.pro_teams ?? []).map((code) => ({
      label: code,
      color: nflTeamColor(code),
      logo: nflLogo(code),
    })),
  };
}

export default function NewPreviewLockerPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("form");
  const [identity, setIdentity] = React.useState<Identity>({
    full_name: "",
    school: "",
    position: "",
    level: "",
    cohort_year: "",
  });
  const [events, setEvents] = React.useState<PipelineEvent[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [review, setReview] = React.useState<ReviewState | null>(null);
  const [newVideoTitle, setNewVideoTitle] = React.useState("");
  const [newVideoUrl, setNewVideoUrl] = React.useState("");

  async function startScrape(e: React.FormEvent) {
    e.preventDefault();
    if (!identity.full_name.trim()) return;
    setError(null);
    setEvents([]);
    setStep("scraping");

    try {
      const res = await fetch("/api/onboarding/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: identity.full_name,
          school: identity.school || null,
          position: identity.position || null,
          level: identity.level || null,
          cohort_year: identity.cohort_year ? Number(identity.cohort_year) : null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { runId } = await res.json();

      const es = new EventSource(`/api/onboarding/pipeline/${runId}`);
      es.addEventListener("event", (msg) => {
        const ev = JSON.parse((msg as MessageEvent).data) as PipelineEvent;
        setEvents((prev) => [...prev, ev]);
      });
      es.addEventListener("done", (msg) => {
        const payload = JSON.parse((msg as MessageEvent).data) as {
          status: string;
          draft?: PipelineDraft;
          error?: string | null;
        };
        es.close();
        if (payload.draft) {
          setReview(draftToReview(identity, payload.draft));
          setStep("review");
        } else {
          setError(payload.error || "The scraper couldn't find enough to draft a locker.");
          setStep("form");
        }
      });
      es.onerror = () => {
        es.close();
        setError("Lost connection to the scraper. Try again.");
        setStep("form");
      };
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Couldn't start the scraper.");
      setStep("form");
    }
  }

  function addVideo() {
    if (!newVideoTitle.trim() || !newVideoUrl.trim() || !review) return;
    setReview({
      ...review,
      videos: [
        ...review.videos,
        {
          id: `video-${Date.now()}`,
          title: newVideoTitle.trim(),
          url: newVideoUrl.trim(),
          thumb: youtubeThumb(newVideoUrl.trim()),
        },
      ],
    });
    setNewVideoTitle("");
    setNewVideoUrl("");
  }

  function removeVideo(id: string) {
    if (!review) return;
    setReview({ ...review, videos: review.videos.filter((v) => v.id !== id) });
  }

  function togglePhoto(id: string) {
    if (!review) return;
    setReview({
      ...review,
      photos: review.photos.map((p) => (p.id === id ? { ...p, included: !p.included } : p)),
    });
  }

  function toggleAward(index: number) {
    if (!review) return;
    setReview({
      ...review,
      awards: review.awards.map((a, i) => (i === index ? { ...a, included: !a.included } : a)),
    });
  }

  async function save() {
    if (!review) return;
    setStep("saving");
    setError(null);
    try {
      const res = await fetch("/api/preview-lockers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: review.slug,
          full_name: review.full_name,
          position: review.position || null,
          level: review.level || null,
          school: review.school || null,
          hometown: review.hometown || null,
          height_in: review.height_in ? Number(review.height_in) : null,
          weight_lbs: review.weight_lbs ? Number(review.weight_lbs) : null,
          dob: review.dob || null,
          games_played: review.games_played ? Number(review.games_played) : null,
          headshot_url: review.headshot_url || null,
          bio: review.bio,
          athlete_quote: review.athlete_quote || null,
          athlete_quote_author: review.athlete_quote_author || null,
          pro_teams: review.proTeams,
          awards: review.awards.filter((a) => a.included).map(({ year, label }) => ({ year, label })),
          videos: review.videos,
          photos: review.photos
            .filter((p) => p.included)
            .map(({ id, url, title, credits, sourceUrl, level, season }) => ({
              id,
              url,
              title,
              credits,
              sourceUrl,
              level,
              season,
            })),
        }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.error || "Couldn't save the preview locker.");
      }
      const { slug } = await res.json();
      router.push(`/preview-lockers/${slug}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Couldn't save the preview locker.");
      setStep("review");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-3 md:p-8">
      <h1 className="text-2xl font-bold text-neutral-950 dark:text-white">New Preview Locker</h1>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {step === "form" && (
        <form onSubmit={startScrape} className="space-y-4 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
          <Field label="Full name *">
            <input
              required
              value={identity.full_name}
              onChange={(e) => setIdentity({ ...identity, full_name: e.target.value })}
              className={inputClass}
              placeholder="e.g. Caleb Williams"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="School">
              <input
                value={identity.school}
                onChange={(e) => setIdentity({ ...identity, school: e.target.value })}
                className={inputClass}
                placeholder="e.g. USC"
              />
            </Field>
            <Field label="Position">
              <input
                value={identity.position}
                onChange={(e) => setIdentity({ ...identity, position: e.target.value })}
                className={inputClass}
                placeholder="e.g. QB"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Level">
              <select
                value={identity.level ?? ""}
                onChange={(e) => setIdentity({ ...identity, level: e.target.value as Identity["level"] })}
                className={inputClass}
              >
                <option value="">Not sure</option>
                <option value="college">College</option>
                <option value="pro">Pro</option>
                <option value="former">Former pro</option>
              </select>
            </Field>
            <Field label="Grad / draft year">
              <input
                value={identity.cohort_year}
                onChange={(e) => setIdentity({ ...identity, cohort_year: e.target.value })}
                className={inputClass}
                placeholder="e.g. 2024"
                inputMode="numeric"
              />
            </Field>
          </div>
          <button type="submit" className="w-full rounded-xl bg-[#ffbb00] py-3 font-semibold text-black hover:brightness-95">
            Run scraper
          </button>
        </form>
      )}

      {step === "scraping" && (
        <div className="space-y-3 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Searching for {identity.full_name}…
          </p>
          <ul className="space-y-1.5 text-sm">
            {events.map((ev, i) => (
              <li key={i} className="text-neutral-500 dark:text-neutral-400">
                {ev.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(step === "review" || step === "saving") && review && (
        <div className="space-y-6">
          <section className="space-y-4 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
            <h2 className="font-semibold text-neutral-950 dark:text-white">Identity</h2>
            <Field label="Preview link slug">
              <input
                value={review.slug}
                onChange={(e) => setReview({ ...review, slug: slugify(e.target.value) })}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-neutral-500">/preview-lockers/{review.slug}</p>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full name">
                <input value={review.full_name} onChange={(e) => setReview({ ...review, full_name: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Position">
                <input value={review.position} onChange={(e) => setReview({ ...review, position: e.target.value })} className={inputClass} />
              </Field>
              <Field label="School">
                <input value={review.school} onChange={(e) => setReview({ ...review, school: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Hometown">
                <input value={review.hometown} onChange={(e) => setReview({ ...review, hometown: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Height (inches)">
                <input value={review.height_in} onChange={(e) => setReview({ ...review, height_in: e.target.value })} className={inputClass} inputMode="numeric" />
              </Field>
              <Field label="Weight (lbs)">
                <input value={review.weight_lbs} onChange={(e) => setReview({ ...review, weight_lbs: e.target.value })} className={inputClass} inputMode="numeric" />
              </Field>
              <Field label="Date of birth">
                <input value={review.dob} onChange={(e) => setReview({ ...review, dob: e.target.value })} className={inputClass} placeholder="YYYY-MM-DD" />
              </Field>
              <Field label="Games played">
                <input value={review.games_played} onChange={(e) => setReview({ ...review, games_played: e.target.value })} className={inputClass} inputMode="numeric" />
              </Field>
            </div>
            <Field label="Headshot URL">
              <input value={review.headshot_url} onChange={(e) => setReview({ ...review, headshot_url: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Bio">
              <textarea value={review.bio} onChange={(e) => setReview({ ...review, bio: e.target.value })} className={`${inputClass} h-28`} />
            </Field>
          </section>

          <section className="space-y-3 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
            <h2 className="font-semibold text-neutral-950 dark:text-white">
              Photos ({review.photos.filter((p) => p.included).length} of {review.photos.length})
            </h2>
            {review.photos.length === 0 && <p className="text-sm text-neutral-500">No photos found.</p>}
            <div className="grid grid-cols-4 gap-3">
              {review.photos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePhoto(p.id)}
                  className={`relative overflow-hidden rounded-lg border-2 ${p.included ? "border-[#ffbb00]" : "border-transparent opacity-40"}`}
                >
                  <img src={p.url || ""} alt="" className="h-24 w-full object-cover" />
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
            <h2 className="font-semibold text-neutral-950 dark:text-white">Videos</h2>
            <ul className="space-y-2">
              {review.videos.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                  <span className="truncate">{v.title} — {v.url}</span>
                  <button type="button" onClick={() => removeVideo(v.id)} className="text-red-600 hover:underline">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input value={newVideoTitle} onChange={(e) => setNewVideoTitle(e.target.value)} placeholder="Title" className={inputClass} />
              <input value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} placeholder="Video URL" className={inputClass} />
              <button type="button" onClick={addVideo} className="flex-shrink-0 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950">
                Add
              </button>
            </div>
          </section>

          {review.awards.length > 0 && (
            <section className="space-y-3 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
              <h2 className="font-semibold text-neutral-950 dark:text-white">Awards</h2>
              <ul className="space-y-1.5">
                {review.awards.map((a, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={a.included} onChange={() => toggleAward(i)} />
                    <span className={a.included ? "" : "text-neutral-400 line-through"}>
                      {a.label} {a.year ? `· ${a.year}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <button
            type="button"
            onClick={save}
            disabled={step === "saving"}
            className="w-full rounded-xl bg-[#ffbb00] py-3 font-semibold text-black hover:brightness-95 disabled:opacity-50"
          >
            {step === "saving" ? "Saving…" : "Save Preview Locker"}
          </button>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
      {children}
    </label>
  );
}
