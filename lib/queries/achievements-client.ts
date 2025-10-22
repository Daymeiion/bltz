import { createClient } from "@/lib/supabase/client";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
  criteria: any;
  points: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlayerAchievement {
  id: string;
  player_id: string;
  achievement_id: string;
  unlocked_at: string | null;
  progress: any;
  is_unlocked: boolean;
  created_at: string;
  updated_at: string;
  achievement: Achievement;
}

export interface AchievementProgress {
  id: string;
  player_id: string;
  achievement_id: string;
  current_progress: number;
  max_progress: number;
  progress_percentage: number;
  last_updated: string;
  created_at: string;
  updated_at: string;
  achievement: Achievement;
}

/**
 * Get all achievements for a player with their unlock status and progress (client-side)
 */
export async function getPlayerAchievementsClient(playerId: string): Promise<PlayerAchievement[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('player_achievements')
    .select(`
      *,
      achievement:achievements(*)
    `)
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching player achievements:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all available achievements with player's progress (client-side)
 */
export async function getAllAchievementsWithProgressClient(playerId: string): Promise<(Achievement & {
  player_achievement?: PlayerAchievement;
  progress?: AchievementProgress;
})[]> {
  const supabase = createClient();

  // Get all achievements
  const { data: achievements, error: achievementsError } = await supabase
    .from('achievements')
    .select('*')
    .eq('is_active', true)
    .order('rarity', { ascending: true });

  if (achievementsError) {
    console.error('Error fetching achievements:', achievementsError);
    return [];
  }

  if (!achievements) return [];

  // Get player's achievements
  const { data: playerAchievements, error: playerError } = await supabase
    .from('player_achievements')
    .select('*')
    .eq('player_id', playerId);

  if (playerError) {
    console.error('Error fetching player achievements:', playerError);
  }

  // Get player's progress
  const { data: progress, error: progressError } = await supabase
    .from('achievement_progress')
    .select('*')
    .eq('player_id', playerId);

  if (progressError) {
    console.error('Error fetching achievement progress:', progressError);
  }

  // Combine the data
  return achievements.map(achievement => {
    const playerAchievement = playerAchievements?.find(pa => pa.achievement_id === achievement.id);
    const achievementProgress = progress?.find(p => p.achievement_id === achievement.id);

    return {
      ...achievement,
      player_achievement: playerAchievement,
      progress: achievementProgress
    };
  });
}

/**
 * Get achievement statistics for a player (client-side)
 */
export async function getAchievementStatsClient(playerId: string): Promise<{
  totalAchievements: number;
  unlockedAchievements: number;
  completionRate: number;
  legendaryCount: number;
  epicCount: number;
  rareCount: number;
  commonCount: number;
}> {
  const supabase = createClient();

  // Get total achievements
  const { count: totalAchievements } = await supabase
    .from('achievements')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // Get unlocked achievements
  const { count: unlockedAchievements } = await supabase
    .from('player_achievements')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .eq('is_unlocked', true);

  // Get achievements by rarity
  const { data: achievementsByRarity } = await supabase
    .from('player_achievements')
    .select(`
      is_unlocked,
      achievement:achievements(rarity)
    `)
    .eq('player_id', playerId)
    .eq('is_unlocked', true);

  const legendaryCount = achievementsByRarity?.filter((a: any) => a.achievement?.rarity === 'legendary').length || 0;
  const epicCount = achievementsByRarity?.filter((a: any) => a.achievement?.rarity === 'epic').length || 0;
  const rareCount = achievementsByRarity?.filter((a: any) => a.achievement?.rarity === 'rare').length || 0;
  const commonCount = achievementsByRarity?.filter((a: any) => a.achievement?.rarity === 'common').length || 0;

  const completionRate = totalAchievements ? Math.round((unlockedAchievements || 0) / totalAchievements * 100) : 0;

  return {
    totalAchievements: totalAchievements || 0,
    unlockedAchievements: unlockedAchievements || 0,
    completionRate,
    legendaryCount,
    epicCount,
    rareCount,
    commonCount
  };
}

/**
 * Fetch achievements data from API
 */
export async function fetchAchievementsFromAPI(): Promise<{
  achievements: any[];
  stats: any;
}> {
  try {
    const response = await fetch('/api/achievements');
    if (!response.ok) {
      throw new Error('Failed to fetch achievements');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching achievements from API:', error);
    throw error;
  }
}
