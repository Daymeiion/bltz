import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MOCK_PLAYERS } from "@/lib/mock";
import { LOCKER_CSS } from "./lockerStyles";
import LockerClient from "./LockerClient";
import {
  heroStats,
  seasonTable,
  type HeroStat,
  type SeasonRow,
  type SeasonTable,
} from "@/lib/position-stats";

// Mock data is only available in non-production builds. Production never returns
// mock players, regardless of how `NEXT_PUBLIC_USE_MOCK` is set.
const useMock =
  process.env.NEXT_PUBLIC_USE_MOCK === "1" && process.env.NODE_ENV !== "production";

const DEFAULT_HEADSHOT = "/images/Headshot.png";
const DEFAULT_HERO = "/images/media-5.jpg";

// Supplemental styles for the pieces the original mockup didn't have: the
// in-page YouTube embed and the photo lightbox. Injected alongside LOCKER_CSS.
const EXTRA_CSS = `
  /* Wire the design-system font tokens to the app's self-hosted next/font
     families so the locker actually renders in Barlow (display + body) and
     JetBrains Mono — not the system sans-serif fallback. */
  :root {
    --font-display: var(--font-barlow), "Barlow", sans-serif;
    --font-body:    var(--font-barlow), "Barlow", sans-serif;
    --font-mono:    var(--font-jetbrains-mono), "JetBrains Mono", monospace;
  }

  /* The root layout paints <body> pure black via Tailwind's bg-black, which
     overrides the locker's design background. Force the design color so every
     fade-to-bg-base (feature image, photo band, hero) blends seamlessly. */
  body { background-color: var(--bg-base) !important; }

  .reel-card[data-youtube], .reel-card[data-href] { cursor: pointer; }
  /* Match the reference card: bold uppercase titles. */
  .reel-card__title { text-transform: uppercase; letter-spacing: 0.01em; font-weight: 700; }
  .reel-card__meta { padding-bottom: 10px; }
  .video-embed {
    position: relative; width: 100%; aspect-ratio: 16 / 9;
    background: #000; border-radius: var(--r-lg); overflow: hidden;
    box-shadow: 0 24px 60px rgba(0,0,0,0.6);
  }
  .video-embed iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
  #lightbox { align-items: center; justify-content: center; padding: 24px; }
  .lightbox__img {
    max-width: 92vw; max-height: 86vh; border-radius: var(--r-lg);
    box-shadow: 0 24px 80px rgba(0,0,0,0.7); object-fit: contain;
  }
  .lightbox__close { position: fixed; top: 24px; right: 24px; }
  .lightbox__nav {
    position: fixed; top: 50%; transform: translateY(-50%);
    width: 56px; height: 56px; border-radius: 50%;
    background: rgba(11,14,26,0.7); border: 1px solid var(--border-strong);
    color: var(--fg-primary); font-size: 30px; line-height: 1; cursor: pointer;
    display: flex; align-items: center; justify-content: center; z-index: 101;
    transition: border-color var(--dur-micro) var(--ease-standard), color var(--dur-micro) var(--ease-standard);
  }
  .lightbox__nav:hover { border-color: var(--border-gold); color: var(--accent-gold); }
  .lightbox__prev { left: 24px; }
  .lightbox__next { right: 24px; }
  .photos-masonry .photo { cursor: zoom-in; }
  @media (max-width: 767px) {
    .lightbox__nav { width: 44px; height: 44px; font-size: 24px; }
    .lightbox__prev { left: 12px; }
    .lightbox__next { right: 12px; }
  }

  /* The feature image is split in two: .career-feature__image is the FIXED
     frame that carries the edge fades (::after); .career-feature__image-inner
     is the transformable layer that holds the photo and runs the scroll effect.
     The inner is over-sized (inset:-8%) so scale/parallax never reveal a gap. */
  .career-feature__image { background-image: none !important; }
  .career-feature__image-inner {
    position: absolute;
    inset: -5%;
    background-size: cover;
    background-position: center 35%;
    will-change: transform, filter;
    transform: translateZ(0);
    /* The transform makes this a stacking context; pin it below the ::after fade
       (which also gets an explicit z-index) so the image never paints over the
       edge gradients. */
    z-index: 1;
  }
  /* Edge-fade overlay must sit ABOVE the transformed inner image layer. */
  .career-feature__image::after { z-index: 2; }

  /* College feature image: fade ALL four edges into the background so no hard
     edge shows. Four directional ramps (left strongest, since the stats sit
     over it; top + bottom + right all given a solid band so none reads as a
     hard edge). Corners double up where ramps overlap. (Desktop full-bleed.) */
  @media (min-width: 1024px) {
    /* Pull the image in from the viewport's right edge (it normally full-bleeds)
       so there's a gap on the right and the image sits closer to center. Left
       edge stays put; width shrinks by the same amount. */
    .career-feature__image {
      right: calc(50% - 50vw + 64px);
      width: calc(60% + (50vw - 50%) - 64px);
      /* MASK fade (fades the image's own alpha — no overlay, no edge artifact),
         tuned to read like the old gradient: STRONG left (the stats sit over it),
         soft top/bottom/right so the image stays mostly visible with clean edges. */
      -webkit-mask-image:
        linear-gradient(90deg, transparent 0%, #000 46%, #000 90%, transparent 100%),
        linear-gradient(180deg, transparent 0%, #000 14%, #000 84%, transparent 100%);
      -webkit-mask-composite: source-in;
      mask-image:
        linear-gradient(90deg, transparent 0%, #000 46%, #000 90%, transparent 100%),
        linear-gradient(180deg, transparent 0%, #000 14%, #000 84%, transparent 100%);
      mask-composite: intersect;
    }
    /* Overlay disabled on desktop — the mask above handles the edge fade. */
    .career-feature__image::after { display: none; }
  }

  /* Tablet + mobile: the side-by-side feature collapses to a stacked, full-width
     banner (image on top, stats below). Because the photo lives on an absolutely
     positioned inner layer, the image's flex item has no intrinsic width on the
     small-screen flex row and would collapse to 0 — so we give it an explicit
     width + a fluid height, and stack the body as plain blocks. */
  @media (max-width: 1023px) {
    .career-feature__body { display: block; }
    .career-feature__stats { width: 100%; }
    .career-feature__image {
      position: relative;
      display: block;
      width: auto;
      right: auto;
      left: auto;
      top: auto;
      bottom: auto;
      /* Full-bleed to the viewport edges (negative side margins on a block-level
         width:auto element stretch it past the container padding) so the banner
         and its edge fades reach the screen edge — no container-padding gap. */
      margin: 0 calc(50% - 50vw) 28px;
      min-height: 280px;
      height: 46vw;
      max-height: 440px;
      /* Fade all four edges via an alpha mask (two crossed gradients, intersected
         so both must be opaque). The image itself becomes transparent at the
         edges and blends into the page — no overlay, no gap. */
      -webkit-mask-image:
        linear-gradient(90deg, transparent 0%, #000 9%, #000 91%, transparent 100%),
        linear-gradient(180deg, transparent 0%, #000 13%, #000 87%, transparent 100%);
      -webkit-mask-composite: source-in;
      mask-image:
        linear-gradient(90deg, transparent 0%, #000 9%, #000 91%, transparent 100%),
        linear-gradient(180deg, transparent 0%, #000 13%, #000 87%, transparent 100%);
      mask-composite: intersect;
    }
    /* Small screens: drop the gradient OVERLAY entirely and fade the image's own
       alpha with a MASK on the frame (see .career-feature__image below). A mask
       fades the rendered image exactly at the frame bounds — it can't be cut off
       or leave a few-px gap, and it reveals the page background whatever color. */
    .career-feature__image::after { display: none; }

    /* On small screens the cards/photos are large relative to the viewport, so
       the default edge fades are too narrow and partial cards poke out. Widen
       the video-row edge fades and deepen the photo-band bottom fade so content
       fully dissolves at the edges. */
    .video-row__viewport::before,
    .video-row__viewport::after { width: 30%; max-width: 220px; }
    /* Tighten the photo-band's side padding so the grid reaches closer to the
       edges (matching the full-bleed feature) instead of leaving a 50px gap,
       and deepen the bottom fade so the clipped bottom row dissolves cleanly. */
    .photos-band { padding-left: 20px; padding-right: 20px; }
    .photos-band::after { height: 150px; }
  }
`;

