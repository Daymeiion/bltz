"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Eye,
  Film,
  Link2,
  Maximize,
  Minimize,
  Pause,
  Play,
  Search,
  Share2,
  ThumbsUp,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { PublicVideo, PublicVideoLevel } from "@/lib/player/public-video";
import { createClient } from "@/lib/supabase/client";
import { trackProductEvent } from "@/lib/analytics/client";
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
  taggedTeammates: TaggedTeammate[];
  playerId: string | null;
  isFollowing: boolean;
};

export type TaggedTeammate = {
  id: string;
  name: string;
  headshotUrl: string | null;
  position: string | null;
  team: string | null;
};

const LEVELS: { key: PublicVideoLevel; label: string }[] = [
  { key: "hs", label: "High School" },
  { key: "cfb", label: "Collegiate" },
  { key: "pro", label: "Professional" },
  { key: "off-field", label: "Off the Field" },
];

function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "--:--";
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

function teammateInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
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
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [titleScrollDistance, setTitleScrollDistance] = useState(0);
  const [publicationScrollDistance, setPublicationScrollDistance] = useState(0);
  const [activeTeammateId, setActiveTeammateId] = useState<string | null>(null);
  const [hoveredTeammateId, setHoveredTeammateId] = useState<string | null>(null);
  const [teammateMarqueeNeeded, setTeammateMarqueeNeeded] = useState(false);
  const [teammateMarqueeInView, setTeammateMarqueeInView] = useState(false);
  const [teammateMarqueeDistance, setTeammateMarqueeDistance] = useState(0);
  const [playerControlsActive, setPlayerControlsActive] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(data.video.durationSeconds ?? 0);
  const [following, setFollowing] = useState(data.isFollowing);
  const [followPending, setFollowPending] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const titleViewportRef = useRef<HTMLDivElement>(null);
  const titleTrackRef = useRef<HTMLDivElement>(null);
  const publicationViewportRef = useRef<HTMLDivElement>(null);
  const publicationTrackRef = useRef<HTMLSpanElement>(null);
  const teammateViewportRef = useRef<HTMLDivElement>(null);
  const teammateGroupRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const grouped = useMemo(
    () => LEVELS.map((level) => ({
      ...level,
      videos: data.videos.filter((video) => video.level === level.key),
    })).filter((level) => level.videos.length > 0),
    [data.videos],
  );

  useEffect(() => {
    void trackProductEvent({
      eventName: "media_viewed",
      source: "public_locker",
      athleteId: data.playerId,
      properties: { media_id: data.video.id, media_type: "video", section: "video_detail" },
      dedupeKey: `media_viewed:video:${data.video.id}`,
    });
  }, [data.playerId, data.slug, data.video.id]);

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      void trackProductEvent({
        eventName: "share_link_copied",
        source: "public_locker",
        athleteId: data.playerId,
        properties: { surface: "locker_share_modal" },
      });
      void trackProductEvent({
        eventName: "locker_shared",
        source: "public_locker",
        athleteId: data.playerId,
        properties: { mechanism: "clipboard" },
      });
    } catch {
      // Clipboard permission failures must not interrupt video playback.
    }
  }

  async function toggleFollow() {
    if (followPending) return;
    if (!data.playerId) {
      setFollowing((current) => !current);
      return;
    }

    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) {
      const next = `${window.location.pathname}${window.location.search}`;
      router.push(`/auth/login?next=${encodeURIComponent(next)}`);
      return;
    }

    const previous = following;
    setFollowing(!previous);
    setFollowPending(true);
    const result = previous
      ? await supabase
          .from("player_follows")
          .delete()
          .eq("user_id", user.id)
          .eq("player_id", data.playerId)
      : await supabase
          .from("player_follows")
          .insert({ user_id: user.id, player_id: data.playerId });
    if (result.error) setFollowing(previous);
    setFollowPending(false);
  }

  const description =
    data.video.description ||
    `This film is part of ${data.athleteName}'s verified public BLTZ archive. Additional context will appear as it is approved.`;
  const displayedTeammate = data.taggedTeammates.find(
    (teammate) => teammate.id === (activeTeammateId ?? hoveredTeammateId),
  ) ?? null;

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

  useEffect(() => {
    const viewport = publicationViewportRef.current;
    const track = publicationTrackRef.current;
    if (!viewport || !track) return;

    const measurePublication = () => {
      setPublicationScrollDistance(Math.max(0, track.scrollWidth - viewport.clientWidth));
    };
    const observer = new ResizeObserver(measurePublication);
    observer.observe(viewport);
    observer.observe(track);
    measurePublication();
    return () => observer.disconnect();
  }, [data.video.publishedAt]);

  useEffect(() => {
    const viewport = teammateViewportRef.current;
    const group = teammateGroupRef.current;
    if (!viewport || !group) return;

    const measureTeammates = () => {
      const gap = 10;
      setTeammateMarqueeNeeded(group.scrollWidth > viewport.clientWidth + 1);
      setTeammateMarqueeDistance(group.scrollWidth + gap);
    };
    const resizeObserver = new ResizeObserver(measureTeammates);
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => setTeammateMarqueeInView(entry.isIntersecting),
      { threshold: 0.15 },
    );
    resizeObserver.observe(viewport);
    resizeObserver.observe(group);
    intersectionObserver.observe(viewport);
    measureTeammates();
    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [data.taggedTeammates.length]);

  useEffect(() => () => {
    if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === playerRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function keepPlayerControlsVisible() {
    if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
    setPlayerControlsActive(true);
  }

  function schedulePlayerControlsFade() {
    keepPlayerControlsVisible();
    controlsTimerRef.current = window.setTimeout(() => {
      setPlayerControlsActive(false);
      controlsTimerRef.current = null;
    }, 2000);
  }

  function handlePlayerInteraction() {
    if (videoRef.current?.paused === false) schedulePlayerControlsFade();
    else keepPlayerControlsVisible();
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) await video.play().catch(() => undefined);
    else video.pause();
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
    handlePlayerInteraction();
  }

  function seekVideo(value: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setCurrentTime(value);
    handlePlayerInteraction();
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    } else {
      await playerRef.current?.requestFullscreen?.().catch(() => undefined);
    }
    handlePlayerInteraction();
  }

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
            <section
              ref={playerRef}
              className={`${styles.player} ${playerControlsActive ? styles.playerControlsActive : ""}`}
              aria-label={`${data.video.title} video player`}
              onMouseMove={handlePlayerInteraction}
              onPointerDown={handlePlayerInteraction}
            >
              {data.video.playbackUrl ? (
                <video
                  ref={videoRef}
                  src={data.video.playbackUrl}
                  poster={data.video.thumbnailUrl ?? undefined}
                  playsInline
                  preload="metadata"
                  onClick={togglePlayback}
                  onLoadedMetadata={(event) => setVideoDuration(event.currentTarget.duration)}
                  onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                  onPlay={() => {
                    setIsPlaying(true);
                    schedulePlayerControlsFade();
                  }}
                  onPause={() => {
                    setIsPlaying(false);
                    keepPlayerControlsVisible();
                  }}
                  onEnded={() => {
                    setIsPlaying(false);
                    keepPlayerControlsVisible();
                  }}
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
              {data.video.playbackUrl ? (
                <div className={`${styles.playerChrome} ${playerControlsActive ? styles.playerChromeVisible : ""}`}>
                  <div className={styles.playerControls}>
                    <button type="button" onClick={togglePlayback} aria-label={isPlaying ? "Pause video" : "Play video"}>
                      {isPlaying ? <Pause aria-hidden="true" fill="currentColor" /> : <Play aria-hidden="true" fill="currentColor" />}
                    </button>
                    <span className={styles.playerTime}>{formatDuration(currentTime)} / {formatDuration(videoDuration)}</span>
                    <input
                      className={styles.playerProgress}
                      type="range"
                      min="0"
                      max={Math.max(videoDuration, 0)}
                      step="0.1"
                      value={Math.min(currentTime, videoDuration || 0)}
                      onChange={(event) => seekVideo(Number(event.target.value))}
                      aria-label="Video progress"
                    />
                    <button type="button" onClick={toggleMute} aria-label={isMuted ? "Unmute video" : "Mute video"}>
                      {isMuted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
                    </button>
                    <button type="button" onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
                      {isFullscreen ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
                    </button>
                  </div>
                </div>
              ) : null}
              <div className={styles.playerTools}>
                <span>{data.video.sourceLabel}</span>
                <button type="button" onClick={copyShareLink} aria-label="Copy video share link">
                  {copied ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
                </button>
              </div>
            </section>
          </div>

          <div className={styles.detailColumn}>
            <section className={styles.videoInfo}>
              <div className={styles.titleRow}>
                <div className={styles.titleBlock}>
                  <div className={styles.titleViewport} ref={titleViewportRef}>
                    <div
                      ref={titleTrackRef}
                      className={`${styles.titleTrack} ${titleScrollDistance > 0 ? styles.titleTrackScrolling : ""}`}
                      style={{ "--title-scroll-distance": `${titleScrollDistance}px` } as React.CSSProperties}
                    >
                      <h1>{formatTitle(data.video.title)}</h1>
                      <span className={styles.titleDuration}>{formatDuration(data.video.durationSeconds)}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className={`${styles.followButton} ${following ? styles.followButtonFollowing : ""}`}
                  onClick={toggleFollow}
                  disabled={followPending}
                  aria-pressed={following}
                >
                  {following ? "Following" : "Follow"}
                </button>
              </div>
              <div className={styles.metadataRow}>
                <div className={styles.publicationMeta} ref={publicationViewportRef}>
                  <span
                    ref={publicationTrackRef}
                    className={publicationScrollDistance > 0 ? styles.publicationTrackScrolling : undefined}
                    style={{ "--title-scroll-distance": `${publicationScrollDistance}px` } as React.CSSProperties}
                  >
                    Published on {formatDate(data.video.publishedAt)}
                  </span>
                </div>
                <div className={styles.engagementMeta}>
                  <span><Eye aria-hidden="true" />{formatViews(data.views)} viewers</span>
                  <button type="button" aria-label="Like this video">
                    <ThumbsUp aria-hidden="true" />
                    {data.likes > 0 ? `${formatViews(data.likes)} Liked` : "Like"}
                  </button>
                </div>
              </div>
              <p className={styles.description}>{description}</p>
            </section>

            <details className={styles.conversation} open>
              <summary>
                <strong>Player conversation</strong>
                <ChevronDown aria-hidden="true" />
              </summary>
              <p>Comments and reactions will appear here when the verified community feature is available.</p>
            </details>
          </div>

          <aside className={styles.sidebar} aria-label="Player film archive">
            <section className={styles.additionalVideos} aria-label="Additional videos">
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
            </section>

            {data.taggedTeammates.length > 0 && (
              <section className={styles.teammateCard} aria-labelledby="tagged-teammates-title">
                <h2 id="tagged-teammates-title">Tagged teammates</h2>
                <div className={styles.teammateList} ref={teammateViewportRef}>
                  <div
                    className={`${styles.teammateTrack} ${
                      teammateMarqueeNeeded && teammateMarqueeInView ? styles.teammateTrackScrolling : ""
                    } ${activeTeammateId || hoveredTeammateId ? styles.teammateTrackPaused : ""}`}
                    style={{ "--teammate-marquee-distance": `${teammateMarqueeDistance}px` } as React.CSSProperties}
                  >
                    <div className={styles.teammateGroup} ref={teammateGroupRef}>
                      {data.taggedTeammates.map((teammate) => {
                        const isActive = activeTeammateId === teammate.id;
                        return (
                          <div
                            key={teammate.id}
                            className={`${styles.teammateItem} ${isActive ? styles.teammateItemActive : ""}`}
                            onMouseEnter={() => setHoveredTeammateId(teammate.id)}
                            onMouseLeave={() => setHoveredTeammateId(null)}
                          >
                            <button
                              type="button"
                              className={styles.teammateAvatar}
                              aria-label={`Show details for ${teammate.name}`}
                              aria-describedby="tagged-teammate-tooltip"
                              aria-expanded={isActive}
                              onFocus={() => setHoveredTeammateId(teammate.id)}
                              onBlur={() => setHoveredTeammateId(null)}
                              onPointerDown={() => setHoveredTeammateId(teammate.id)}
                              onClick={() => setActiveTeammateId((current) => current === teammate.id ? null : teammate.id)}
                            >
                              {teammate.headshotUrl ? (
                                <Image src={teammate.headshotUrl} alt="" fill sizes="44px" />
                              ) : (
                                <span>{teammateInitials(teammate.name)}</span>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {teammateMarqueeNeeded && (
                      <div className={styles.teammateGroup} aria-hidden="true">
                        {data.taggedTeammates.map((teammate) => (
                          <div key={`duplicate-${teammate.id}`} className={styles.teammateAvatar}>
                            {teammate.headshotUrl ? (
                              <Image src={teammate.headshotUrl} alt="" fill sizes="44px" />
                            ) : (
                              <span>{teammateInitials(teammate.name)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  id="tagged-teammate-tooltip"
                  role="tooltip"
                  className={`${styles.teammateTooltip} ${displayedTeammate ? styles.teammateTooltipVisible : ""}`}
                >
                  {displayedTeammate && (
                    <>
                      <strong>{displayedTeammate.name}</strong>
                      {(displayedTeammate.position || displayedTeammate.team) && (
                        <span>{[displayedTeammate.position, displayedTeammate.team].filter(Boolean).join(" · ")}</span>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}

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
