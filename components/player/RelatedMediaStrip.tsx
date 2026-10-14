"use client";

import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Eye, ExternalLink, KeyRound, Play, X } from "lucide-react";
import { Dialog, DialogClose, DialogDescription, DialogPortal, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  const searchName = athleteName.trim().toLowerCase().replace(/\s+/g, "-");
  const gettySearchUrl = `https://www.gettyimages.com/photos/${encodeURIComponent(searchName)}`;
  return <section className={styles.strip} aria-label="Related media" data-athlete-slug={athleteSlug} data-media-source="preview_upload" data-demo="true" data-context-image-id={activeImageId}>
    <div className={styles.stripHeader}>
      <p className={styles.powered}>Powered by Getty Images</p>
      {onResume && <button type="button" className={styles.resume} onClick={onResume} aria-label="Resume slideshow" title="Resume slideshow"><Play aria-hidden="true" fill="currentColor" /></button>}
    </div>
    <div className={styles.row} tabIndex={0} aria-label={`Related photos of ${athleteName}`}>
      {available.map(image => (
        <Dialog key={image.id}>
          <div className={`${styles.image} ${image.id === activeImageId ? styles.imageActive : ""}`}>
            <button type="button" className={styles.imageSelect} aria-label={`Show related photo: ${image.title || athleteName}`} aria-pressed={image.id === activeImageId} title={[image.title, image.credits].filter(Boolean).join(" · ")} onClick={() => onSelect(image)}>
              <img src={image.url} alt={image.title || `${athleteName} career photo`} loading="lazy" onError={() => setFailed(current => current.includes(image.url) ? current : [...current, image.url])} />
            </button>
            <button type="button" className={`${styles.imageAction} ${styles.viewAction}`} aria-label={`View in slideshow: ${image.title || athleteName}`} title="View in slideshow" onClick={() => onSelect(image)}>
              <Eye aria-hidden="true" />
            </button>
            <DialogTrigger asChild>
              <button type="button" className={`${styles.imageAction} ${styles.licenseAction}`} aria-label={`Explore Getty Images licensing: ${image.title || athleteName}`} title="Explore licensing on Getty Images">
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
      {!available.length && <p>Related photos will appear here when available.</p>}
    </div>
  </section>;
}
