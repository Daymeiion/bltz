"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ChevronDown, ChevronUp, Mic } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SearchResult } from "@/components/ui/search-modal";

// ---------------------------------------------------------------------------
// LockerView — fan-facing athlete locker, ported from the standalone design.
//
// Real scraped data (identity, school, NFL draft, height/weight, DOB, games,
// bio, awards, videos, photos) is threaded into the layout. Sections without a
// data source yet (season/career stat lines, pool earnings, game log, timeline,
// extended combine measurables, article/podcast media) keep the design's sample
// values so the full experience renders — swap these for live queries once the
// stats pipeline lands. Search "SAMPLE" to find every placeholder.
// ---------------------------------------------------------------------------

export type LockerData = {
  slug: string;
  fullName: string;
  hometown: string;
  position: string;
  jersey: string;
  jerseyNumbers?: string[];
  levelLabel: string;
  headshotUrl: string;
  headshotYear?: string | null;
  heroVideoUrl: string | null;
  logoSrc: string;
  bio: string;
  athleteQuote?: string | null;
  athleteQuoteAuthor?: string | null;
  heightDisplay: string;
  weightLbs: number | null;
  dobDisplay: string;
  age?: number;
  gamesPlayed: number | null;
  careerStats?: {
    key: string;
    label: string;
    value: string | number;
  }[];
  careerSeasons?: {
    year: string;
    gamesPlayed: number;
    level: "cfb" | "pro" | string;
    team: string | null;
  }[];
  gameLogs?: {
    key: string;
    label: string;
    meta: string;
    columns: {
      key: string;
      label: string;
      width?: number;
      align?: "left" | "center" | "right";
    }[];
    seasons: {
      year: string;
      summary: string;
      rows: {
        id: string;
        resultTone?: "win" | "loss" | "neutral";
        values: Record<string, string | number | null>;
      }[];
    }[];
  }[];
  highSchool: string;
  classOf: string;
  school: {
    name: string;
    abbr: string;
    primaryColor: string;
    logoUrl: string | null;
  } | null;
  nfl: {
    latestTeam: string | null;
    draftYear: number | null;
    draftRound: number | null;
    draftPick: number | null;
    draftTeam: string | null;
  } | null;
  // Rotating hero pills. `schools` cycles the player's colleges (exact school
  // colors); `proTeams` cycles their pro teams. When proTeams is empty (never
  // made the NFL), the right pill falls back to level/status.
  schools: { label: string; color: string; logo: string | null }[];
  proTeams: { label: string; color: string; logo: string | null }[];
  awards: { year: string; label: string }[];
  videos: { id: string; title: string; thumb: string | null }[];
  podcastAppearances?: {
    id: string;
    type: "podcast" | "interview";
    source: string;
    title: string;
    meta: string;
    sourceUrl?: string | null;
  }[];
  photos: {
    id: string;
    url: string;
    title: string;
    credits: string | null;
    sourceUrl: string | null;
    provenance: string | null;
    licenseLabel: string;
  }[];
};

// Shape returned by GET /api/spotify/now-playing when a track is live.
type NowPlayingTrack = {
  connected: true;
  isPlaying: true;
  title: string;
  artists: string;
  album: string;
  albumArt: string | null;
  url: string | null;
};

const GRAD_FIELD = "linear-gradient(135deg,#0A1A6E,#131829)";
const lockerAccent = "#FFB940";
const HEADSHOT_FALLBACK = "/images/black-headshot-fallback.svg";

const mono = "'JetBrains Mono',ui-monospace,monospace";
// Display font — Barlow at heavy weight (700-900), not the condensed cut:
// condensed's tight tracking made characters overlap at display sizes.
const disp = "'Barlow','Oswald',Impact,sans-serif";
const body = "'Barlow','Inter',system-ui,sans-serif";

const statNumberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function formatStatNumber(value: string | number) {
  const numericValue = typeof value === "number" ? value : Number(value.replace(/,/g, ""));
  return Number.isFinite(numericValue) ? statNumberFormatter.format(numericValue) : String(value);
}

function fittedStatSize(value: string, standardSize: number) {
  if (value.length >= 8) return Math.max(12, standardSize - 10);
  if (value.length >= 6) return Math.max(13, standardSize - 6);
  return standardSize;
}

function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

type LockerViewerMode = "public" | "athlete";
type LockerPresentation = "page" | "embedded";

