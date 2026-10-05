"use client";

import { useState } from "react";
import styles from "./related-media-strip.module.css";

export type RelatedMediaImage = { id: string; url: string; title: string; credits?: string | null };

/** Provider demo: only already authorized images from this athlete's preview. */
export function RelatedMediaStrip({ images, athleteName, athleteSlug, activeImageId, onSelect, onResume }: {
  images: RelatedMediaImage[];
  athleteName: string;
  athleteSlug: string;
  activeImageId?: string;
  onSelect: (image: RelatedMediaImage) => void;
  onResume?: () => void;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const available = images.filter(image => !failed.includes(image.url));
  return <section className={styles.strip} aria-label="Related media" data-athlete-slug={athleteSlug} data-media-source="preview_upload" data-demo="true" data-context-image-id={activeImageId}>
    <div className={styles.heading}>
      <h2>Related Media</h2>
      <span>Demo · uploaded photos</span>
      {onResume && <button type="button" onClick={onResume}>Resume slideshow</button>}
    </div>
    <div className={styles.row} tabIndex={0} aria-label={`Related photos of ${athleteName}`}>
      {available.map(image => <button type="button" key={image.id} className={styles.image} aria-label={`Show related photo: ${image.title || athleteName}`} aria-pressed={image.id === activeImageId} title={[image.title, image.credits].filter(Boolean).join(" · ")} onClick={() => onSelect(image)}>
        <img src={image.url} alt={image.title || `${athleteName} career photo`} loading="lazy" onError={() => setFailed(current => [...current, image.url])} />
      </button>)}
      {!available.length && <p>Related photos will appear here when available.</p>}
    </div>
    <p className={styles.powered}>Powered by Getty Images</p>
  </section>;
}
