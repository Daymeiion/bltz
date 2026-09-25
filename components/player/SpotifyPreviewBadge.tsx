"use client";

import { useEffect, useState } from "react";
import { VolumeX } from "lucide-react";
import Image from "next/image";
import styles from "./spotify-preview-badge.module.css";

/** A visual preview only. It never requests Spotify data or plays audio. */
export function SpotifyPreviewBadge() {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const timeout = window.setTimeout(() => setExpanded(false), 4500);
    return () => window.clearTimeout(timeout);
  }, [expanded]);

  return (
    <div className={styles.stack}>
      <button
        type="button"
        className={`${styles.badge} ${expanded ? styles.expanded : ""}`}
        aria-label="Spotify player preview. Show sample song"
        aria-expanded={expanded}
        aria-controls="spotify-preview-track"
        onClick={() => setExpanded(value => !value)}
      >
        <span className={styles.logo}>
          <Image src="/images/integrations/spotify.svg" alt="" width={28} height={28} />
        </span>
        <span className={styles.bars} aria-hidden="true"><i /><i /><i /></span>
        <span className={styles.details} id="spotify-preview-track" aria-hidden={!expanded}>
          <span className={styles.kicker}>SPOTIFY · PREVIEW</span>
          <span className={styles.track}>Game Day (sample)</span>
          <span className={styles.artist}>BLTZ Preview Artist</span>
        </span>
      </button>
      <button
        type="button"
        className={styles.mute}
        disabled
        aria-label="Spotify preview is muted; audio is unavailable"
        title="Audio available when Spotify launches"
      >
        <VolumeX size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </div>
  );
}
