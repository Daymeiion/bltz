import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MOCK_PLAYERS } from "@/lib/mock";
import LockerView, { type LockerData } from "./LockerView";

// Mock data is only available in non-production builds. Production never returns
// mock players, regardless of how `NEXT_PUBLIC_USE_MOCK` is set.
const useMock =
  process.env.NEXT_PUBLIC_USE_MOCK === "1" && process.env.NODE_ENV !== "production";

const LEVEL_LABEL: Record<string, string> = {
  hs: "High school",
  college: "College",
  pro: "Pro",
  former: "Former pro",
};

type LockerPhotoRow = {
  id: string;
  url: string | null;
  title: string | null;
  credits: string | null;
  source_url?: string | null;
  provenance?: string | null;
  license_status?: string | null;
  public_locker_approved?: boolean | null;
};

function canRenderLockerPhoto(photo: LockerPhotoRow): boolean {
  if (!photo.url) return false;
  return photo.public_locker_approved === true && photo.license_status === "approved";
}

function photoLicenseLabel(photo: LockerPhotoRow): string {
  if (photo.provenance === "athlete_uploaded") return "ATHLETE UPLOAD";
  if (photo.provenance === "cal_archive") return "TEAM ARCHIVE";
  if (photo.provenance === "founder_archive") return "BLTZ CLEARED";
  if (photo.provenance === "scraped_candidate") return "RIGHTS CLEARED";
  return photo.source_url ? "SOURCE VERIFIED" : "LICENSED";
}

// 3-letter team codes used by nflverse / NFL.com.
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

// Primary team colors for the rotating pro-teams pill (nflverse 2/3-letter codes).
const NFL_TEAM_COLORS: Record<string, string> = {
  ARI: "#97233F", ATL: "#A71930", BAL: "#241773", BUF: "#00338D", CAR: "#0085CA",
  CHI: "#0B162A", CIN: "#FB4F14", CLE: "#311D00", DAL: "#003594", DEN: "#FB4F14",
  DET: "#0076B6", GB: "#203731", HOU: "#03202F", IND: "#002C5F", JAX: "#006778",
  KC: "#E31837", LA: "#003594", LAC: "#0080C6", LAR: "#003594", LV: "#000000",
  MIA: "#008E97", MIN: "#4F2683", NE: "#002244", NO: "#D3BC8D", NYG: "#0B2265",
  NYJ: "#125740", PHI: "#004C54", PIT: "#FFB612", SEA: "#002244", SF: "#AA0000",
  TB: "#D50A0A", TEN: "#4B92DB", WAS: "#5A1414",
};

function nflTeamColor(code: string | null | undefined): string {
  if (!code) return "#1A3DCC";
  return NFL_TEAM_COLORS[code] ?? "#1A3DCC";
}

// ESPN's logo CDN keys mostly match nflverse codes once lowercased; these are
// the few that differ. a.espncdn.com is whitelisted in next.config.ts.
const NFL_ESPN_ABBR: Record<string, string> = { WAS: "wsh", LA: "lar" };

