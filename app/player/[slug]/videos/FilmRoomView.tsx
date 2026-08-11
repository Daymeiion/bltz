"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Maximize, Minimize, Pause, Play, Search, Volume2, VolumeX, X } from "lucide-react";
import type { SearchResult } from "@/components/ui/search-modal";
import type { PublicVideo } from "@/lib/player/public-video";
import styles from "./film-room.module.css";

export type FilmRoomVideo = PublicVideo;

export type FilmRoomData = {
  slug: string;
  athleteName: string;
  athleteHeadshotUrl: string;
  accentColor: string;
  videos: FilmRoomVideo[];
};

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds < 0) return "--:--";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function yearRange(videos: FilmRoomVideo[]): string {
  const years = videos
    .map((video) => Number(video.season))
    .filter((year) => Number.isFinite(year) && year > 1900)
    .sort((a, b) => a - b);
  if (!years.length) return "FILM ARCHIVE";
  return years[0] === years[years.length - 1]
    ? String(years[0])
    : `${years[0]}-${years[years.length - 1]}`;
}

function FilmCard({
  video,
  active,
  focused,
  onSelect,
}: {
  video: FilmRoomVideo;
  active: boolean;
  focused: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.filmCard} ${focused ? styles.filmCardFocused : ""}`}
      onClick={onSelect}
      aria-label={`Play ${video.title}`}
      aria-pressed={active}
      data-gallery-id={video.id}
    >
      <span className={styles.cardVisual}>
        {video.thumbnailUrl ? (
          <Image src={video.thumbnailUrl} alt="" fill sizes="(max-width: 640px) 46vw, 260px" />
        ) : (
          <span className={styles.cardFallback} />
        )}
        <span className={styles.cardStatus}>RISING</span>
        <span className={styles.cardPlay}><Play aria-hidden="true" fill="currentColor" /></span>
        <span className={styles.cardDuration}>{formatDuration(video.durationSeconds)}</span>
      </span>
      <span className={styles.cardCopy}>
        <strong>{video.title}</strong>
        <span>{video.season ?? "SEASON FILM"} · {video.sourceLabel}</span>
      </span>
    </button>
  );
}

function FilmShelf({
  videos,
  selectedId,
  onSelect,
}: {
  videos: FilmRoomVideo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const [focusedId, setFocusedId] = useState(videos[0]?.id ?? null);

  useEffect(() => {
    setFocusedId(videos[0]?.id ?? null);
  }, [videos]);

  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
  }, []);

  function updateFocusedCard() {
    const row = rowRef.current;
    if (!row) return;
    const rowCenter = row.getBoundingClientRect().left + row.clientWidth / 2;
    const cards = Array.from(row.querySelectorAll<HTMLElement>("[data-gallery-id]"));
    const nearest = cards.reduce<{ id: string; distance: number } | null>((closest, card) => {
      const rect = card.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - rowCenter);
      const id = card.dataset.galleryId;
      if (!id || (closest && closest.distance <= distance)) return closest;
      return { id, distance };
    }, null);
    if (nearest) setFocusedId(nearest.id);
  }

  function handleScroll() {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(updateFocusedCard);
  }

  return (
    <div ref={rowRef} className={styles.filmRow} onScroll={handleScroll}>
      {videos.map((video) => (
        <FilmCard
          key={video.id}
          video={video}
          active={video.id === selectedId}
          focused={video.id === focusedId}
          onSelect={() => {
            setFocusedId(video.id);
            onSelect(video.id);
          }}
        />
      ))}
    </div>
  );
}

export default function FilmRoomView({ data }: { data: FilmRoomData }) {
  const [selectedId, setSelectedId] = useState(data.videos[0]?.id ?? null);
  const [playing, setPlaying] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const libraryStackRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const pointerInteractionRef = useRef(false);
  const [scrollOverlayOpacity, setScrollOverlayOpacity] = useState(0);

  const selected = data.videos.find((video) => video.id === selectedId) ?? data.videos[0] ?? null;
  const hsVideos = useMemo(() => data.videos.filter((video) => video.level === "hs"), [data.videos]);
  const cfbVideos = useMemo(() => data.videos.filter((video) => video.level === "cfb"), [data.videos]);
  const proVideos = useMemo(() => data.videos.filter((video) => video.level === "pro"), [data.videos]);
  const offFieldVideos = useMemo(() => data.videos.filter((video) => video.level === "off-field"), [data.videos]);

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    setControlsVisible(true);
    if (videoRef.current) videoRef.current.load();
  }, [selectedId]);

  useEffect(() => () => {
    if (controlsTimerRef.current !== null) window.clearTimeout(controlsTimerRef.current);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === playerRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!searchOpen || query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`, {
          signal: controller.signal,
        });
        const payload = response.ok ? await response.json() : { results: [] };
        setSearchResults(Array.isArray(payload.results) ? payload.results : []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchOpen, searchQuery]);

  useEffect(() => {
    if (!searchOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  useEffect(() => {
    let frame: number | null = null;

    function updateScrollOverlay() {
      const hero = playerRef.current;
      const stack = libraryStackRef.current;
      if (!hero || !stack) return;

      const heroRect = hero.getBoundingClientRect();
      const progress = Math.min(Math.max(window.scrollY / (heroRect.height * 0.42), 0), 1);
      setScrollOverlayOpacity(progress * 1);
    }

    function handleScroll() {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateScrollOverlay);
    }

    updateScrollOverlay();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  function searchHref(result: SearchResult) {
    if (result.type === "team") return `/team/${result.slug}`;
    if (result.type === "school") return `/school/${result.slug}`;
    return `/player/${result.slug}`;
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video || !selected?.playbackUrl) return;
    if (video.paused) {
      await video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }

  function clearControlsTimer() {
    if (controlsTimerRef.current === null) return;
    window.clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = null;
  }

  function hideControlsAfterDelay() {
    clearControlsTimer();
    controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 3000);
  }

  function revealControls() {
    setControlsVisible(true);
    if (playing) hideControlsAfterDelay();
  }

  function handleVideoPauseRequest() {
    videoRef.current?.pause();
    clearControlsTimer();
    setControlsVisible(true);
  }

  function chooseVideo(id: string) {
    setSelectedId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    } else {
      await playerRef.current?.requestFullscreen?.().catch(() => undefined);
    }
    revealControls();
  }

  return (
    <main className={styles.page} style={{ "--film-accent": data.accentColor } as React.CSSProperties}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href={`/player/${data.slug}`} className={styles.brand} aria-label="BLTZ Player Locker">
            <Image src="/images/bltz-mark.svg" alt="BLTZ" width={38} height={39} priority />
          </Link>
          <div className={styles.headerActions}>
            <button type="button" className={styles.iconButton} onClick={() => setSearchOpen(true)} aria-label="Search BLTZ">
              <Search aria-hidden="true" />
            </button>
            <Link href={`/player/${data.slug}`} className={styles.avatar} aria-label={`View ${data.athleteName}'s locker`}>
              <Image src={data.athleteHeadshotUrl} alt="" fill sizes="42px" />
            </Link>
          </div>
        </header>

        <section ref={playerRef} className={styles.featured} aria-label="Featured film">
          {selected ? (
            <>
              <div
                className={styles.featuredMedia}
                onPointerDown={() => {
                  pointerInteractionRef.current = true;
                  revealControls();
                }}
                onKeyDownCapture={() => {
                  pointerInteractionRef.current = false;
                }}
                onFocusCapture={() => setControlsVisible(true)}
              >
                <div className={styles.featuredViewport}>
                {selected.playbackUrl ? (
                  <video
                    ref={videoRef}
                    src={selected.playbackUrl}
                    poster={selected.thumbnailUrl ?? undefined}
                    preload="metadata"
                    playsInline
                    muted={muted}
                    onPlay={() => {
                      setPlaying(true);
                      setControlsVisible(true);
                      hideControlsAfterDelay();
                      if (pointerInteractionRef.current) {
                        (document.activeElement as HTMLElement | null)?.blur();
                      }
                    }}
                    onPause={() => {
                      setPlaying(false);
                      clearControlsTimer();
                      setControlsVisible(true);
                    }}
                    onTimeUpdate={(event) => {
                      const target = event.currentTarget;
                      setProgress(target.duration ? (target.currentTime / target.duration) * 100 : 0);
                    }}
                    onEnded={() => {
                      setPlaying(false);
                      clearControlsTimer();
                      setControlsVisible(true);
                    }}
                  />
                ) : selected.thumbnailUrl ? (
                  <Image src={selected.thumbnailUrl} alt="" fill priority sizes="(max-width: 760px) 100vw, 760px" />
                ) : (
                  <div className={styles.featuredFallback} />
                )}
                <div className={styles.scrollShade} style={{ opacity: scrollOverlayOpacity }} />
                {selected.playbackUrl ? (
                  <button
                    type="button"
                    className={styles.mediaTapTarget}
                    onClick={handleVideoPauseRequest}
                    aria-label="Pause film and show video controls"
                  />
                ) : null}
                <div className={styles.sourceBadge}>{selected.sourceLabel}</div>
                <div className={`${styles.mediaShade} ${controlsVisible ? styles.mediaShadeVisible : styles.mediaShadeHidden}`} />
                <div className={`${styles.controls} ${controlsVisible ? styles.controlsVisible : styles.controlsHidden}`}>
                  <div className={styles.controlRow}>
                    <button type="button" onClick={togglePlayback} disabled={!selected.playbackUrl} aria-label={playing ? "Pause film" : "Play film"}>
                      {playing ? <Pause aria-hidden="true" fill="currentColor" /> : <Play aria-hidden="true" fill="currentColor" />}
                    </button>
                    <button type="button" onClick={() => setMuted((value) => !value)} disabled={!selected.playbackUrl} aria-label={muted ? "Unmute film" : "Mute film"}>
                      {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.1"
                      value={progress}
                      aria-label="Film progress"
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        setProgress(next);
                        if (videoRef.current?.duration) videoRef.current.currentTime = (next / 100) * videoRef.current.duration;
                      }}
                      style={{ "--progress": `${progress}%` } as React.CSSProperties}
                    />
                    <button type="button" onClick={toggleFullscreen} disabled={!selected.playbackUrl} aria-label={isFullscreen ? "Exit fullscreen" : "View film fullscreen"}>
                      {isFullscreen ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
                    </button>
                  </div>
                  <div className={styles.featuredInfo}>
                    <span className={styles.featuredAvatar} aria-hidden="true" />
                    <span className={styles.featuredCopy}>
                      <strong>{selected.title}</strong>
                      <small>{selected.attribution} · {formatDuration(selected.durationSeconds)}</small>
                    </span>
                    <Link
                      className={styles.detailLink}
                      href={`/player/${data.slug}/videos/${selected.id}`}
                      aria-label={`Open details for ${selected.title}`}
                    >
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                  </div>
                </div>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.emptyFeatured}>
              <Play aria-hidden="true" />
              <strong>Film room loading soon</strong>
              <span>No public game film has been attached to this locker yet.</span>
            </div>
          )}
        </section>

        <div ref={libraryStackRef} className={styles.libraryStack}>
          {hsVideos.length > 0 && (
            <section className={styles.library} aria-labelledby="hs-heading">
              <div className={styles.sectionHeading}>
                <h1 id="hs-heading">HIGH SCHOOL</h1>
                <span>{yearRange(hsVideos)}</span>
              </div>
              <FilmShelf videos={hsVideos} selectedId={selected?.id ?? null} onSelect={chooseVideo} />
            </section>
          )}

          {cfbVideos.length > 0 && (
            <section className={styles.library} aria-labelledby="cfb-heading">
              <div className={styles.sectionHeading}>
                <h1 id="cfb-heading">CFB</h1>
                <span>{yearRange(cfbVideos)}</span>
              </div>
              <FilmShelf videos={cfbVideos} selectedId={selected?.id ?? null} onSelect={chooseVideo} />
            </section>
          )}

          {proVideos.length > 0 && (
            <section className={styles.library} aria-labelledby="pro-heading">
              <div className={styles.sectionHeading}>
                <h1 id="pro-heading">PRO</h1>
                <span>{yearRange(proVideos)}</span>
              </div>
              <FilmShelf videos={proVideos} selectedId={selected?.id ?? null} onSelect={chooseVideo} />
            </section>
          )}

          {offFieldVideos.length > 0 && (
            <section className={styles.library} aria-labelledby="off-field-heading">
              <div className={styles.sectionHeading}>
                <h1 id="off-field-heading">OFF-THE FIELD</h1>
                <span>{yearRange(offFieldVideos)}</span>
              </div>
              <FilmShelf videos={offFieldVideos} selectedId={selected?.id ?? null} onSelect={chooseVideo} />
            </section>
          )}
        </div>

        {searchOpen && (
          <div className={styles.searchOverlay} role="dialog" aria-modal="true" aria-label="Search BLTZ">
            <button
              type="button"
              className={styles.searchBackdrop}
              onClick={() => setSearchOpen(false)}
              aria-hidden="true"
              tabIndex={-1}
            />
            <div className={styles.searchPanel}>
              <div className={styles.searchTitle}>
                <strong>SEARCH BLTZ</strong>
                <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search"><X aria-hidden="true" /></button>
              </div>
              <div className={styles.searchForm}>
                <Search aria-hidden="true" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  autoFocus
                  placeholder="Players, schools, teams"
                  aria-label="Search players, schools, and teams"
                />
              </div>
              <div className={styles.searchResults} aria-live="polite">
                {searchLoading ? <span className={styles.searchMessage}>SEARCHING...</span> : null}
                {!searchLoading && searchQuery.trim().length >= 2 && searchResults.length === 0 ? (
                  <span className={styles.searchMessage}>NO RESULTS FOUND</span>
                ) : null}
                {searchResults.map((result) => (
                  <Link key={`${result.type}-${result.id}`} href={searchHref(result)} onClick={() => setSearchOpen(false)}>
                    <span className={styles.resultAvatar}>
                      {result.image_url || result.logo_url ? (
                        <Image src={result.image_url || result.logo_url || ""} alt="" fill sizes="34px" />
                      ) : result.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span><strong>{result.name}</strong><small>{result.type}</small></span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
