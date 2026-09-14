// Shared shapes for the standalone preview-locker generator (admin-only demo
// tool). Kept separate from the real onboarding/player types on purpose —
// canonical player linkage is optional and only assigned after admin review.

export type PreviewLevel = "hs" | "college" | "pro" | "former";

export type PreviewAward = { year: string; label: string; sourceUrl?: string | null; description?: string | null };
export type PreviewCareerStat = { key: string; label: string; value: string | number };
export type PreviewCareerSeason = {
  year: string;
  gamesPlayed: number;
  level: "cfb" | "pro" | string;
  team: string | null;
};
export type PreviewVideo = { id: string; title: string; thumb: string | null; url: string | null };
export type PreviewPhoto = {
  id: string;
  url?: string | null;
  storagePath?: string | null;
  mimeType?: string | null;
  title: string;
  credits: string | null;
  sourceUrl: string | null;
  level: "hs" | "cfb" | "pro" | "off-field";
  season: string | null;
};
export type PreviewSchoolInfo = {
  name: string;
  abbr: string;
  primaryColor: string;
  logoUrl: string | null;
} | null;
export type PreviewNflInfo = {
  latestTeam: string | null;
  draftYear: number | null;
  draftRound: number | null;
  draftPick: number | null;
  draftTeam: string | null;
} | null;
export type PreviewTeamPill = { label: string; color: string; logo: string | null };

export interface PreviewLockerRow {
  player_id?: string | null;
  id: string;
  slug: string;
  full_name: string;
  position: string | null;
  level: PreviewLevel | null;
  school: string | null;
  hometown: string | null;
  jersey: string | null;
  height_in: number | null;
  weight_lbs: number | null;
  dob: string | null;
  games_played: number | null;
  headshot_url: string | null;
  hero_video_url: string | null;
  bio: string;
  athlete_quote: string | null;
  athlete_quote_author: string | null;
  school_info: PreviewSchoolInfo;
  nfl_info: PreviewNflInfo;
  schools: PreviewTeamPill[];
  pro_teams: PreviewTeamPill[];
  awards: PreviewAward[];
  career_stats: PreviewCareerStat[];
  career_seasons: PreviewCareerSeason[];
  videos: PreviewVideo[];
  photos: PreviewPhoto[];
  photo_count?: number;
  source: Record<string, unknown>;
  pipeline_run_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePreviewLockerInput {
  slug: string;
  full_name: string;
  position?: string | null;
  level?: PreviewLevel | null;
  school?: string | null;
  hometown?: string | null;
  jersey?: string | null;
  height_in?: number | null;
  weight_lbs?: number | null;
  dob?: string | null;
  games_played?: number | null;
  headshot_url?: string | null;
  hero_video_url?: string | null;
  bio?: string;
  athlete_quote?: string | null;
  athlete_quote_author?: string | null;
  school_info?: PreviewSchoolInfo;
  nfl_info?: PreviewNflInfo;
  schools?: PreviewTeamPill[];
  pro_teams?: PreviewTeamPill[];
  awards?: PreviewAward[];
  career_stats?: PreviewCareerStat[];
  career_seasons?: PreviewCareerSeason[];
  videos?: PreviewVideo[];
  photos?: PreviewPhoto[];
  source?: Record<string, unknown>;
  pipeline_run_id?: string | null;
}
