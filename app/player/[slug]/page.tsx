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

export default async function PlayerLocker({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // -------- MOCK PATH (dev only) --------
  if (useMock) {
    const player = MOCK_PLAYERS.find((p: any) => p.slug === slug) ?? MOCK_PLAYERS[0];
    const meta = (player as any).meta ?? {};
    const heightIn = meta.height_in ?? 71;
    const data: LockerData = {
      slug,
      fullName: (player as any).full_name || (player as any).name || "Unknown Player",
      hometown: "LOS ANGELES, CA",
      position: (player as any).position || "CB",
      jersey: "#1",
      levelLabel: "Pro",
      headshotUrl: "/images/Headshot.png",
      heroVideoUrl: (player as any).video_url ?? null,
      logoSrc: "/bltz-white-logo.svg",
      bio: (player as any).bio || "Mock biography goes here.",
      heightDisplay: heightDisplay(heightIn),
      weightLbs: meta.weight_lbs ?? 210,
      dobDisplay: formatDob(meta.dob ?? "1985-08-07"),
      age: calcAge(meta.dob ?? "1985-08-07"),
      gamesPlayed: meta.games_played ?? 116,
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
    levelLabel,
    headshotUrl,
    heroVideoUrl: (player as any).video_url ?? null,
    logoSrc: "/bltz-white-logo.svg",
    bio: bioCopy,
    heightDisplay: heightDisplay(player.height_in),
    weightLbs: player.weight_lbs ?? null,
    dobDisplay: formatDob(dob),
    age,
    gamesPlayed: player.games_played ?? null,
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
