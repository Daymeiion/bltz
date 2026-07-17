"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
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
  levelLabel: string;
  headshotUrl: string;
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

type LockerViewerMode = "public" | "athlete";

export default function LockerView({ data, viewerMode = "public" }: { data: LockerData; viewerMode?: LockerViewerMode }) {
  const [tab, setTab] = useState<"bio" | "media" | "stats">("bio");
  const [bioSort, setBioSort] = useState("all");
  const [mediaSort, setMediaSort] = useState("articles");
  const [statsSort, setStatsSort] = useState("career");
  const [gameLogOpen, setGameLogOpen] = useState<Record<string, boolean>>({ cfb: true, pro: false });
  const [articleModalOpen, setArticleModalOpen] = useState(false);
  const [activeShortIndex, setActiveShortIndex] = useState(0);
  const [shortsScrolling, setShortsScrolling] = useState(false);
  const [shortsScrollProgress, setShortsScrollProgress] = useState(0);
  const [socialScrolling, setSocialScrolling] = useState(false);
  const [socialScrollProgress, setSocialScrollProgress] = useState(0);
  const [awardsScrolling, setAwardsScrolling] = useState(false);
  const [awardsScrollProgress, setAwardsScrollProgress] = useState(0);
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
  const socialScrollRef = useRef<HTMLDivElement | null>(null);
  const socialScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const awardsScrollRef = useRef<HTMLDivElement | null>(null);
  const awardsScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shortRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shortVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [heroPlaying, setHeroPlaying] = useState(true);
  const showAthleteNav = viewerMode === "athlete";

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

  // ---- Spotify "now playing" (live) ----
  // Polls the athlete's currently-playing track. Stays null until we confirm a
  // linked account + an active track, so the hero badge collapses gracefully
  // when nothing is playing or Spotify isn't connected.
  const [nowPlaying, setNowPlaying] = useState<NowPlayingTrack | null>(null);
  useEffect(() => {
    if (!data.slug) return;
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
  }, [data.slug]);

  // SAMPLE — no stats pipeline yet; these are the counter targets.
  const targets = { tackles: 58, int: 6, pbu: 14, ff: 2, dtd: 2, solo: 41, earned: 14208, views: 842000 };

  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 320);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
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
    { source: "THE ATHLETIC", title: "THE CONFERENCE'S BEST COVER MAN", meta: "6 MIN READ", img: poolAt(0), dek: "Film, leadership, and the week-by-week rise of a verified locker profile." },
    { source: "ESPN", title: "DRAFT STOCK RISING", meta: "4 MIN READ", img: poolAt(3), dek: "Scouts circle the traits, production, and projection behind the latest board movement." },
    { source: "TEAM SITE", title: "LOCKER ROOM STANDARD SETTER", meta: "3 MIN READ", img: poolAt(1), dek: "How preparation and practice habits have become part of the weekly team story." },
    { source: "LOCAL PRESS", title: "FROM FRIDAY NIGHTS TO FEATURE FILM", meta: "5 MIN READ", img: poolAt(2), dek: "The hometown arc behind the athlete's growing media archive." },
  ];
  const mediaShorts = [
    { source: "@ATHLETE", title: "PREGAME WALK", meta: "218K VIEWS", img: poolAt(1), videoUrl: null },
    { source: "@ATHLETE", title: "FILM STUDY · 6AM", meta: "96K VIEWS", img: poolAt(2), videoUrl: null },
    { source: "TEAM CAM", title: "TUNNEL READY", meta: "74K VIEWS", img: poolAt(3), videoUrl: null },
    { source: "BLTZ CUT", title: "SIDELINE ENERGY", meta: "52K VIEWS", img: poolAt(4), videoUrl: null },
  ];
  const mediaPodcast: any[] = [];
  const mediaSocial = [
    { platform: "Instagram", handle: "@athlete", meta: "12.4K LIKES", img: poolAt(4) },
    { platform: "X", handle: "@athlete", meta: "4.8K REPOSTS", img: poolAt(0) },
    { platform: "Facebook", handle: "Athlete Page", meta: "8.1K REACTIONS", img: poolAt(1) },
    { platform: "LinkedIn", handle: "Athlete", meta: "2.2K IMPRESSIONS", img: poolAt(2) },
    { platform: "Instagram", handle: "@athlete", meta: "18.6K VIEWS", img: poolAt(3) },
    { platform: "X", handle: "@athlete", meta: "9.3K VIEWS", img: poolAt(4) },
  ];
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
  const careerCells = [["39", "GAMES"], ["187", "TACKLES"], ["15", "INT"], ["41", "PASS BU"], ["6", "FORCED FUM"], ["4", "DEF. TD"]]
    .map(([value, label]) => ({ value, label }));
  const intData: [string, number][] = [["2021", 3], ["2022", 2], ["2023", 4], ["2024", 6]];
  const maxInt = 6;
  const intBars = intData.map(([year, value]) => ({
    year, value,
    barStyle: { width: 26, height: (value / maxInt * 100) + "%", borderRadius: 5, background: year === "2024" ? "linear-gradient(180deg,#FFB940,#C77D00)" : "linear-gradient(180deg,#2952FF,#1A3DCC)", transformOrigin: "bottom", animation: "barGrow .6s cubic-bezier(.16,1,.3,1) both" } as React.CSSProperties,
  }));
  const timeline = [
    { year: "2021", tag: "TRUE FRESHMAN", title: "BROKE THE ROTATION", note: "Started 4 games, first career INT. Freshman All-American nod." },
    { year: "2022", tag: "RB1 SHUTDOWN", title: "LOCKDOWN ISLAND", note: "Held opposing WR1s to 38% completion. Named team captain." },
    { year: "2023", tag: "ALL-CONFERENCE", title: "FIRST-TEAM ALL-CONFERENCE", note: "4 INT, 2 returned for scores. Led conference in PBU." },
    { year: "2024", tag: "THE LEAP", title: "CONSENSUS ALL-AMERICAN", note: "Thorpe finalist. $14K in pool earnings shared with the secondary." },
  ];
  const gameRows = [
    ["@ RIVAL", "W 27-20", "5", "3", "1.0", "2", "3", "1"], ["STATE", "W 31-24", "6", "4", "0.5", "1", "2", "0"],
    ["@ TECH", "L 21-28", "7", "5", "0.0", "0", "2", "0"], ["NORTH", "W 34-17", "4", "2", "1.5", "1", "4", "1"],
    ["SOUTH", "W 41-10", "3", "3", "0.0", "2", "1", "0"], ["@ WEST", "W 24-14", "5", "4", "1.0", "0", "2", "1"],
  ].map(([opp, res, tkl, solo, sack, int, pbu, ff]) => ({ opp, res, tkl, solo, sack, int, pbu, ff, resColor: (res as string)[0] === "W" ? "#00D68F" : "#FF3D5A" }));
  const showProGameLogPreview = true;
  const gameLogSections = [
    {
      key: "cfb",
      label: "CFB",
      meta: "4 seasons · organization / scrape data",
      seasons: ["2024", "2023", "2022", "2021"].map((year, index) => ({
        year,
        summary: `${gameRows.length} games · ${58 - index * 7} tackles · ${Math.max(1, 6 - index)} INT`,
        rows: gameRows.slice(0, index === 0 ? 6 : 3),
      })),
    },
    ...(showProGameLogPreview ? [{
      key: "pro",
      label: "PRO",
      meta: "3 seasons · league / team data",
      seasons: ["2027", "2026", "2025"].map((year, index) => ({
        year,
        summary: `${12 - index} games · ${42 - index * 6} tackles · ${Math.max(0, 3 - index)} INT`,
        rows: gameRows.slice(0, 3),
      })),
    }] : []),
  ];
  const statsPills = [["career", "CAREER"], ["awards", "AWARDS"], ["log", "GAME LOG"]]
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
  const displayJersey = hasKnownText(data.jersey) ? data.jersey : unknownText;
  const displayPosition = hasKnownText(data.position) ? data.position : unknownText;
  const displayHighSchool = hasKnownText(data.highSchool) ? data.highSchool : unknownText;

  const tabIdx = { bio: 0, media: 1, stats: 2 }[tab];
  const earnedFmt = "$" + (stats.earned || 0).toLocaleString("en-US");
  const viewsFmt = Math.round((stats.views || 0) / 1000) + "K";

  const reelBase: React.CSSProperties = { position: "absolute", inset: 0, backgroundSize: "cover", backgroundPosition: "center", animation: "heroFade 18s ease-in-out infinite" };

  return (
    <div style={{ minHeight: "100dvh", background: "#05070F", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: body }}>
      <style>{styleSheet}</style>
      <div className="bltz-frame">

        {/* STICKY MINI HEADER */}
        <div style={{
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 12px", position: "relative", zIndex: 6 }}>
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
          <section style={{ padding: "0 18px" }}>
            <div style={{ position: "relative", height: 600, borderRadius: 24, overflow: "hidden", background: "linear-gradient(180deg,#161B30 0%,#10142404 55%,#0B0E1A 100%)" }}>
              {/* video / photo-reel background */}
              <div style={{ position: "absolute", inset: 0 }}>
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
              </div>
              {/* stadium grid */}
              <div style={{ position: "absolute", inset: "-40%", backgroundImage: "linear-gradient(rgba(41,82,255,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(41,82,255,.10) 1px,transparent 1px)", backgroundSize: "46px 46px", transformOrigin: "50% 40%", animation: "drift 20s ease-in-out infinite alternate", pointerEvents: "none" }} />
              {/* glows */}
              <div style={{ position: "absolute", top: -60, left: -80, width: 340, height: 340, borderRadius: 9999, background: "radial-gradient(circle,rgba(41,82,255,.35),transparent 70%)", animation: "glowA 7s ease-in-out infinite", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: 120, right: -70, width: 260, height: 260, borderRadius: 9999, background: "radial-gradient(circle,rgba(245,166,35,.28),transparent 70%)", animation: "glowB 8s ease-in-out infinite", pointerEvents: "none" }} />
              {/* bottom blend */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(11,14,26,.15) 0%,rgba(11,14,26,0) 30%,rgba(11,14,26,.15) 52%,rgba(11,14,26,.72) 78%,#0B0E1A 100%)", pointerEvents: "none" }} />

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
              <img src={data.headshotUrl} alt={data.fullName} style={{ position: "absolute", bottom: 96, left: "50%", transform: "translateX(-50%)", height: 268, width: 210, objectFit: "cover", objectPosition: "top", zIndex: 3, filter: "drop-shadow(0 24px 40px rgba(0,0,0,.55))", WebkitMaskImage: "linear-gradient(to bottom,#000 74%,transparent 100%)", maskImage: "linear-gradient(to bottom,#000 74%,transparent 100%)" }} />

              {/* small solid-navy fade pinned to the bottom of the headshot — same
                  color as the container background, so name + hometown pop */}
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 96, height: 90, zIndex: 3, background: "linear-gradient(to bottom, rgba(11,14,26,0) 0%, rgba(11,14,26,.55) 55%, #0B0E1A 100%)", pointerEvents: "none" }} />

              {/* name-readability gradient — on top of the headshot, behind the name/pills */}
              <div style={{ position: "absolute", inset: 0, zIndex: 4, background: "linear-gradient(to bottom, transparent 0%, transparent 58%, rgba(5,7,15,.5) 78%, rgba(11,14,26,.95) 100%)", pointerEvents: "none" }} />

              {/* name block */}
              <div style={{ position: "absolute", bottom: 18, left: 0, right: 0, zIndex: 5, textAlign: "center", padding: "0 16px" }}>
                <h1 style={{ fontFamily: disp, fontWeight: 900, fontSize: heroNameSize, lineHeight: ".9", letterSpacing: "-.005em", textTransform: "uppercase", color: "#fff", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{data.fullName}</h1>
                <div style={{ fontFamily: mono, fontSize: 14, letterSpacing: ".14em", color: "#F5A623", margin: "8px 0 14px", fontWeight: 700 }}>{data.hometown}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
                  <RotatingPill items={data.schools} fallback={{ label: "SCHOOL", color: "#1A3DCC" }} />
                  <div style={{ width: 46, height: 46, borderRadius: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.28)", backdropFilter: "blur(8px)", fontFamily: disp, fontWeight: 800, fontSize: 16, color: "#fff", flex: "none" }}>{data.position || "—"}</div>
                  <RotatingPill items={data.proTeams} fallback={{ label: data.levelLabel.toUpperCase(), color: "#1A3DCC" }} />
                </div>
              </div>

              {/* container stroke — fades out toward the bottom */}
              <div style={{ position: "absolute", inset: 0, borderRadius: 24, border: "1px solid rgba(255,255,255,.18)", pointerEvents: "none", WebkitMaskImage: "linear-gradient(to bottom,#000 0%,#000 42%,transparent 88%)", maskImage: "linear-gradient(to bottom,#000 0%,#000 42%,transparent 88%)" }} />
            </div>
          </section>

          {hasAthleteQuote && (
            <section style={{ padding: "10px 18px 0" }}>
              <div style={{ padding: "0 2px", textAlign: "center" }}>
                <p style={{ margin: 0, fontFamily: mono, fontWeight: 700, fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,.86)" }}>
                  “{displayAthleteQuote}”
                </p>
                <div style={{ marginTop: 8, fontFamily: mono, fontSize: 8.5, letterSpacing: ".14em", color: "rgba(255,255,255,.48)", textTransform: "uppercase" }}>
                  {displayAthleteQuoteAuthor}
                </div>
              </div>
            </section>
          )}

          {/* ===== FILM ROOM ===== */}
          <section style={{ padding: "18px 18px 4px" }}>
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
          <section style={{ padding: "20px 18px 8px" }}>
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
          <section style={{ padding: "24px 0 0" }}>
            <Tabs
              value={tab}
              onValueChange={(value) => selectTab(value as "bio" | "media" | "stats")}
              className="gap-0"
            >
              <div style={{ padding: "0 18px" }}>
                <TabsList className="relative grid h-[52px] w-full grid-cols-3 overflow-hidden rounded-full border border-[#1E2640] bg-[#111624] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
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
                      className="relative z-10 h-10 rounded-full border-0 px-2 text-[12px] font-extrabold uppercase tracking-normal text-white/45 transition-colors duration-300 data-[state=active]:text-[#0B0E1A]"
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
                <div className="hs" style={{ display: "flex", gap: 9, justifyContent: "center", overflowX: "auto", padding: "0 18px 4px" }}>
                  {bioPills.map((p) => (
                    <button key={p.key} onClick={() => setBioSort(p.key)} style={pillStyle(p.active)}>{p.label}</button>
                  ))}
                </div>
                {bioSort === "all" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "42% 1fr", gap: 8, alignItems: "start", padding: "14px 18px 10px" }}>
                    <div style={{ height: 216, borderRadius: 14, overflow: "hidden", border: "1px solid #1E2640", background: GRAD_FIELD, position: "relative" }}>
                      <img
                        src={data.headshotUrl}
                        alt=""
                        onError={(event) => {
                          if (event.currentTarget.src.endsWith(HEADSHOT_FALLBACK)) return;
                          event.currentTarget.src = HEADSHOT_FALLBACK;
                        }}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 12%", filter: "drop-shadow(0 10px 18px rgba(0,0,0,.55))" }}
                      />
                    </div>
                    <div style={{ minHeight: 216, borderRadius: 14, border: "1px solid #1E2640", background: "#131829", padding: 16, display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
                      <div style={{ fontFamily: disp, fontWeight: 800, fontSize: 18, lineHeight: 1, letterSpacing: ".02em", textTransform: "uppercase", color: lockerAccent, marginBottom: 14 }}>BASIC INFO</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
                        <IdRow label="HOMETOWN" value={displayHometown} />
                        <IdRow label="BIRTHDATE" value={displayDob} />
                        <IdRow label="JERSEY NUMBERS" value={displayJersey} />
                        <IdRow label="POSITION" value={displayPosition} />
                        <IdRow label="HIGH SCHOOL" value={displayHighSchool} />
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
                      <div style={{ padding: "18px 18px 16px", background: "linear-gradient(135deg,rgba(255,185,64,.12),rgba(41,82,255,.08),rgba(19,24,41,0))", borderBottom: "1px solid #1E2640" }}>
                        <div style={{ fontFamily: disp, fontWeight: 800, fontSize: 20, lineHeight: 1, letterSpacing: ".02em", textTransform: "uppercase", color: lockerAccent, marginBottom: 14 }}>MEASURABLES</div>
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
                      <div style={{ fontFamily: disp, fontWeight: 800, fontSize: 20, lineHeight: 1, letterSpacing: ".02em", textTransform: "uppercase", color: lockerAccent, marginBottom: 16 }}>THE STORY</div>
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
                <div className="hs" style={{ display: "flex", gap: 9, justifyContent: "center", overflowX: "auto", padding: "0 18px 4px" }}>
                  {mediaPills.map((p) => (
                    <button key={p.key} onClick={() => setMediaSort(p.key)} style={pillStyle(p.active)}>{p.label}</button>
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
                        className="media-inner-scroll"
                        ref={shortsScrollRef}
                        onScroll={handleShortsScroll}
                        style={{ height: 408, overflowY: "auto", overscrollBehavior: "auto", paddingRight: 6, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}
                      >
                      {mediaShorts.map((short, index) => (
                        <div
                          key={short.title}
                          ref={(node) => { shortRefs.current[index] = node; }}
                          data-short-index={index}
                          style={{ minHeight: 246, borderRadius: 14, overflow: "hidden", border: "1px solid #1E2640", background: "#131829", position: "relative" }}
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
                        </div>
                      ))}
                      </div>
                      <div style={{ position: "absolute", top: 14 + shortsScrollProgress * 286, right: 1, width: 2, height: 54, borderRadius: 9999, background: "rgba(210,214,224,.72)", boxShadow: "0 0 8px rgba(210,214,224,.22)", opacity: shortsScrolling ? 1 : 0, transition: "opacity .22s ease, top .08s linear", pointerEvents: "none" }} />
                    </div>
                  </div>
                ) : mediaSort === "podcast" ? (
                  <div style={{ padding: "14px 18px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {mediaPodcast.length ? (
                      mediaPodcast.map((m) => (
                        <div key={m.title} style={{ width: "100%", height: 178, borderRadius: 16, overflow: "hidden", border: "1px solid #1E2640", background: "#131829" }}>
                          <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 16, background: "linear-gradient(150deg,#12183a,#131829)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                              <span style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg,#2952FF,#1A3DCC)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎙</span>
                              <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".14em", color: "rgba(255,255,255,.5)" }}>{m.source}</span>
                            </div>
                            <div style={{ fontFamily: disp, fontWeight: 700, fontSize: 21, lineHeight: .95, textTransform: "uppercase", color: "#fff", marginBottom: 14 }}>{m.title}</div>
                            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 34, marginTop: "auto" }}>
                              {[[.4, "#FFB940", 0], [.8, "#FFB940", .15], [.55, "#F5A623", .3], [.95, "#F5A623", .45], [.35, "#C77D00", .6], [.7, "#C77D00", .2]].map((b, k) => (
                                <span key={k} style={{ width: 3, background: b[1] as string, borderRadius: 2, height: `${(b[0] as number) * 100}%`, animation: `eqbar 1.1s ease-in-out ${b[2]}s infinite` }} />
                              ))}
                              <span style={{ flex: 1 }} />
                              <span style={{ fontFamily: mono, fontSize: 10, color: "rgba(255,255,255,.6)" }}>{m.meta}</span>
                            </div>
                          </div>
                        </div>
                      ))
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
                        className="media-inner-scroll"
                        ref={socialScrollRef}
                        onScroll={handleSocialScroll}
                        style={{ height: 408, overflowY: "auto", overscrollBehavior: "auto", display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 0 }}
                      >
                        {mediaSocial.map((post, index) => (
                          <div key={`${post.platform}-${index}`} style={{ aspectRatio: "1 / 1.18", position: "relative", overflow: "hidden", background: GRAD_FIELD }}>
                            {post.img ? <img src={post.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(5,7,15,.88),rgba(5,7,15,.04) 58%)" }} />
                            <div style={{ position: "absolute", top: 8, left: 8, padding: "4px 7px", borderRadius: 9999, background: "rgba(11,14,26,.7)", border: "1px solid rgba(255,255,255,.14)", fontFamily: mono, fontSize: 7.5, letterSpacing: ".1em", color: "#fff", textTransform: "uppercase" }}>{post.platform}</div>
                            <div style={{ position: "absolute", left: 10, right: 10, bottom: 10 }}>
                              <div style={{ fontFamily: mono, fontSize: 7.5, letterSpacing: ".1em", color: lockerAccent, textTransform: "uppercase", marginBottom: 4 }}>{post.handle}</div>
                              <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: ".08em", color: "rgba(255,255,255,.68)", textTransform: "uppercase" }}>{post.meta}</div>
                            </div>
                          </div>
                        ))}
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
                      <div style={{ overflowY: "auto", padding: "12px 18px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
                        {mediaArticles.map((article) => (
                          <article key={article.title} style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: 12, border: "1px solid #1E2640", borderRadius: 12, background: "#131829", padding: 10 }}>
                            <div style={{ height: 76, borderRadius: 8, overflow: "hidden", background: GRAD_FIELD }}>
                              {article.img ? <img src={article.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                            </div>
                            <div>
                              <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: ".12em", color: lockerAccent, textTransform: "uppercase", marginBottom: 5 }}>{article.source} · {article.meta}</div>
                              <h3 style={{ fontFamily: disp, fontWeight: 800, fontSize: 17, lineHeight: .95, color: "#fff", textTransform: "uppercase", margin: "0 0 7px" }}>{article.title}</h3>
                              <p style={{ fontFamily: body, fontSize: 12.5, lineHeight: 1.45, color: "rgba(255,255,255,.62)", margin: 0 }}>{article.dek}</p>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STATS TAB */}
            {tab === "stats" && (
              <div style={{ animation: "tabIn .4s cubic-bezier(.16,1,.3,1)", paddingTop: 16 }}>
                <div className="hs" style={{ display: "flex", gap: 9, justifyContent: "center", overflowX: "auto", padding: "0 18px 4px" }}>
                  {statsPills.map((p) => (
                    <button key={p.key} onClick={() => setStatsSort(p.key)} style={pillStyle(p.active)}>{p.label}</button>
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
                          <div style={{ fontFamily: disp, fontWeight: 900, fontSize: 32, lineHeight: ".85", color: "#fff" }}>{s.value}</div>
                          <div style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: ".12em", color: "rgba(255,255,255,.45)", marginTop: 6 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {statsSort === "career" && (
                  <div style={{ animation: "tabIn .35s ease", padding: "14px 18px 4px" }}>
                    <div style={{ marginBottom: 12, padding: "11px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", fontFamily: mono, fontSize: 8, letterSpacing: ".11em", color: "rgba(255,255,255,.52)", textTransform: "uppercase", lineHeight: 1.35, textAlign: "center" }}>
                      Career metrics adapt by sport and position from onboarding scrape, athlete upload, or organization data.
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
                      {careerCells.map((s, i) => (
                        <div key={i} style={{ minHeight: 86, borderRadius: 12, padding: "15px 10px", border: "1px solid #1E2640", background: "#131829", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                          <div style={{ fontFamily: disp, fontWeight: 900, fontSize: 30, lineHeight: ".85", color: "#fff" }}>{s.value}</div>
                          <div style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: ".12em", color: "rgba(255,255,255,.45)", marginTop: 6 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ borderRadius: 16, padding: 18, border: "1px solid #1E2640", background: "#131829" }}>
                      <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".16em", color: "#FFB940", marginBottom: 16 }}>◆ INTERCEPTIONS BY SEASON</div>
                      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, height: 120 }}>
                        {intBars.map((b, i) => (
                          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
                            <span style={{ fontFamily: disp, fontWeight: 800, fontSize: 16, color: "#fff" }}>{b.value}</span>
                            <div style={b.barStyle} />
                            <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".08em", color: "rgba(255,255,255,.45)" }}>{b.year}</span>
                          </div>
                        ))}
                      </div>
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
                      <div style={{ minHeight: 260, borderRadius: 16, border: "1px solid #1E2640", background: "radial-gradient(120% 100% at 100% 0,rgba(255,185,64,.12),#131829 58%)", padding: "26px 22px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
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
                      return (
                        <div key={section.key} style={{ borderRadius: 14, border: "1px solid #1E2640", background: "#131829", overflow: "hidden" }}>
                          <button
                            type="button"
                            onClick={() => setGameLogOpen((prev) => ({ ...prev, [section.key]: !prev[section.key] }))}
                            style={{ width: "100%", border: 0, background: "transparent", padding: "14px 14px 13px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: "pointer", textAlign: "left" }}
                          >
                            <span>
                              <span style={{ display: "block", fontFamily: disp, fontWeight: 900, fontSize: 23, lineHeight: .9, color: "#fff", textTransform: "uppercase" }}>{section.label}</span>
                              <span style={{ display: "block", fontFamily: mono, fontSize: 8, letterSpacing: ".11em", color: "rgba(255,255,255,.45)", textTransform: "uppercase", marginTop: 5 }}>{section.meta}</span>
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
                                    <div style={{ width: 688, maxWidth: "none" }}>
                                      <div style={{ display: "grid", gridTemplateColumns: "150px 76px repeat(6,72px)", gap: 0, padding: "0 10px 8px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                                        {["OPPONENT", "RES", "TKL", "SOLO", "SACK", "INT", "PBU", "FF"].map((h, i) => (
                                          <span key={h} style={{ fontFamily: mono, fontSize: 8, letterSpacing: ".1em", color: "rgba(255,255,255,.4)", textAlign: i === 0 ? "left" : "center", whiteSpace: "nowrap" }}>{h}</span>
                                        ))}
                                      </div>
                                      {season.rows.map((g, i) => (
                                        <div key={`${season.year}-${g.opp}-${i}`} style={{ display: "grid", gridTemplateColumns: "150px 76px repeat(6,72px)", alignItems: "center", padding: "11px 10px", borderRadius: 9, background: i % 2 ? "transparent" : "rgba(255,255,255,.035)" }}>
                                          <span style={{ fontFamily: disp, fontWeight: 700, fontSize: 14, textTransform: "uppercase", color: "#fff" }}>{g.opp}</span>
                                          <span style={{ fontFamily: mono, fontSize: 10, textAlign: "center", color: g.resColor }}>{g.res}</span>
                                          <span style={{ fontFamily: disp, fontWeight: 700, fontSize: 14, color: "#fff", textAlign: "center" }}>{g.tkl}</span>
                                          <span style={{ fontFamily: disp, fontWeight: 700, fontSize: 14, color: "#fff", textAlign: "center" }}>{g.solo}</span>
                                          <span style={{ fontFamily: disp, fontWeight: 700, fontSize: 14, color: "#fff", textAlign: "center" }}>{g.sack}</span>
                                          <span style={{ fontFamily: disp, fontWeight: 700, fontSize: 14, color: "#fff", textAlign: "center" }}>{g.int}</span>
                                          <span style={{ fontFamily: disp, fontWeight: 700, fontSize: 14, color: "#fff", textAlign: "center" }}>{g.pbu}</span>
                                          <span style={{ fontFamily: disp, fontWeight: 700, fontSize: 14, color: "#fff", textAlign: "center" }}>{g.ff}</span>
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
            <div style={{ maxHeight: "calc(100% - 68px)", overflowY: "auto", paddingRight: 2 }}>
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

function IdRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: ".12em", color: "rgba(255,255,255,.4)", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontFamily: disp, fontWeight: 700, fontSize: 15, lineHeight: 1, textTransform: "uppercase", color: "#fff", overflowWrap: "anywhere" }}>{value}</span>
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
@media (min-width:640px){.bltz-frame{border-radius:28px}}
@media (max-width:640px){.bltz-frame{width:100vw;height:100dvh;box-shadow:none}}
.scr::-webkit-scrollbar,.hs::-webkit-scrollbar{display:none;width:0;height:0}
.scr,.hs{scrollbar-width:none;-ms-overflow-style:none}
.media-inner-scroll{scrollbar-width:none;-ms-overflow-style:none}
.media-inner-scroll::-webkit-scrollbar{display:none;width:0;height:0;background:transparent}
.media-inner-scroll::-webkit-scrollbar-track{background:transparent}
.media-inner-scroll::-webkit-scrollbar-thumb{background:transparent}
.media-inner-scroll::-webkit-scrollbar-button{display:none;width:0;height:0;background:transparent}
.media-inner-scroll::-webkit-scrollbar-corner{background:transparent}
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
@keyframes eqbar{0%,100%{height:20%}50%{height:95%}}
@keyframes pillScroll{0%{transform:translateY(0)}100%{transform:translateY(-44px)}}
@keyframes pillSeamFade{0%{opacity:0}45%{opacity:1}100%{opacity:0}}
`;
