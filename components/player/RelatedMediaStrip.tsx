"use client";

import { useEffect, useState } from "react";
import { Eye, Pause, Play } from "lucide-react";
import { GettyLicenseControl, gettyDetailUrl } from "./GettyLicenseControl";
import styles from "./related-media-strip.module.css";
import { useFilmRowScroll } from "./use-film-row-scroll";

export type RelatedMediaImage = { id: string; url: string; title: string; credits?: string | null; sourceUrl?: string | null };

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
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const { rowRef, groupRef, looping, paused, togglePaused, setModalOpen, rowEvents } = useFilmRowScroll();
  useEffect(() => {
    // Cached SSR images can finish loading before React attaches onLoad.
    const loaded = [...(rowRef.current?.querySelectorAll<HTMLImageElement>('button[aria-label^="Show related photo:"] img') ?? [])]
      .filter(image => image.complete && image.naturalWidth && image.naturalHeight);
    setRatios(current => {
      const updates = loaded.filter(image => current[image.getAttribute("src")!] !== image.naturalWidth / image.naturalHeight);
      if (!updates.length) return current;
      return { ...current, ...Object.fromEntries(updates.map(image => [image.getAttribute("src")!, image.naturalWidth / image.naturalHeight])) };
    });
  }, [images, rowRef]);
  const available = images.filter(image => !failed.includes(image.url));
  return <section className={styles.strip} aria-label="Related media" data-athlete-slug={athleteSlug} data-media-source="preview_upload" data-demo="true" data-context-image-id={activeImageId}>
    <div className={styles.stripHeader}>
      {available.some(image => gettyDetailUrl(image.sourceUrl)) && <p className={styles.powered}>Powered by Getty Images</p>}
      {available.length > 0 && <button type="button" className={styles.scrollToggle} onClick={togglePaused} aria-label={paused ? "Play photo row" : "Pause photo row"} title={paused ? "Play photo row" : "Pause photo row"} aria-pressed={paused}>{paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}</button>}
      {onResume && <button type="button" className={styles.resume} onClick={onResume} aria-label="Resume slideshow" title="Resume slideshow"><Play aria-hidden="true" fill="currentColor" /></button>}
    </div>
    <div ref={rowRef} {...rowEvents} className={styles.row} tabIndex={0} aria-label={`Related photos of ${athleteName}`}>
      {[false, true].map(repeated => <div key={String(repeated)} ref={repeated ? undefined : groupRef} className={styles.sequence} hidden={repeated && !looping} role="group" aria-label={repeated ? "Repeated photos for continuous scrolling" : "Career photos"}>
      {available.map(image => (
          <div key={image.id} style={{ aspectRatio: ratios[image.url] || 280 / 172 }} className={`${styles.image} ${ratios[image.url] < 1.1 ? styles.imageNarrow : ""} ${image.id === activeImageId ? styles.imageActive : ""}`}>
            <button type="button" tabIndex={repeated ? -1 : undefined} className={styles.imageSelect} aria-label={`Show related photo: ${image.title || athleteName}${repeated ? " (loop)" : ""}`} aria-pressed={image.id === activeImageId} title={[image.title, image.credits].filter(Boolean).join(" · ")} onClick={() => onSelect(image)}>
              <img src={image.url} alt={image.title || `${athleteName} career photo`} loading="lazy" onLoad={event => {
                const { naturalWidth, naturalHeight } = event.currentTarget;
                if (naturalWidth && naturalHeight) setRatios(current => ({ ...current, [image.url]: naturalWidth / naturalHeight }));
              }} onError={() => setFailed(current => current.includes(image.url) ? current : [...current, image.url])} />
            </button>
            <button type="button" tabIndex={repeated ? -1 : undefined} className={`${styles.imageAction} ${styles.viewAction}`} aria-label={`View in slideshow: ${image.title || athleteName}${repeated ? " (loop)" : ""}`} title="View in slideshow" onClick={() => onSelect(image)}>
              <Eye aria-hidden="true" />
            </button>
            <GettyLicenseControl image={image} athleteName={athleteName} repeated={repeated} onOpenChange={setModalOpen} />
          </div>
      ))}
      </div>)}
      {!available.length && <p>Related photos will appear here when available.</p>}
    </div>
  </section>;
}
