"use client";

import type { ReactNode } from "react";
import { FileText, Image as ImageIcon, Mic, PlayCircle, UserRound } from "lucide-react";
import { dayLabel, type MediaItem } from "./model";
import styles from "./lab.module.css";

const KIND_ICON: Record<MediaItem["kind"], ReactNode> = {
  video: <PlayCircle size={20} aria-hidden="true" />, interview: <Mic size={20} aria-hidden="true" />, article: <FileText size={20} aria-hidden="true" />,
  profile: <UserRound size={20} aria-hidden="true" />, photo: <ImageIcon size={20} aria-hidden="true" />, media: <ImageIcon size={20} aria-hidden="true" />,
};

export function MediaCard({ item, ghost = false, mini = false }: { item: MediaItem; ghost?: boolean; mini?: boolean }) {
  return <div className={styles.mediaCard} data-kind={item.kind} data-ghost={ghost} data-mini={mini}>
    <div className={styles.mediaThumb}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {item.imageUrl ? <img src={item.imageUrl} alt="" referrerPolicy="no-referrer" draggable={false} /> : item.origin === "getty" ? <img src="/images/getty-images-logo.svg" alt="" className={styles.gettyThumb} draggable={false} /> : KIND_ICON[item.kind]}
      {item.origin === "locker" || item.origin === "getty" ? <span className={styles.originBadge} data-origin={item.origin}>{item.origin === "getty" ? "Getty" : "Locker"}</span> : null}
    </div>
    {!mini && <div className={styles.mediaText}><strong>{item.title}</strong><span>{item.publisher}</span><small>{dayLabel(item.date) ?? "Undated"}</small></div>}
  </div>;
}
