"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ExternalLink, KeyRound, X } from "lucide-react";
import { Dialog, DialogClose, DialogDescription, DialogPortal, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import styles from "./related-media-strip.module.css";

export type GettyLicenseImage = { id: string; url: string; title: string; sourceUrl?: string | null };

function gettyDetailUrl(sourceUrl: string | null | undefined) {
  if (!sourceUrl) return null;
  try {
    const url = new URL(sourceUrl);
    return url.protocol === "https:" && url.hostname === "www.gettyimages.com" &&
      !url.username && !url.password && !url.port &&
      /^\/detail\/(?:news-photo\/[^/]+\/|photo\/[^/]+\/)?\d+\/?$/.test(url.pathname)
      ? url.href : null;
  } catch {
    return null;
  }
}

/** External licensing handoff only; a source link does not establish usage rights. */
export function GettyLicenseControl({ image, athleteName, repeated = false, onOpenChange }: {
  image: GettyLicenseImage;
  athleteName: string;
  repeated?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const detailUrl = gettyDetailUrl(image.sourceUrl);
  const searchName = athleteName.trim().toLowerCase().replace(/\s+/g, "-");
  const gettySearchUrl = `https://www.gettyimages.com/photos/${encodeURIComponent(searchName)}`;
  return <Dialog onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
              <button type="button" tabIndex={repeated ? -1 : undefined} className={`${styles.imageAction} ${styles.licenseAction}`} aria-label={`Explore Getty Images licensing: ${image.title || athleteName}${repeated ? " (loop)" : ""}`} title="Explore licensing on Getty Images">
                <img className={styles.gettyLogo} src="/images/getty-images-logo.svg" alt="" aria-hidden="true" />
                <KeyRound aria-hidden="true" />
              </button>
            </DialogTrigger>
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
                {detailUrl ? "View this photo and review its licensing options on Getty Images." : <>Explore photos of {athleteName}. Choose an image and review its licensing options on Getty Images.</>}
              </DialogDescription>
              <a className={styles.gettyLink} href={detailUrl || gettySearchUrl} target="_blank" rel="noopener noreferrer">
                {detailUrl ? "View this photo on Getty Images" : "Explore on Getty Images"} <ExternalLink aria-hidden="true" />
                <span className={styles.srOnly}> (opens in a new tab)</span>
              </a>
              <p className={styles.modalNote}>{detailUrl ? "Opens this photo’s Getty Images page. Image availability and licensing are confirmed on Getty Images." : "Showcase preview · Opens athlete search results. Image availability and licensing are confirmed on Getty Images."}</p>
            </DialogPrimitive.Content>
          </DialogPortal>
  </Dialog>;
}
