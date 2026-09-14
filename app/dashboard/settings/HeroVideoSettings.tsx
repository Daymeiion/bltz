"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Settings = { mobile: string | null; desktop: string | null; videos: { id: string; title: string }[] };
export default function HeroVideoSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    void fetch("/api/locker/hero-videos", { signal: abort.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSettings(data);
    }).catch(error => { if (!abort.signal.aborted) setMessage(error.message || "Unable to load hero videos."); });
    return () => abort.abort();
  }, []);
  async function save() {
    if (!settings) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/locker/hero-videos", { method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: settings.mobile, desktop: settings.desktop }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage("Hero videos saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save hero videos."); }
    finally { setBusy(false); }
  }
  return <Card><CardHeader><CardTitle>Locker hero videos</CardTitle><CardDescription>Choose a portrait video for mobile and a landscape video for larger screens. Your photo slideshow fills devices without a video selection.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      {!settings && !message && <p role="status">Loading hero videos…</p>}
      {settings && <>
        {(["mobile", "desktop"] as const).map(device => <label key={device} className="grid gap-2 text-sm font-medium">
          {device === "mobile" ? "Mobile · portrait (9:16)" : "Desktop and tablet · landscape (16:9)"}
          <select className="w-full rounded-md border bg-background p-3" disabled={busy} value={settings[device] ?? ""}
            onChange={event => setSettings({ ...settings, [device]: event.target.value || null })}>
            <option value="">Photo slideshow</option>
            {settings.videos.map(video => <option key={video.id} value={video.id}>{video.title}</option>)}
          </select>
        </label>)}
        <p className="text-sm text-muted-foreground">Select a video with the matching orientation. Only your existing public playable videos appear here.</p>
        {!settings.videos.length && <p>No eligible videos yet. Add videos to your Locker first.</p>}
        <Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save hero videos"}</Button>
      </>}
      {message && <p role="status" className="text-sm">{message}</p>}
    </CardContent></Card>;
}
