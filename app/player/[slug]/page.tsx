import { notFound } from "next/navigation";
import { readStructuredStats } from "@/lib/player/structured-stats";
import { createClient } from "@/lib/supabase/server";
import { MOCK_MEDIA, MOCK_PLAYERS, MOCK_VIDEOS } from "@/lib/mock";
import {
  LEVEL_LABEL,
  calcAge,
  formatDob,
  heightDisplay,
  nflLogo,
  nflTeamColor,
  nflTeamName,
} from "@/lib/player/locker-format";
import LockerView, { type LockerData } from "./LockerView";

// Mock data is only available in non-production builds. Production never returns
// mock players, regardless of how `NEXT_PUBLIC_USE_MOCK` is set.
const useMock =
  process.env.NEXT_PUBLIC_USE_MOCK === "1" && process.env.NODE_ENV !== "production";

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

const danteHughesNflGameLogs: NonNullable<LockerData["gameLogs"]> = [
  {
    key: "nflverse-defense",
    label: "NFL DEFENSE",
    meta: "NFLVERSE WEEKLY PLAYER STATS · REGULAR SEASON · RECORDED DEFENSIVE ROWS",
    columns: [
      { key: "week", label: "WK", width: 44 },
      { key: "opponent", label: "OPP", width: 78, align: "left" },
      { key: "result", label: "RESULT", width: 78, align: "left" },
      { key: "total", label: "TKL", width: 50, align: "right" },
      { key: "solo", label: "SOLO", width: 56, align: "right" },
      { key: "ast", label: "AST", width: 48, align: "right" },
      { key: "pd", label: "PD", width: 44, align: "right" },
      { key: "int", label: "INT", width: 46, align: "right" },
      { key: "intYds", label: "YDS", width: 48, align: "right" },
      { key: "ff", label: "FF", width: 44, align: "right" },
    ],
    seasons: [
      {
        year: "2011",
        summary: "14 stat rows · SD · 40 TKL · 3 PD · 0 INT",
        rows: [
          { id: "nfl-2011-wk2", resultTone: "loss", values: { week: 2, opponent: "@ NE", result: "L 21-35", total: 1, solo: 0, ast: 1, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2011-wk3", resultTone: "win", values: { week: 3, opponent: "vs KC", result: "W 20-17", total: 4, solo: 4, ast: 0, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2011-wk4", resultTone: "win", values: { week: 4, opponent: "vs MIA", result: "W 26-16", total: 4, solo: 0, ast: 4, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2011-wk5", resultTone: "win", values: { week: 5, opponent: "@ DEN", result: "W 29-24", total: 2, solo: 2, ast: 0, pd: 1, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2011-wk7", resultTone: "loss", values: { week: 7, opponent: "@ NYJ", result: "L 21-27", total: 1, solo: 1, ast: 0, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2011-wk8", resultTone: "loss", values: { week: 8, opponent: "@ KC", result: "L 20-23", total: 1, solo: 1, ast: 0, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2011-wk9", resultTone: "loss", values: { week: 9, opponent: "vs GB", result: "L 38-45", total: 5, solo: 3, ast: 2, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2011-wk10", resultTone: "loss", values: { week: 10, opponent: "vs OAK", result: "L 17-24", total: 6, solo: 5, ast: 1, pd: 1, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2011-wk11", resultTone: "loss", values: { week: 11, opponent: "@ CHI", result: "L 20-31", total: 1, solo: 0, ast: 1, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2011-wk12", resultTone: "loss", values: { week: 12, opponent: "vs DEN", result: "L 13-16", total: 2, solo: 2, ast: 0, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2011-wk13", resultTone: "win", values: { week: 13, opponent: "@ JAX", result: "W 38-14", total: 1, solo: 1, ast: 0, pd: 1, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2011-wk14", resultTone: "win", values: { week: 14, opponent: "vs BUF", result: "W 37-10", total: 3, solo: 3, ast: 0, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2011-wk15", resultTone: "win", values: { week: 15, opponent: "vs BAL", result: "W 34-14", total: 4, solo: 3, ast: 1, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2011-wk16", resultTone: "loss", values: { week: 16, opponent: "@ DET", result: "L 10-38", total: 5, solo: 5, ast: 0, pd: 0, int: 0, intYds: 0, ff: 0 } },
        ],
      },
      {
        year: "2010",
        summary: "7 stat rows · SD · 25 TKL · 0 PD · 0 INT",
        rows: [
          { id: "nfl-2010-wk5", resultTone: "loss", values: { week: 5, opponent: "@ OAK", result: "L 27-35", total: 1, solo: 1, ast: 0, pd: 0, int: 0, intYds: 0, ff: 1 } },
          { id: "nfl-2010-wk8", resultTone: "win", values: { week: 8, opponent: "vs TEN", result: "W 33-25", total: 1, solo: 1, ast: 0, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2010-wk12", resultTone: "win", values: { week: 12, opponent: "@ IND", result: "W 36-14", total: 8, solo: 7, ast: 1, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2010-wk14", resultTone: "win", values: { week: 14, opponent: "vs KC", result: "W 31-0", total: 4, solo: 4, ast: 0, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2010-wk15", resultTone: "win", values: { week: 15, opponent: "vs SF", result: "W 34-7", total: 6, solo: 5, ast: 1, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2010-wk16", resultTone: "loss", values: { week: 16, opponent: "@ CIN", result: "L 20-34", total: 2, solo: 1, ast: 1, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2010-wk17", resultTone: "win", values: { week: 17, opponent: "@ DEN", result: "W 33-28", total: 3, solo: 3, ast: 0, pd: 0, int: 0, intYds: 0, ff: 0 } },
        ],
      },
      {
        year: "2009",
        summary: "1 stat row · SD · 1 TKL · 0 PD · 0 INT",
        rows: [
          { id: "nfl-2009-wk17", resultTone: "win", values: { week: 17, opponent: "vs WAS", result: "W 23-20", total: 1, solo: 1, ast: 0, pd: 0, int: 0, intYds: 0, ff: 0 } },
        ],
      },
      {
        year: "2008",
        summary: "9 stat rows · IND · 16 TKL · 2 PD · 1 INT",
        rows: [
          { id: "nfl-2008-wk3", resultTone: "loss", values: { week: 3, opponent: "vs JAX", result: "L 21-23", total: 1, solo: 0, ast: 1, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2008-wk5", resultTone: "win", values: { week: 5, opponent: "@ HOU", result: "W 31-27", total: 1, solo: 1, ast: 0, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2008-wk6", resultTone: "win", values: { week: 6, opponent: "vs BAL", result: "W 31-3", total: 3, solo: 3, ast: 0, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2008-wk8", resultTone: "loss", values: { week: 8, opponent: "@ TEN", result: "L 21-31", total: 1, solo: 0, ast: 1, pd: 1, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2008-wk11", resultTone: "win", values: { week: 11, opponent: "vs HOU", result: "W 33-27", total: 1, solo: 1, ast: 0, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2008-wk14", resultTone: "win", values: { week: 14, opponent: "vs CIN", result: "W 35-3", total: 4, solo: 3, ast: 1, pd: 1, int: 1, intYds: 16, ff: 0 } },
          { id: "nfl-2008-wk15", resultTone: "win", values: { week: 15, opponent: "vs DET", result: "W 31-21", total: 1, solo: 0, ast: 1, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2008-wk16", resultTone: "win", values: { week: 16, opponent: "@ JAX", result: "W 31-24", total: 1, solo: 1, ast: 0, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2008-wk17", resultTone: "win", values: { week: 17, opponent: "vs TEN", result: "W 23-0", total: 3, solo: 2, ast: 1, pd: 0, int: 0, intYds: 0, ff: 0 } },
        ],
      },
      {
        year: "2007",
        summary: "8 stat rows · IND · 10 TKL · 2 PD · 0 INT",
        rows: [
          { id: "nfl-2007-wk1", resultTone: "win", values: { week: 1, opponent: "vs NO", result: "W 41-10", total: 1, solo: 1, ast: 0, pd: 1, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2007-wk2", resultTone: "win", values: { week: 2, opponent: "@ TEN", result: "W 22-20", total: 0, solo: 0, ast: 0, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2007-wk4", resultTone: "win", values: { week: 4, opponent: "vs DEN", result: "W 38-20", total: 1, solo: 1, ast: 0, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2007-wk5", resultTone: "win", values: { week: 5, opponent: "vs TB", result: "W 33-14", total: 2, solo: 2, ast: 0, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2007-wk7", resultTone: "win", values: { week: 7, opponent: "@ JAX", result: "W 29-7", total: 1, solo: 1, ast: 0, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2007-wk8", resultTone: "win", values: { week: 8, opponent: "@ CAR", result: "W 31-7", total: 3, solo: 3, ast: 0, pd: 1, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2007-wk9", resultTone: "loss", values: { week: 9, opponent: "vs NE", result: "L 20-24", total: 2, solo: 2, ast: 0, pd: 0, int: 0, intYds: 0, ff: 0 } },
          { id: "nfl-2007-wk10", resultTone: "loss", values: { week: 10, opponent: "@ SD", result: "L 21-23", total: 0, solo: 0, ast: 0, pd: 0, int: 0, intYds: 0, ff: 0 } },
        ],
      },
    ],
  },
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
      athleteId: null,
      slug,
      fullName: (player as any).full_name || (player as any).name || "Unknown Player",
      hometown: "LOS ANGELES, CA",
      position: (player as any).position || "CB",
      jersey: "#33",
      jerseyNumbers: ["#13", "#20", "#33"],
      levelLabel: "Former pro",
      headshotUrl: "/images/Headshot.png",
      headshotYear: null,
      heroVideoUrl: (player as any).video_url ?? null,
      logoSrc: "/bltz-white-logo.svg",
      bio: (player as any).bio || "Mock biography goes here.",
      story: (player as any).story,
      athleteQuote: "If I had a team full of Hughes’s we would undoubtedly be competing for the national championship every year.",
      athleteQuoteAuthor: "Jeff Tedford",
      heightDisplay: heightDisplay(heightIn),
      weightLbs: meta.weight_lbs ?? 190,
      dobDisplay: formatDob(meta.dob ?? "1985-08-21"),
      age: calcAge(meta.dob ?? "1985-08-21"),
      gamesPlayed: meta.games_played ?? 53,
      careerStats: [
        { key: "tackles", label: "TOTAL TACKLES", value: 105 },
        { key: "solo_tackles", label: "SOLO TACKLES", value: 74 },
        { key: "assists", label: "ASSISTS", value: 18 },
        { key: "pass_deflections", label: "PASS DEFLECTIONS", value: 7 },
        { key: "interceptions", label: "INTERCEPTIONS", value: 1 },
        { key: "fumble_recoveries", label: "FUMBLE RECOVERIES", value: 1 },
        { key: "starts", label: "STARTS", value: 2 },
        { key: "interception_yards", label: "INT RETURN YARDS", value: 16 },
        { key: "sacks", label: "SACKS", value: 0 },
      ],
      careerSeasons: [
        { year: "2007", gamesPlayed: 10, level: "pro", team: "IND" },
        { year: "2008", gamesPlayed: 14, level: "pro", team: "IND" },
        { year: "2009", gamesPlayed: 1, level: "pro", team: "SD" },
        { year: "2010", gamesPlayed: 12, level: "pro", team: "SD" },
        { year: "2011", gamesPlayed: 16, level: "pro", team: "SD" },
      ],
      gameLogs: danteHughesNflGameLogs,
      highSchool: "CRENSHAW",
      classOf: "2003",
      school: { name: "University of California, Berkeley", abbr: "CAL", primaryColor: "#003262", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/25.png" },
      nfl: {
        latestTeam: "San Diego Chargers",
        draftYear: 2007,
        draftRound: 3,
        draftPick: 95,
        draftTeam: "Indianapolis Colts",
      },
      schools: [
        { label: "CAL", color: "#003262", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/25.png" },
      ],
      proTeams: [
        { label: "IND", color: "#002C5F", logo: nflLogo("IND") },
        { label: "SD", color: "#0080C6", logo: nflLogo("LAC") },
        { label: "NYG", color: "#0B2265", logo: nflLogo("NYG") },
      ],
      awards: [
        { year: "2006", label: "LOTT IMPACT TROPHY" },
        { year: "2006", label: "CONSENSUS ALL-AMERICAN" },
        { year: "2006", label: "PAC-10 DEFENSIVE PLAYER OF THE YEAR" },
        { year: "2006", label: "FIRST-TEAM ALL-PAC-10" },
        { year: "2005", label: "FIRST-TEAM ALL-PAC-10" },
      ],
      timeline: [
        { year: "2003", tag: "CAL DEBUT", title: "BOB SIMMONS AWARD", note: "Started five games as a freshman and tied for the team lead with two interceptions." },
        { year: "2005", tag: "ALL-CONFERENCE", title: "FIRST-TEAM ALL-PAC-10", note: "Led the Pac-10 with 17 defended passes and finished the season with five interceptions." },
        { year: "2006", tag: "NATIONAL HONORS", title: "LOTT TROPHY WINNER", note: "Consensus All-American and Pac-10 Defensive Player of the Year after leading the nation with eight interceptions." },
        { year: "2007", tag: "NFL DRAFT", title: "INDIANAPOLIS COLTS", note: "Selected in the third round with the 95th overall pick." },
        { year: "2009", tag: "SAN DIEGO", title: "JOINED THE CHARGERS", note: "Continued his NFL career in San Diego through the 2011 season." },
        { year: "2012", tag: "NEW YORK", title: "GIANTS OFFSEASON ROSTER", note: "Joined the New York Giants during the 2012 offseason." },
      ],
      videos: MOCK_VIDEOS.map((video) => ({
        id: video.id,
        title: video.title,
        thumb: video.thumbnail,
        playbackUrl: video.src,
      })),
      photos: MOCK_MEDIA.map((photo) => ({
        ...photo,
        credits: null,
        sourceUrl: null,
        provenance: "private_preview",
        licenseLabel: "",
      })),
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
    .select("headline, bio, colors, quote_text, quote_author")
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
    .select("id,title,thumbnail_url,playback_url")
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
    athleteId: player.id,
    structuredStats: await readStructuredStats(supabase, player.id),
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
    athleteQuote: locker?.quote_text ?? null,
    athleteQuoteAuthor: locker?.quote_author ?? null,
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
      playbackUrl: v.playback_url ?? null,
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
