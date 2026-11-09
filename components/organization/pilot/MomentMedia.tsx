"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconPlus, IconX } from "@tabler/icons-react";
import type { GettyResult } from "@/lib/getty/search";
import type { AthleteFile, PilotAthleteMedia } from "@/lib/enterprise-crm/pilot/types";
import { MediaAttach, MediaThumb, type PendingMedia } from "./MediaAttach";

type Moment = AthleteFile["moments"][number];
type Suggestions = { state: "loading" | "ready" | "not_configured" | "unavailable"; images: GettyResult[] };

const PREVIEW_SUGGESTIONS: GettyResult[] = Array.from({ length: 6 }, (_, index) => ({
  id: `91000${index}`, title: `Sample Getty editorial photo ${index + 1}`, caption: null, date: `2016-11-0${index + 1}`, artist: "Getty Images",
  collection: null, thumb: "", comp: null, detailUrl: `https://www.gettyimages.com/detail/91000${index}`,
}));

/** Photos from the Moment's own year first; Getty returns the athlete's whole career. */
export function rankForMoment(images: readonly GettyResult[], momentDate: string | null): GettyResult[] {
  const year = momentDate?.slice(0, 4) ?? null;
  return [...images].sort((a, b) => Number(Boolean(year && b.date?.startsWith(year))) - Number(Boolean(year && a.date?.startsWith(year))));
}

/**
 * Media for one Moment: what is already tied to it, the school's archive for this
 * player in one click, and Getty Images suggestions searched for the athlete, so
 * staff rarely have to search for visuals themselves.
 */
export function MomentMedia({ moment, media, organizationId, playerId, playerName, preview, canManage, onAdd, onLink }: {
  moment: Moment;
  media: readonly PilotAthleteMedia[];
  organizationId: string;
  playerId: string;
  playerName: string;
  preview: boolean;
  canManage: boolean;
  onAdd: (item: PendingMedia & { momentId: string }) => Promise<boolean>;
  onLink: (mediaId: string, momentId: string | null) => Promise<boolean>;
}) {
  const linked = media.filter((item) => item.momentId === moment.id);
  const archive = media.filter((item) => !item.momentId && (item.kind === "image" || item.kind === "highlight")).slice(0, 6);
  const [suggested, setSuggested] = useState<Suggestions>({ state: canManage ? "loading" : "ready", images: [] });
  const [busy, setBusy] = useState<string | null>(null);
  const added = new Set(linked.flatMap((item) => item.source === "getty" && item.url ? [item.url] : []));

  useEffect(() => {
    if (!canManage) return;
    let live = true;
    (async () => {
      if (preview) { await Promise.resolve(); if (live) setSuggested({ state: "ready", images: rankForMoment(PREVIEW_SUGGESTIONS, moment.date) }); return; }
      try {
        const response = await fetch(`/api/organization/${organizationId}/getty?${new URLSearchParams({ q: playerName })}`, { credentials: "same-origin", cache: "no-store" });
        const body = await response.json() as Suggestions;
        if (live) setSuggested(body.state === "ready" ? { state: "ready", images: rankForMoment(body.images, moment.date).slice(0, 6) } : { state: body.state === "not_configured" ? "not_configured" : "unavailable", images: [] });
      } catch {
        if (live) setSuggested({ state: "unavailable", images: [] });
      }
    })();
    return () => { live = false; };
  }, [canManage, preview, organizationId, playerName, moment.date]);

  async function run(key: string, action: () => Promise<boolean>) {
    setBusy(key);
    await action();
    setBusy(null);
  }

  const addGetty = (image: GettyResult) => run(image.id, () => onAdd({
    key: `getty-${image.id}`, kind: "image", title: image.title.slice(0, 200), url: image.detailUrl, source: "getty", storagePath: null,
    thumbUrl: image.thumb || null, externalId: image.id, momentId: moment.id,
  }));

  return (
    <div className="pilot-moment-media">
      <h4>Media for this Moment{linked.length ? ` (${linked.length})` : ""}</h4>
      {linked.length ? (
        <ul className="pilot-media-strip pilot-media-strip--edit">
          {linked.map((item) => (
            <li key={item.id}>
              {item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" title={item.title}><MediaThumb item={item} /></a> : <span title={item.title}><MediaThumb item={item} /></span>}
              {canManage ? <button type="button" className="pilot-media-strip__remove" aria-label={`Remove ${item.title} from this Moment`} disabled={busy === item.id} onClick={() => void run(item.id, () => onLink(item.id, null))}><IconX stroke={1.5} aria-hidden /></button> : null}
            </li>
          ))}
        </ul>
      ) : <p className="pilot-quiet">Nothing tied to this Moment yet. Pick from the suggestions below; it comes along when you plan from this Moment.</p>}

      {canManage && archive.length ? (
        <div className="pilot-moment-media__group">
          <h5>From your archive</h5>
          <ul className="pilot-suggest-grid">
            {archive.map((item) => (
              <li key={item.id}>
                <button type="button" className="pilot-suggest" disabled={busy === item.id} onClick={() => void run(item.id, () => onLink(item.id, moment.id))} aria-label={`Add ${item.title} to this Moment`}>
                  <MediaThumb item={item} />
                  <span>{item.title}</span>
                  <i aria-hidden><IconPlus stroke={1.8} /></i>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canManage ? (
        <div className="pilot-moment-media__group">
          <h5>Suggested from Getty Images</h5>
          {suggested.state === "loading" ? <p className="pilot-quiet">Finding photos of {playerName}…</p>
            : suggested.state === "not_configured" ? <p className="pilot-quiet">Getty Images search is not connected yet.</p>
            : suggested.state === "unavailable" ? <p className="pilot-quiet">Getty Images did not answer. Try the search button below.</p>
            : suggested.images.length ? (
              <ul className="pilot-suggest-grid">
                {suggested.images.map((image) => {
                  const done = added.has(image.detailUrl);
                  return (
                    <li key={image.id}>
                      <button type="button" className="pilot-suggest" disabled={done || busy === image.id} onClick={() => void addGetty(image)} aria-label={done ? `${image.title} is on this Moment` : `Add ${image.title} to this Moment`}>
                        <MediaThumb item={{ kind: "image", source: "getty", thumbUrl: image.thumb || null }} />
                        <span>{image.title}{image.date ? <small>{image.date.slice(0, 4)}</small> : null}</span>
                        <i aria-hidden>{done ? <IconCheck stroke={1.8} /> : <IconPlus stroke={1.8} />}</i>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="pilot-quiet">No Getty Images photos found for {playerName}.</p>}
          <MediaAttach organizationId={organizationId} playerId={playerId} athleteName={playerName} preview={preview}
            onAdd={(items) => { for (const item of items) void onAdd({ ...item, momentId: moment.id }); }} />
        </div>
      ) : null}
    </div>
  );
}
