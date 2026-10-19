"use client";

import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Eye, ExternalLink, KeyRound, Pause, Play, X } from "lucide-react";
import { Dialog, DialogClose, DialogDescription, DialogPortal, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import styles from "./related-media-strip.module.css";
import { useFilmRowScroll } from "./use-film-row-scroll";

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
  const searchName = athleteName.trim().toLowerCase().replace(/\s+/g, "-");
  const gettySearchUrl = `https://www.gettyimages.com/photos/${encodeURIComponent(searchName)}`;
  return <section className={styles.strip} aria-label="Related media" data-athlete-slug={athleteSlug} data-media-source="preview_upload" data-demo="true" data-context-image-id={activeImageId}>
    <div className={styles.stripHeader}>
      <p className={styles.powered}>Powered by Getty Images</p>
      {available.length > 0 && <button type="button" className={styles.scrollToggle} onClick={togglePaused} aria-label={paused ? "Play photo row" : "Pause photo row"} title={paused ? "Play photo row" : "Pause photo row"} aria-pressed={paused}>{paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}</button>}
      {onResume && <button type="button" className={styles.resume} onClick={onResume} aria-label="Resume slideshow" title="Resume slideshow"><Play aria-hidden="true" fill="currentColor" /></button>}
    </div>
    <div ref={rowRef} {...rowEvents} className={styles.row} tabIndex={0} aria-label={`Related photos of ${athleteName}`}>
      {[false, true].map(repeated => <div key={String(repeated)} ref={repeated ? undefined : groupRef} className={styles.sequence} hidden={repeated && !looping} role="group" aria-label={repeated ? "Repeated photos for continuous scrolling" : "Career photos"}>
      {available.map(image => (
        <Dialog key={image.id} onOpenChange={setModalOpen}>
          <div style={{ aspectRatio: ratios[image.url] || 280 / 172 }} className={`${styles.image} ${ratios[image.url] < 1.1 ? styles.imageNarrow : ""} ${image.id === activeImageId ? styles.imageActive : ""}`}>
            <button type="button" tabIndex={repeated ? -1 : undefined} className={styles.imageSelect} aria-label={`Show related photo: ${image.title || athleteName}${repeated ? " (loop)" : ""}`} aria-pressed={image.id === activeImageId} title={[image.title, image.credits].filter(Boolean).join(" · ")} onClick={() => onSelect(image)}>
              <img src={image.url} alt={image.title || `${athleteName} career photo`} loading="lazy" onLoad={event => {
                const { naturalWidth, naturalHeight } = event.currentTarget;
                if (naturalWidth && naturalHeight) setRatios(current => ({ ...current, [image.url]: naturalWidth / naturalHeight }));
              }} onError={() => setFailed(current => current.includes(image.url) ? current : [...current, image.url])} />
            </button>
            <button type="button" tabIndex={repeated ? -1 : undefined} className={`${styles.imageAction} ${styles.viewAction}`} aria-label={`View in slideshow: ${image.title || athleteName}${repeated ? " (loop)" : ""}`} title="View in slideshow" onClick={() => onSelect(image)}>
              <Eye aria-hidden="true" />
            </button>
            <DialogTrigger asChild>
              <button type="button" tabIndex={repeated ? -1 : undefined} className={`${styles.imageAction} ${styles.licenseAction}`} aria-label={`Explore Getty Images licensing: ${image.title || athleteName}${repeated ? " (loop)" : ""}`} title="Explore licensing on Getty Images">
                <img className={styles.gettyLogo} src="/images/getty-images-logo.svg" alt="" aria-hidden="true" />
                <KeyRound aria-hidden="true" />
              </button>
            </DialogTrigger>
          </div>
          <DialogPortal>
            <DialogPrimitive.Overlay className={styles.licenseBackdrop} />
            <DialogPrimitive.Content className={styles.licenseModal} aria-modal="true">
              <DialogClose className={styles.modalClose} aria-label="Close Getty Images licensing">
                <X aria-hidden="true" />
              </DialogClose>
              <div className={styles.modalBrand}>
                <img src="/images/getty-images-logo.svg" alt="Getty Images" />
                <span>LICENSING SHOWCASE</span>
              </div>
              <img className={styles.modalPhoto} src={image.url} alt={image.title || `${athleteName} career photo`} />
              <DialogTitle className={styles.modalTitle}>License with Getty Images</DialogTitle>
              <DialogDescription className={styles.modalDescription}>
                Explore photos of {athleteName}. Choose an image and review its licensing options on Getty Images.
              </DialogDescription>
              <a className={styles.gettyLink} href={gettySearchUrl} target="_blank" rel="noopener noreferrer">
                Explore on Getty Images <ExternalLink aria-hidden="true" />
                <span className={styles.srOnly}> (opens in a new tab)</span>
              </a>
              <p className={styles.modalNote}>Showcase preview · Opens athlete search results. Image availability and licensing are confirmed on Getty Images.</p>
            </DialogPrimitive.Content>
          </DialogPortal>
        </Dialog>
      ))}
      </div>)}
      {!available.length && <p>Related photos will appear here when available.</p>}
    </div>
  </section>;
}