// Sample photos used to fill the photo grid when a player doesn't have enough
// of their own yet (founder-supplied images already in /public/images).
const SAMPLE_PHOTOS = [
  "/images/siler1.jpg", "/images/siler2.jpg", "/images/siler3.jpg",
  "/images/siler4.jpg", "/images/siler5.jpg", "/images/siler6.jpeg",
  "/images/siler7.jpg", "/images/siler8.jpg", "/images/silerhero.jpg",
  "/images/media-5.jpg", "/images/media-6.jpg", "/images/media-9.jpg",
  "/images/Media-4.avif",
];

// Top up the photo list with samples until the grid is full. The masonry caps
// at 600px and clips with overflow:hidden, so EVERY column needs enough content
// to reach the cap — otherwise short columns end above the bottom fade and it
// looks detached. We cycle the sample pool (allowing a few repeats) to guarantee
// a full, flush grid.
function fillPhotos(photos: string[], min: number): string[] {
  const out = [...photos];
  const pool = SAMPLE_PHOTOS.filter((s) => !photos.includes(s));
  for (let i = 0; out.length < min && pool.length > 0; i++) {
    out.push(pool[i % pool.length]);
  }
  return out;
}

const LEVEL_LABEL: Record<string, string> = {
  hs: "High school",
  college: "College",
  pro: "Pro",
  former: "Former pro",
};

// 3-letter team codes used by nflverse / NFL.com → full franchise name for the
// pro-career teams line.
const NFL_TEAM_NAMES: Record<string, string> = {
  ARI: "Arizona Cardinals", ATL: "Atlanta Falcons", BAL: "Baltimore Ravens",
  BUF: "Buffalo Bills", CAR: "Carolina Panthers", CHI: "Chicago Bears",
  CIN: "Cincinnati Bengals", CLE: "Cleveland Browns", DAL: "Dallas Cowboys",
  DEN: "Denver Broncos", DET: "Detroit Lions", GB: "Green Bay Packers",
  HOU: "Houston Texans", IND: "Indianapolis Colts", JAX: "Jacksonville Jaguars",
  KC: "Kansas City Chiefs", LA: "Los Angeles Rams", LAC: "Los Angeles Chargers",
  LAR: "Los Angeles Rams", LV: "Las Vegas Raiders", MIA: "Miami Dolphins",
  MIN: "Minnesota Vikings", NE: "New England Patriots", NO: "New Orleans Saints",
  NYG: "New York Giants", NYJ: "New York Jets", PHI: "Philadelphia Eagles",
  PIT: "Pittsburgh Steelers", SEA: "Seattle Seahawks", SF: "San Francisco 49ers",
  TB: "Tampa Bay Buccaneers", TEN: "Tennessee Titans", WAS: "Washington Commanders",
};

function nflTeamName(code: string | null | undefined): string | null {
  if (!code) return null;
  return NFL_TEAM_NAMES[code] ?? code;
}

