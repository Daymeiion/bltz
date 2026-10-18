"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { extractPfrJerseys } from "@/lib/pipeline/scrapers/pfr-jerseys";
import type { JerseyHistory } from "@/lib/player/jersey-history";

export function PfrJerseyImport({ name, teams, initialUrl, onImport }: { name: string; teams: string[]; initialUrl: string; onImport: (items: JerseyHistory[]) => void }) {
  const [url, setUrl] = useState(initialUrl), [html, setHtml] = useState(""), [message, setMessage] = useState("");
  function read() {
    try {
      const items = extractPfrJerseys(html, name, teams, url);
      if (!items.length) { setMessage("No matching team-number badges found. Include the player's name and the jersey badge links from their PFR page."); return; }
      onImport(items); setHtml(""); setMessage(`${items.length} PFR team-number pairs compared with the available roster results. Review and save the draft.`);
    } catch { setMessage("Use the player's PFR profile URL and its jersey badge HTML."); }
  }
  return <details className="space-y-3 rounded-lg border p-4"><summary className="cursor-pointer font-semibold">Import PFR jersey badges</summary>
    <p className="text-sm">If automatic access to PFR is unavailable, paste the jersey badge HTML from the player page, including the player name. Only team numbers and colors are imported; the pasted HTML is discarded.</p>
    <label className="grid gap-2 text-sm">PFR player page<Input aria-label="PFR jersey source URL" value={url} maxLength={2048} onChange={event => setUrl(event.target.value)} /></label>
    <label className="grid gap-2 text-sm">Jersey badge HTML<Textarea aria-label="PFR jersey badge HTML" value={html} maxLength={100000} onChange={event => setHtml(event.target.value)} /></label>
    <Button type="button" variant="outline" disabled={!html.trim() || !url.trim()} onClick={read}>Compare PFR jersey badges</Button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </details>;
}
