"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Eye,
  Film,
  Link2,
  Play,
  Search,
  Share2,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import type { PublicVideo, PublicVideoLevel } from "@/lib/player/public-video";
import styles from "./video-detail.module.css";

export type VideoDetailData = {
  slug: string;
  athleteName: string;
  athleteHeadshotUrl: string;
  accentColor: string;
  video: PublicVideo;
  videos: PublicVideo[];
  views: number;
  likes: number;
};

const LEVELS: { key: PublicVideoLevel; label: string }[] = [
  { key: "hs", label: "High School" },
  { key: "cfb", label: "Collegiate" },
  { key: "pro", label: "Professional" },
  { key: "off-field", label: "Off the Field" },
];

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds < 0) return "--:--";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function formatDate(value: string | null): string {
  if (!value) return "Date pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date pending";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatViews(views: number): string {
  return new Intl.NumberFormat("en-US", { notation: views >= 10_000 ? "compact" : "standard" }).format(views);
}

function formatTitle(title: string): string {
  if (title !== title.toUpperCase()) return title;
  return title
    .toLocaleLowerCase()
    .replace(/(^|\s|[-/])\p{L}/gu, (letter) => letter.toLocaleUpperCase());
}

function VideoListItem({ video, slug, current }: { video: PublicVideo; slug: string; current: boolean }) {
  return (
    <Link
      href={`/player/${slug}/videos/${video.id}`}
      className={`${styles.episode} ${current ? styles.episodeActive : ""}`}
      aria-current={current ? "page" : undefined}
    >
      <span className={styles.episodeThumb}>
        {video.thumbnailUrl ? (
          <Image src={video.thumbnailUrl} alt="" fill sizes="110px" />
        ) : (
          <span className={styles.episodeFallback}><Play aria-hidden="true" fill="currentColor" /></span>
        )}
      </span>
      <span className={styles.episodeCopy}>
        <strong>{video.title}</strong>
        <small>{formatDuration(video.durationSeconds)} · {video.season ?? "Archive"}</small>
      </span>
    </Link>
  );
}

export default function VideoDetailView({ data }: { data: VideoDetailData }) {
  const [copied, setCopied] = useState(false);
  const [titleScrollDistance, setTitleScrollDistance] = useState(0);
  const titleViewportRef = useRef<HTMLDivElement>(null);
  const titleTrackRef = useRef<HTMLDivElement>(null);
  const grouped = useMemo(
    () => LEVELS.map((level) => ({
      ...level,
      videos: data.videos.filter((video) => video.level === level.key),
    })).filter((level) => level.videos.length > 0),
    [data.videos],
  );

  async function copyShareLink() {
    await navigator.clipboard.writeText(window.location.href).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const description =
    data.video.description ||
    `This film is part of ${data.athleteName}'s verified public BLTZ archive. Additional context will appear as it is approved.`;

  useEffect(() => {
    const viewport = titleViewportRef.current;
    const track = titleTrackRef.current;
    if (!viewport || !track) return;

    const measureTitle = () => {
      setTitleScrollDistance(Math.max(0, track.scrollWidth - viewport.clientWidth));
    };
    const observer = new ResizeObserver(measureTitle);
    observer.observe(viewport);
    observer.observe(track);
    measureTitle();
    return () => observer.disconnect();
  }, [data.video.title, data.video.durationSeconds]);

  return (
    <main className={styles.page} style={{ "--video-accent": data.accentColor } as React.CSSProperties}>
      <header className={styles.header}>
        <Link href={`/player/${data.slug}`} className={styles.brand} aria-label={`${data.athleteName} Player Locker`}>
          <Image src="/images/bltz-mark.svg" alt="BLTZ" width={44} height={46} priority />
        </Link>
        <nav className={styles.headerNav} aria-label="Film navigation">
          <Link href={`/player/${data.slug}`}>Locker</Link>
          <Link href={`/player/${data.slug}/videos`}>Film Room</Link>
        </nav>
        <div className={styles.headerActions}>
          <Link href={`/player/${data.slug}/videos`} className={styles.searchAction} aria-label="Browse Film Room">
            <Search aria-hidden="true" />
          </Link>
          <Link href={`/player/${data.slug}`} className={styles.avatar} aria-label={`View ${data.athleteName}'s Locker`}>
            <Image src={data.athleteHeadshotUrl} alt="" fill sizes="40px" />
          </Link>
        </div>
      </header>

      <div className={styles.shell}>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href={`/player/${data.slug}`}>{data.athleteName}</Link>
          <span>/</span>
          <Link href={`/player/${data.slug}/videos`}>Film Room</Link>
          <span>/</span>
          <span>{data.video.title}</span>
        </nav>

        <div className={styles.layout}>
          <div className={styles.primary}>
            <section className={styles.player} aria-label={`${data.video.title} video player`}>
              {data.video.playbackUrl ? (
                <video
                  src={data.video.playbackUrl}
                  poster={data.video.thumbnailUrl ?? undefined}
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : data.video.thumbnailUrl ? (
                <Image src={data.video.thumbnailUrl} alt="" fill priority sizes="(max-width: 900px) 100vw, 820px" />
              ) : (
                <div className={styles.playerFallback}>
                  <Film aria-hidden="true" />
                  <span>Playback source pending</span>
                </div>
              )}
              <span className={styles.playerShade} aria-hidden="true" />
              <div className={styles.playerTools}>
                <span>{data.video.sourceLabel}</span>
                <button type="button" onClick={copyShareLink} aria-label="Copy video share link">
                  {copied ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
                </button>
              </div>
            </section>

            <section className={styles.videoInfo}>
              <div className={styles.titleRow}>
                <div className={styles.titleViewport} ref={titleViewportRef}>
                  <div
                    ref={titleTrackRef}
                    className={`${styles.titleTrack} ${titleScrollDistance > 0 ? styles.titleTrackScrolling : ""}`}
                    style={{ "--title-scroll-distance": `${titleScrollDistance}px` } as React.CSSProperties}
                  >
                    <h1>{formatTitle(data.video.title)}</h1>
                    <span>{formatDuration(data.video.durationSeconds)}</span>
                  </div>
                </div>
                <button type="button" className={styles.followButton}>Following</button>
              </div>
              <div className={styles.metadataRow}>
                <div className={styles.publicationMeta}>
                  <span>Published on {formatDate(data.video.publishedAt)}</span>
                </div>
                <div className={styles.engagementMeta}>
                  <span><Eye aria-hidden="true" />{formatViews(data.views)} viewers</span>
                  <button type="button" aria-label="Like this video">
                    <ThumbsUp aria-hidden="true" />
                    {data.likes > 0 ? `${formatViews(data.likes)} Liked` : "Like"}
                  </button>
                  <button type="button" aria-label="Dislike this video">
                    <ThumbsDown aria-hidden="true" />
                    Dislike
                  </button>
                </div>
              </div>
              <p className={styles.description}>{description}</p>
            </section>

            <section className={styles.conversation}>
              <strong>Player conversation</strong>
              <p>Comments and reactions will appear here when the verified community feature is available.</p>
            </section>
          </div>

          <aside className={styles.sidebar} aria-label="Player film archive">
            <div className={styles.archive}>
              {grouped.map((group) => (
                <details key={group.key} open={group.videos.some((video) => video.id === data.video.id)}>
                  <summary>
                    <span>{group.label}</span>
                    <small>{group.videos.length} {group.videos.length === 1 ? "video" : "videos"}</small>
                    <ChevronDown aria-hidden="true" />
                  </summary>
                  <div className={styles.episodeList}>
                    {group.videos.map((video) => (
                      <VideoListItem key={video.id} video={video} slug={data.slug} current={video.id === data.video.id} />
                    ))}
                  </div>
                </details>
              ))}
            </div>

            <section className={styles.shareCard}>
              <h2>Share this film</h2>
              <p>Send this verified Player Locker link without losing the athlete attribution.</p>
              <button type="button" onClick={copyShareLink}>
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                {copied ? "Link copied" : "Copy link"}
              </button>
            </section>

            {data.video.tags.length > 0 && (
              <section className={styles.tagCard}>
                <h2>Tags</h2>
                <div>{data.video.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
              </section>
            )}

            <Link href={`/player/${data.slug}/videos`} className={styles.backLink}>
              <Link2 aria-hidden="true" />
              View full Film Room
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
