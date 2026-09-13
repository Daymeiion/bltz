"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import type { PreviewVideo } from "@/lib/preview-lockers/types";

type Record_ = {
  id: string;
  slug: string;
  full_name: string;
  bio: string;
  athlete_quote: string | null;
  athlete_quote_author: string | null;
  headshot_url: string | null;
  hero_video_url: string | null;
  videos: PreviewVideo[];
};

function youtubeThumb(url: string): string | null {
  const m =
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{6,})/.exec(url);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}

export function EditPreviewLockerForm({ record }: { record: Record_ }) {
  const router = useRouter();
  const [bio, setBio] = React.useState(record.bio || "");
  const [quote, setQuote] = React.useState(record.athlete_quote || "");
  const [quoteAuthor, setQuoteAuthor] = React.useState(record.athlete_quote_author || "");
  const [headshotUrl, setHeadshotUrl] = React.useState(record.headshot_url || "");
  const [heroVideoUrl, setHeroVideoUrl] = React.useState(record.hero_video_url || "");
  const [videos, setVideos] = React.useState<PreviewVideo[]>(record.videos || []);
  const [newTitle, setNewTitle] = React.useState("");
  const [newUrl, setNewUrl] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function addVideo() {
    if (!newTitle.trim() || !newUrl.trim()) return;
    setVideos((prev) => [
      ...prev,
      { id: `video-${Date.now()}`, title: newTitle.trim(), url: newUrl.trim(), thumb: youtubeThumb(newUrl.trim()) },
    ]);
    setNewTitle("");
    setNewUrl("");
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/preview-lockers/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio,
          athlete_quote: quote || null,
          athlete_quote_author: quoteAuthor || null,
          headshot_url: headshotUrl || null,
          hero_video_url: heroVideoUrl || null,
          videos,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push("/admin/preview-lockers");
      router.refresh();
    } catch {
      setError("Couldn't save changes. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
        <Field label="Headshot URL">
          <input value={headshotUrl} onChange={(e) => setHeadshotUrl(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Hero video URL">
          <input value={heroVideoUrl} onChange={(e) => setHeroVideoUrl(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Bio">
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} className={`${inputClass} h-28`} />
        </Field>
        <Field label="Athlete quote">
          <textarea value={quote} onChange={(e) => setQuote(e.target.value)} className={`${inputClass} h-20`} />
        </Field>
        <Field label="Quote author">
          <input value={quoteAuthor} onChange={(e) => setQuoteAuthor(e.target.value)} className={inputClass} />
        </Field>
      </section>

      <section className="space-y-3 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
        <h2 className="font-semibold text-neutral-950 dark:text-white">Videos</h2>
        <ul className="space-y-2">
          {videos.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
              <span className="truncate">{v.title} — {v.url}</span>
              <button type="button" onClick={() => setVideos((prev) => prev.filter((x) => x.id !== v.id))} className="text-red-600 hover:underline">
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title" className={inputClass} />
          <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="Video URL" className={inputClass} />
          <button type="button" onClick={addVideo} className="flex-shrink-0 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950">
            Add
          </button>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-[#ffbb00] px-6 py-3 font-semibold text-black hover:brightness-95 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <Link href={`/preview-lockers/${record.slug}`} target="_blank" className="text-sm text-neutral-500 hover:underline">
          View live preview →
        </Link>
      </div>
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