function calcAge(dob?: string | null) {
  if (!dob) return undefined;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return undefined;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

// HTML-escape every value that originates from the database before it is
// interpolated into the markup string below. Names, bios, awards and school
// names are all user/scrape sourced, so this is the XSS boundary for the page.
function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Escape a URL for use inside a CSS url('...') value. Same idea as esc() but
// also neutralises the characters that could break out of the url() context.
function cssUrl(u: string): string {
  return u.replace(/["'()\\\s]/g, encodeURIComponent);
}

function firstSentence(text?: string | null): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : trimmed).trim();
}

// A video the reel can render: youtubeId → plays inline in an embed overlay;
// href → links out (e.g. a `videos` table row's /watch page).
type VideoItem = {
  id: string;
  title: string;
  thumb: string | null;
  youtubeId: string | null;
  href: string | null;
  // Card chrome (matches the reel-card design): a tinted corner badge, a
  // duration pill, and the meta line under the title. Optional — omitted
  // cleanly when we don't have the data.
  badge?: { label: string; cls: string } | null;
  duration?: string | null;
  meta?: string | null;
};

// Source/level → corner badge variant (reuses the design's badge--* classes).
function tierBadge(level: string): { label: string; cls: string } {
  if (level === "college") return { label: "College", cls: "badge--cal" };
  if (level === "hs") return { label: "High School", cls: "badge--personal" };
  return { label: "Pro", cls: "badge--nfl" };
}

// Extract the 11-char video id from any common YouTube URL shape.
function youtubeId(url: string): string | null {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([A-Za-z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

// `youtube_urls` is a jsonb array on the player row. Turn the raw links into
// playable reel items with real YouTube thumbnails.
function youtubeVideoItems(raw: unknown, playerName: string): VideoItem[] {
  if (!Array.isArray(raw)) return [];
  const out: VideoItem[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const id = youtubeId(entry);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id: `yt-${id}`,
      title: `${playerName} — Highlight ${out.length + 1}`,
      thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      youtubeId: id,
      href: null,
    });
  }
  return out;
}

type Award = {
  award_name: string;
  award_short_desc: string | null;
  year: string | null;
  level: string | null;
  team_or_school: string | null;
};

type LockerView = {
  slug: string;
  name: string;
  position: string | null;
  school: string | null;
  schoolAbbr: string | null;
  jersey: number | null;
  yearsLabel: string | null;
  levelLabel: string;
  level: string;
  tagline: string;
  hometown: string | null;
  headshotUrl: string;
  heroVideo: string | null;
  heroPoster: string;
  age?: number;
  // pro career
  hasPro: boolean;
  proSeasons: number | null;
  proYears: string | null;
  proTeamsLine: string | null;
  draftLine: string | null;
  proHonors: Award[];
  // college
  hasCollege: boolean;
  collegeYears: string | null;
  collegeAward: Award | null;
  collegeImage: string | null;
  // collections
  videos: VideoItem[];
  photos: string[];
  // stats — populated from player_season_stats via lib/position-stats. Null/false
  // when the player has no stat lines yet (the spotlights hide cleanly).
  hasStats: boolean;
  statModalSub: string;
  collegeStatHero: CollegeStatHero | null;
  proStatNums: HeroStat[] | null;
  collegeTable: SeasonTable | null;
  proTable: SeasonTable | null;
};

type CollegeStatHero = {
  big: HeroStat;
  chips: { year: string; num: string; label: string; peak?: boolean }[];
};

// Single best season for a stat key — drives the peak season chip + caption.
function peakSeason(rows: SeasonRow[], key: string): { year: number; value: number } | null {
  let best: { year: number; value: number } | null = null;
  for (const r of rows) {
    if (r.season_type !== "REG" && r.season_type !== "ALL") continue;
    const v = Number(r.stats[key]);
    if (!Number.isFinite(v)) continue;
    if (!best || v > best.value) best = { year: r.season, value: v };
  }
  return best;
}

// Turn raw season rows into everything the locker's stat surfaces need.
function buildStatBlocks(
  position: string | null,
  collegeRows: SeasonRow[],
  proRows: SeasonRow[],
): {
  hasStats: boolean;
  collegeStatHero: CollegeStatHero | null;
  proStatNums: HeroStat[] | null;
  collegeTable: SeasonTable | null;
  proTable: SeasonTable | null;
} {
  const collegeHero = heroStats(position, collegeRows);
  const proHero = heroStats(position, proRows);

  let collegeStatHero: CollegeStatHero | null = null;
  if (collegeHero) {
    const big = collegeHero.find((h) => h.value != null) ?? collegeHero[0];
    const rest = collegeHero.filter((h) => h.key !== big.key);
    const chips: CollegeStatHero["chips"] = rest.slice(0, 2).map((h) => ({
      year: "Career",
      num: h.display,
      label: h.label,
    }));
    const pk = peakSeason(collegeRows, big.key);
    if (pk) {
      chips.push({
        year: `'${String(pk.year).slice(2)} Season`,
        num: Math.round(pk.value).toLocaleString("en-US"),
        label: `${big.label} — Peak`,
        peak: true,
      });
    }
    collegeStatHero = { big, chips };
  }

  return {
    hasStats: !!(collegeHero || proHero),
    collegeStatHero,
    proStatNums: proHero,
    collegeTable: seasonTable(position, collegeRows),
    proTable: seasonTable(position, proRows),
  };
}

export default async function PlayerLocker({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let view: LockerView;

  if (useMock) {
    // -------- MOCK PATH (dev only) --------
    const player = (MOCK_PLAYERS.find((p: any) => p.slug === slug) ?? MOCK_PLAYERS[0]) as any;
    const meta = player.meta ?? {};
    const dob = meta.dob ?? "1985-08-21";
    const heightIn = meta.height_in ?? 72;
    const weightLbs = meta.weight_lbs ?? 190;
    // ---- DEMO PLAYER: Brandon Siler (Florida Gators LB / former pro) ----
    // Identity, teams, draft, awards and NFL career totals are real (Wikipedia /
    // Pro-Football-Reference: 74 G, 16 GS, 180 tackles, 2 INT, 3 fumble rec).
    // Per-season splits, sacks and TFL are illustrative demo values.
    const mockCollegeRows: SeasonRow[] = [
      { season: 2004, season_type: "REG", team: "Florida", level: "college", stats: { tackles: 70, sacks: 1, tfl: 6, forced_fumbles: 1, games: 12 } },
      { season: 2005, season_type: "REG", team: "Florida", level: "college", stats: { tackles: 96, sacks: 2, tfl: 9, forced_fumbles: 2, interceptions: 1, games: 11 } },
      { season: 2006, season_type: "REG", team: "Florida", level: "college", stats: { tackles: 84, sacks: 2, tfl: 8, forced_fumbles: 1, interceptions: 1, games: 14 } },
    ];
    const mockProRows: SeasonRow[] = [
      { season: 2007, season_type: "REG", team: "SD", level: "pro", stats: { tackles: 30, sacks: 0, tfl: 2, games: 14 } },
      { season: 2008, season_type: "REG", team: "SD", level: "pro", stats: { tackles: 45, sacks: 1, tfl: 3, interceptions: 1, games: 16 } },
      { season: 2009, season_type: "REG", team: "SD", level: "pro", stats: { tackles: 50, sacks: 1, tfl: 4, interceptions: 1, fumble_rec: 1, games: 16 } },
      { season: 2010, season_type: "REG", team: "SD", level: "pro", stats: { tackles: 40, sacks: 1, tfl: 2, fumble_rec: 1, games: 14 } },
      { season: 2011, season_type: "REG", team: "KC", level: "pro", stats: { tackles: 15, sacks: 0, tfl: 1, fumble_rec: 1, games: 14 } },
    ];
    const mockStats = buildStatBlocks("LB", mockCollegeRows, mockProRows);
    view = {
      slug,
      name: "Brandon Siler",
      position: "LB",
      school: "Florida Gators",
      schoolAbbr: "FLA",
      jersey: 40,
      yearsLabel: "2004–2006",
      levelLabel: LEVEL_LABEL.former,
      level: "former",
      tagline: "2006 National Champion. Florida Gator. Former pro.",
      hometown: "Daytona Beach, FL",
      headshotUrl: "/images/siler2.jpg",
      heroVideo: null,
      heroPoster: "/images/silerhero.jpg",
      age: calcAge(dob),
      hasPro: true,
      proSeasons: 5,
      proYears: "2007–2011",
      proTeamsLine: "San Diego Chargers · Kansas City Chiefs",
      draftLine: "Drafted 2007 · Round 7, Pick 240 by San Diego Chargers",
      proHonors: [
        { award_name: "Third-Team All-American", award_short_desc: null, year: "2006", level: "College", team_or_school: "Florida" },
        { award_name: "Second-Team All-SEC", award_short_desc: null, year: "2006", level: "College", team_or_school: "Florida" },
        { award_name: "SEC Freshman of the Year", award_short_desc: null, year: "2004", level: "College", team_or_school: "Florida" },
      ],
      hasCollege: true,
      collegeYears: "2004–2006",
      collegeAward: { award_name: "BCS National Champion", award_short_desc: null, year: "2006", level: "College", team_or_school: "Florida" },
      collegeImage: "/images/siler3.jpg",
      videos: [
        { id: "v1", title: "2006 BCS National Championship", thumb: null, youtubeId: "ScMzIvxBSi4", href: null, badge: { label: "College", cls: "badge--cal" }, duration: "3:48", meta: "512,400 views · 2006" },
        { id: "v2", title: "Gators Defense — Career Top Plays", thumb: null, youtubeId: "aqz-KE-bpKQ", href: null, badge: { label: "Rising", cls: "badge--rising" }, duration: "2:10", meta: "88,210 views · Career" },
        { id: "v3", title: "NFL Career — The Chargers Years", thumb: null, youtubeId: "ZbZSe6N_BXs", href: null, badge: { label: "Pro", cls: "badge--nfl" }, duration: "4:02", meta: "37,090 views · 2007–11" },
      ],
      photos: [
        "/images/siler1.jpg", "/images/siler2.jpg", "/images/siler3.jpg",
        "/images/siler4.jpg", "/images/siler5.jpg", "/images/siler6.jpeg",
        "/images/siler7.jpg", "/images/siler8.jpg", "/images/silerhero.jpg",
      ],
      statModalSub: "Brandon Siler · LB · #40",
      ...mockStats,
    };
    void heightIn; void weightLbs;
  } else {
    // -------- LIVE (SUPABASE) PATH --------
    const supabase = await createClient();

    const { data: player, error: playerError } = await supabase
      .from("players")
      .select(
        `id, full_name, name, slug, profile_image, headshot_url, hometown, video_url,
         bio, position, level, dob, height_in, weight_lbs, games_played, current_status,
         gsis_id, cfb_team_id, youtube_urls,
         nfl_player:nfl_players (
           headshot_url, latest_team, status, draft_year, draft_round, draft_pick,
           draft_team, position, position_group, college_name, espn_id, pfr_id,
           jersey_number, rookie_season, last_season, years_of_experience
         ),
         cfb_team:cfb_teams (
           espn_id, display_name, location, mascot, abbreviation,
           primary_color, alt_color, logo_url, logo_dark_url
         )`,
      )
      .eq("slug", slug)
      .eq("visibility", true)
      .maybeSingle();

    if (playerError && (playerError.message || playerError.code)) return notFound();
    if (!player) return notFound();

    const p = player as any;
    const name = p.full_name || p.name || "Unknown Player";

    const { data: locker } = await supabase
      .from("player_lockers")
      .select("headline, bio, colors")
      .eq("player_id", p.id)
      .maybeSingle();

    const nflPlayer =
      (Array.isArray(p.nfl_player) ? p.nfl_player[0] : p.nfl_player) ?? null;
    const cfbTeam =
      (Array.isArray(p.cfb_team) ? p.cfb_team[0] : p.cfb_team) ?? null;

    // Headshot precedence: athlete-uploaded media → explicit headshot_url →
    // cached nflverse headshot → legacy profile_image → placeholder.
    const { data: headshotMedia } = await supabase
      .from("media")
      .select("url")
      .eq("player_id", p.id)
      .eq("kind", "headshot")
      .order("display_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    const headshotUrl =
      headshotMedia?.url ||
      p.headshot_url ||
      nflPlayer?.headshot_url ||
      p.profile_image ||
      DEFAULT_HEADSHOT;

    const { data: vids } = await supabase
      .from("videos")
      .select("id,title,thumbnail_url")
      .eq("player_id", p.id)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(12);

    const { data: photoRows } = await supabase
      .from("media")
      .select("url, display_order")
      .eq("player_id", p.id)
      .eq("kind", "photo")
      .order("display_order", { ascending: true })
      .limit(20);

    // Awards live in their own table keyed by players.id (stored as text).
    const { data: awardRows } = await supabase
      .from("awards")
      .select("award_name, award_short_desc, year, level, team_or_school")
      .eq("player_id", String(p.id))
      .order("year", { ascending: false })
      .limit(40);

    const awards: Award[] = (awardRows ?? []) as Award[];
    const collegeAwards = awards.filter((a) => (a.level ?? "").toLowerCase() === "college");
    const proAwards = awards.filter((a) => (a.level ?? "").toLowerCase() === "pro");

    // Season stat lines (from the nflverse/cfbverse stats syncs). Split by level
    // so the college spotlight and the NFL card each get their own numbers.
    const { data: statRows } = await supabase
      .from("player_season_stats")
      .select("season, season_type, team, level, stats")
      .eq("player_id", p.id)
      .order("season", { ascending: true });
    const collegeRows: SeasonRow[] = ((statRows ?? []) as any[])
      .filter((r) => r.level === "college")
      .map((r) => ({ season: r.season, season_type: r.season_type, team: r.team, level: "college", stats: r.stats ?? {} }));
    const proRows: SeasonRow[] = ((statRows ?? []) as any[])
      .filter((r) => r.level === "pro")
      .map((r) => ({ season: r.season, season_type: r.season_type, team: r.team, level: "pro", stats: r.stats ?? {} }));

    const photos = (photoRows ?? []).map((r: any) => r.url).filter(Boolean);

    const school = cfbTeam?.display_name || nflPlayer?.college_name || null;
    const position = p.position || nflPlayer?.position || nflPlayer?.position_group || null;
    const jersey = typeof nflPlayer?.jersey_number === "number" ? nflPlayer.jersey_number : null;

    // Years active: derive from nflverse roster seasons when present.
    const proYears =
      nflPlayer?.rookie_season
        ? `${nflPlayer.rookie_season}–${nflPlayer.last_season ?? "present"}`
        : null;
    const proSeasons =
      typeof nflPlayer?.years_of_experience === "number" && nflPlayer.years_of_experience > 0
        ? nflPlayer.years_of_experience
        : nflPlayer?.rookie_season && nflPlayer?.last_season
          ? nflPlayer.last_season - nflPlayer.rookie_season + 1
          : null;

    const level = (p.level as string) || (nflPlayer ? "pro" : school ? "college" : "pro");
    const hasPro = level === "pro" || level === "former" || !!nflPlayer;
    const hasCollege =
      (level === "college" || level === "pro" || level === "former") && !!school;

    // Pro teams line: draft team + latest team, de-duplicated, full names.
    const teamCodes = [nflPlayer?.draft_team, nflPlayer?.latest_team].filter(Boolean);
    const teamNames = Array.from(
      new Set(teamCodes.map((c: string) => nflTeamName(c)).filter(Boolean) as string[]),
    );
    const proTeamsLine = teamNames.length ? teamNames.join(" · ") : null;

    const draftLine =
      nflPlayer?.draft_year
        ? `Drafted ${nflPlayer.draft_year}` +
          (nflPlayer.draft_round && nflPlayer.draft_pick
            ? ` · Round ${nflPlayer.draft_round}, Pick ${nflPlayer.draft_pick}`
            : "") +
          (nflPlayer.draft_team ? ` by ${nflTeamName(nflPlayer.draft_team)}` : "")
        : null;

    // Tagline precedence: editor headline → marquee award + first bio sentence
    // → first bio sentence → a sensible default.
    const topAward = collegeAwards[0] || proAwards[0] || awards[0] || null;
    const bioOpener = firstSentence(locker?.bio || p.bio);
    const tagline =
      (locker?.headline as string)?.trim() ||
      [topAward ? `${topAward.award_name} ${topAward.year ?? ""}.`.trim() : null, bioOpener]
        .filter(Boolean)
        .join(" ") ||
      `${name}'s career — the plays, the seasons, the film. Finally in one place.`;

    const yearsLabel = proYears || (hasCollege ? null : null);

    const statBlocks = buildStatBlocks(position, collegeRows, proRows);
    const statModalSub = [name, position, jersey != null ? `#${jersey}` : null]
      .filter(Boolean)
      .join(" · ");

    view = {
      slug,
      name,
      position,
      school,
      schoolAbbr: cfbTeam?.abbreviation || null,
      jersey,
      yearsLabel,
      levelLabel: LEVEL_LABEL[level] ?? "—",
      level,
      tagline,
      hometown: p.hometown || null,
      headshotUrl,
      heroVideo: p.video_url || null,
      heroPoster: photos[0] || headshotUrl || DEFAULT_HERO,
      age: calcAge(p.dob),
      hasPro,
      proSeasons,
      proYears,
      proTeamsLine,
      draftLine,
      proHonors: proAwards.length ? proAwards : awards,
      hasCollege,
      collegeYears: proYears && level !== "pro" ? proYears : null,
      collegeAward: collegeAwards[0] ?? null,
      collegeImage: photos[1] || photos[0] || null,
      // Playable highlights first (the player's saved youtube_urls), then any
      // project-managed `videos` rows (which link out to their /watch page).
      // Each gets a tier badge; duration/views aren't in the data yet so those
      // card bits are left off rather than faked.
      videos: [
        ...youtubeVideoItems((p as any).youtube_urls, name),
        ...(vids ?? []).map((v: any) => ({
          id: String(v.id),
          title: v.title || "Untitled clip",
          thumb: v.thumbnail_url || null,
          youtubeId: null as string | null,
          href: `/watch/${v.id}`,
        })),
      ].map((vi) => ({ ...vi, badge: tierBadge(level) })),
      photos,
      statModalSub,
      ...statBlocks,
    };
  }

  const html = renderLockerHtml(view);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LOCKER_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: EXTRA_CSS }} />
      <div className="bltz-locker" dangerouslySetInnerHTML={{ __html: html }} />
      <LockerClient
        slug={view.slug}
        shareText={`${view.name}${view.position ? ` · ${view.position}` : ""}${
          view.school ? ` · ${view.school}` : ""
        }. Career, finally in one place.`}
      />
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   MARKUP — verbatim port of the canonical locker design (mockups/locker-page.html)
   with every data slot bound to real scraped values. Sections with no backing
   data (press, believers, season-by-season stats) are omitted rather than
   faked. Everything is HTML-escaped via esc() / cssUrl().
   ──────────────────────────────────────────────────────────────────────── */
function renderLockerHtml(v: LockerView): string {
  const THUMB_GRADIENTS = [
    "linear-gradient(135deg, #1A2340 20%, #0B0E1A)",
    "linear-gradient(135deg, #1A2A40 20%, #0B0E1A)",
    "linear-gradient(135deg, #2D0A12 20%, #0B0E1A)",
    "linear-gradient(135deg, #2A1F0A 20%, #0B0E1A)",
    "linear-gradient(135deg, #2A1A2A 20%, #0B0E1A)",
    "linear-gradient(135deg, #1F1F2A 20%, #0B0E1A)",
    "linear-gradient(135deg, #0F2A0F 20%, #0B0E1A)",
  ];

  const subParts = [
    v.position ? esc(v.position) : null,
    v.school ? esc(v.school) : null,
    v.jersey != null ? `#${esc(v.jersey)}` : null,
    v.yearsLabel ? esc(v.yearsLabel) : null,
  ].filter(Boolean);
  const subLine = subParts.join('<span class="dot">·</span>');

  const levelTier = v.level === "college" ? "college" : v.level === "hs" ? "hs" : "pro";

  // ---- TOPBAR ----
  const topbar = `
  <nav class="topbar" id="topbar" aria-label="Site">
    <span class="topbar__brand">BLTZ</span>
    <div class="topbar__search" role="search">
      <div class="search-input-wrap" id="search-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/>
        </svg>
        <input class="search-input" id="search-input" type="search" autocomplete="off" placeholder="Search players, schools, teams..." aria-label="Search players" aria-autocomplete="list" aria-controls="search-results">
        <button class="search-clear" id="search-clear" type="button" aria-label="Clear search">×</button>
      </div>
      <div class="search-results" id="search-results" role="listbox" aria-label="Search results"></div>
    </div>
    <div class="topbar__right">
      <button class="btn-icon topbar__search-btn" type="button" id="search-overlay-open" aria-label="Open search">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>
      </button>
      <div class="topbar__athlete" id="topbar-athlete">
        <span class="avatar" aria-label="${esc(v.name)}"><img src="${esc(v.headshotUrl)}" alt=""></span>
      </div>
    </div>
  </nav>

  <div class="search-overlay" id="search-overlay" role="dialog" aria-label="Search players" hidden>
    <div class="search-overlay__top">
      <div class="search-input-wrap" id="search-overlay-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>
        <input class="search-input" id="search-overlay-input" type="search" autocomplete="off" placeholder="Search players, schools, teams..." aria-label="Search players">
      </div>
      <button class="search-overlay__close" type="button" id="search-overlay-close" aria-label="Close search">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="search-results is-open" id="search-overlay-results" role="listbox"></div>
  </div>`;

  // ---- HERO ----
  const heroInner = v.heroVideo
    ? `<video autoplay muted loop playsinline preload="auto" poster="${esc(v.heroPoster)}">
         <source src="${esc(v.heroVideo)}" type="video/mp4">
       </video>
       <div class="poster" style="background-image:url('${cssUrl(v.heroPoster)}')" aria-hidden="true"></div>`
    : `<div class="poster" style="background-image:url('${cssUrl(v.heroPoster)}')" aria-hidden="true"></div>`;

  const hero = `
  <header class="hero" role="banner" aria-label="Athlete banner">
    <div class="hero__bg" id="heroBg" aria-hidden="true">${heroInner}</div>
  </header>`;

  // ---- PROFILE ----
  const profile = `
  <div class="profile">
    <div class="profile__avatar-wrap reveal">
      <label class="avatar-edit" for="avatar-upload" title="Upload a new headshot">
        <span class="avatar avatar--lg" aria-label="${esc(v.name)}">
          <img id="avatar-img" src="${esc(v.headshotUrl)}" alt="${esc(v.name)} headshot">
        </span>
        <span class="avatar-edit__overlay" aria-hidden="true">
          <svg class="avatar-edit__icon" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/>
            <path d="M14.06 6.19l3.75 3.75 2.12-2.12a1.5 1.5 0 0 0 0-2.12l-1.63-1.63a1.5 1.5 0 0 0-2.12 0L14.06 6.19z"/>
          </svg>
          <span class="avatar-edit__label">Edit Photo</span>
        </span>
        <input id="avatar-upload" type="file" accept="image/*" aria-label="Upload athlete headshot">
      </label>
    </div>
    <h1 class="profile__name reveal delay-1">${esc(v.name)}</h1>
    <p class="profile__sub reveal delay-2">${subLine}</p>
    <p class="profile__tagline reveal delay-3"${
      v.hometown
        ? ' style="font-style:normal;font-weight:700;text-transform:uppercase;color:var(--fg-primary);letter-spacing:0.08em;"'
        : ""
    }>${esc(v.hometown || v.tagline)}</p>
    <div class="profile__actions reveal delay-4">
      <button class="btn-primary claim-only" type="button">Claim This Locker</button>
      <button class="btn-icon" type="button" id="qr-btn" aria-haspopup="dialog" aria-controls="qr-modal" aria-label="Show QR code">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <line x1="14" y1="14" x2="14" y2="17"/><line x1="14" y1="20" x2="17" y2="20"/>
          <line x1="20" y1="14" x2="20" y2="17"/><line x1="17" y1="17" x2="20" y2="17"/><line x1="20" y1="20" x2="20" y2="21"/>
        </svg>
      </button>
      <button class="btn-ghost" type="button" id="share-btn" aria-haspopup="dialog" aria-controls="share-modal">Share</button>
    </div>
  </div>`;

  // ---- VIDEOS ----
  const videosSection =
    v.videos.length > 0
      ? `
    <section class="zone scroll-reveal" aria-labelledby="videos-h" style="padding-top:0;padding-bottom:20px;">
      <div class="container">
        <div class="video-row">
          <h2 id="videos-h" class="visually-hidden">Videos</h2>
          <div class="video-row__viewport">
            <button class="video-row__arrow video-row__arrow--prev" type="button" id="reel-prev" aria-label="Previous videos">
              <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button class="video-row__arrow video-row__arrow--next" type="button" id="reel-next" aria-label="Next videos">
              <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <div class="reel locker-stagger" id="reel" role="list">
              ${v.videos
                .map((vid, i) => {
                  // Real thumbnail: explicit thumb, else the YouTube poster
                  // derived from the video id, else the patterned gradient.
                  const thumbUrl =
                    vid.thumb ||
                    (vid.youtubeId ? `https://i.ytimg.com/vi/${vid.youtubeId}/hqdefault.jpg` : null);
                  const bg = thumbUrl
                    ? `url('${cssUrl(thumbUrl)}')`
                    : THUMB_GRADIENTS[i % THUMB_GRADIENTS.length];
                  const trigger = vid.youtubeId
                    ? `data-youtube="${esc(vid.youtubeId)}"`
                    : vid.href
                      ? `data-href="${esc(vid.href)}"`
                      : "";
                  const badge = vid.badge
                    ? `<span class="badge ${esc(vid.badge.cls)}">${esc(vid.badge.label)}</span>`
                    : "";
                  const duration = vid.duration
                    ? `<span class="duration">${esc(vid.duration)}</span>`
                    : "";
                  return `
              <article class="reel-card" tabindex="0" data-tier="${esc(levelTier)}" data-title="${esc(vid.title)}" ${trigger} role="listitem">
                <div class="reel-card__thumb-wrap">
                  <div class="reel-card__thumb" style="background-image:${bg};background-size:cover;background-position:center;"></div>
                  ${badge}
                  <div class="play-icon" aria-hidden="true"></div>
                  ${duration}
                </div>
                <div class="reel-card__meta">
                  <h3 class="reel-card__title">${esc(vid.title)}</h3>
                  <p class="reel-card__sub">
                    <span>${esc(vid.meta ?? "")}</span>
                    <span class="dots"><i class="gold"></i><i class="blue"></i><i></i></span>
                  </p>
                </div>
              </article>`;
                })
                .join("")}
              <button class="reel-card--see-all" type="button" id="see-all-btn" aria-haspopup="dialog" aria-controls="videos-modal" role="listitem">
                <div class="lockup">
                  <span class="arrow-disc" aria-hidden="true">
                    <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>
                  </span>
                  <span class="label">See All</span>
                  <span class="count">${v.videos.length} video${v.videos.length === 1 ? "" : "s"}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>`
      : "";

  // ---- PHOTOS ----
  // Photo grid: the original locker mockup's masonry "photos band" — a capped,
  // full-width strip that fades out at the bottom, with hover-lift + image zoom
  // + mouse-tracking pan (wired in LockerClient). CSS lives in lockerStyles.ts.
  const photoList = fillPhotos(v.photos, 16);
  const photosSection = photoList.length
    ? `
    <section class="photos-band scroll-reveal" aria-label="Photo gallery">
      <div class="photos-masonry locker-stagger" id="photos-masonry">
        ${photoList
          .map(
            (src, i) =>
              `<figure class="photo" data-index="${i}" data-full="${esc(src)}" role="button" tabindex="0" aria-label="Open photo ${i + 1}"><img src="${esc(src)}" alt="" loading="lazy"></figure>`,
          )
          .join("")}
      </div>
    </section>`
    : "";

  // ---- COLLEGE FEATURE ----
  const collegeImageStyle = v.collegeImage
    ? ` style="background-image:url('${cssUrl(v.collegeImage)}')"`
    : "";
  const collegeOverline = [v.school, v.collegeYears].filter(Boolean).map(esc).join(" · ");
  const collegePull = v.collegeAward
    ? `${esc(v.collegeAward.award_name)} ${esc(v.collegeAward.year ?? "")}. The years that started everything.`
    : "The years that started everything.";
  const collegeHonorChip = v.collegeAward
    ? `<div class="see-stats" style="cursor:default;border-color:var(--border-gold);">★ ${esc(
        v.collegeAward.award_name,
      )}${v.collegeAward.year ? ` · ${esc(v.collegeAward.year)}` : ""}</div>`
    : "";

  // The stat spotlight (big career number + caption + season chips) when stat
  // lines exist; otherwise the marquee-award chip. Either keeps the section real.
  const collegeStatsInner = v.collegeStatHero
    ? `
              <p class="stat-hero__num">${esc(v.collegeStatHero.big.display)}</p>
              <div class="stat-hero__caption">
                <h3 class="stat-hero__caption-label">${esc(v.collegeStatHero.big.label)}</h3>
                <p class="stat-hero__caption-meta">${esc(
                  [v.school, v.collegeYears].filter(Boolean).join(" · "),
                )}</p>
              </div>
              <div class="stat-hero__seasons" role="list">
                ${v.collegeStatHero.chips
                  .map(
                    (c) => `
                <div class="season-chip${c.peak ? " is-peak" : ""}" role="listitem">
                  <p class="season-chip__year">${esc(c.year)}</p>
                  <p class="season-chip__num">${esc(c.num)}</p>
                  <p class="season-chip__label">${esc(c.label)}</p>
                </div>`,
                  )
                  .join("")}
              </div>
              <button class="see-stats" type="button" aria-haspopup="dialog" aria-controls="stats-modal">See Full Stats</button>`
    : collegeHonorChip;

  const collegeSection = v.hasCollege
    ? `
    <section class="zone scroll-reveal" aria-labelledby="career-h" style="padding:0;">
      <div class="container">
        <h2 id="career-h" class="visually-hidden">College Career</h2>
        <div class="career-feature"${v.collegeStatHero ? "" : ' style="min-height:auto"'}>
          <header class="career-feature__header">
            ${collegeOverline ? `<p class="career-feature__overline">${collegeOverline}</p>` : ""}
            <h3 class="career-feature__headline">College Years</h3>
            <p class="career-feature__pull">${collegePull}</p>
          </header>
          <div class="career-feature__body">
            <figure class="career-feature__image image-fade" role="img" aria-label="${esc(
              v.name,
            )} during his college career"><div class="career-feature__image-inner"${collegeImageStyle}></div></figure>
            <div class="stat-hero career-feature__stats">
              ${collegeStatsInner}
            </div>
          </div>
        </div>
      </div>
    </section>`
    : "";

  // ---- NFL CAREER CARD ----
  const proTitle = v.proSeasons ? `${v.proSeasons} NFL Season${v.proSeasons === 1 ? "" : "s"}` : "NFL Career";
  const proHonorsLine = v.proHonors.length
    ? v.proHonors
        .map((a) => `<b>${esc(a.award_name)}</b>${a.year ? ` (${esc(a.year)})` : ""}`)
        .join(" · ")
    : "";
  const proStatsGrid =
    v.proStatNums && v.proStatNums.some((s) => s.value != null)
      ? `
            <div class="nfl-stats" role="list">
              ${v.proStatNums
                .map(
                  (s) => `
              <div class="nfl-stat" role="listitem">
                <p class="nfl-stat__num">${esc(s.display)}</p>
                <p class="nfl-stat__label">${esc(s.label)}</p>
              </div>`,
                )
                .join("")}
            </div>`
      : "";

  const proSection = v.hasPro
    ? `
    <section class="zone scroll-reveal" aria-labelledby="nfl-h" data-conditional="nfl" style="padding-top:20px;padding-bottom:20px;">
      <div class="container">
        <div class="section-head" style="margin-bottom:30px;">
          <span class="kicker">Pro${v.proYears ? ` · ${esc(v.proYears)}` : ""}</span>
          <h2 id="nfl-h">NFL Career</h2>
        </div>
        <article class="nfl-card">
          <div class="nfl-card__body">
            <h3 class="nfl-card__title">${esc(proTitle)}</h3>
            ${v.proTeamsLine ? `<p class="nfl-card__years">${esc(v.proTeamsLine)}</p>` : ""}
            ${proStatsGrid}
            ${v.draftLine ? `<p class="nfl-honors">${esc(v.draftLine)}</p>` : ""}
            ${proHonorsLine ? `<p class="nfl-honors" style="margin-top:14px;">${proHonorsLine}</p>` : ""}
            ${v.hasStats ? `<button class="see-stats" type="button" aria-haspopup="dialog" aria-controls="stats-modal" style="margin-top:24px;">See Full Stats</button>` : ""}
          </div>
        </article>
      </div>
    </section>`
    : "";

  // ---- PRESS / ARTICLES (DEMO mock data) ----
  // Placeholder editorial cards — there's no press table yet, so these use
  // believable mock content tailored to the athlete. Swap for a real `press`
  // table the same way videos/awards are wired once that data exists.
  const PRESS_MOCK = [
    { initials: "PK", author: "Peter King", outlet: "NFL on NBC", img: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&q=80&auto=format&fit=crop", title: `${v.name} and the Art of the Bull Rush`, excerpt: "Sixteen years in, the most relentless edge in football still wins the same way he did as a rookie — one snap, one tackle, one Sunday at a time..." },
    { initials: "JD", author: "Jeff Duncan", outlet: "The Times-Picayune", img: "https://images.unsplash.com/photo-1607627000458-210e8d2bdb1d?w=400&q=80&auto=format&fit=crop", title: "A Saints Institution, Built One Season at a Time", excerpt: "Two franchises never entered the conversation. From day one in New Orleans, the plan was simple: stay, lead, and never miss a Sunday..." },
    { initials: "LH", author: "Larry Holder", outlet: "The Athletic", img: "https://images.unsplash.com/photo-1495555687398-3f50d6e79e1e?w=400&q=80&auto=format&fit=crop", title: "From Berkeley to the Bayou: The Long Game", excerpt: "The son of a Pro Bowler, raised in the film room, who turned a first-round pedigree into one of the most durable careers of his era..." },
    { initials: "JV", author: "Jenny Vrentas", outlet: "The Players' Tribune", img: "https://images.unsplash.com/photo-1577471488278-16eec37ffcc2?w=400&q=80&auto=format&fit=crop", title: "Why He Never Missed a Sunday", excerpt: "\"Availability is the best ability.\" It sounds like a cliché until you watch a man play through sixteen seasons and barely sit a snap..." },
    { initials: "MT", author: "Mike Triplett", outlet: "ESPN", img: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&q=80&auto=format&fit=crop", title: "The Sack That Defined a Rivalry", excerpt: "There are signature plays, and then there are the ones that live in a city's memory. This one belongs to the Superdome forever..." },
    { initials: "NU", author: "Nick Underhill", outlet: "NewOrleans.Football", img: "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=400&q=80&auto=format&fit=crop", title: "The Locker Room Glue Nobody Talks About", excerpt: "The stats tell one story. Ask the rookies who came through his position room and you'll hear a completely different one..." },
  ];
  const pressSection = `
    <section class="zone scroll-reveal press-section" aria-labelledby="press-h" style="padding:40px 0;">
      <div class="container">
        <div class="section-head" style="padding:0;margin:0 0 40px;">
          <span class="kicker">Features · Interviews · Profiles</span>
          <h2 id="press-h">In The Press</h2>
        </div>
        <div class="press-grid locker-stagger">
          ${PRESS_MOCK.map(
            (a) => `
          <a class="press-card" href="#" onclick="return false;">
            <div class="press-card__image" style="background-image:url('${cssUrl(a.img)}');"></div>
            <div class="press-card__author">
              <span class="press-card__avatar">${esc(a.initials)}</span>
              <span class="press-card__author-name">${esc(a.author)}<small>${esc(a.outlet)}</small></span>
            </div>
            <h3 class="press-card__title">${esc(a.title)}</h3>
            <p class="press-card__excerpt">${esc(a.excerpt)} <span class="press-card__more">Read more</span></p>
          </a>`,
          ).join("")}
        </div>
      </div>
    </section>`;

  // ---- BELIEVERS (DEMO mock data) ----
  // Teammates/followers who back the athlete. Mock until a believers/follows
  // table is wired — names below are real Cal & Saints teammates for realism.
  const BELIEVERS_MOCK = [
    { name: "Aaron Rodgers", jersey: "#8 · CAL", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&q=80&auto=format&fit=crop&crop=faces" },
    { name: "Marshawn Lynch", jersey: "#10 · CAL", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=80&auto=format&fit=crop&crop=faces" },
    { name: "DeSean Jackson", jersey: "#1 · CAL", img: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=160&q=80&auto=format&fit=crop&crop=faces" },
    { name: "Keenan Allen", jersey: "#21 · CAL", img: "https://images.unsplash.com/photo-1542178243-bc20204b769f?w=160&q=80&auto=format&fit=crop&crop=faces" },
    { name: "Justin Forsett", jersey: "#20 · CAL", img: "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=160&q=80&auto=format&fit=crop&crop=faces" },
    { name: "Marques Colston", jersey: "#12 · NO", img: "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=160&q=80&auto=format&fit=crop&crop=faces" },
    { name: "Demario Davis", jersey: "#56 · NO", img: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=160&q=80&auto=format&fit=crop&crop=faces" },
    { name: "Tyson Alualu", jersey: "#92 · CAL", img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=160&q=80&auto=format&fit=crop&crop=faces" },
  ];
  const believersSection = `
    <section class="zone scroll-reveal" aria-labelledby="believers-h" style="padding-top:0;">
      <div class="container">
        <div class="section-head" style="padding-top:0;margin-top:0;margin-bottom:0;">
          <span class="kicker">Teammates &amp; followers</span>
          <h2 id="believers-h">Believers</h2>
        </div>
        <div class="believers__count-block">
          <p class="believers__count">${BELIEVERS_MOCK.length}</p>
          <p class="believers__count-label">Believers Since 2026</p>
        </div>
        <ul class="believers__grid">
          ${BELIEVERS_MOCK.map(
            (b) => `
          <li class="believer-card"><span class="avatar"><img src="${esc(b.img)}" alt="" loading="lazy"></span><span class="believer-card__name">${esc(b.name)}</span><span class="believer-card__jersey">${esc(b.jersey)}</span></li>`,
          ).join("")}
        </ul>
      </div>
    </section>`;

  // ---- CLAIM CTA + FOOTER ----
  const claim = `
    <section class="claim-cta scroll-reveal claim-only" aria-labelledby="claim-h">
      <h2 id="claim-h">This Locker Is Yours</h2>
      <p>Built free, owned by you. Edit anything, share anywhere. One link. Forever.</p>
      <button class="btn-primary" type="button">Claim This Locker</button>
    </section>`;

  const footer = `
  <footer class="foot" role="contentinfo">
    <p class="foot__brand">BLTZ</p>
    <p class="foot__tag">Built by athletes · Owned by the player</p>
  </footer>`;

  // ---- MODALS (share, qr, videos) ----
  const modals = `
  <div class="modal" id="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-modal-title" hidden>
    <div class="modal__inner share-modal__inner">
      <div class="share-modal__close-row"><button class="modal__close" type="button" id="share-modal-close" aria-label="Close">×</button></div>
      <h2 class="share-modal__title" id="share-modal-title">Share This Locker</h2>
      <div class="share-url-row">
        <input class="share-url-row__url" type="text" id="share-url-input" readonly value="">
        <button class="share-url-row__copy" type="button" id="share-copy-btn">Copy</button>
      </div>
      <div class="share-grid">
        <a class="share-target share-target--x" id="share-x" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg><span>X</span></a>
        <a class="share-target share-target--facebook" id="share-facebook" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg><span>Facebook</span></a>
        <a class="share-target share-target--linkedin" id="share-linkedin" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg><span>LinkedIn</span></a>
        <a class="share-target share-target--reddit" id="share-reddit" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 00.029-.463.33.33 0 00-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.232-.095z"/></svg><span>Reddit</span></a>
        <a class="share-target share-target--whatsapp" id="share-whatsapp" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.07.001.003z"/></svg><span>WhatsApp</span></a>
        <a class="share-target share-target--email" id="share-email"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1.5 4.5h21A1.5 1.5 0 0124 6v12a1.5 1.5 0 01-1.5 1.5h-21A1.5 1.5 0 010 18V6a1.5 1.5 0 011.5-1.5zm.75 1.875v.55l9.75 6.293 9.75-6.293v-.55H2.25zm19.5 1.929l-9.34 6.029a.75.75 0 01-.82 0L2.25 8.305v9.07h19.5v-9.07z"/></svg><span>Email</span></a>
        <a class="share-target share-target--sms" id="share-sms"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5C5.925 1.5 1 5.755 1 11c0 2.245.93 4.31 2.485 5.96L2 22.5l5.69-1.494A11.97 11.97 0 0012 20.5c6.075 0 11-4.255 11-9.5S18.075 1.5 12 1.5zm-4.5 8h9v1.5h-9V9.5zm0 3h6V14h-6v-1.5z"/></svg><span>SMS</span></a>
        <button class="share-target share-target--native" type="button" id="share-native" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z"/></svg><span>More</span></button>
      </div>
    </div>
  </div>

  <div class="modal" id="qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-modal-title" hidden>
    <div class="modal__inner qr-modal__inner">
      <div class="modal__head"><h2 class="modal__title" id="qr-modal-title">Share via QR</h2><button class="modal__close" type="button" id="qr-modal-close" aria-label="Close">×</button></div>
      <div class="qr-canvas-wrap" id="qr-canvas"></div>
      <p class="qr-url" id="qr-url"></p>
      <div class="qr-actions"><button type="button" id="qr-copy">Copy Link</button><button type="button" class="solid" id="qr-download">Download QR</button></div>
    </div>
  </div>

  <div class="modal" id="videos-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" hidden>
    <div class="modal__inner">
      <div class="modal__head"><h2 class="modal__title" id="modal-title">All Videos</h2><button class="modal__close" type="button" id="modal-close" aria-label="Close">×</button></div>
      <div class="sort-tabs" role="tablist" aria-label="Sort videos by tier">
        <button class="sort-tab is-active" type="button" role="tab" aria-selected="true" data-tier="all">All</button>
        <button class="sort-tab" type="button" role="tab" aria-selected="false" data-tier="college">College</button>
        <button class="sort-tab" type="button" role="tab" aria-selected="false" data-tier="pro">Pro</button>
        <button class="sort-tab" type="button" role="tab" aria-selected="false" data-tier="hs">High School</button>
      </div>
      <div class="modal-grid" id="modal-grid"></div>
    </div>
  </div>

  <div class="modal" id="video-modal" role="dialog" aria-modal="true" aria-label="Video player" hidden>
    <div class="modal__inner" style="max-width:980px;">
      <div class="share-modal__close-row">
        <button class="modal__close" type="button" id="video-modal-close" aria-label="Close">×</button>
      </div>
      <div class="video-embed" id="video-embed"></div>
    </div>
  </div>

  <div class="modal" id="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" hidden>
    <button class="modal__close lightbox__close" type="button" id="lightbox-close" aria-label="Close">×</button>
    <button class="lightbox__nav lightbox__prev" type="button" id="lightbox-prev" aria-label="Previous photo">‹</button>
    <img class="lightbox__img" id="lightbox-img" src="" alt="">
    <button class="lightbox__nav lightbox__next" type="button" id="lightbox-next" aria-label="Next photo">›</button>
  </div>`;

  // ---- STATS MODAL (only when we actually have season lines) ----
  const renderTable = (title: string, meta: string, table: SeasonTable | null): string => {
    if (!table) return "";
    return `
    <section class="stats-section">
      <div class="stats-section__head">
        <h3 class="stats-section__title">${esc(title)}</h3>
        ${meta ? `<span class="stats-section__meta">${esc(meta)}</span>` : ""}
      </div>
      <table class="stats-table" aria-label="${esc(title)} season-by-season">
        <thead>
          <tr><th>Year</th><th class="opt">Team</th>${table.columns
            .map((c) => `<th class="num">${esc(c)}</th>`)
            .join("")}</tr>
        </thead>
        <tbody>
          ${table.rows
            .map(
              (r) =>
                `<tr class="${r.isPeak ? "is-peak" : ""}"><td class="year">${esc(
                  r.season,
                )}</td><td class="opt">${esc(r.team ?? "")}</td>${r.cells
                  .map((c) => `<td class="num">${esc(c)}</td>`)
                  .join("")}</tr>`,
            )
            .join("")}
          <tr class="is-totals"><td>Career</td><td class="opt"></td>${table.totals
            .map((c) => `<td class="num">${esc(c)}</td>`)
            .join("")}</tr>
        </tbody>
      </table>
    </section>`;
  };

  const honorsTable = v.proHonors.length
    ? `
    <section class="stats-section">
      <div class="stats-section__head">
        <h3 class="stats-section__title">Honors</h3>
        <span class="stats-section__meta">Career awards</span>
      </div>
      <table class="stats-table" aria-label="Career honors">
        <tbody>
          ${v.proHonors
            .map(
              (a) =>
                `<tr><td class="year">${esc(a.year ?? "")}</td><td>${esc(a.award_name)}</td></tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </section>`
    : "";

  const statsModal = v.hasStats
    ? `
  <div class="modal" id="stats-modal" role="dialog" aria-modal="true" aria-labelledby="stats-modal-title" hidden>
    <div class="modal__inner">
      <div class="modal__head">
        <div class="stats-modal__lockup">
          <span class="avatar" aria-hidden="true"><img src="${esc(v.headshotUrl)}" alt=""></span>
          <div>
            <h2 class="modal__title" id="stats-modal-title">Career Stats</h2>
            <p class="stats-modal__sub">${esc(v.statModalSub)}</p>
          </div>
        </div>
        <button class="modal__close" type="button" id="stats-modal-close" aria-label="Close">×</button>
      </div>
      ${renderTable("College", [v.school, v.collegeYears].filter(Boolean).join(" · "), v.collegeTable)}
      ${renderTable("NFL", v.proTeamsLine ?? "", v.proTable)}
      ${honorsTable}
    </div>
  </div>`
    : "";

  return `${topbar}${hero}${profile}<main id="main">${videosSection}${photosSection}${collegeSection}${proSection}${pressSection}${believersSection}${claim}</main>${footer}${modals}${statsModal}`;
}