function nflLogo(code: string | null | undefined): string | null {
  if (!code) return null;
  const abbr = (NFL_ESPN_ABBR[code] ?? code).toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png`;
}

function formatDob(dob?: string | null) {
  if (!dob) return "—";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "—";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}-${d.getFullYear()}`;
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

function heightDisplay(heightIn?: number | null) {
  if (!heightIn) return "";
  const feet = Math.floor(heightIn / 12);
  const inches = heightIn % 12;
  return `${feet}'${inches}"`;
}

type LockerGameLog = NonNullable<LockerData["gameLogs"]>[number];

const MOCK_DEFENSIVE_GAME_LOG_COLUMNS: LockerGameLog["columns"] = [
  { key: "opponent", label: "OPPONENT", width: 150, align: "left" },
  { key: "result", label: "RESULT", width: 88 },
  { key: "tackles", label: "TKL", width: 72 },
  { key: "solo", label: "SOLO", width: 72 },
  { key: "assists", label: "AST", width: 72 },
  { key: "sacks", label: "SACK", width: 72 },
  { key: "tfl", label: "TFL", width: 72 },
  { key: "interceptions", label: "INT", width: 72 },
  { key: "pass_breakups", label: "PBU", width: 72 },
  { key: "forced_fumbles", label: "FF", width: 72 },
  { key: "fumble_recoveries", label: "FR", width: 72 },
  { key: "qb_hits", label: "QB HIT", width: 76 },
];

const MOCK_DEFENSIVE_GAME_ROWS: LockerGameLog["seasons"][number]["rows"] = [
  { id: "rival", resultTone: "win", values: { opponent: "@ RIVAL", result: "W 27-20", tackles: 5, solo: 3, assists: 2, sacks: 1, tfl: 1, interceptions: 2, pass_breakups: 3, forced_fumbles: 1, fumble_recoveries: 0, qb_hits: 1 } },
  { id: "state", resultTone: "win", values: { opponent: "STATE", result: "W 31-24", tackles: 6, solo: 4, assists: 2, sacks: 0.5, tfl: 2, interceptions: 1, pass_breakups: 2, forced_fumbles: 0, fumble_recoveries: 1, qb_hits: 2 } },
  { id: "tech", resultTone: "loss", values: { opponent: "@ TECH", result: "L 21-28", tackles: 7, solo: 5, assists: 2, sacks: 0, tfl: 1, interceptions: 0, pass_breakups: 2, forced_fumbles: 0, fumble_recoveries: 0, qb_hits: 1 } },
  { id: "north", resultTone: "win", values: { opponent: "NORTH", result: "W 34-17", tackles: 4, solo: 2, assists: 2, sacks: 1.5, tfl: 2, interceptions: 1, pass_breakups: 4, forced_fumbles: 1, fumble_recoveries: 1, qb_hits: 3 } },
  { id: "south", resultTone: "win", values: { opponent: "SOUTH", result: "W 41-10", tackles: 3, solo: 3, assists: 0, sacks: 0, tfl: 0, interceptions: 2, pass_breakups: 1, forced_fumbles: 0, fumble_recoveries: 0, qb_hits: 0 } },
  { id: "west", resultTone: "win", values: { opponent: "@ WEST", result: "W 24-14", tackles: 5, solo: 4, assists: 1, sacks: 1, tfl: 1, interceptions: 0, pass_breakups: 2, forced_fumbles: 1, fumble_recoveries: 0, qb_hits: 2 } },
];

export default async function PlayerLocker({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const usePreviewMock =
    useMock || (slug === "test-null-user-id" && process.env.NODE_ENV !== "production");

  // -------- MOCK PATH (dev only) --------
  if (usePreviewMock) {
    const player = MOCK_PLAYERS.find((p: any) => p.slug === slug) ?? MOCK_PLAYERS[0];
    const meta = (player as any).meta ?? {};
    const heightIn = meta.height_in ?? 71;
    const data: LockerData = {
      slug,
      fullName: (player as any).full_name || (player as any).name || "Unknown Player",
      hometown: "LOS ANGELES, CA",
      position: (player as any).position || "CB",
      jersey: "#1",
      jerseyNumbers: ["#1", "#7", "#21"],
      levelLabel: "Pro",
      headshotUrl: "/images/Headshot.png",
      headshotYear: "2025",
      heroVideoUrl: (player as any).video_url ?? null,
      logoSrc: "/bltz-white-logo.svg",
      bio: (player as any).bio || "Mock biography goes here.",
      heightDisplay: heightDisplay(heightIn),
      weightLbs: meta.weight_lbs ?? 210,
      dobDisplay: formatDob(meta.dob ?? "1985-08-07"),
      age: calcAge(meta.dob ?? "1985-08-07"),
      gamesPlayed: meta.games_played ?? 116,
      careerStats: [
        { key: "tackles", label: "TACKLES", value: 187 },
        { key: "solo_tackles", label: "SOLO", value: 126 },
        { key: "interceptions", label: "INTERCEPTIONS", value: 15 },
        { key: "pass_breakups", label: "PASS BREAKUPS", value: 41 },
        { key: "forced_fumbles", label: "FORCED FUMBLES", value: 6 },
        { key: "sacks", label: "SACKS", value: 4.5 },
        { key: "tackles_for_loss", label: "TACKLES FOR LOSS", value: 12 },
        { key: "defensive_touchdowns", label: "DEFENSIVE TD", value: 4 },
        { key: "starts", label: "STARTS", value: 35 },
      ],
      careerSeasons: Array.from({ length: 16 }, (_, index) => ({
        year: String(2009 + index),
        gamesPlayed: index < 4 ? [12, 13, 13, 14][index] : index >= 12 ? 17 : 16,
        level: index < 4 ? "cfb" : "pro",
        team: index < 4 ? "CAL" : "LAC",
      })),
      gameLogs: [
        {
          key: "cfb",
          label: "CFB",
          meta: "4 seasons · organization / scrape data",
          columns: MOCK_DEFENSIVE_GAME_LOG_COLUMNS,
          seasons: ["2024", "2023", "2022", "2021"].map((year, index) => ({
            year,
            summary: `${6 - Math.min(index, 2)} games · ${58 - index * 7} tackles · ${Math.max(1, 6 - index)} INT`,
            rows: MOCK_DEFENSIVE_GAME_ROWS.slice(0, index === 0 ? 6 : 4).map((row) => ({ ...row, id: `cfb-${year}-${row.id}` })),
          })),
        },
        {
          key: "pro",
          label: "PRO",
          meta: "3 seasons · league / team data",
          columns: MOCK_DEFENSIVE_GAME_LOG_COLUMNS,
          seasons: ["2027", "2026", "2025"].map((year, index) => ({
            year,
            summary: `${12 - index} games · ${42 - index * 6} tackles · ${Math.max(0, 3 - index)} INT`,
            rows: MOCK_DEFENSIVE_GAME_ROWS.slice(0, 4).map((row) => ({ ...row, id: `pro-${year}-${row.id}` })),
          })),
        },
      ],
      highSchool: "CRENSHAW",
      classOf: "2025",
      school: { name: "California", abbr: "CAL", primaryColor: "#003262", logoUrl: null },
      nfl: null,
      // Two of each so the rotation is visible in the mock preview.
      // Stand-in mark (public/images/bltz-mark.svg) sized/shaped like a real
      // team crest; production uses real ESPN school + NFL team logos.
      schools: [
        { label: "CAL", color: "#003262", logo: "/images/bltz-mark.svg" },
        { label: "USC", color: "#990000", logo: "/images/bltz-mark.svg" },
      ],
      proTeams: [
        { label: "NO", color: "#D3BC8D", logo: "/images/bltz-mark.svg" },
        { label: "LAC", color: "#0080C6", logo: "/images/bltz-mark.svg" },
      ],
      awards: [],
      videos: [],
      photos: [],
    };
    return <LockerView data={data} />;
  }

  // -------- LIVE (SUPABASE) PATH --------
  const supabase = await createClient();

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select(
      `id, full_name, name, slug, profile_image, headshot_url, hometown, video_url,
       bio, position, level, school, dob, height_in, weight_lbs, games_played, current_status,
       gsis_id, cfb_team_id,
       nfl_player:nfl_players (
         headshot_url, latest_team, status, draft_year, draft_round, draft_pick,
         draft_team, position, position_group, college_name, espn_id, pfr_id, jersey_number
       ),
       cfb_team:cfb_teams (
         espn_id, display_name, location, mascot, abbreviation,
         primary_color, alt_color, logo_url, logo_dark_url
       )`,
    )
    .eq("slug", slug)
    .eq("visibility", true)
    .maybeSingle();

  if (playerError && (playerError.message || playerError.code)) {
    return notFound();
  }
  if (!player) return notFound();

  const playerFullName = (player as any).full_name || (player as any).name || "Unknown Player";

  const { data: locker } = await supabase
    .from("player_lockers")
    .select("headline, bio, colors")
    .eq("player_id", player.id)
    .maybeSingle();

  // PostgREST returns one-to-one joins as a single object, but TS infers an array.
  const nflPlayer = (Array.isArray((player as any).nfl_player)
    ? (player as any).nfl_player[0]
    : (player as any).nfl_player) ?? null;
  const cfbTeam = (Array.isArray((player as any).cfb_team)
    ? (player as any).cfb_team[0]
    : (player as any).cfb_team) ?? null;

  // Headshot precedence: uploaded media → players.headshot_url → nflverse → legacy.
  const { data: headshotMedia } = await supabase
    .from("media")
    .select("url")
    .eq("player_id", player.id)
    .eq("kind", "headshot")
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  const headshotUrl =
    headshotMedia?.url ||
    player.headshot_url ||
    nflPlayer?.headshot_url ||
    (player as any).profile_image ||
    "/images/Headshot.png";

  // Videos (project-managed table).
  const { data: vids } = await supabase
    .from("videos")
    .select("id,title,thumbnail_url")
    .eq("player_id", player.id)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(12);

  // Gameday photos come from `media` rows tagged photo.
  const { data: photoRows } = await supabase
    .from("media")
    .select("id, url, title, credits, source_url, provenance, license_status, public_locker_approved, width, height")
    .eq("player_id", player.id)
    .eq("kind", "photo")
    .order("display_order", { ascending: true })
    .limit(20);

  const lockerPhotos = ((photoRows ?? []) as LockerPhotoRow[])
    .filter(canRenderLockerPhoto);

  // Awards (scraped) — powers the BIO tab award cards.
  const { data: awardRows } = await supabase
    .from("awards")
    .select("award_name, award_short_desc, year, level, team_or_school")
    .eq("player_id", player.id)
    .order("year", { ascending: false })
    .limit(12);

  const dob = player.dob ?? null;
  const age = calcAge(dob);
  const levelLabel = player.level ? LEVEL_LABEL[player.level] ?? "—" : "—";

  const bioCopy =
    locker?.bio ||
    player.bio ||
    `${playerFullName} hasn't written their story yet. Check back soon.`;

  const jersey = nflPlayer?.jersey_number ? `#${nflPlayer.jersey_number}` : "";
  const schoolName =
    player.school ||
    cfbTeam?.display_name ||
    nflPlayer?.college_name ||
    nflTeamName(nflPlayer?.latest_team) ||
    "—";

  // Rotating college pill — one entry today (we store a single cfb_team), but
  // shaped as a list so multi-school careers slot in once that data exists.
  const schools: { label: string; color: string; logo: string | null }[] = cfbTeam
    ? [{
        label: cfbTeam.abbreviation || (cfbTeam.display_name ?? "").slice(0, 3).toUpperCase(),
        color: cfbTeam.primary_color || "#1A3DCC",
        logo: cfbTeam.logo_url ?? cfbTeam.logo_dark_url ?? null,
      }]
    : [];

  // Rotating pro-teams pill — de-duped from the athlete's latest + draft team
  // (the only pro affiliations nflverse gives us). Empty when they never
  // reached the NFL, which drives the level/status fallback in the view.
  const proTeams: { label: string; color: string; logo: string | null }[] = [];
  const seenPro = new Set<string>();
  for (const code of [nflPlayer?.latest_team, nflPlayer?.draft_team]) {
    if (!code || seenPro.has(code)) continue;
    seenPro.add(code);
    proTeams.push({ label: code, color: nflTeamColor(code), logo: nflLogo(code) });
  }

  const data: LockerData = {
    slug,
    fullName: playerFullName,
    hometown: (player.hometown || "").toUpperCase() || "—",
    position: player.position || nflPlayer?.position || "",
    jersey,
    jerseyNumbers: jersey ? [jersey] : [],
    levelLabel,
    headshotUrl,
    headshotYear: null,
    heroVideoUrl: (player as any).video_url ?? null,
    logoSrc: "/bltz-white-logo.svg",
    bio: bioCopy,
    heightDisplay: heightDisplay(player.height_in),
    weightLbs: player.weight_lbs ?? null,
    dobDisplay: formatDob(dob),
    age,
    gamesPlayed: player.games_played ?? null,
    careerStats: [],
    careerSeasons: [],
    gameLogs: [],
    highSchool: schoolName,
    classOf: nflPlayer?.draft_year ? String(nflPlayer.draft_year) : "—",
    school: cfbTeam
      ? {
          name: cfbTeam.display_name ?? "",
          abbr: cfbTeam.abbreviation || (cfbTeam.display_name ?? "").slice(0, 3).toUpperCase(),
          primaryColor: cfbTeam.primary_color || "#1A3DCC",
          logoUrl: cfbTeam.logo_url ?? null,
        }
      : null,
    nfl: nflPlayer
      ? {
          latestTeam: nflTeamName(nflPlayer.latest_team),
          draftYear: nflPlayer.draft_year ?? null,
          draftRound: nflPlayer.draft_round ?? null,
          draftPick: nflPlayer.draft_pick ?? null,
          draftTeam: nflTeamName(nflPlayer.draft_team),
        }
      : null,
    schools,
    proTeams,
    awards: (awardRows ?? []).map((a: any) => ({
      year: String(a.year ?? ""),
      label: (a.award_name || a.award_short_desc || "").toUpperCase(),
    })),
    videos: (vids ?? []).map((v: any) => ({
      id: String(v.id),
      title: (v.title || "HIGHLIGHT").toUpperCase(),
      thumb: v.thumbnail_url ?? null,
    })),
    photos: lockerPhotos.map((p) => ({
      id: String(p.id),
      url: p.url ?? "",
      title: (p.title || "").toUpperCase(),
      credits: p.credits ?? null,
      sourceUrl: p.source_url ?? null,
      provenance: p.provenance ?? null,
      licenseLabel: photoLicenseLabel(p),
    })),
  };

  return <LockerView data={data} />;
}
