"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Search, X } from "lucide-react";
import type { SearchResult } from "@/components/ui/search-modal";
import { trackProductEvent } from "@/lib/analytics/client";
import styles from "./photo-room.module.css";

export type PhotoRoomImage = {
  id: string;
  url: string;
  title: string;
  credits: string | null;
  sourceUrl: string | null;
  level: "hs" | "cfb" | "pro" | "off-field";
  season: string | null;
  licenseLabel: string;
  width: number | null;
  height: number | null;
};

export type PhotoRoomData = {
  privateDemo?: boolean;
  athleteId: string | null;
  slug: string;
  athleteName: string;
  athleteHeadshotUrl: string;
  accentColor: string;
  images: PhotoRoomImage[];
};

type FilterKey = "hs" | "cfb" | "pro" | "off-field";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "hs", label: "HS" },
  { key: "cfb", label: "CFB" },
  { key: "pro", label: "PRO" },
  { key: "off-field", label: "OFF THE FIELD" },
];

function searchHref(result: SearchResult) {
  if (result.type === "team") return `/team/${result.slug}`;
  if (result.type === "school") return `/school/${result.slug}`;
  return `/player/${result.slug}`;
}

export default function PhotoRoomView({ data }: { data: PhotoRoomData }) {
  const lockerPath = `${data.privateDemo ? "/preview-lockers" : "/player"}/${encodeURIComponent(data.slug)}`;
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("cfb");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [scrollOverlayOpacity, setScrollOverlayOpacity] = useState(0);
  const [galleryProgress, setGalleryProgress] = useState(0);
  const [galleryLocked, setGalleryLocked] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const heroRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const resumeTriggeredRef = useRef(false);

  useEffect(() => {
    if (data.privateDemo) return;
    void trackProductEvent({
      eventName: "photo_gallery_opened",
      source: "public_locker",
      athleteId: data.athleteId,
      athleteSlug: data.slug,
      properties: { photo_count: data.images.length },
      dedupeKey: `photo_gallery_opened:${data.slug}:${window.location.pathname}`,
    });
  }, [data.athleteId, data.images.length, data.slug, data.privateDemo]);

  const slideshowImages = data.images.length ? data.images : [];
  const hasAnyImages = data.images.length > 0;
  const activeImage = slideshowImages[activeIndex % Math.max(slideshowImages.length, 1)] ?? null;
  const filteredImages = useMemo(
    () => data.images.filter((image) => image.level === activeFilter),
    [activeFilter, data.images],
  );
  const filterCounts = useMemo(
    () =>
      FILTERS.reduce<Record<FilterKey, number>>(
        (counts, filter) => {
          counts[filter.key] = data.images.filter((image) => image.level === filter.key).length;
          return counts;
        },
        { hs: 0, cfb: 0, pro: 0, "off-field": 0 },
      ),
    [data.images],
  );
  const sparseSlotCount = hasAnyImages && filteredImages.length > 0 && filteredImages.length < 4
    ? 4 - filteredImages.length
    : 0;

  useEffect(() => {
    if (slideshowImages.length <= 1 || !autoplayEnabled) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % slideshowImages.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [autoplayEnabled, slideshowImages.length]);

  useEffect(() => {
    if (activeIndex < slideshowImages.length) return;
    setActiveIndex(0);
  }, [activeIndex, slideshowImages.length]);

  useEffect(() => {
    if (!hasAnyImages || filterCounts[activeFilter] > 0) return;
    const nextFilter = FILTERS.find((filter) => filterCounts[filter.key] > 0);
    if (nextFilter) setActiveFilter(nextFilter.key);
  }, [activeFilter, filterCounts, hasAnyImages]);

  useEffect(() => {
    let frame: number | null = null;

    function updateScrollOverlay() {
      const hero = heroRef.current;
      if (!hero) return;
      const heroRect = hero.getBoundingClientRect();
      const lockDistance = Math.min(heroRect.height * 0.5, window.innerHeight * 0.22);
      const progress = Math.min(Math.max(window.scrollY / lockDistance, 0), 1);
      setGalleryProgress(progress);
      setScrollOverlayOpacity(Math.min(1, progress * 1.2));
      setGalleryLocked(progress >= 0.98);
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

  function selectImage(id: string) {
    if (!data.privateDemo) void trackProductEvent({
      eventName: "media_viewed",
      source: "public_locker",
      athleteId: data.athleteId,
      athleteSlug: data.slug,
      properties: { media_id: id, media_type: "photo", section: activeFilter },
      dedupeKey: `media_viewed:photo:${id}`,
    });
    const nextIndex = data.images.findIndex((image) => image.id === id);
    if (nextIndex >= 0) setActiveIndex(nextIndex);
    resumeTriggeredRef.current = false;
    setAutoplayEnabled(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resumeSlideshow() {
    if (slideshowImages.length <= 1 || resumeTriggeredRef.current) return;
    resumeTriggeredRef.current = true;
    setActiveIndex((index) => (index + 1) % slideshowImages.length);
    setAutoplayEnabled(true);
  }

  return (
    <main className={styles.page} style={{ "--photo-accent": data.accentColor } as React.CSSProperties}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href={lockerPath} className={styles.brand} aria-label="BLTZ Player Locker">
            <Image src="/images/bltz-mark.svg" alt="BLTZ" width={38} height={39} priority />
          </Link>
          <div className={styles.headerActions}>
            <button type="button" disabled={data.privateDemo} className={styles.iconButton} onClick={() => setSearchOpen(true)} aria-label="Search BLTZ">
              <Search aria-hidden="true" />
            </button>
            <Link href={lockerPath} className={styles.avatar} aria-label={`View ${data.athleteName}'s locker`}>
              <Image src={data.athleteHeadshotUrl} alt="" fill sizes="42px" unoptimized={data.privateDemo} />
            </Link>
          </div>
        </header>

        <section ref={heroRef} className={styles.featured} aria-label="Featured photo slideshow">
          <div className={`${styles.featuredMedia} ${!hasAnyImages ? styles.featuredMediaEmpty : ""}`}>
            {slideshowImages.length ? (
              slideshowImages.map((image, index) => (
                <img
                  key={image.id}
                  src={image.url}
                  alt=""
                  className={`${styles.heroImage} ${index === activeIndex ? styles.heroImageActive : ""}`}
                />
              ))
            ) : (
              <div className={styles.featuredFallback}>
                <strong>Photo archive loading soon</strong>
                <span>No verified public photos are attached yet.</span>
              </div>
            )}
            <div className={styles.scrollShade} style={{ opacity: scrollOverlayOpacity }} />
            <div className={styles.sourceBadge}>{activeImage?.licenseLabel ?? "PHOTO ROOM"}</div>
            <div className={styles.featuredInfo}>
              <span className={styles.featuredAvatar} aria-hidden="true" />
              <span>
                <strong>{activeImage?.title ?? "Photo archive loading soon"}</strong>
                <small>{activeImage?.credits ?? "BLTZ will add approved images here"}</small>
              </span>
            </div>
            {!autoplayEnabled && slideshowImages.length > 1 ? (
              <button
                type="button"
                className={styles.slideshowPlayButton}
                onMouseDown={resumeSlideshow}
                onTouchStart={resumeSlideshow}
                onClick={resumeSlideshow}
                aria-label="Resume photo slideshow"
              >
                <Play aria-hidden="true" fill="currentColor" />
              </button>
            ) : null}
          </div>
        </section>

        <div
          ref={gridRef}
          className={styles.gridStack}
          style={{ "--gallery-progress": galleryProgress } as React.CSSProperties}
        >
          <section className={styles.library} aria-labelledby="photos-heading">
            <div className={styles.sectionHeading}>
              <h1 id="photos-heading">PHOTOS</h1>
              <span>{filteredImages.length} IMAGES</span>
            </div>
            <div className={styles.filterPills} aria-label="Filter photos">
              {FILTERS.map((filter) => (
                (() => {
                  const disabled = hasAnyImages && filterCounts[filter.key] === 0;
                  return (
                    <button
                      key={filter.key}
                      type="button"
                      className={filter.key === activeFilter ? styles.filterPillActive : styles.filterPill}
                      onClick={() => {
                        if (!disabled) setActiveFilter(filter.key);
                      }}
                      aria-pressed={filter.key === activeFilter}
                      disabled={disabled}
                    >
                      {filter.label}
                    </button>
                  );
                })()
              ))}
            </div>

            {filteredImages.length ? (
              <div
                className={`${styles.bentoViewport} ${galleryLocked ? styles.bentoViewportUnlocked : ""}`}
                aria-label="Scrollable photo grid"
              >
                <div className={styles.bentoGrid}>
                  {filteredImages.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      className={`${styles.photoTile} ${index % 7 === 0 ? styles.photoTileLarge : ""} ${index % 7 === 3 ? styles.photoTileWide : ""}`}
                      onClick={() => selectImage(image.id)}
                      aria-label={`View ${image.title}`}
                    >
                      <img src={image.url} alt="" />
                      <span className={styles.tileShade} />
                      <span className={styles.tileMeta}>
                        <strong>{image.title}</strong>
                        <small>{image.licenseLabel}{image.season ? ` · ${image.season}` : ""}</small>
                      </span>
                    </button>
                  ))}
                  {Array.from({ length: sparseSlotCount }).map((_, index) => (
                    <div key={`sparse-${activeFilter}-${index}`} className={styles.photoTilePlaceholder}>
                      <strong>More verified photos coming</strong>
                      <span>BLTZ will add images as they are approved.</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <strong>{hasAnyImages ? `No ${FILTERS.find((filter) => filter.key === activeFilter)?.label} photos yet` : "No verified photos found"}</strong>
                <span>{hasAnyImages ? "Try another category, or check back as more images are verified." : "BLTZ will add this section as photos are discovered, approved, or shared by the athlete."}</span>
              </div>
            )}
          </section>
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
