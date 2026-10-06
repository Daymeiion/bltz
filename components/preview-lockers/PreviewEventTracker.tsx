"use client";

import { useEffect } from "react";
import { trackPreviewEvent, type PreviewEventName } from "@/lib/analytics/preview-client";

type ViewEvent = Extract<PreviewEventName, "locker_view" | "photos_view" | "film_view" | "video_open">;

/** Rendered only after the route's existing preview reader authorizes the record. */
export default function PreviewEventTracker({ previewId, eventName, assetId }: {
  previewId: string;
  eventName: ViewEvent;
  assetId?: string;
}) {
  useEffect(() => {
    const track = () => { void trackPreviewEvent({ previewId, eventName, assetId }); };
    track();
    document.addEventListener("visibilitychange", track);
    window.addEventListener("online", track);
    return () => {
      document.removeEventListener("visibilitychange", track);
      window.removeEventListener("online", track);
    };
  }, [previewId, eventName, assetId]);
  return null;
}