export default function LockerView({
  data,
  viewerMode = "public",
  presentation = "page",
}: {
  data: LockerData;
  viewerMode?: LockerViewerMode;
  presentation?: LockerPresentation;
}) {
  const [tab, setTab] = useState<"bio" | "media" | "stats">("bio");
  const [bioSort, setBioSort] = useState("all");
  const [mediaSort, setMediaSort] = useState("articles");
  const [statsSort, setStatsSort] = useState("career");
  const [gameLogOpen, setGameLogOpen] = useState<Record<string, boolean>>({ cfb: true, pro: false });
  const [articleModalOpen, setArticleModalOpen] = useState(false);
  const [pendingArticleRedirect, setPendingArticleRedirect] = useState<{ source: string; title: string; url: string } | null>(null);
  const [externalRedirectCountdown, setExternalRedirectCountdown] = useState(5);
  const [selectedSocialIndex, setSelectedSocialIndex] = useState<number | null>(null);
  const [shortModalIndex, setShortModalIndex] = useState<number | null>(null);
  const [activeShortIndex, setActiveShortIndex] = useState(0);
  const [shortsScrolling, setShortsScrolling] = useState(false);
  const [shortsScrollProgress, setShortsScrollProgress] = useState(0);
  const [socialScrolling, setSocialScrolling] = useState(false);
  const [socialScrollProgress, setSocialScrollProgress] = useState(0);
  const [awardsScrolling, setAwardsScrolling] = useState(false);
  const [awardsScrollProgress, setAwardsScrollProgress] = useState(0);
  const [teamHistoryInView, setTeamHistoryInView] = useState(false);
  const [teamHistoryNeedsScroll, setTeamHistoryNeedsScroll] = useState(false);
  const [careerGamesInView, setCareerGamesInView] = useState(false);
  const [careerGamesNeedsScroll, setCareerGamesNeedsScroll] = useState(false);
  const [showAllCareerStats, setShowAllCareerStats] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [following, setFollowing] = useState(false);
  const [stats, setStats] = useState({
    tackles: 0, int: 0, pbu: 0, ff: 0, dtd: 0, solo: 0, earned: 0, views: 0,
  });
  const statsAnimated = useRef(false);
  const screenRef = useRef<HTMLDivElement | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  const shortsScrollRef = useRef<HTMLDivElement | null>(null);
  const shortsScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shortModalScrollRef = useRef<HTMLDivElement | null>(null);
  const shortModalVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const shortModalInitialIndexRef = useRef<number | null>(null);
  const socialScrollRef = useRef<HTMLDivElement | null>(null);
  const socialScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const awardsScrollRef = useRef<HTMLDivElement | null>(null);
  const awardsScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const teamHistoryRef = useRef<HTMLDivElement | null>(null);
  const teamHistoryViewportRef = useRef<HTMLDivElement | null>(null);
  const teamHistoryPrimaryRef = useRef<HTMLDivElement | null>(null);
  const careerGamesRef = useRef<HTMLDivElement | null>(null);
  const careerGamesViewportRef = useRef<HTMLDivElement | null>(null);
  const careerGamesPrimaryRef = useRef<HTMLDivElement | null>(null);
  const shortRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const shortVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [heroPlaying, setHeroPlaying] = useState(true);
  const showAthleteNav = viewerMode === "athlete";
  const isEmbedded = presentation === "embedded";

  useEffect(() => {
    const node = teamHistoryRef.current;
    if (tab !== "stats" || statsSort !== "career" || !node) {
      setTeamHistoryInView(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setTeamHistoryInView(entry.isIntersecting),
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [statsSort, tab]);

  useEffect(() => {
    const viewport = teamHistoryViewportRef.current;
    const primary = teamHistoryPrimaryRef.current;
    if (tab !== "stats" || statsSort !== "career" || !viewport || !primary) {
      setTeamHistoryNeedsScroll(false);
      return;
    }

    const measure = () => {
      const isPhone = window.matchMedia("(max-width: 640px)").matches;
      setTeamHistoryNeedsScroll(isPhone && primary.scrollWidth > viewport.clientWidth + 1);
    };
    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(viewport);
    resizeObserver.observe(primary);
    return () => resizeObserver.disconnect();
  }, [data.proTeams.length, data.school?.abbr, data.schools.length, statsSort, tab]);

  useEffect(() => {
    const node = careerGamesRef.current;
    if (tab !== "stats" || statsSort !== "career" || !node) {
      setCareerGamesInView(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setCareerGamesInView(entry.isIntersecting),
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [statsSort, tab]);

  useEffect(() => {
    const viewport = careerGamesViewportRef.current;
    const primary = careerGamesPrimaryRef.current;
    if (tab !== "stats" || statsSort !== "career" || !viewport || !primary) {
      setCareerGamesNeedsScroll(false);
      return;
    }

    const measure = () => setCareerGamesNeedsScroll(primary.scrollWidth > viewport.clientWidth + 1);
    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(viewport);
    resizeObserver.observe(primary);
    return () => resizeObserver.disconnect();
  }, [data.careerSeasons?.length, statsSort, tab]);

  const openSiteSearch = () => {
    setSearchOpen(true);
  };

  const closeSiteSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchLoading(false);
  };

  const searchResultHref = (result: SearchResult) => {
    if (result.type === "player") return `/player/${result.slug}`;
    if (result.type === "team") return `/team/${result.slug}`;
    return `/school/${result.slug}`;
  };

  const handleSearchInput = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  useEffect(() => {
    const query = searchQuery.trim();
    if (!searchOpen || !query) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setSearchResults([]);
          return;
        }
        const body = await response.json();
        setSearchResults(Array.isArray(body?.results) ? body.results : []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [searchOpen, searchQuery]);

  useEffect(() => {
    if (!searchOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSiteSearch();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [searchOpen]);

  useEffect(() => {
    if (selectedSocialIndex === null) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedSocialIndex(null);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedSocialIndex]);

  useEffect(() => {
    if (!pendingArticleRedirect) return;
    const startedAt = Date.now();
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPendingArticleRedirect(null);
    };
    setExternalRedirectCountdown(5);
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    const interval = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      setExternalRedirectCountdown(Math.max(0, 5 - elapsedSeconds));
    }, 250);
    const timeout = window.setTimeout(() => {
      window.location.assign(pendingArticleRedirect.url);
    }, 5000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pendingArticleRedirect]);

  // ---- Spotify "now playing" (live) ----
  // Polls the athlete's currently-playing track. Stays null until we confirm a
  // linked account + an active track, so the hero badge collapses gracefully
  // when nothing is playing or Spotify isn't connected.
  const [nowPlaying, setNowPlaying] = useState<NowPlayingTrack | null>(null);
  useEffect(() => {
    if (isEmbedded || !data.slug) return;
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(
          `/api/spotify/now-playing?player=${encodeURIComponent(data.slug)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const body = await res.json();
        if (!alive) return;
        setNowPlaying(body?.connected && body?.isPlaying ? (body as NowPlayingTrack) : null);
      } catch {
        /* transient — keep the last state */
      }
    };
    load();
    const id = setInterval(load, 30_000); // refresh every 30s
    return () => { alive = false; clearInterval(id); };
  }, [data.slug, isEmbedded]);

  // SAMPLE — no stats pipeline yet; these are the counter targets.
  const targets = { tackles: 58, int: 6, pbu: 14, ff: 2, dtd: 2, solo: 41, earned: 14208, views: 842000 };

  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const onScroll = () => {
      const scrollTop = window.innerWidth >= 900 ? window.scrollY : el.scrollTop;
      setScrolled(scrollTop > 320);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (tab !== "media" || mediaSort !== "shorts") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const index = visible?.target.getAttribute("data-short-index");
        if (index != null) setActiveShortIndex(Number(index));
      },
      { root: screenRef.current, threshold: [0.35, 0.6, 0.85] },
    );
    shortRefs.current.forEach((node) => {
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [tab, mediaSort]);

  useEffect(() => () => {
    if (shortsScrollTimerRef.current) clearTimeout(shortsScrollTimerRef.current);
    if (socialScrollTimerRef.current) clearTimeout(socialScrollTimerRef.current);
    if (awardsScrollTimerRef.current) clearTimeout(awardsScrollTimerRef.current);
  }, []);

  const handleShortsScroll = () => {
    const el = shortsScrollRef.current;
    if (el) {
      const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
      setShortsScrollProgress(Math.min(1, Math.max(0, el.scrollTop / maxScroll)));
    }
    setShortsScrolling(true);
    if (shortsScrollTimerRef.current) clearTimeout(shortsScrollTimerRef.current);
    shortsScrollTimerRef.current = setTimeout(() => setShortsScrolling(false), 650);
  };

  const handleSocialScroll = () => {
    const el = socialScrollRef.current;
    if (el) {
      const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
      setSocialScrollProgress(Math.min(1, Math.max(0, el.scrollTop / maxScroll)));
    }
    setSocialScrolling(true);
    if (socialScrollTimerRef.current) clearTimeout(socialScrollTimerRef.current);
    socialScrollTimerRef.current = setTimeout(() => setSocialScrolling(false), 650);
  };

  const handleAwardsScroll = () => {
    const el = awardsScrollRef.current;
    if (el) {
      const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
      setAwardsScrollProgress(Math.min(1, Math.max(0, el.scrollTop / maxScroll)));
    }
    setAwardsScrolling(true);
    if (awardsScrollTimerRef.current) clearTimeout(awardsScrollTimerRef.current);
    awardsScrollTimerRef.current = setTimeout(() => setAwardsScrolling(false), 650);
  };

  useEffect(() => {
    shortVideoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (tab === "media" && mediaSort === "shorts" && index === activeShortIndex) {
        video.muted = true;
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });
  }, [activeShortIndex, mediaSort, tab]);

  const toggleHeroVideo = () => {
    const v = heroVideoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setHeroPlaying(true); }
    else { v.pause(); setHeroPlaying(false); }
  };

  const animateStats = () => {
    if (statsAnimated.current) return;
    statsAnimated.current = true;
    const dur = 1100;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const out: Record<string, number> = {};
      for (const k in targets) out[k] = Math.round((targets as any)[k] * e);
      setStats(out as any);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const selectTab = (t: "bio" | "media" | "stats") => {
    setTab(t);
    if (t === "stats") setTimeout(animateStats, 180);
  };

  // ---- image pool for reels + media visuals (real photos / video thumbs) ----
  const imgPool = [
    ...data.photos.map((p) => p.url),
    ...data.videos.map((v) => v.thumb).filter(Boolean) as string[],
  ];
  const poolAt = (i: number) => imgPool.length ? imgPool[i % imgPool.length] : null;

  const schoolAbbr = data.school?.abbr || "SCHOOL";

  // Hero name shrinks to fit long full names on one line instead of wrapping.
  const nameLen = data.fullName.length;
  const heroNameSize = nameLen > 22 ? 22 : nameLen > 18 ? 26 : nameLen > 14 ? 30 : 36;

  // ---- pill helpers ----
  const tabTextShadow = "0 1px 3px rgba(0,0,0,.42)";
  const pillStyle = (active: boolean): React.CSSProperties =>
    active
      ? { flex: "none", padding: "8px 15px", borderRadius: 9999, border: "1px solid #fff", background: "#fff", color: "#0B0E1A", fontFamily: mono, fontWeight: 700, fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap", textShadow: "0 1px 1px rgba(255,255,255,.24)" }
      : { flex: "none", padding: "8px 15px", borderRadius: 9999, border: "1px solid #1E2640", background: "rgba(255,255,255,.05)", color: "rgba(255,255,255,.5)", fontFamily: mono, fontWeight: 600, fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap", textShadow: tabTextShadow };

  // ---- HIGHLIGHT VIDEOS (real title + thumb; SAMPLE tag/dur/views/when) ----
  const sampleMeta = [
    { tag: "RISING", dur: "0:47", views: "842K", when: "WEEK 6" },
    { tag: "TRENDING", dur: "0:32", views: "512K", when: "WEEK 4" },
    { tag: "RISING", dur: "1:12", views: "377K", when: "WEEK 8" },
    { tag: "REEL", dur: "3:04", views: "1.2M", when: "SEASON" },
  ];
  const realVideos = data.videos.map((v, i) => ({
    ...v,
    ...sampleMeta[i % sampleMeta.length],
    img: v.thumb || poolAt(i),
    isPlaceholder: false,
  }));
  const placeholderTitles = ["SEASON HIGHLIGHTS", "GAME DAY CUT", "TOP PLAYS", "FULL SEASON REEL"];
  const videos = [
    ...realVideos,
    ...Array.from({ length: Math.max(0, 4 - realVideos.length) }, (_, i) => ({
      id: `placeholder-${i}`,
      title: placeholderTitles[(realVideos.length + i) % placeholderTitles.length],
      thumb: null,
      tag: "UP NEXT",
      dur: "--:--",
      views: "—",
      when: "COMING SOON",
      img: poolAt(realVideos.length + i),
      isPlaceholder: true,
    })),
  ];

  // ---- BIO cards ----
  const hasKnownText = (value?: string | null) => {
    const normalized = value?.trim();
    return Boolean(normalized && normalized !== "—");
  };
  const unknownText = "Unknown";
  const pendingMetric = "TBD";
  const hasAthleteQuote = hasKnownText(data.athleteQuote);
  const displayAthleteQuote = hasAthleteQuote ? data.athleteQuote!.trim() : "";
  const displayAthleteQuoteAuthor = hasKnownText(data.athleteQuoteAuthor)
    ? data.athleteQuoteAuthor!.trim()
    : data.fullName;

  // Real: height + weight. Fallbacks are intentionally marked pending until verified data exists.
  const measure = [
    [data.heightDisplay || pendingMetric, "HEIGHT"],
    [data.weightLbs ? String(data.weightLbs) : pendingMetric, "WEIGHT · LBS"],
    [pendingMetric, "40-YARD"],
    [pendingMetric, "WINGSPAN"],
    [pendingMetric, "VERTICAL"],
    [pendingMetric, "BENCH · REPS"],
  ].map(([value, label]) => ({
    cat: "measurables", isStat: true, value, label,
    style: { flex: "none", width: 128, scrollSnapAlign: "start", borderRadius: 16, border: "1px solid #1E2640", background: "#131829" } as React.CSSProperties,
  }));
  const combineMetrics = [
    { label: "40-YARD", value: pendingMetric, unit: "PENDING", tone: lockerAccent },
    { label: "10-YARD SPLIT", value: pendingMetric, unit: "PENDING", tone: "#7DD3FC" },
    { label: "VERTICAL", value: pendingMetric, unit: "PENDING", tone: "#A7F3D0" },
    { label: "BROAD JUMP", value: pendingMetric, unit: "PENDING", tone: "#FDE68A" },
    { label: "3-CONE", value: pendingMetric, unit: "PENDING", tone: "#C4B5FD" },
    { label: "BENCH", value: pendingMetric, unit: "PENDING", tone: "#FCA5A5" },
  ];

  const story = [{
    cat: "story", isStory: true, text: data.bio,
    style: { flex: "none", width: 272, scrollSnapAlign: "start", borderRadius: 16, border: "1px solid #1E2640", background: "linear-gradient(150deg,#12183a,#131829)" } as React.CSSProperties,
  }];

  const hasRealAwards = data.awards.length > 0;
  const awardSrc = hasRealAwards
    ? data.awards
    : [];
  const awards = awardSrc.map((a, index) => ({
    cat: "awards", isAward: true, year: a.year, label: a.label, img: poolAt(index),
    style: { flex: "none", width: 164, scrollSnapAlign: "start", borderRadius: 16, border: "1px solid #1E2640", background: "linear-gradient(160deg,#1a2035,#131829)" } as React.CSSProperties,
  }));

  const allBio = [...measure, ...story];
  const bioCards = bioSort === "all" ? allBio : allBio.filter((c) => c.cat === bioSort);
  const bioPills = [["all", "ALL"], ["measurables", "MEASURABLES"], ["story", "STORY"]]
    .map(([key, label]) => ({ key, label, active: bioSort === key }));

  // ---- MEDIA cards (visuals use real photos; SAMPLE article/podcast copy) ----
  const mediaArticles = [
    { source: "THE ATHLETIC", title: "THE CONFERENCE'S BEST COVER MAN", meta: "6 MIN READ", img: poolAt(0), dek: "Film, leadership, and the week-by-week rise of a verified locker profile.", originalUrl: "https://www.nytimes.com/athletic/" },
    { source: "ESPN", title: "DRAFT STOCK RISING", meta: "4 MIN READ", img: poolAt(3), dek: "Scouts circle the traits, production, and projection behind the latest board movement.", originalUrl: "https://www.espn.com/" },
    { source: "TEAM SITE", title: "LOCKER ROOM STANDARD SETTER", meta: "3 MIN READ", img: poolAt(1), dek: "How preparation and practice habits have become part of the weekly team story.", originalUrl: "https://calbears.com/" },
    { source: "LOCAL PRESS", title: "FROM FRIDAY NIGHTS TO FEATURE FILM", meta: "5 MIN READ", img: poolAt(2), dek: "The hometown arc behind the athlete's growing media archive.", originalUrl: "https://www.latimes.com/sports/" },
  ];
  const mediaShorts = [
    { source: "@ATHLETE", title: "PREGAME WALK", meta: "218K VIEWS", img: poolAt(1), videoUrl: null },
    { source: "@ATHLETE", title: "FILM STUDY · 6AM", meta: "96K VIEWS", img: poolAt(2), videoUrl: null },
    { source: "TEAM CAM", title: "TUNNEL READY", meta: "74K VIEWS", img: poolAt(3), videoUrl: null },
    { source: "BLTZ CUT", title: "SIDELINE ENERGY", meta: "52K VIEWS", img: poolAt(4), videoUrl: null },
  ];
  const modalShortHasVideo = shortModalIndex !== null && Boolean(mediaShorts[shortModalIndex]?.videoUrl);
  const modalShortCount = mediaShorts.length;

  useEffect(() => {
    if (shortModalIndex === null) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShortModalIndex(null);
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = Math.min(modalShortCount - 1, Math.max(0, shortModalIndex + direction));
      const container = shortModalScrollRef.current;
      container?.scrollTo({ top: nextIndex * container.clientHeight, behavior: "smooth" });
      setShortModalIndex(nextIndex);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    if (shortModalInitialIndexRef.current !== null) {
      const initialIndex = shortModalInitialIndexRef.current;
      window.requestAnimationFrame(() => {
        const container = shortModalScrollRef.current;
        if (container) container.scrollTop = initialIndex * container.clientHeight;
        shortModalInitialIndexRef.current = null;
      });
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [modalShortCount, shortModalIndex]);

  useEffect(() => {
    if (shortModalIndex === null) return;
    shortModalVideoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index === shortModalIndex) void video.play().catch(() => undefined);
      else video.pause();
    });
    if (modalShortHasVideo || shortModalIndex >= modalShortCount - 1) return;
    const timeout = window.setTimeout(() => {
      const nextIndex = shortModalIndex + 1;
      const container = shortModalScrollRef.current;
      container?.scrollTo({ top: nextIndex * container.clientHeight, behavior: "smooth" });
      setShortModalIndex(nextIndex);
    }, 6000);
    return () => window.clearTimeout(timeout);
  }, [modalShortCount, modalShortHasVideo, shortModalIndex]);
  const mediaPodcast = data.podcastAppearances ?? [];
  const mediaSocial = [
    { platform: "Instagram", handle: "@athlete", meta: "12.4K LIKES", img: poolAt(4), format: "square", published: "OCT 18, 2025", caption: "Game day with the people who make every rep count." },
    { platform: "X", handle: "@athlete", meta: "4.8K REPOSTS", img: poolAt(0), format: "portrait", published: "SEP 29, 2025", caption: "The work travels. Another week, another opportunity to raise the standard." },
    { platform: "Facebook", handle: "Athlete Page", meta: "8.1K REACTIONS", img: poolAt(1), format: "square", published: "AUG 12, 2025", caption: "A hometown moment worth keeping in the career archive." },
    { platform: "LinkedIn", handle: "Athlete", meta: "2.2K IMPRESSIONS", img: poolAt(2), format: "portrait", published: "JUL 24, 2025", caption: "Leadership is built in the quiet moments long before the lights turn on." },
    { platform: "Instagram", handle: "@athlete", meta: "18.6K VIEWS", img: poolAt(3), format: "portrait", published: "JUN 08, 2025", caption: "Behind the scenes from a full day of preparation, film, and recovery." },
    { platform: "X", handle: "@athlete", meta: "9.3K VIEWS", img: poolAt(4), format: "square", published: "MAY 17, 2025", caption: "One chapter at a time. The full story belongs in one place." },
  ];
  const selectedSocialPost = selectedSocialIndex === null ? null : mediaSocial[selectedSocialIndex];
  const contact = { kind: "contact", isContact: true, style: { flex: "none", width: 224, scrollSnapAlign: "start", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(41,82,255,.3)" } as React.CSSProperties };
  let mediaCards: any[] = mediaSort === "podcast" ? mediaPodcast : [];
  mediaCards = [...mediaCards, contact];
  const mediaPills = [["articles", "ARTICLES"], ["shorts", "SHORTS"], ["podcast", "PODCAST"], ["social", "SOCIAL"]]
    .map(([key, label]) => ({ key, label, active: mediaSort === key }));

  // ---- STATS (all SAMPLE — no stats pipeline yet) ----
  const seasonCells = [
    [stats.tackles, "TACKLES"], [stats.int, "INTERCEPTIONS"], [stats.pbu, "PASS BREAKUPS"],
    [stats.solo, "SOLO"], [stats.ff, "FORCED FUM."], [stats.dtd, "DEF. TD"],
  ].map(([value, label]) => ({ value, label }));
  const careerSeasons = [...(data.careerSeasons ?? [])].sort((a, b) => a.year.localeCompare(b.year, undefined, { numeric: true }));
  const totalCareerGames = careerSeasons.reduce((total, season) => total + season.gamesPlayed, 0);
  const suppliedCareerStats = data.careerStats ?? [];
  const careerCells = [
    {
      key: "games",
      label: "GAMES",
      value: careerSeasons.length ? totalCareerGames : data.gamesPlayed ?? "—",
    },
    ...suppliedCareerStats.filter((stat) => stat.key.toLowerCase() !== "games"),
  ];
  const visibleCareerCells = showAllCareerStats ? careerCells : careerCells.slice(0, 6);
  const collegeTeams = data.schools.length
    ? data.schools
    : data.school
      ? [{ label: data.school.abbr, color: data.school.primaryColor, logo: data.school.logoUrl }]
      : [];
  const careerTeams = Array.from(
    new Map(
      [...collegeTeams, ...data.proTeams].map((team) => [team.label.trim().toUpperCase(), team]),
    ).values(),
  );
  const maxCareerGames = Math.max(...careerSeasons.map((season) => season.gamesPlayed), 1);
  const careerGameBars = careerSeasons.map((season) => ({
    ...season,
    levelLabel: season.level.toUpperCase(),
    value: formatStatNumber(season.gamesPlayed),
    barStyle: { width: 26, height: Math.max(8, season.gamesPlayed / maxCareerGames * 100) + "%", borderRadius: 5, background: season.level.toLowerCase() === "pro" ? "linear-gradient(180deg,#FFB940,#C77D00)" : "linear-gradient(180deg,#2952FF,#1A3DCC)", transformOrigin: "bottom", animation: "barGrow .6s cubic-bezier(.16,1,.3,1) both" } as React.CSSProperties,
  }));
  const timeline = [
    { year: "2021", tag: "TRUE FRESHMAN", title: "BROKE THE ROTATION", note: "Started 4 games, first career INT. Freshman All-American nod." },
    { year: "2022", tag: "RB1 SHUTDOWN", title: "LOCKDOWN ISLAND", note: "Held opposing WR1s to 38% completion. Named team captain." },
    { year: "2023", tag: "ALL-CONFERENCE", title: "FIRST-TEAM ALL-CONFERENCE", note: "4 INT, 2 returned for scores. Led conference in PBU." },
    { year: "2024", tag: "THE LEAP", title: "CONSENSUS ALL-AMERICAN", note: "Thorpe finalist. $14K in pool earnings shared with the secondary." },
  ];
  const gameLogSections = data.gameLogs ?? [];
  const statsPills = [["career", "STATS"], ["awards", "AWARDS"], ["log", "GAME LOG"]]
    .map(([key, label]) => ({ key, label, active: statsSort === key }));

  const hasBio = hasKnownText(data.bio) && !data.bio.includes("hasn't written their story yet");
  const displayBio =
    hasBio
      ? data.bio
      : "Bio has not been added yet. BLTZ will show an athlete-written summary or a verified profile snippet once signup, scraped source, school, or team data is available.";
  const displayHometown = hasKnownText(data.hometown) ? data.hometown : unknownText;
  const displayStory =
    hasBio
      ? `Early Life: ${data.bio}\n\nCollege: BLTZ will expand this section with scraped school history, roster context, awards, and career milestones from verified sources.\n\nProfessional: Pro team, draft, media, and post-college details will appear here when available from organization/team data.`
      : `Early Life: Verified early-life details have not been added yet.\n\nCollege: School history, roster context, awards, and major performances will appear here once signup, scraped source, school, or team data is available.\n\nProfessional: Draft notes, pro affiliations, media coverage, and career milestones will populate here as verified organization and league data becomes available.`;
  const displayDob = hasKnownText(data.dobDisplay) ? `${data.dobDisplay}${data.age ? ` (${data.age})` : ""}` : unknownText;
  const knownJerseyNumbers = (data.jerseyNumbers ?? []).filter(hasKnownText);
  const displayJerseyNumbers = knownJerseyNumbers.length
    ? knownJerseyNumbers
    : hasKnownText(data.jersey)
      ? [data.jersey]
      : [];
  const displayPosition = hasKnownText(data.position) ? data.position : unknownText;
  const displayHighSchool = hasKnownText(data.highSchool) ? data.highSchool : unknownText;

  const tabIdx = { bio: 0, media: 1, stats: 2 }[tab];
  const earnedFmt = "$" + (stats.earned || 0).toLocaleString("en-US");
  const viewsFmt = Math.round((stats.views || 0) / 1000) + "K";

  const reelBase: React.CSSProperties = { position: "absolute", inset: 0, backgroundSize: "cover", backgroundPosition: "center", animation: "heroFade 18s ease-in-out infinite" };

  const renderSocialCard = (post: (typeof mediaSocial)[number], index: number) => (
    <button
      type="button"
      key={`${post.platform}-${index}`}
      className={`locker-social-card locker-social-card--${post.format}`}
      onClick={() => setSelectedSocialIndex(index)}
      aria-label={`Open ${post.platform} post from ${post.handle}`}
      style={{ position: "relative", overflow: "hidden", border: "none", padding: 0, background: GRAD_FIELD, textAlign: "left", cursor: "pointer" }}
    >
      {post.img ? <img src={post.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(5,7,15,.88),rgba(5,7,15,.04) 58%)" }} />
      <div style={{ position: "absolute", top: 8, left: 8, padding: "4px 7px", borderRadius: 9999, background: "rgba(11,14,26,.7)", border: "1px solid rgba(255,255,255,.14)", fontFamily: mono, fontSize: 7.5, letterSpacing: ".1em", color: "#fff", textTransform: "uppercase" }}>{post.platform}</div>
      <div style={{ position: "absolute", left: 10, right: 10, bottom: 10 }}>
        <div style={{ fontFamily: mono, fontSize: 7.5, letterSpacing: ".1em", color: lockerAccent, textTransform: "uppercase", marginBottom: 4 }}>{post.handle}</div>
        <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: ".08em", color: "rgba(255,255,255,.68)", textTransform: "uppercase" }}>{post.meta}</div>
      </div>
    </button>
  );

  return (
    <div className="locker-page-shell" style={{ minHeight: isEmbedded ? "100%" : "100dvh", height: isEmbedded ? "100%" : undefined, width: "100%", overflow: isEmbedded ? "hidden" : undefined, background: "#05070F", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: body }}>
      <style>{styleSheet}</style>
      <div className={`bltz-frame${isEmbedded ? " bltz-frame-embedded" : ""}`}>

        {/* STICKY MINI HEADER */}
        <div className="locker-sticky-header" style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 30,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 18px", background: "rgba(11,14,26,.9)", backdropFilter: "blur(20px)",
          borderBottom: "1px solid #1E2640",
          transform: scrolled ? "translateY(0)" : "translateY(-110%)",
          opacity: scrolled ? 1 : 0, transition: "transform .4s cubic-bezier(.16,1,.3,1),opacity .3s",
          pointerEvents: scrolled ? "auto" : "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9999, overflow: "hidden", background: "#0A1A6E", flex: "none", border: "1px solid #1E2640" }}>
              <img src={data.headshotUrl} alt="" style={{ width: "150%", height: "150%", objectFit: "cover", objectPosition: "50% 8%" }} />
            </div>
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontFamily: disp, fontWeight: 800, fontSize: 16, letterSpacing: "-.02em", textTransform: "uppercase", color: "#fff" }}>{data.fullName}</div>
              <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".14em", color: "rgba(255,255,255,.5)", marginTop: 2 }}>
                {[data.position, schoolAbbr, data.jersey].filter(Boolean).join(" · ")}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
            <button
              type="button"
              aria-label="Search BLTZ"
              onClick={openSiteSearch}
              style={{ width: 34, height: 34, borderRadius: 9999, border: "1px solid #1E2640", background: "rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "none" }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#FFB940" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            </button>
            <button onClick={() => setFollowing((f) => !f)} style={following ? followOff : followOn}>
              {following ? "FOLLOWING" : "+ FOLLOW"}
            </button>
          </div>
        </div>

        {/* SCROLL AREA */}
        <div className="scr" ref={screenRef} style={{ position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden" }}>

          {/* ===== TOP BAR (outside the hero container) ===== */}
          <div className="locker-topbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 12px", position: "relative", zIndex: 6 }}>
            <img src={data.logoSrc} alt="BLTZ" style={{ height: 30, width: "auto", display: "block" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button type="button" aria-label="Search BLTZ" onClick={openSiteSearch} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFB940" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
              </button>
              <div style={{ width: 38, height: 38, borderRadius: 9999, overflow: "hidden", background: "#0A1A6E", border: "1px solid rgba(255,255,255,.2)" }}>
                <img src={data.headshotUrl} alt="" style={{ width: "150%", height: "150%", objectFit: "cover", objectPosition: "50% 6%" }} />
              </div>
            </div>
          </div>

          {/* ===== HERO ===== */}
          <section className="locker-hero-section" style={{ padding: "0 18px" }}>
            <div className="locker-hero-card" style={{ position: "relative", height: 600, borderRadius: 24, overflow: "hidden", background: "linear-gradient(180deg,#161B30 0%,#10142404 55%,#0B0E1A 100%)" }}>
              {/* video / photo-reel background */}
              <div className="locker-hero-media">
                {data.heroVideoUrl ? (
                  <video
                    ref={heroVideoRef}
                    src={data.heroVideoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  [0, 6, 12].map((delay, i) => {
                    const img = poolAt(i);
                    return img ? <div key={i} style={{ ...reelBase, backgroundImage: `url(${img})`, animationDelay: `${delay}s` }} /> : null;
                  })
                )}
                {/* stadium grid */}
                <div style={{ position: "absolute", inset: "-40%", backgroundImage: "linear-gradient(rgba(41,82,255,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(41,82,255,.10) 1px,transparent 1px)", backgroundSize: "46px 46px", transformOrigin: "50% 40%", animation: "drift 20s ease-in-out infinite alternate", pointerEvents: "none" }} />
                {/* glows */}
                <div style={{ position: "absolute", top: -60, left: -80, width: 340, height: 340, borderRadius: 9999, background: "radial-gradient(circle,rgba(41,82,255,.35),transparent 70%)", animation: "glowA 7s ease-in-out infinite", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: 120, right: -70, width: 260, height: 260, borderRadius: 9999, background: "radial-gradient(circle,rgba(245,166,35,.28),transparent 70%)", animation: "glowB 8s ease-in-out infinite", pointerEvents: "none" }} />
                {/* bottom blend */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(11,14,26,.15) 0%,rgba(11,14,26,0) 30%,rgba(11,14,26,.15) 52%,rgba(11,14,26,.72) 78%,#0B0E1A 100%)", pointerEvents: "none" }} />
              </div>

              {/* Spotify "now playing" — live. Collapses entirely when the athlete
                  hasn't linked Spotify or nothing is currently playing. */}
              {nowPlaying && (
                <a
                  href={nowPlaying.url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Now playing on Spotify: ${nowPlaying.title} by ${nowPlaying.artists}`}
                  style={{
                    position: "absolute", top: 16, left: 16, zIndex: 6,
                    display: "flex", alignItems: "center", gap: 9, maxWidth: 236,
                    padding: "6px 12px 6px 6px", borderRadius: 9999,
                    background: "rgba(11,14,26,.72)", backdropFilter: "blur(10px)",
                    border: "1px solid rgba(29,185,84,.55)", textDecoration: "none",
                    boxShadow: "0 4px 16px rgba(0,0,0,.45)", animation: "tabIn .45s cubic-bezier(.16,1,.3,1)",
                  }}
                >
                  {nowPlaying.albumArt ? (
                    <img src={nowPlaying.albumArt} alt="" style={{ width: 34, height: 34, borderRadius: 7, objectFit: "cover", flex: "none" }} />
                  ) : (
                    <span style={{ width: 34, height: 34, borderRadius: 7, background: "#1DB954", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#0B0E1A"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.586 14.424a.622.622 0 0 1-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.622.622 0 1 1-.277-1.215c3.809-.871 7.077-.496 9.712 1.115a.623.623 0 0 1 .207.857zm1.223-2.722a.78.78 0 0 1-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.779.779 0 1 1-.452-1.491c3.632-1.102 8.147-.568 11.234 1.329a.78.78 0 0 1 .255 1.071zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71a.935.935 0 1 1-.542-1.79c3.532-1.072 9.404-.865 13.115 1.338a.936.936 0 0 1-.954 1.61z" /></svg>
                    </span>
                  )}
                  <span style={{ minWidth: 0, display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ display: "flex", alignItems: "flex-end", gap: 1.5, height: 9 }}>
                        {[0, 0.2, 0.4].map((d, i) => (
                          <span key={i} style={{ width: 2, background: "#1DB954", borderRadius: 1, height: "100%", animation: `eqbar 1.1s ease-in-out ${d}s infinite` }} />
                        ))}
                      </span>
                      <span style={{ fontFamily: mono, fontSize: 7.5, letterSpacing: ".14em", color: "#1DB954", textTransform: "uppercase", fontWeight: 700 }}>Now Playing</span>
                    </span>
                    <span style={{ fontFamily: disp, fontWeight: 700, fontSize: 13, color: "#fff", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{nowPlaying.title}</span>
                    <span style={{ fontFamily: mono, fontSize: 9, color: "rgba(255,255,255,.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>{nowPlaying.artists}</span>
                  </span>
                </a>
              )}

              {/* center play/pause — only meaningful when a real hero video is playing */}
              {data.heroVideoUrl && (
                <button
                  onClick={toggleHeroVideo}
                  aria-label={heroPlaying ? "Pause background video" : "Play background video"}
                  style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 5, width: 62, height: 62, borderRadius: 9999, border: "1.5px solid rgba(255,255,255,.55)", background: "rgba(11,14,26,.3)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  {heroPlaying ? (
                    <span style={{ display: "flex", gap: 5, alignItems: "center", width: 16, height: 18 }}>
                      <span style={{ width: 5, height: 18, background: "#fff", borderRadius: 1 }} />
                      <span style={{ width: 5, height: 18, background: "#fff", borderRadius: 1 }} />
                    </span>
                  ) : (
                    <span style={{ display: "block", width: 0, height: 0, borderLeft: "18px solid #fff", borderTop: "12px solid transparent", borderBottom: "12px solid transparent", marginLeft: 5 }} />
                  )}
                </button>
              )}

              {/* cutout headshot — bottom edge masked so it dissolves into the
                  container background, letting the name/hometown read clearly */}
              <img className="locker-hero-headshot" src={data.headshotUrl} alt={data.fullName} style={{ position: "absolute", bottom: 96, left: "50%", transform: "translateX(-50%)", height: 268, width: 210, objectFit: "cover", objectPosition: "top", zIndex: 3, filter: "drop-shadow(0 24px 40px rgba(0,0,0,.55))", WebkitMaskImage: "linear-gradient(to bottom,#000 74%,transparent 100%)", maskImage: "linear-gradient(to bottom,#000 74%,transparent 100%)" }} />

              {/* small solid-navy fade pinned to the bottom of the headshot — same
                  color as the container background, so name + hometown pop */}
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 96, height: 90, zIndex: 3, background: "linear-gradient(to bottom, rgba(11,14,26,0) 0%, rgba(11,14,26,.55) 55%, #0B0E1A 100%)", pointerEvents: "none" }} />

              {/* name-readability gradient — on top of the headshot, behind the name/pills */}
              <div style={{ position: "absolute", inset: 0, zIndex: 4, background: "linear-gradient(to bottom, transparent 0%, transparent 58%, rgba(5,7,15,.5) 78%, rgba(11,14,26,.95) 100%)", pointerEvents: "none" }} />

              {/* name block */}
              <div className="locker-hero-copy" style={{ position: "absolute", bottom: 18, left: 0, right: 0, zIndex: 5, textAlign: "center", padding: "0 16px" }}>
                <h1 style={{ fontFamily: disp, fontWeight: 900, fontSize: heroNameSize, lineHeight: ".9", letterSpacing: "-.005em", textTransform: "uppercase", color: "#fff", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{data.fullName}</h1>
                <div style={{ fontFamily: mono, fontSize: 14, letterSpacing: ".14em", color: "#F5A623", margin: "8px 0 14px", fontWeight: 700 }}>{data.hometown}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
                  <RotatingPill items={data.schools} fallback={{ label: "SCHOOL", color: "#1A3DCC" }} />
                  <div style={{ width: 46, height: 46, borderRadius: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.28)", backdropFilter: "blur(8px)", fontFamily: disp, fontWeight: 800, fontSize: 16, color: "#fff", flex: "none" }}>{data.position || "—"}</div>
                  <RotatingPill items={data.proTeams} fallback={{ label: data.levelLabel.toUpperCase(), color: "#1A3DCC" }} />
                </div>
              </div>

              {/* container stroke — fades out toward the bottom */}
              <div className="locker-hero-stroke" style={{ position: "absolute", inset: 0, border: "1px solid rgba(255,255,255,.18)", pointerEvents: "none", WebkitMaskImage: "linear-gradient(to bottom,#000 0%,#000 42%,transparent 88%)", maskImage: "linear-gradient(to bottom,#000 0%,#000 42%,transparent 88%)" }} />
            </div>
          </section>

          {hasAthleteQuote && (
            <section style={{ padding: "10px 18px 0" }}>
              <div style={{ padding: "0 2px", textAlign: "center" }}>
                <p className="locker-athlete-quote" style={{ margin: 0, fontFamily: mono, fontWeight: 700, lineHeight: 1.5, color: "rgba(255,255,255,.86)" }}>
                  “{displayAthleteQuote}”
                </p>
                <div className="locker-athlete-quote-author" style={{ marginTop: 8, fontFamily: mono, letterSpacing: ".14em", color: "rgba(255,255,255,.48)", textTransform: "uppercase" }}>
                  {displayAthleteQuoteAuthor}
                </div>
              </div>
            </section>
          )}

          {/* ===== FILM ROOM ===== */}
          <section className="locker-film-section" style={{ padding: "18px 18px 4px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
              <h2 style={{ fontFamily: disp, fontWeight: 700, fontSize: 24, lineHeight: 1, letterSpacing: "-.02em", textTransform: "uppercase", color: "#fff", margin: 0 }}>FILM ROOM</h2>
              <a
                href={`/player/${data.slug}/videos`}
                aria-label="View all videos"
                style={{ width: 34, height: 34, borderRadius: 9999, border: "1px solid #1E2640", background: "rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "none", textDecoration: "none" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFB940" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </a>
            </div>
            <div className="hs" style={{ display: "flex", gap: 12, overflowX: "auto", padding: "4px 0 8px", scrollSnapType: "x mandatory" }}>
              {videos.map((v, i) => (
                <div key={v.id + i} style={{ flex: "none", width: 262, scrollSnapAlign: "start", cursor: v.isPlaceholder ? "default" : "pointer" }}>
                  <div style={{ position: "relative", height: 150, borderRadius: 14, overflow: "hidden", border: "1px solid #1E2640", background: GRAD_FIELD }}>
                    {v.img ? <img src={v.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: .92 }} /> : null}
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, #05070F, rgba(5,7,15,.05) 55%)" }} />
                    <div style={{ position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: 5, padding: "4px 8px", borderRadius: 9999, background: "rgba(11,14,26,.6)", border: "1px solid rgba(245,166,35,.4)", backdropFilter: "blur(6px)" }}>
                      <span style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: ".14em", color: "#FFB940" }}>▲ {v.tag}</span>
                    </div>
                    <div style={{ position: "absolute", top: 10, right: 10, padding: "3px 7px", borderRadius: 6, background: "rgba(11,14,26,.7)", fontFamily: mono, fontSize: 9, letterSpacing: ".08em", color: "#fff" }}>{v.dur}</div>
                    <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 33, height: 33, borderRadius: 9999, background: "linear-gradient(135deg,#FFB940,#F5A623,#C77D00)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(245,166,35,.45)" }}>
                      <span style={{ display: "block", width: 0, height: 0, borderLeft: "12px solid #0A0800", borderTop: "8px solid transparent", borderBottom: "8px solid transparent", marginLeft: 3 }} />
                    </div>
                    <div style={{ position: "absolute", left: 10, right: 10, bottom: 10 }}>
                      <div style={{ fontFamily: disp, fontWeight: 700, fontSize: 15, letterSpacing: ".01em", textTransform: "uppercase", color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,.6)", lineHeight: ".95", maxWidth: "82%" }}>{v.title}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7 }}>
                        <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: ".08em", color: "#FFB940", fontWeight: 600, textShadow: "0 1px 4px rgba(0,0,0,.6)" }}>{v.views}</span>
                        <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: ".08em", color: "rgba(255,255,255,.55)", textShadow: "0 1px 4px rgba(0,0,0,.6)" }}>· {v.when}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ===== PHOTOS ===== */}
          <section className="locker-photos-section" style={{ padding: "20px 18px 8px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
              <h1 style={{ fontFamily: disp, fontWeight: 700, fontSize: 24, lineHeight: 1, letterSpacing: "-.02em", textTransform: "uppercase", color: "#fff", margin: 0 }}>PHOTOS</h1>
              <a
                href={`/player/${data.slug}/photos`}
                aria-label="View all photos"
                style={{ width: 34, height: 34, borderRadius: 9999, border: "1px solid #1E2640", background: "rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "none", textDecoration: "none" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFB940" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </a>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gridAutoRows: 104, gap: 8 }}>
              <div style={{ gridColumn: "1/3", gridRow: "1/3", borderRadius: 14, overflow: "hidden", position: "relative", border: "1px solid #1E2640", background: GRAD_FIELD }}>
                {data.photos[0] ? (
                  <>
                    <img src={data.photos[0].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(5,7,15,.7),transparent 50%)" }} />
                  <div style={{ position: "absolute", top: 10, left: 10, padding: "4px 8px", borderRadius: 9999, background: "rgba(11,14,26,.72)", border: "1px solid rgba(255,255,255,.14)", backdropFilter: "blur(6px)", fontFamily: mono, fontSize: 8.5, letterSpacing: ".14em", color: "#FFB940" }}>{data.photos[0].licenseLabel}</div>
                  <div style={{ position: "absolute", left: 12, right: 12, bottom: 11 }}>
                    {data.photos[0].title ? <div style={{ fontFamily: disp, fontWeight: 700, fontSize: 16, textTransform: "uppercase", color: "#fff", letterSpacing: ".02em", textShadow: "0 2px 8px rgba(0,0,0,.6)", lineHeight: ".95" }}>{data.photos[0].title}</div> : null}
                    {data.photos[0].credits ? <div style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: ".1em", color: "rgba(255,255,255,.62)", marginTop: 6, textTransform: "uppercase" }}>{data.photos[0].credits}</div> : null}
                  </div>
                  </>
                ) : (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 14, background: "linear-gradient(145deg,rgba(19,24,41,.95),rgba(10,26,110,.62))" }}>
                    <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".16em", color: "#FFB940", marginBottom: 8 }}>LICENSE CHECK</div>
                    <div style={{ fontFamily: disp, fontWeight: 800, fontSize: 21, lineHeight: ".92", textTransform: "uppercase", color: "#fff" }}>Awaiting Approved Photos</div>
                  </div>
                )}
              </div>
              {[1, 2, 3].map((idx, k) => (
                <div key={idx} style={{ gridColumn: k === 2 ? "1/2" : "3/4", gridRow: k === 0 ? "1/2" : k === 1 ? "2/3" : "3/4", borderRadius: 14, overflow: "hidden", border: "1px solid #1E2640", position: "relative", background: "#131829" }}>
                  {data.photos[idx] ? <img src={data.photos[idx].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                  <div style={{ position: "absolute", inset: 0, background: data.photos[idx] ? "linear-gradient(to top,rgba(5,7,15,.55),transparent 60%)" : "linear-gradient(135deg,rgba(255,255,255,.04),rgba(10,26,110,.28))" }} />
                  <div style={{ position: "absolute", left: 8, right: 8, bottom: 8, fontFamily: mono, fontSize: 7.5, letterSpacing: ".12em", color: "rgba(255,255,255,.72)", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.photos[idx]?.licenseLabel ?? "READY SLOT"}</div>
                </div>
              ))}
              <div style={{ gridColumn: "2/4", gridRow: "3/4", borderRadius: 14, overflow: "hidden", position: "relative", border: "1px solid #1E2640", background: GRAD_FIELD }}>
                {data.photos[4] ? <img src={data.photos[4].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: .9 }} /> : null}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg,rgba(10,26,110,.5),transparent)" }} />
                <div style={{ position: "absolute", left: 12, bottom: 11, fontFamily: mono, fontSize: 8.5, letterSpacing: ".12em", color: "rgba(255,255,255,.72)", textTransform: "uppercase" }}>{data.photos[4]?.licenseLabel ?? "SCRAPED / UPLOADED MEDIA"}</div>
                {data.photos.length > 5 ? <div style={{ position: "absolute", right: 12, bottom: 11, fontFamily: mono, fontSize: 10, letterSpacing: ".14em", color: "#fff" }}>+{data.photos.length - 5} MORE</div> : null}
              </div>
            </div>
          </section>

          {/* ===== TABS ===== */}
          <section className="locker-tabs-section" style={{ padding: "24px 0 0" }}>
            <Tabs
              value={tab}
              onValueChange={(value) => selectTab(value as "bio" | "media" | "stats")}
              className="gap-0"
            >
              <div className="locker-tabs-nav" style={{ padding: "0 18px" }}>
                <TabsList className="locker-main-tabs-list relative grid h-[52px] w-full grid-cols-3 overflow-hidden rounded-full border border-[#1E2640] bg-[#111624] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-1.5 left-1.5 top-1.5 rounded-full"
                    style={{
                      width: "calc((100% - 12px) / 3)",
                      transform: `translateX(${tabIdx * 100}%)`,
                      background: lockerAccent,
                      transition: "transform .34s cubic-bezier(.22,1,.36,1)",
                      willChange: "transform",
                    }}
                  />
                  {[
                    ["bio", "BIO"],
                    ["media", "MEDIA"],
                    ["stats", "CAREER"],
                  ].map(([value, label]) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="locker-main-tab relative z-10 h-10 rounded-full border-0 px-2 font-extrabold uppercase tracking-normal text-white/45 transition-colors duration-300 data-[state=active]:text-[#0B0E1A]"
                      style={{ fontFamily: disp, background: "transparent", boxShadow: "none", textShadow: tabTextShadow }}
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

            {/* BIO TAB */}
            {tab === "bio" && (
              <div style={{ animation: "tabIn .4s cubic-bezier(.16,1,.3,1)", paddingTop: 16 }}>
                <div className="hs locker-filter-row" style={{ display: "flex", gap: 9, justifyContent: "center", overflowX: "auto", padding: "0 18px 4px" }}>
                  {bioPills.map((p) => (
                    <button className="locker-filter-pill" key={p.key} onClick={() => setBioSort(p.key)} style={pillStyle(p.active)}>{p.label}</button>
                  ))}
                </div>
                {bioSort === "all" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "42% 1fr", gap: 8, alignItems: "start", padding: "14px 18px 10px" }}>
                    <div className="bio-headshot-card">
                      <div className="bio-headshot-image">
                        <img
                          className="bio-headshot-photo"
                          src={data.headshotUrl}
                          alt={`${data.fullName} headshot`}
                          onError={(event) => {
                            if (event.currentTarget.src.endsWith(HEADSHOT_FALLBACK)) return;
                            event.currentTarget.src = HEADSHOT_FALLBACK;
                          }}
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", filter: "drop-shadow(0 10px 18px rgba(0,0,0,.55))" }}
                        />
                      </div>
                      <div className="bio-headshot-year" aria-label={`Headshot year ${data.headshotYear ?? "pending"}`}>
                        {data.headshotYear ?? "YEAR PENDING"}
                      </div>
                    </div>
                    <div style={{ minHeight: 216, borderRadius: 14, border: "1px solid #1E2640", background: "#131829", padding: 16, display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
                      <div style={{ fontFamily: disp, fontWeight: 800, fontSize: 18, lineHeight: 1, letterSpacing: ".02em", textTransform: "uppercase", color: lockerAccent, marginBottom: 14 }}>BASIC INFO</div>
                      <div className="basic-info-grid">
                        <IdRow className="basic-info-hometown" label="HOMETOWN" value={displayHometown} />
                        <IdRow className="basic-info-birthdate" label="BIRTHDATE" value={displayDob} />
                        <JerseyNumberRow values={displayJerseyNumbers} fallback={unknownText} />
                        <IdRow label="POSITION" value={displayPosition} />
                        <IdRow className="basic-info-high-school" label="HIGH SCHOOL" value={displayHighSchool} />
                      </div>
                    </div>
                    <div style={{ gridColumn: "1/3", minHeight: 326, borderRadius: 14, border: "1px solid #1E2640", background: "#131829", padding: "22px 20px", display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
                      <div style={{ fontFamily: disp, fontWeight: 800, fontSize: 18, lineHeight: 1, letterSpacing: ".02em", textTransform: "uppercase", color: lockerAccent, marginBottom: 14 }}>BIO</div>
                      <p style={{ fontFamily: body, fontSize: 15, lineHeight: 1.62, color: "rgba(255,255,255,.78)", margin: 0 }}>{displayBio}</p>
                    </div>
                  </div>
                ) : bioSort === "measurables" ? (
                  <div style={{ padding: "14px 18px 10px" }}>
                    <div style={{ borderRadius: 14, border: "1px solid #1E2640", background: "#131829", overflow: "hidden" }}>
                      <div style={{ padding: "18px 18px 16px", background: "#131829", borderBottom: "1px solid #1E2640" }}>
                        <div style={{ fontFamily: disp, fontWeight: 800, fontSize: 18, lineHeight: 1, letterSpacing: ".02em", textTransform: "uppercase", color: lockerAccent, marginBottom: 14 }}>MEASURABLES</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
                          <div style={{ borderRadius: 12, padding: "14px 13px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", textAlign: "center" }}>
                            <div style={{ fontFamily: disp, fontWeight: 900, fontSize: 38, lineHeight: ".85", color: "#fff" }}>{data.heightDisplay || pendingMetric}</div>
                            <div style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: ".13em", color: "rgba(255,255,255,.48)", marginTop: 8 }}>HEIGHT</div>
                          </div>
                          <div style={{ borderRadius: 12, padding: "14px 13px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", textAlign: "center" }}>
                            <div style={{ fontFamily: disp, fontWeight: 900, fontSize: 38, lineHeight: ".85", color: "#fff" }}>{data.weightLbs ?? pendingMetric}</div>
                            <div style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: ".13em", color: "rgba(255,255,255,.48)", marginTop: 8 }}>WEIGHT · LBS</div>
                          </div>
                        </div>
                      </div>
                      <div style={{ padding: "14px 14px 16px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
                          {combineMetrics.map((metric) => (
                            <div key={metric.label} style={{ minHeight: 96, borderRadius: 12, padding: "13px 10px", background: "#0F1424", border: "1px solid #1E2640", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 8 }}>
                              <div>
                                <div style={{ fontFamily: disp, fontWeight: 900, fontSize: 27, lineHeight: ".85", color: "#fff" }}>{metric.value}</div>
                                <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: ".11em", color: metric.tone, marginTop: 4 }}>{metric.unit}</div>
                              </div>
                              <div style={{ fontFamily: mono, fontSize: 7.5, letterSpacing: ".1em", color: "rgba(255,255,255,.42)", textTransform: "uppercase", lineHeight: 1.15 }}>{metric.label}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}>
                          <span style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: ".13em", color: "rgba(255,255,255,.46)", textTransform: "uppercase" }}>Combine board</span>
                          <span style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: ".13em", color: lockerAccent, textTransform: "uppercase" }}>Awaiting verified data</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : bioSort === "story" ? (
                  <div style={{ padding: "14px 18px 10px" }}>
                    <div style={{ borderRadius: 14, border: "1px solid #1E2640", background: "#131829", padding: "22px 20px 24px" }}>
                      <div style={{ fontFamily: disp, fontWeight: 800, fontSize: 18, lineHeight: 1, letterSpacing: ".02em", textTransform: "uppercase", color: lockerAccent, marginBottom: 16 }}>THE STORY</div>
                      <p style={{ fontFamily: body, fontSize: 16, lineHeight: 1.72, color: "rgba(255,255,255,.82)", margin: 0, whiteSpace: "pre-line" }}>{displayStory}</p>
                    </div>
                  </div>
                ) : (
                  <div className="hs" style={{ display: "flex", gap: 12, overflowX: "auto", padding: "14px 18px 10px", alignItems: "stretch", scrollSnapType: "x mandatory" }}>
                    {bioCards.map((c: any, i) => (
                      <div key={i} style={c.style}>
                        {c.isStat && (
                          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", padding: 16 }}>
                            <div style={{ fontFamily: disp, fontWeight: 900, fontSize: 40, lineHeight: ".85", letterSpacing: "-.02em", color: "#fff" }}>{c.value}</div>
                            <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: ".14em", color: lockerAccent, marginTop: 8 }}>{c.label}</div>
                          </div>
                        )}
                        {c.isAward && (
                          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", padding: 16 }}>
                            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".1em", color: lockerAccent }}>★ {c.year}</div>
                            <div style={{ fontFamily: disp, fontWeight: 800, fontSize: 19, lineHeight: ".95", textTransform: "uppercase", color: "#fff" }}>{c.label}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MEDIA TAB */}
            {tab === "media" && (
              <div style={{ animation: "tabIn .4s cubic-bezier(.16,1,.3,1)", paddingTop: 16 }}>
                <div className="hs locker-filter-row" style={{ display: "flex", gap: 9, justifyContent: "center", overflowX: "auto", padding: "0 18px 4px" }}>
                  {mediaPills.map((p) => (
                    <button className="locker-filter-pill" key={p.key} onClick={() => setMediaSort(p.key)} style={pillStyle(p.active)}>{p.label}</button>
                  ))}
                </div>
                {mediaSort === "articles" ? (
                  <div style={{ padding: "14px 18px 10px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {mediaArticles.slice(0, 3).map((article) => (
                        <button key={article.title} type="button" onClick={() => setArticleModalOpen(true)} style={{ display: "grid", gridTemplateColumns: "74px 1fr", gap: 10, alignItems: "center", border: "1px solid #1E2640", borderRadius: 12, background: "#131829", padding: 8, textAlign: "left", cursor: "pointer" }}>
                          <div style={{ width: 74, height: 58, borderRadius: 8, overflow: "hidden", background: GRAD_FIELD }}>
                            {article.img ? <img src={article.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: ".13em", color: lockerAccent, textTransform: "uppercase", marginBottom: 4 }}>{article.source} · {article.meta}</div>
                            <div style={{ fontFamily: disp, fontWeight: 800, fontSize: 15, lineHeight: .95, color: "#fff", textTransform: "uppercase" }}>{article.title}</div>
                          </div>
                        </button>
                      ))}
                      <button type="button" onClick={() => setArticleModalOpen(true)} style={{ alignSelf: "center", marginTop: 2, border: "1px solid rgba(255,185,64,.45)", borderRadius: 9999, background: "rgba(255,185,64,.08)", color: lockerAccent, padding: "9px 13px", fontFamily: mono, fontWeight: 700, fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", cursor: "pointer" }}>
                        View all articles
                      </button>
                    </div>
                  </div>
                ) : mediaSort === "shorts" ? (
                  <div style={{ padding: "14px 18px 10px" }}>
                    <div style={{ position: "relative" }}>
                      <div
                        className="media-inner-scroll locker-shorts-grid"
                        ref={shortsScrollRef}
                        onScroll={handleShortsScroll}
                        style={{ height: 408, overflowY: "auto", overscrollBehavior: "auto", paddingRight: 6, display: "grid", gap: 10 }}
                      >
                      {mediaShorts.map((short, index) => (
                        <button
                          type="button"
                          key={short.title}
                          className="locker-short-card"
                          ref={(node) => { shortRefs.current[index] = node; }}
                          data-short-index={index}
                          onClick={() => {
                            shortModalInitialIndexRef.current = index;
                            setShortModalIndex(index);
                          }}
                          aria-label={`Open short: ${short.title}`}
                          style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #1E2640", padding: 0, background: "#131829", position: "relative", textAlign: "left", cursor: "pointer" }}
                        >
                          {short.videoUrl ? (
                            <video ref={(node) => { shortVideoRefs.current[index] = node; }} src={short.videoUrl} muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : short.img ? (
                            <img src={short.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", background: GRAD_FIELD }} />
                          )}
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(5,7,15,.92),rgba(5,7,15,.08) 58%,rgba(5,7,15,.18))" }} />
                          <div style={{ position: "absolute", top: 9, left: 9, padding: "4px 7px", borderRadius: 9999, background: activeShortIndex === index ? "rgba(255,185,64,.18)" : "rgba(11,14,26,.68)", border: `1px solid ${activeShortIndex === index ? "rgba(255,185,64,.45)" : "rgba(255,255,255,.13)"}`, fontFamily: mono, fontSize: 7.5, letterSpacing: ".12em", color: activeShortIndex === index ? lockerAccent : "rgba(255,255,255,.72)", textTransform: "uppercase" }}>
                            {activeShortIndex === index ? "Previewing" : "Short"}
                          </div>
                          <div style={{ position: "absolute", left: 11, right: 10, bottom: 11 }}>
                            <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: ".1em", color: lockerAccent, marginBottom: 5 }}>{short.source}</div>
                            <div style={{ fontFamily: disp, fontWeight: 800, fontSize: 16, lineHeight: .95, textTransform: "uppercase", color: "#fff" }}>{short.title}</div>
                            <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: ".08em", color: "rgba(255,255,255,.5)", marginTop: 7 }}>{short.meta}</div>
                          </div>
                        </button>
                      ))}
                      </div>
                      <div style={{ position: "absolute", top: 14 + shortsScrollProgress * 286, right: 1, width: 2, height: 54, borderRadius: 9999, background: "rgba(210,214,224,.72)", boxShadow: "0 0 8px rgba(210,214,224,.22)", opacity: shortsScrolling ? 1 : 0, transition: "opacity .22s ease, top .08s linear", pointerEvents: "none" }} />
                    </div>
                  </div>
                ) : mediaSort === "podcast" ? (
                  <div style={{ padding: "14px 18px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {mediaPodcast.length ? (
                      <div className="locker-podcast-grid">
                        {mediaPodcast.map((m) => (
                          <div key={m.id} style={{ minWidth: 0, height: 188, borderRadius: 14, overflow: "hidden", border: "1px solid #1E2640", background: "#131829" }}>
                            <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 14, background: "linear-gradient(150deg,#12183a,#131829)" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
                                <span style={{ width: 30, height: 30, flex: "0 0 auto", borderRadius: 8, background: "linear-gradient(135deg,#2952FF,#1A3DCC)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Mic size={16} strokeWidth={2.25} /></span>
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: mono, fontWeight: 700, fontSize: 7.5, letterSpacing: ".12em", color: lockerAccent, textTransform: "uppercase" }}>{m.type}</span>
                              </div>
                              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: mono, fontSize: 7.5, letterSpacing: ".1em", color: "rgba(255,255,255,.48)", textTransform: "uppercase", marginBottom: 7 }}>{m.source}</div>
                              <div style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 3, overflow: "hidden", fontFamily: disp, fontWeight: 800, fontSize: 16, lineHeight: .98, textTransform: "uppercase", color: "#fff", marginBottom: 12 }}>{m.title}</div>
                              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 26, marginTop: "auto" }}>
                                {[[.4, "#FFB940", 0], [.8, "#FFB940", .15], [.55, "#F5A623", .3], [.95, "#F5A623", .45], [.35, "#C77D00", .6], [.7, "#C77D00", .2]].map((b, k) => (
                                  <span key={k} style={{ width: 3, background: b[1] as string, borderRadius: 2, height: `${(b[0] as number) * 100}%`, animation: `eqbar 1.1s ease-in-out ${b[2]}s infinite` }} />
                                ))}
                                <span style={{ flex: 1 }} />
                                <span style={{ fontFamily: mono, fontSize: 8, color: "rgba(255,255,255,.6)" }}>{m.meta}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ width: "100%", minHeight: 178, borderRadius: 16, border: "1px solid #1E2640", background: "linear-gradient(150deg,#12183a,#131829)", padding: "22px 18px", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
                        <div style={{ fontFamily: disp, fontWeight: 900, fontSize: 24, lineHeight: .92, color: "#fff", textTransform: "uppercase", marginBottom: 12 }}>The mic is waiting</div>
                        <p style={{ margin: 0, fontFamily: body, fontSize: 14, lineHeight: 1.45, color: "rgba(255,255,255,.68)" }}>
                          No verified podcast appearances are attached yet, BLTZ will add interviews as they are discovered, approved, or shared by the athlete.
                        </p>
                      </div>
                    )}
                    <button type="button" style={{ width: "100%", minHeight: 58, borderRadius: 14, border: "1px solid rgba(255,185,64,.55)", background: "linear-gradient(135deg,#FFB940,#F5A623,#C77D00)", color: "#0A0800", fontFamily: disp, fontWeight: 800, fontSize: 16, letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer", boxShadow: "none" }}>
                      GET IN CONTACT
                    </button>
                  </div>
                ) : mediaSort === "social" ? (
                  <div style={{ padding: "14px 18px 10px" }}>
                    <div style={{ position: "relative" }}>
                      <div
                        className="media-inner-scroll locker-social-scroll"
                        ref={socialScrollRef}
                        onScroll={handleSocialScroll}
                        style={{ height: 408, overflowY: "auto", overscrollBehavior: "auto" }}
                      >
                        <div className="locker-social-layout locker-social-layout--mobile">
                          {[0, 1].map((column) => (
                            <div className="locker-social-column" key={column}>
                              {mediaSocial.map((post, index) => index % 2 === column ? renderSocialCard(post, index) : null)}
                            </div>
                          ))}
                        </div>
                        <div className="locker-social-layout locker-social-layout--desktop">
                          {[0, 1, 2].map((column) => (
                            <div className="locker-social-column" key={column}>
                              {mediaSocial.map((post, index) => index % 3 === column ? renderSocialCard(post, index) : null)}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ position: "absolute", top: 14 + socialScrollProgress * 286, right: 1, width: 2, height: 54, borderRadius: 9999, background: "rgba(210,214,224,.72)", boxShadow: "0 0 8px rgba(210,214,224,.22)", opacity: socialScrolling ? 1 : 0, transition: "opacity .22s ease, top .08s linear", pointerEvents: "none" }} />
                    </div>
                    <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", fontFamily: mono, fontSize: 8, letterSpacing: ".11em", color: "rgba(255,255,255,.52)", textTransform: "uppercase", lineHeight: 1.35 }}>
                      Connected social accounts will be managed from the athlete dashboard.
                    </div>
                  </div>
                ) : (
                  <div className="hs" style={{ display: "flex", gap: 12, overflowX: "auto", padding: "14px 18px 10px", alignItems: "stretch", scrollSnapType: "x mandatory" }}>
                    {mediaCards.map((m: any, i) => (
                      <div key={i} style={m.style}>
                        {m.isPodcast && (
                          <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 16, background: "linear-gradient(150deg,#12183a,#131829)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                              <span style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg,#2952FF,#1A3DCC)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎙</span>
                              <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".14em", color: "rgba(255,255,255,.5)" }}>{m.source}</span>
                            </div>
                            <div style={{ fontFamily: disp, fontWeight: 700, fontSize: 17, lineHeight: 1, textTransform: "uppercase", color: "#fff", marginBottom: 14 }}>{m.title}</div>
                            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 34, marginTop: "auto" }}>
                              {[[.4, "#FFB940", 0], [.8, "#FFB940", .15], [.55, "#F5A623", .3], [.95, "#F5A623", .45], [.35, "#C77D00", .6], [.7, "#C77D00", .2]].map((b, k) => (
                                <span key={k} style={{ width: 3, background: b[1] as string, borderRadius: 2, height: `${(b[0] as number) * 100}%`, animation: `eqbar 1.1s ease-in-out ${b[2]}s infinite` }} />
                              ))}
                              <span style={{ flex: 1 }} />
                              <span style={{ fontFamily: mono, fontSize: 10, color: "rgba(255,255,255,.6)" }}>{m.meta}</span>
                            </div>
                          </div>
                        )}
                        {m.isContact && (
                          <button type="button" style={{ width: "100%", height: "100%", border: "none", borderRadius: 16, background: "linear-gradient(135deg,#FFB940,#F5A623,#C77D00)", color: "#0A0800", fontFamily: disp, fontWeight: 800, fontSize: 16, letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer", boxShadow: "none" }}>
                            GET IN CONTACT
                          </button>
                        )}
                        {m.isVisual && (
                          <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
                            <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
                              {m.img ? <img src={m.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", background: GRAD_FIELD }} />}
                              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(5,7,15,.9),transparent 55%)" }} />
                              <div style={{ position: "absolute", top: 10, left: 10, padding: "4px 8px", borderRadius: 6, background: "rgba(11,14,26,.65)", border: "1px solid rgba(255,255,255,.12)", backdropFilter: "blur(6px)", fontFamily: mono, fontSize: 8, letterSpacing: ".14em", color: "#fff" }}>{m.kindLabel}</div>
                              <div style={{ position: "absolute", left: 12, right: 12, bottom: 11 }}>
                                <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".1em", color: "#FFB940", marginBottom: 4 }}>{m.source}</div>
                                <div style={{ fontFamily: disp, fontWeight: 700, fontSize: 16, lineHeight: ".98", textTransform: "uppercase", color: "#fff" }}>{m.title}</div>
                              </div>
                            </div>
                            <div style={{ padding: "9px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#131829" }}>
                              <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: ".08em", color: "rgba(255,255,255,.5)" }}>{m.meta}</span>
                              <span style={{ fontFamily: mono, fontSize: 11, color: "rgba(255,255,255,.35)" }}>→</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {shortModalIndex !== null && (
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Shorts viewer"
                    onClick={(event) => {
                      if (event.currentTarget === event.target) setShortModalIndex(null);
                    }}
                    style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(5,7,15,.9)", backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}
                  >
                    <div className="locker-short-modal-shell">
                      <div style={{ position: "absolute", top: 12, left: 12, zIndex: 3, padding: "5px 8px", borderRadius: 9999, border: "1px solid rgba(255,255,255,.14)", background: "rgba(5,7,15,.68)", fontFamily: mono, fontSize: 8, letterSpacing: ".12em", color: "#fff" }}>{shortModalIndex + 1} / {modalShortCount}</div>
                      <button type="button" onClick={() => setShortModalIndex(null)} aria-label="Close Shorts viewer" style={{ position: "absolute", top: 10, right: 10, zIndex: 3, width: 38, height: 38, borderRadius: 9999, border: "1px solid rgba(255,255,255,.18)", background: "rgba(5,7,15,.68)", color: "#fff", fontFamily: disp, fontSize: 22, cursor: "pointer" }}>×</button>
                      <button
                        type="button"
                        aria-label="Previous short"
                        disabled={shortModalIndex === 0}
                        onClick={() => {
                          const previousIndex = Math.max(0, shortModalIndex - 1);
                          const container = shortModalScrollRef.current;
                          container?.scrollTo({ top: previousIndex * container.clientHeight, behavior: "smooth" });
                          setShortModalIndex(previousIndex);
                        }}
                        className="locker-short-modal-arrow locker-short-modal-arrow--up"
                      ><ChevronUp size={17} strokeWidth={2.25} /></button>
                      <button
                        type="button"
                        aria-label="Next short"
                        disabled={shortModalIndex === modalShortCount - 1}
                        onClick={() => {
                          const nextIndex = Math.min(modalShortCount - 1, shortModalIndex + 1);
                          const container = shortModalScrollRef.current;
                          container?.scrollTo({ top: nextIndex * container.clientHeight, behavior: "smooth" });
                          setShortModalIndex(nextIndex);
                        }}
                        className="locker-short-modal-arrow locker-short-modal-arrow--down"
                      ><ChevronDown size={17} strokeWidth={2.25} /></button>
                      <div
                        className="locker-short-modal-feed"
                        ref={shortModalScrollRef}
                        onScroll={(event) => {
                          const container = event.currentTarget;
                          if (!container.clientHeight) return;
                          const nextIndex = Math.min(modalShortCount - 1, Math.max(0, Math.round(container.scrollTop / container.clientHeight)));
                          if (nextIndex !== shortModalIndex) setShortModalIndex(nextIndex);
                        }}
                      >
                        {mediaShorts.map((short, index) => (
                          <div
                            key={`modal-${short.title}`}
                            className="locker-short-modal-slide"
                          >
                            {short.videoUrl ? (
                              <video
                                ref={(node) => { shortModalVideoRefs.current[index] = node; }}
                                src={short.videoUrl}
                                autoPlay={index === shortModalIndex}
                                muted
                                playsInline
                                preload="metadata"
                                onEnded={() => {
                                  if (index >= modalShortCount - 1) return;
                                  const nextIndex = index + 1;
                                  const container = shortModalScrollRef.current;
                                  container?.scrollTo({ top: nextIndex * container.clientHeight, behavior: "smooth" });
                                  setShortModalIndex(nextIndex);
                                }}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : short.img ? (
                              <img src={short.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: "100%", height: "100%", background: GRAD_FIELD }} />
                            )}
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(5,7,15,.94),rgba(5,7,15,.02) 62%,rgba(5,7,15,.28))", pointerEvents: "none" }} />
                            <div style={{ position: "absolute", left: 18, right: 54, bottom: 22, zIndex: 1 }}>
                              <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".12em", color: lockerAccent, textTransform: "uppercase", marginBottom: 7 }}>{short.source}</div>
                              <div style={{ fontFamily: disp, fontWeight: 900, fontSize: 27, lineHeight: .92, color: "#fff", textTransform: "uppercase" }}>{short.title}</div>
                              <div style={{ marginTop: 9, fontFamily: mono, fontSize: 9, letterSpacing: ".1em", color: "rgba(255,255,255,.62)", textTransform: "uppercase" }}>{short.meta}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {articleModalOpen && (
                  <div role="dialog" aria-modal="true" aria-label="Articles" style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(5,7,15,.78)", backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
                    <div style={{ width: "min(100%, 520px)", maxHeight: "82dvh", border: "1px solid #1E2640", borderRadius: 18, background: "#0B0E1A", boxShadow: "0 24px 90px rgba(0,0,0,.58)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "18px 18px 12px", borderBottom: "1px solid #1E2640" }}>
                        <div>
                          <div style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: ".16em", color: lockerAccent, textTransform: "uppercase", marginBottom: 5 }}>Media archive</div>
                          <div style={{ fontFamily: disp, fontWeight: 900, fontSize: 24, lineHeight: .9, textTransform: "uppercase", color: "#fff" }}>Articles</div>
                        </div>
                        <button type="button" onClick={() => setArticleModalOpen(false)} aria-label="Close articles" style={{ width: 36, height: 36, borderRadius: 9999, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)", color: "#fff", fontFamily: disp, fontSize: 20, cursor: "pointer" }}>×</button>
                      </div>
                      <div className="locker-modal-scroll" style={{ overflowY: "auto", padding: "12px 18px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
                        {mediaArticles.map((article) => (
                          <button
                            type="button"
                            key={article.title}
                            onClick={() => {
                              const url = safeExternalUrl(article.originalUrl);
                              if (url) setPendingArticleRedirect({ source: article.source, title: article.title, url });
                            }}
                            style={{ width: "100%", display: "grid", gridTemplateColumns: "88px 1fr", gap: 12, border: "1px solid #1E2640", borderRadius: 12, background: "#131829", padding: 10, color: "inherit", textAlign: "left", cursor: "pointer" }}
                          >
                            <div style={{ height: 76, borderRadius: 8, overflow: "hidden", background: GRAD_FIELD }}>
                              {article.img ? <img src={article.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                            </div>
                            <div>
                              <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: ".12em", color: lockerAccent, textTransform: "uppercase", marginBottom: 5 }}>{article.source} · {article.meta}</div>
                              <h3 style={{ fontFamily: disp, fontWeight: 800, fontSize: 14, lineHeight: 1, color: "#fff", textTransform: "uppercase", margin: "0 0 7px" }}>{article.title}</h3>
                              <p style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden", fontFamily: body, fontSize: 12.5, lineHeight: 1.45, color: "rgba(255,255,255,.62)", margin: 0 }}>{article.dek}</p>
                              <div style={{ marginTop: 8, fontFamily: mono, fontSize: 8, fontWeight: 700, letterSpacing: ".11em", color: lockerAccent, textTransform: "uppercase" }}>Open original source ↗</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {pendingArticleRedirect && (
                  <div role="alertdialog" aria-modal="true" aria-label="External article warning" style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(5,7,15,.88)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
                    <div style={{ width: "min(100%, 430px)", border: "1px solid #1E2640", borderRadius: 18, background: "#0B0E1A", boxShadow: "0 28px 100px rgba(0,0,0,.7)", padding: "24px 20px 20px", textAlign: "center" }}>
                      <div style={{ width: 58, height: 58, margin: "0 auto 18px", borderRadius: 9999, border: `1px solid ${lockerAccent}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: mono, fontWeight: 800, fontSize: 20, color: lockerAccent }}>{externalRedirectCountdown}</div>
                      <div style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: ".16em", color: lockerAccent, textTransform: "uppercase", marginBottom: 8 }}>Leaving BLTZ</div>
                      <h3 style={{ margin: "0 0 10px", fontFamily: disp, fontWeight: 900, fontSize: 25, lineHeight: .95, color: "#fff", textTransform: "uppercase" }}>Continue to the original article?</h3>
                      <p style={{ margin: "0 auto", maxWidth: 350, fontFamily: body, fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,.66)" }}>
                        You will leave this Player Locker and be redirected to {pendingArticleRedirect.source} in {externalRedirectCountdown} seconds.
                      </p>
                      <div style={{ marginTop: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: mono, fontSize: 8, letterSpacing: ".08em", color: "rgba(255,255,255,.36)", textTransform: "uppercase" }}>{pendingArticleRedirect.title}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginTop: 22 }}>
                        <button type="button" onClick={() => setPendingArticleRedirect(null)} style={{ minHeight: 46, border: "1px solid rgba(255,255,255,.16)", borderRadius: 10, background: "rgba(255,255,255,.06)", color: "#fff", fontFamily: disp, fontWeight: 800, fontSize: 14, textTransform: "uppercase", cursor: "pointer" }}>Stay in BLTZ</button>
                        <button type="button" onClick={() => window.location.assign(pendingArticleRedirect.url)} style={{ minHeight: 46, border: "none", borderRadius: 10, background: lockerAccent, color: "#0A0800", fontFamily: disp, fontWeight: 900, fontSize: 14, textTransform: "uppercase", cursor: "pointer" }}>Continue now</button>
                      </div>
                    </div>
                  </div>
                )}
                {selectedSocialPost && (
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${selectedSocialPost.platform} post details`}
                    onClick={(event) => {
                      if (event.currentTarget === event.target) setSelectedSocialIndex(null);
                    }}
                    style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(5,7,15,.84)", backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}
                  >
                    <div style={{ width: "min(100%, 760px)", maxHeight: "88dvh", padding: "5px 0", border: "1px solid #1E2640", borderRadius: 18, background: "#0B0E1A", boxShadow: "0 24px 90px rgba(0,0,0,.62)", overflow: "hidden" }}>
                      <div className="locker-modal-scroll" style={{ maxHeight: "calc(88dvh - 10px)", overflowY: "auto" }}>
                      <div style={{ position: "sticky", top: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "15px 16px", borderBottom: "1px solid #1E2640", background: "rgba(11,14,26,.96)", backdropFilter: "blur(12px)" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: ".16em", color: lockerAccent, textTransform: "uppercase", marginBottom: 4 }}>{selectedSocialPost.platform}</div>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: disp, fontWeight: 800, fontSize: 18, color: "#fff", textTransform: "uppercase" }}>{selectedSocialPost.handle}</div>
                        </div>
                        <button type="button" onClick={() => setSelectedSocialIndex(null)} aria-label="Close social post" style={{ flex: "0 0 auto", width: 36, height: 36, borderRadius: 9999, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)", color: "#fff", fontFamily: disp, fontSize: 20, cursor: "pointer" }}>×</button>
                      </div>
                      <div className="locker-social-modal-layout">
                        <div className={`locker-social-modal-media locker-social-modal-media--${selectedSocialPost.format}`} style={{ overflow: "hidden", background: GRAD_FIELD }}>
                          {selectedSocialPost.img ? <img src={selectedSocialPost.img} alt={`${selectedSocialPost.platform} post by ${selectedSocialPost.handle}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, padding: "20px 18px 22px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginBottom: 18 }}>
                            <div style={{ padding: "11px 12px", border: "1px solid #1E2640", borderRadius: 10, background: "#131829", textAlign: "center" }}>
                              <div style={{ fontFamily: mono, fontSize: 7.5, letterSpacing: ".13em", color: "rgba(255,255,255,.42)", textTransform: "uppercase", marginBottom: 5 }}>Published</div>
                              <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: ".06em", color: "#fff" }}>{selectedSocialPost.published}</div>
                            </div>
                            <div style={{ padding: "11px 12px", border: "1px solid #1E2640", borderRadius: 10, background: "#131829", textAlign: "center" }}>
                              <div style={{ fontFamily: mono, fontSize: 7.5, letterSpacing: ".13em", color: "rgba(255,255,255,.42)", textTransform: "uppercase", marginBottom: 5 }}>Engagement</div>
                              <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: ".06em", color: lockerAccent }}>{selectedSocialPost.meta}</div>
                            </div>
                          </div>
                          <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: ".14em", color: "rgba(255,255,255,.42)", textTransform: "uppercase", marginBottom: 8 }}>Post caption</div>
                          <p style={{ margin: 0, fontFamily: body, fontSize: 16, lineHeight: 1.55, color: "rgba(255,255,255,.82)" }}>{selectedSocialPost.caption}</p>
                          <div style={{ marginTop: "auto", paddingTop: 24, fontFamily: mono, fontSize: 8, lineHeight: 1.45, letterSpacing: ".1em", color: "rgba(255,255,255,.4)", textTransform: "uppercase" }}>
                            Connected account content · Athlete dashboard source
                          </div>
                        </div>
                      </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STATS TAB */}
            {tab === "stats" && (
              <div style={{ animation: "tabIn .4s cubic-bezier(.16,1,.3,1)", paddingTop: 16 }}>
                <div className="hs locker-filter-row" style={{ display: "flex", gap: 9, justifyContent: "center", overflowX: "auto", padding: "0 18px 4px" }}>
                  {statsPills.map((p) => (
                    <button className="locker-filter-pill" key={p.key} onClick={() => setStatsSort(p.key)} style={pillStyle(p.active)}>{p.label}</button>
                  ))}
                </div>

                {statsSort === "season" && (
                  <div style={{ animation: "tabIn .35s ease", padding: "14px 18px 4px" }}>
                    <div style={{ borderRadius: 16, padding: 18, border: "1px solid rgba(245,166,35,.25)", background: "radial-gradient(120% 100% at 100% 0,rgba(245,166,35,.12),#131829 60%)", marginBottom: 14 }}>
                      <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".18em", color: "rgba(255,255,255,.5)", marginBottom: 6 }}>2024 SEASON POOL EARNINGS</div>
                      <div style={{ fontFamily: disp, fontWeight: 900, fontSize: 52, lineHeight: ".85", letterSpacing: "-.03em", background: "linear-gradient(135deg,#FFB940,#F5A623,#C77D00)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>{earnedFmt}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                        <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: ".1em", color: "#00D68F" }}>▲ {viewsFmt} VIEWS</span>
                        <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: ".1em", color: "rgba(255,255,255,.4)" }}>· TEAMMATES SPLIT 25%</span>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                      {seasonCells.map((s, i) => (
                        <div key={i} style={{ borderRadius: 12, padding: "15px 12px", border: "1px solid #1E2640", background: "#131829" }}>
                          <div style={{ maxWidth: "100%", overflow: "hidden", fontFamily: disp, fontWeight: 900, fontSize: fittedStatSize(formatStatNumber(s.value), 32), fontVariantNumeric: "tabular-nums", lineHeight: ".85", color: "#fff", whiteSpace: "nowrap" }}>{formatStatNumber(s.value)}</div>
                          <div style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: ".12em", color: "rgba(255,255,255,.45)", marginTop: 6 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {statsSort === "career" && (
                  <div style={{ animation: "tabIn .35s ease", padding: "14px 18px 4px" }}>
                    <div ref={teamHistoryRef} className="team-history-container" style={{ width: "100%", minHeight: 66, marginBottom: 12, padding: "11px 14px", borderRadius: 12, border: "1px solid #1E2640", background: "#131829", display: "flex", alignItems: "center", gap: 14, overflow: "hidden" }}>
                      <span className="team-history-heading" style={{ flex: "none", fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: ".12em", color: lockerAccent, whiteSpace: "nowrap" }}>TEAM HISTORY</span>
                      <div ref={teamHistoryViewportRef} className="team-history-viewport">
                        {careerTeams.length ? (
                          <div className={`team-history-track${teamHistoryInView && teamHistoryNeedsScroll ? " is-active" : ""}`}>
                            {[false, true].map((duplicate) => (
                              <div ref={duplicate ? undefined : teamHistoryPrimaryRef} className="team-history-sequence" aria-hidden={duplicate || undefined} key={duplicate ? "duplicate" : "primary"}>
                                {careerTeams.map((team, index) => (
                                  <div key={`${team.label}-${index}`} style={{ flex: "none", display: "flex", alignItems: "center", gap: 8, padding: "0 14px", borderLeft: "1px solid rgba(255,255,255,.12)" }}>
                                    <div style={{ width: 28, height: 28, flex: "none", borderRadius: 6, background: team.color, display: "grid", placeItems: "center", overflow: "hidden" }}>
                                      {team.logo ? <img src={team.logo} alt="" style={{ width: 21, height: 21, objectFit: "contain" }} /> : <span style={{ fontFamily: disp, fontSize: 11, fontWeight: 900, color: "#fff" }}>{team.label.slice(0, 2)}</span>}
                                    </div>
                                    <span style={{ fontFamily: disp, fontSize: 16, fontWeight: 800, color: "#fff", textTransform: "uppercase" }}>{team.label}</span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".1em", color: "rgba(255,255,255,.48)", textTransform: "uppercase" }}>Verified team history pending</span>
                        )}
                      </div>
                    </div>
                    <div style={{ marginBottom: 12, padding: "11px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", fontFamily: mono, fontSize: 8, letterSpacing: ".11em", color: "rgba(255,255,255,.52)", textTransform: "uppercase", lineHeight: 1.35, textAlign: "center" }}>
                      Career metrics adapt by sport and position from onboarding scrape, athlete upload, or organization data.
                    </div>
                    <div className="career-stat-grid">
                      {visibleCareerCells.map((s) => (
                        <div className="career-stat-card" key={s.key} style={{ minHeight: 86, borderRadius: 12, padding: "15px 10px", border: "1px solid #1E2640", background: "#131829", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                          <div style={{ maxWidth: "100%", overflow: "hidden", fontFamily: disp, fontWeight: 900, fontSize: fittedStatSize(formatStatNumber(s.value), 30), fontVariantNumeric: "tabular-nums", lineHeight: ".85", color: "#fff", whiteSpace: "nowrap" }}>{formatStatNumber(s.value)}</div>
                          <div style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: ".12em", color: "rgba(255,255,255,.45)", marginTop: 6 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    {careerCells.length > 6 ? (
                      <div style={{ display: "flex", justifyContent: "center", margin: "-4px 0 16px" }}>
                        <button type="button" onClick={() => setShowAllCareerStats((current) => !current)} style={{ minHeight: 34, padding: "7px 14px", borderRadius: 9999, border: "1px solid #1E2640", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.72)", fontFamily: mono, fontSize: 8.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}>
                          {showAllCareerStats ? "SHOW FEATURED STATS" : `VIEW ALL ${careerCells.length} STATS`}
                        </button>
                      </div>
                    ) : null}
                    <div ref={careerGamesRef} style={{ borderRadius: 16, padding: 18, border: "1px solid #1E2640", background: "#131829", overflow: "hidden" }}>
                      <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".16em", color: "#FFB940", marginBottom: 16 }}>◆ GAMES PLAYED BY SEASON</div>
                      {careerGameBars.length ? (
                        <div ref={careerGamesViewportRef} className="career-games-viewport">
                          <div className={`career-games-track${careerGamesInView && careerGamesNeedsScroll ? " is-active" : ""}`}>
                            {[false, true].map((duplicate) => (
                              <div ref={duplicate ? undefined : careerGamesPrimaryRef} className="career-games-sequence" aria-hidden={duplicate || undefined} key={duplicate ? "duplicate" : "primary"}>
                                {careerGameBars.map((season) => (
                                  <div key={`${season.level}-${season.year}`} title={`${season.year} ${season.team ?? season.levelLabel}: ${season.value} games`} style={{ width: 64, flex: "0 0 64px", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, height: 132, justifyContent: "flex-end" }}>
                                    <span style={{ maxWidth: "100%", fontFamily: disp, fontWeight: 800, fontSize: fittedStatSize(season.value, 16), fontVariantNumeric: "tabular-nums", color: "#fff", whiteSpace: "nowrap" }}>{season.value}</span>
                                    <div style={season.barStyle} />
                                    <span style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: ".06em", color: "rgba(255,255,255,.58)" }}>{season.year}</span>
                                    <span style={{ fontFamily: mono, fontSize: 7, letterSpacing: ".1em", color: season.level.toLowerCase() === "pro" ? lockerAccent : "#6E8BFF" }}>{season.levelLabel}</span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{ minHeight: 110, display: "grid", placeItems: "center", fontFamily: mono, fontSize: 9, letterSpacing: ".1em", color: "rgba(255,255,255,.48)", textAlign: "center", textTransform: "uppercase" }}>
                          Verified season-by-season games pending
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {statsSort === "awards" && (
                  <div style={{ animation: "tabIn .35s ease", padding: "14px 18px 10px" }}>
                    {awards.length ? (
                      <div style={{ position: "relative" }}>
                        <div
                          className="media-inner-scroll"
                          ref={awardsScrollRef}
                          onScroll={handleAwardsScroll}
                          style={{ height: 408, overflowY: "auto", overscrollBehavior: "auto", paddingRight: 6, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}
                        >
                          {awards.map((award: any, i) => (
                            <div key={i} style={{ minHeight: 184, borderRadius: 14, border: "1px solid #1E2640", background: "linear-gradient(160deg,#1a2035,#131829)", overflow: "hidden", position: "relative" }}>
                              <div style={{ height: 82, background: GRAD_FIELD, overflow: "hidden" }}>
                                {award.img ? <img src={award.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: .9 }} /> : null}
                              </div>
                              <div style={{ padding: 13, display: "flex", flexDirection: "column", gap: 10 }}>
                                <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".11em", color: lockerAccent, textTransform: "uppercase" }}>★ {award.year}</div>
                                <div style={{ fontFamily: disp, fontWeight: 800, fontSize: 17, lineHeight: .95, textTransform: "uppercase", color: "#fff" }}>{award.label}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div style={{ position: "absolute", top: 14 + awardsScrollProgress * 286, right: 1, width: 2, height: 54, borderRadius: 9999, background: "rgba(210,214,224,.72)", boxShadow: "0 0 8px rgba(210,214,224,.22)", opacity: awardsScrolling ? 1 : 0, transition: "opacity .22s ease, top .08s linear", pointerEvents: "none" }} />
                      </div>
                    ) : (
                      <div style={{ minHeight: 260, borderRadius: 16, border: "1px solid #1E2640", background: "#131829", padding: "26px 22px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".16em", color: lockerAccent, textTransform: "uppercase", marginBottom: 12 }}>Awards archive</div>
                        <div style={{ fontFamily: disp, fontWeight: 900, fontSize: 28, lineHeight: .9, textTransform: "uppercase", color: "#fff", marginBottom: 12 }}>Legacy still loading</div>
                        <p style={{ fontFamily: body, fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,.68)", margin: 0 }}>
                          No verified awards are attached yet, but a great career is more than a trophy case. BLTZ will add honors as they are verified.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {statsSort === "timeline" && (
                  <div className="hs" style={{ animation: "tabIn .35s ease", display: "flex", gap: 12, overflowX: "auto", padding: "16px 18px 10px", scrollSnapType: "x mandatory" }}>
                    {timeline.map((t, i) => (
                      <div key={i} style={{ flex: "none", width: 210, scrollSnapAlign: "start", borderRadius: 16, overflow: "hidden", border: "1px solid #1E2640", background: "#131829", display: "flex", flexDirection: "column" }}>
                        <div style={{ height: 5, background: "linear-gradient(90deg,#2952FF,#F5A623)" }} />
                        <div style={{ padding: "16px 16px 18px" }}>
                          <div style={{ fontFamily: disp, fontWeight: 900, fontSize: 34, lineHeight: ".85", color: "#fff" }}>{t.year}</div>
                          <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".14em", color: "#FFB940", margin: "6px 0 12px" }}>{t.tag}</div>
                          <div style={{ fontFamily: disp, fontWeight: 700, fontSize: 17, lineHeight: 1, textTransform: "uppercase", color: "#fff", marginBottom: 10 }}>{t.title}</div>
                          <p style={{ fontFamily: body, fontSize: 12, lineHeight: 1.55, color: "rgba(255,255,255,.6)", margin: 0 }}>{t.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {statsSort === "log" && (
                  <div style={{ animation: "tabIn .35s ease", padding: "14px 18px 4px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", fontFamily: mono, fontSize: 8, letterSpacing: ".11em", color: "rgba(255,255,255,.52)", textTransform: "uppercase", lineHeight: 1.35, textAlign: "center" }}>
                      Seasons stay collapsed so CFB and pro logs can scale without overwhelming the locker.
                    </div>
                    {gameLogSections.map((section) => {
                      const isOpen = gameLogOpen[section.key];
                      const gridTemplateColumns = section.columns.map((column) => `${column.width ?? 72}px`).join(" ");
                      const tableWidth = section.columns.reduce((total, column) => total + (column.width ?? 72), 0) + 20;
                      return (
                        <div key={section.key} style={{ borderRadius: 14, border: "1px solid #1E2640", background: "#131829", overflow: "hidden" }}>
                          <button
                            type="button"
                            onClick={() => setGameLogOpen((prev) => ({ ...prev, [section.key]: !prev[section.key] }))}
                            style={{ width: "100%", border: 0, background: "transparent", padding: "14px 14px 13px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: "pointer", textAlign: "left" }}
                          >
                            <span>
                              <span style={{ display: "block", fontFamily: disp, fontWeight: 900, fontSize: 23, lineHeight: .9, color: "#fff", textTransform: "uppercase" }}>{section.label}</span>
                              <span style={{ display: "block", fontFamily: mono, fontSize: 8, lineHeight: 1.35, letterSpacing: ".11em", color: "rgba(255,255,255,.45)", textTransform: "uppercase", marginTop: 10 }}>{section.meta}</span>
                            </span>
                            <span style={{ width: 24, alignSelf: "stretch", display: "flex", alignItems: "center", justifyContent: "center", color: lockerAccent, fontFamily: disp, fontSize: 22, lineHeight: 1, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s ease" }}>⌄</span>
                          </button>
                          {isOpen && (
                            <div style={{ borderTop: "1px solid #1E2640", padding: "10px 10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                              {section.seasons.map((season) => (
                                <details key={season.year} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)", overflow: "hidden" }}>
                                  <summary style={{ listStyle: "none", cursor: "pointer", padding: "12px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                                    <span style={{ fontFamily: disp, fontWeight: 900, fontSize: 22, lineHeight: .9, color: "#fff" }}>{season.year}</span>
                                    <span style={{ fontFamily: mono, fontSize: 8, letterSpacing: ".1em", color: "rgba(255,255,255,.5)", textTransform: "uppercase", textAlign: "right" }}>{season.summary}</span>
                                  </summary>
                                  <div className="game-log-scroll" style={{ maxWidth: "100%", overflowX: "auto", overflowY: "hidden", padding: "0 10px 16px", marginBottom: 4, WebkitOverflowScrolling: "touch" }}>
                                    <div style={{ width: tableWidth, maxWidth: "none" }}>
                                      <div style={{ display: "grid", gridTemplateColumns, gap: 0, padding: "0 10px 8px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                                        {section.columns.map((column) => (
                                          <span key={column.key} style={{ fontFamily: mono, fontSize: 8, letterSpacing: ".1em", color: "rgba(255,255,255,.4)", textAlign: column.align ?? (column.key === "opponent" ? "left" : "center"), whiteSpace: "nowrap" }}>{column.label}</span>
                                        ))}
                                      </div>
                                      {season.rows.map((game, i) => (
                                        <div key={game.id} style={{ display: "grid", gridTemplateColumns, alignItems: "center", padding: "11px 10px", borderRadius: 9, background: i % 2 ? "transparent" : "rgba(255,255,255,.035)" }}>
                                          {section.columns.map((column) => {
                                            const value = game.values[column.key] ?? "—";
                                            const isOpponent = column.key === "opponent";
                                            const isResult = column.key === "result";
                                            const resultColor = game.resultTone === "win" ? "#00D68F" : game.resultTone === "loss" ? "#FF3D5A" : "rgba(255,255,255,.72)";
                                            return (
                                              <span key={column.key} title={String(value)} style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", fontFamily: isResult ? mono : disp, fontWeight: isResult ? 600 : 700, fontSize: isResult ? 10 : 14, textTransform: isOpponent ? "uppercase" : undefined, color: isResult ? resultColor : "#fff", textAlign: column.align ?? (isOpponent ? "left" : "center"), whiteSpace: "nowrap" }}>{formatStatNumber(value)}</span>
                                            );
                                          })}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </details>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {!gameLogSections.length ? (
                      <div style={{ minHeight: 180, borderRadius: 14, border: "1px solid #1E2640", background: "#131829", padding: 22, display: "grid", placeItems: "center", textAlign: "center", fontFamily: mono, fontSize: 9, letterSpacing: ".11em", lineHeight: 1.5, color: "rgba(255,255,255,.5)", textTransform: "uppercase" }}>
                        Verified position-specific game logs pending
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
            </Tabs>
          </section>

          <div style={{ height: showAthleteNav ? 104 : 28 }} />
        </div>

        {/* ATHLETE-ONLY BOTTOM NAV */}
        {showAthleteNav && (
          <div style={{ position: "absolute", left: 18, right: 18, bottom: 14, height: 66, borderRadius: 20, background: "rgba(15,19,32,.82)", backdropFilter: "blur(20px)", border: "1px solid #1E2640", boxShadow: "0 12px 40px rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 8px", zIndex: 20 }}>
            <NavBtn label="DASHBOARD" active={false}><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z" /></NavBtn>
            <NavBtn label="SCOUT" active={false}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></NavBtn>
            <button style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", marginTop: -18 }}>
              <span style={{ width: 52, height: 52, borderRadius: 9999, background: "linear-gradient(135deg,#FFB940,#F5A623,#C77D00)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(245,166,35,.5)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A0800" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </span>
            </button>
            <NavBtn label="LOCKER" active><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M4 10h16M9 10v10" /></NavBtn>
            <NavBtn label="WALLET" active={false}><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10h18M16 14h2" /></NavBtn>
          </div>
        )}

        {searchOpen && (
          <div style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(5,7,15,.86)", backdropFilter: "blur(18px)", padding: "72px 18px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#FFB940" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={handleSearchInput}
                  placeholder="Search players, schools, teams"
                  style={{ width: "100%", height: 46, borderRadius: 14, border: "1px solid #1E2640", background: "#0B0E1A", color: "#fff", outline: "none", padding: "0 14px 0 42px", fontFamily: body, fontWeight: 700, fontSize: 14 }}
                />
              </div>
              <button type="button" onClick={closeSiteSearch} aria-label="Close search" style={{ width: 42, height: 42, borderRadius: 9999, border: "1px solid #1E2640", background: "rgba(255,255,255,.06)", color: "#fff", fontFamily: disp, fontSize: 24, lineHeight: 1, cursor: "pointer" }}>×</button>
            </div>
            <div className="locker-modal-scroll" style={{ maxHeight: "calc(100% - 68px)", overflowY: "auto", paddingRight: 2 }}>
              {!searchQuery.trim() ? (
                <div style={{ padding: "28px 14px", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", textAlign: "center" }}>
                  <div style={{ fontFamily: disp, fontWeight: 900, fontSize: 24, lineHeight: .9, color: "#fff", textTransform: "uppercase", marginBottom: 10 }}>Search BLTZ</div>
                  <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".12em", color: "rgba(255,255,255,.52)", textTransform: "uppercase", lineHeight: 1.45 }}>Find players, schools, and teams across the platform.</div>
                </div>
              ) : searchLoading ? (
                <div style={{ padding: "24px 14px", fontFamily: mono, fontSize: 10, letterSpacing: ".14em", color: lockerAccent, textTransform: "uppercase", textAlign: "center" }}>Searching...</div>
              ) : searchResults.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {searchResults.map((result) => {
                    const imageUrl = result.image_url || result.logo_url || result.banner_url;
                    const meta = [result.type, result.school || result.team, result.city && result.state ? `${result.city}, ${result.state}` : result.city || result.state].filter(Boolean).join(" · ");
                    return (
                      <a key={`${result.type}-${result.id}`} href={searchResultHref(result)} onClick={closeSiteSearch} style={{ display: "grid", gridTemplateColumns: "48px 1fr", gap: 10, alignItems: "center", minHeight: 66, borderRadius: 14, border: "1px solid #1E2640", background: "#131829", padding: 9, textDecoration: "none" }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, overflow: "hidden", background: GRAD_FIELD, border: "1px solid rgba(255,255,255,.08)" }}>
                          {imageUrl ? <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: disp, fontWeight: 800, fontSize: 17, lineHeight: .95, color: "#fff", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{result.name}</div>
                          <div style={{ marginTop: 6, fontFamily: mono, fontSize: 8.5, letterSpacing: ".11em", color: "rgba(255,255,255,.48)", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta}</div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: "24px 14px", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", fontFamily: mono, fontSize: 9, letterSpacing: ".12em", color: "rgba(255,255,255,.55)", textTransform: "uppercase", textAlign: "center", lineHeight: 1.45 }}>No matching players, schools, or teams found yet.</div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Pick black or white text for legibility on an arbitrary team color.
function readableText(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  // relative luminance (sRGB approximation)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? "#0B0E1A" : "#fff";
}

type PillItem = { label: string; color: string; logo?: string | null };
const PILL_H = 44;

// One row of a rotating pill: colored background + optional logo + label.
// Logo + abbreviation center together as one group; with no logo
// (level/status fallback) the label centers alone.
function PillContent({ item }: { item: PillItem }) {
  const fg = readableText(item.color);
  const hasLogo = !!item.logo;
  return (
    <div style={{ height: PILL_H, display: "flex", alignItems: "center", justifyContent: "center", gap: hasLogo ? 8 : 0, padding: "0 14px", background: `linear-gradient(135deg, ${item.color}, ${item.color}cc)` }}>
      {hasLogo ? (
        <img src={item.logo!} alt="" style={{ height: 22, width: 22, objectFit: "contain", flex: "none", filter: "drop-shadow(0 1px 3px rgba(0,0,0,.35))" }} />
      ) : null}
      <span style={{ maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: disp, fontWeight: 700, fontSize: 19, letterSpacing: ".05em", textTransform: "uppercase", color: fg }}>
        {item.label}
      </span>
    </div>
  );
}

// Fixed-size hero pill whose content scrolls smoothly upward to the next item
// every 5s (each new column starts on the item the previous ended on, so the
// scroll reads as one continuous loop). Static when it holds a single item;
// falls back to `fallback` when `items` is empty. White stroke matches the
// position pill.
function RotatingPill({ items, fallback }: {
  items: PillItem[];
  fallback: PillItem;
}) {
  const list = items.length ? items : [fallback];
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (list.length <= 1) return;
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, [list.length]);

  const shell: React.CSSProperties = { flex: 1, minWidth: 0, height: PILL_H, borderRadius: 9999, overflow: "hidden", border: "1px solid rgba(255,255,255,.28)", boxShadow: "0 4px 18px rgba(0,0,0,.35)" };

  if (list.length <= 1) {
    return <div style={shell}><PillContent item={list[0]} /></div>;
  }
  const cur = list[tick % list.length];
  const next = list[(tick + 1) % list.length];
  return (
    <div style={shell}>
      <div key={tick} style={{ position: "relative", animation: "pillScroll .6s cubic-bezier(.16,1,.3,1) forwards" }}>
        <PillContent item={cur} />
        <PillContent item={next} />
        {/* blended seam where the two colors meet — only visible mid-scroll,
            faded out by the time the column comes to rest on either side */}
        <div style={{ position: "absolute", left: 0, right: 0, top: PILL_H - 7, height: 14, background: `linear-gradient(to bottom, ${cur.color}, ${next.color})`, pointerEvents: "none", animation: "pillSeamFade .6s ease forwards" }} />
      </div>
    </div>
  );
}

function IdRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span title={label} style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: ".12em", color: "rgba(255,255,255,.4)", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      <span className="basic-info-value" title={value} style={{ fontFamily: disp, fontWeight: 700, fontSize: 15, lineHeight: 1, textTransform: "uppercase", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
    </div>
  );
}

function JerseyNumberRow({ values, fallback }: { values: string[]; fallback: string }) {
  const normalized = values.map((value) => value.replace(/^#\s*/, "").trim()).filter(Boolean);
  const accessibleValue = normalized.length ? normalized.map((value) => `#${value}`).join(" - ") : fallback;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: ".12em", color: "rgba(255,255,255,.4)", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>JERSEY NUMBERS</span>
      <span
        className="basic-info-value"
        title={accessibleValue}
        aria-label={accessibleValue}
        style={{ display: "flex", alignItems: "baseline", gap: 7, minWidth: 0, overflow: "hidden", fontFamily: disp, fontWeight: 700, fontSize: 15, lineHeight: 1, color: "#fff", whiteSpace: "nowrap" }}
      >
        {normalized.length ? normalized.map((value, index) => (
          <span key={`${value}-${index}`} style={{ display: "inline-flex", alignItems: "baseline", gap: 1, flex: "none" }}>
            {index > 0 ? <span aria-hidden="true" style={{ marginRight: 6, color: "rgba(255,255,255,.45)", fontSize: ".7em" }}>-</span> : null}
            <span aria-hidden="true" style={{ fontSize: ".72em", color: "rgba(255,255,255,.62)" }}>#</span>
            <span aria-hidden="true">{value}</span>
          </span>
        )) : fallback}
      </span>
    </div>
  );
}

function NavBtn({ label, active, children }: { label: string; active: boolean; children: React.ReactNode }) {
  const color = active ? "#FFB940" : "rgba(255,255,255,.45)";
  return (
    <button style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
      <span style={{ fontFamily: mono, fontSize: 7.5, letterSpacing: ".1em", color }}>{label}</span>
    </button>
  );
}

const followOn: React.CSSProperties = { padding: "8px 15px", borderRadius: 9999, border: "none", background: "linear-gradient(135deg,#FFB940,#F5A623,#C77D00)", color: "#0A0800", fontFamily: mono, fontWeight: 700, fontSize: 10, letterSpacing: ".1em", cursor: "pointer", boxShadow: "none" };
const followOff: React.CSSProperties = { padding: "8px 14px", borderRadius: 9999, border: "1px solid #1E2640", background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.7)", fontFamily: mono, fontWeight: 600, fontSize: 10, letterSpacing: ".1em", cursor: "pointer" };

const styleSheet = `
.bltz-frame{position:relative;width:390px;height:844px;background:#0B0E1A;overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,.6);border-radius:0}
.locker-hero-card{contain:paint;isolation:isolate;transform:translateZ(0);clip-path:inset(0 round 24px);outline:1px solid rgba(255,255,255,.12);outline-offset:-1px}
.locker-hero-media{position:absolute;inset:3px;overflow:hidden;border-radius:21px;clip-path:inset(0 round 21px)}
.locker-hero-stroke{border-radius:24px}
.bio-headshot-card{height:250px;overflow:hidden;border:1px solid #1E2640;border-radius:14px;background:#131829;display:flex;flex-direction:column}
.bio-headshot-image{position:relative;height:216px;flex:0 0 216px;overflow:hidden;background:${GRAD_FIELD}}
.bio-headshot-photo{object-fit:cover;object-position:50% 12%}
.bio-headshot-year{height:34px;flex:0 0 34px;display:flex;align-items:center;justify-content:center;border-top:1px solid #1E2640;color:${lockerAccent};font-family:${mono};font-size:11px;font-weight:700;letter-spacing:.12em;line-height:1;text-align:center;white-space:nowrap}
.team-history-viewport{min-width:0;flex:1;overflow:hidden;white-space:nowrap}
.team-history-track{display:flex;width:max-content;will-change:transform}
.team-history-sequence{display:flex;align-items:center;flex:none}
.team-history-track:not(.is-active) .team-history-sequence:first-child>div:first-child{border-left:none!important;padding-left:0!important}
.career-games-viewport{width:100%;overflow:hidden}
.career-games-track{display:flex;width:max-content;will-change:transform}
.career-games-sequence{display:flex;align-items:flex-end;flex:none}
.career-games-track:not(.is-active){margin-right:auto;margin-left:auto}
.career-games-track:not(.is-active) .career-games-sequence[aria-hidden="true"]{display:none}
.career-games-track.is-active{animation:careerGamesMarquee 48s linear infinite}
.career-stat-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-bottom:16px}
.career-stat-card{min-width:0;flex:0 0 calc((100% - 16px)/3)}
.locker-main-tab{font-size:15px}
.locker-athlete-quote{font-size:13px}
.locker-athlete-quote-author{font-size:10px}
.locker-shorts-grid{grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:max-content;align-content:start;align-items:start}
.locker-short-card{width:100%;aspect-ratio:9/16;justify-self:center}
.locker-short-card:focus-visible{outline:2px solid ${lockerAccent};outline-offset:-3px}
.locker-short-modal-shell{position:relative;width:min(calc(100vw - 24px),calc((100dvh - 24px)*.5625),430px);aspect-ratio:9/16;overflow:hidden;border:1px solid rgba(255,255,255,.16);border-radius:16px;background:#05070f;box-shadow:0 28px 100px rgba(0,0,0,.72)}
.locker-short-modal-feed{width:100%;height:100%;overflow-y:auto;overscroll-behavior:contain;scroll-snap-type:y mandatory;scroll-behavior:smooth;scrollbar-width:none;-ms-overflow-style:none}
.locker-short-modal-slide{position:relative;width:100%;height:100%;overflow:hidden;scroll-snap-align:start;scroll-snap-stop:always;background:${GRAD_FIELD}}
.locker-short-modal-arrow{position:absolute;right:11px;z-index:4;width:36px;height:36px;padding:0;border:1px solid rgba(255,255,255,.18);border-radius:9999px;background:rgba(5,7,15,.68);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}
.locker-short-modal-arrow--up{top:56px}
.locker-short-modal-arrow--down{bottom:12px}
.locker-short-modal-arrow:disabled{opacity:.28;cursor:default}
.locker-short-modal-arrow:focus-visible{outline:2px solid ${lockerAccent};outline-offset:1px}
.locker-podcast-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.locker-social-scroll{padding-right:6px}
.locker-social-layout{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.locker-social-layout--desktop{display:none}
.locker-social-column{display:flex;min-width:0;flex-direction:column;gap:8px}
.locker-social-card{display:block;width:100%;flex:none;border-radius:10px}
.locker-social-card--square{aspect-ratio:1/1}
.locker-social-card--portrait{aspect-ratio:9/16}
.locker-social-card:focus-visible{outline:2px solid ${lockerAccent};outline-offset:-3px}
.locker-social-modal-layout{display:grid;grid-template-columns:minmax(0,1fr)}
.locker-social-modal-media{width:100%}
.locker-social-modal-media--square{aspect-ratio:1/1}
.locker-social-modal-media--portrait{aspect-ratio:9/16}
.basic-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.basic-info-grid>div{grid-column:1/-1}
@media (min-width:640px){.bltz-frame{border-radius:28px}}
@media (min-width:641px){.bio-headshot-card{height:216px}.bio-headshot-image{height:178px;flex-basis:178px}.bio-headshot-photo{object-fit:contain;object-position:center bottom}.bio-headshot-year{height:38px;flex-basis:38px}.basic-info-grid>div{grid-column:auto}.basic-info-grid>.basic-info-high-school{grid-column:1/-1}}
@media (max-width:640px){
  .bltz-frame{width:100vw;height:100dvh;box-shadow:none}
  .locker-filter-row{gap:6px!important;padding-right:12px!important;padding-left:12px!important}
  .locker-filter-pill{min-width:0;padding:7px 9px!important;font-size:9px!important;letter-spacing:.08em!important}
  .team-history-container{flex-direction:column;gap:10px!important}
  .team-history-heading{width:100%;text-align:center}
  .team-history-viewport{width:100%;flex:none}
  .team-history-track:not(.is-active){margin-right:auto;margin-left:auto}
  .team-history-track:not(.is-active) .team-history-sequence[aria-hidden="true"]{display:none}
  .team-history-track.is-active{animation:teamHistoryMarquee 24s linear infinite}
}
@media (min-width:641px){.team-history-viewport{overflow-x:auto}.team-history-sequence[aria-hidden="true"]{display:none}}
@media (prefers-reduced-motion:reduce){.team-history-track.is-active,.career-games-track.is-active{animation:none}.team-history-viewport,.career-games-viewport{overflow-x:auto}.career-games-track.is-active .career-games-sequence[aria-hidden="true"]{display:none}}
.bltz-frame.bltz-frame-embedded{width:100%;max-width:575px;height:100%;border-radius:18px;box-shadow:none}
@media (min-width:641px) and (max-width:899px){
  .bltz-frame:not(.bltz-frame-embedded){width:100vw;height:100dvh;border-radius:0;box-shadow:none}
  .locker-athlete-quote{font-size:16px}
  .locker-athlete-quote-author{font-size:11px}
}
@media (min-width:900px){
  .locker-shorts-grid{grid-template-columns:repeat(3,minmax(0,220px));justify-content:center}
  .locker-social-layout--mobile{display:none}
  .locker-social-layout--desktop{display:grid;width:min(100%,760px);margin-right:auto;margin-left:auto;grid-template-columns:repeat(3,minmax(0,1fr))}
  .locker-social-modal-layout{grid-template-columns:minmax(0,46%) minmax(0,54%);align-items:start}
  .basic-info-value{font-size:20px!important}
  .career-stat-card{flex-basis:calc((100% - 24px)/4);min-height:100px!important}
  .locker-main-tabs-list{height:65px!important}
  .locker-main-tab{height:53px!important;font-size:19px}
  .locker-athlete-quote{font-size:18px}
  .locker-athlete-quote-author{font-size:12px}
  .locker-tabs-nav{width:70%;margin-right:auto;margin-left:auto}
  .locker-page-shell{align-items:flex-start!important;background:linear-gradient(180deg,#05070F,#080B17 46%,#05070F)!important}
  .bltz-frame:not(.bltz-frame-embedded){width:min(1440px,100%);height:auto;min-height:100vh;overflow:visible;border-radius:0;box-shadow:none}
  .bltz-frame:not(.bltz-frame-embedded)>.scr{position:relative!important;inset:auto!important;min-height:100vh;overflow:visible!important}
  .bltz-frame:not(.bltz-frame-embedded) .locker-sticky-header{position:fixed!important;right:0!important;left:0!important;padding:12px max(32px,calc((100vw - 1280px)/2))!important}
  .bltz-frame:not(.bltz-frame-embedded) .locker-topbar{width:min(1240px,calc(100% - 64px));margin:0 auto;padding:22px 0 16px!important}
  .bltz-frame:not(.bltz-frame-embedded) .scr>section{width:min(1180px,calc(100% - 64px));margin-right:auto;margin-left:auto}
  .bltz-frame:not(.bltz-frame-embedded) .locker-hero-section{width:calc(100% - 32px)!important;max-width:none!important;padding:0!important}
  .bltz-frame:not(.bltz-frame-embedded) .locker-hero-card{height:min(76vh,760px)!important;min-height:640px;border-radius:8px!important;clip-path:inset(0 round 8px)}
  .bltz-frame:not(.bltz-frame-embedded) .locker-hero-media{border-radius:5px;clip-path:inset(0 round 5px)}
  .bltz-frame:not(.bltz-frame-embedded) .locker-hero-stroke{border-radius:8px}
  .bltz-frame:not(.bltz-frame-embedded) .locker-hero-headshot{bottom:104px!important;width:220px!important;height:282px!important}
  .bltz-frame:not(.bltz-frame-embedded) .locker-hero-copy{right:50%!important;left:50%!important;width:min(560px,calc(100% - 48px));padding:0!important;transform:translateX(-50%)}
  .bltz-frame:not(.bltz-frame-embedded) .locker-hero-copy h1{font-size:clamp(52px,5vw,76px)!important}
  .bltz-frame:not(.bltz-frame-embedded) .locker-film-section,
  .bltz-frame:not(.bltz-frame-embedded) .locker-photos-section{padding-right:0!important;padding-left:0!important}
  .bltz-frame:not(.bltz-frame-embedded) .locker-film-section .hs{gap:16px!important;padding-bottom:16px!important}
  .bltz-frame:not(.bltz-frame-embedded) .locker-film-section .hs>div{width:320px!important}
  .bltz-frame:not(.bltz-frame-embedded) .locker-film-section .hs>div>div{height:182px!important;border-radius:8px!important}
  .bltz-frame:not(.bltz-frame-embedded) .locker-photos-section>div:last-child{grid-auto-rows:160px!important;gap:12px!important}
  .bltz-frame:not(.bltz-frame-embedded) .locker-tabs-section{padding-top:34px!important}
}
.scr::-webkit-scrollbar,.hs::-webkit-scrollbar{display:none;width:0;height:0}
.scr,.hs{scrollbar-width:none;-ms-overflow-style:none}
.media-inner-scroll{scrollbar-width:none;-ms-overflow-style:none}
.media-inner-scroll::-webkit-scrollbar{display:none;width:0;height:0;background:transparent}
.media-inner-scroll::-webkit-scrollbar-track{background:transparent}
.media-inner-scroll::-webkit-scrollbar-thumb{background:transparent}
.media-inner-scroll::-webkit-scrollbar-button{display:none;width:0;height:0;background:transparent}
.media-inner-scroll::-webkit-scrollbar-corner{background:transparent}
.locker-modal-scroll{scrollbar-width:thin;scrollbar-color:rgba(196,201,214,.68) transparent}
.locker-modal-scroll::-webkit-scrollbar{width:3px;height:3px;background:transparent}
.locker-modal-scroll::-webkit-scrollbar-track{background:transparent;border:none;box-shadow:none}
.locker-modal-scroll::-webkit-scrollbar-thumb{border:none;border-radius:999px;background:rgba(196,201,214,.68)}
.locker-modal-scroll::-webkit-scrollbar-button{display:none;width:0;height:0;background:transparent}
.locker-modal-scroll::-webkit-scrollbar-corner{background:transparent}
.locker-short-modal-feed::-webkit-scrollbar{display:none;width:0;height:0;background:transparent}
.game-log-scroll{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.34) transparent}
.game-log-scroll::-webkit-scrollbar{height:4px;background:transparent}
.game-log-scroll::-webkit-scrollbar-track{background:transparent;margin:0 10px}
.game-log-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.34);border-radius:999px}
.game-log-scroll::-webkit-scrollbar-button{display:none;width:0;height:0;background:transparent}
.game-log-scroll::-webkit-scrollbar-corner{background:transparent}
@keyframes heroFade{0%,28%{opacity:0}5%,23%{opacity:1}31%,100%{opacity:0}}
@keyframes drift{0%{transform:perspective(800px) rotateX(28deg) scale(2.4) translateY(0)}100%{transform:perspective(800px) rotateX(33deg) scale(2.4) translateY(-30px)}}
@keyframes glowA{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.25);opacity:.85}}
@keyframes glowB{0%,100%{transform:scale(1.1);opacity:.75}50%{transform:scale(1);opacity:.45}}
@keyframes tabIn{0%{opacity:0;transform:translateY(18px)}100%{opacity:1;transform:translateY(0)}}
@keyframes barGrow{0%{transform:scaleY(0)}100%{transform:scaleY(1)}}
@keyframes teamHistoryMarquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes careerGamesMarquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes eqbar{0%,100%{height:20%}50%{height:95%}}
@keyframes pillScroll{0%{transform:translateY(0)}100%{transform:translateY(-44px)}}
@keyframes pillSeamFade{0%{opacity:0}45%{opacity:1}100%{opacity:0}}
`;
