import { createClient } from "@/lib/supabase/server";

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
 * Get all achievements for a player with their unlock status and progress
 */
export async function getPlayerAchievements(playerId: string): Promise<PlayerAchievement[]> {
  const supabase = await createClient();

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
 * Get all available achievements with player's progress
 */
export async function getAllAchievementsWithProgress(playerId: string): Promise<(Achievement & {
  player_achievement?: PlayerAchievement;
  progress?: AchievementProgress;
})[]> {
  const supabase = await createClient();

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
      playerAchievement,
      progress: achievementProgress
    };
  });
}

/**
 * Unlock an achievement for a player
 */
export async function unlockAchievement(playerId: string, achievementId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('player_achievements')
    .upsert({
      player_id: playerId,
      achievement_id: achievementId,
      is_unlocked: true,
      unlocked_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error unlocking achievement:', error);
    return false;
  }

  return true;
}

/**
 * Update achievement progress
 */
export async function updateAchievementProgress(
  playerId: string, 
  achievementId: string, 
  currentProgress: number, 
  maxProgress: number
): Promise<boolean> {
  const supabase = await createClient();

  const progressPercentage = (currentProgress / maxProgress) * 100;

  const { error } = await supabase
    .from('achievement_progress')
    .upsert({
      player_id: playerId,
      achievement_id: achievementId,
      current_progress: currentProgress,
      max_progress: maxProgress,
      progress_percentage: progressPercentage,
      last_updated: new Date().toISOString()
    });

  if (error) {
    console.error('Error updating achievement progress:', error);
    return false;
  }

  // Check if achievement should be unlocked
  if (currentProgress >= maxProgress) {
    await unlockAchievement(playerId, achievementId);
  }

  return true;
}

/**
 * Get achievement statistics for a player
 */
export async function getAchievementStats(playerId: string): Promise<{
  totalAchievements: number;
  unlockedAchievements: number;
  completionRate: number;
  legendaryCount: number;
  epicCount: number;
  rareCount: number;
  commonCount: number;
}> {
  const supabase = await createClient();

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

  const legendaryCount = achievementsByRarity?.filter(a => a.achievement?.rarity === 'legendary').length || 0;
  const epicCount = achievementsByRarity?.filter(a => a.achievement?.rarity === 'epic').length || 0;
  const rareCount = achievementsByRarity?.filter(a => a.achievement?.rarity === 'rare').length || 0;
  const commonCount = achievementsByRarity?.filter(a => a.achievement?.rarity === 'common').length || 0;

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
 * Check and unlock achievements based on player actions
 */
export async function checkAndUnlockAchievements(playerId: string, actionType: string, metadata: any = {}): Promise<void> {
  const supabase = await createClient();

  // Get all active achievements
  const { data: achievements, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('is_active', true);

  if (error || !achievements) return;

  for (const achievement of achievements) {
    const criteria = achievement.criteria;
    
    // Check if this achievement matches the action type
    if (criteria.type !== actionType) continue;

    // Check if player already has this achievement
    const { data: existingAchievement } = await supabase
      .from('player_achievements')
      .select('is_unlocked')
      .eq('player_id', playerId)
      .eq('achievement_id', achievement.id)
      .single();

    if (existingAchievement?.is_unlocked) continue;

    // Check achievement criteria based on type
    let shouldUnlock = false;
    let currentProgress = 0;
    let maxProgress = 1;

    switch (actionType) {
      case 'video_upload':
        const { count: videoCount } = await supabase
          .from('videos')
          .select('*', { count: 'exact', head: true })
          .eq('player_id', playerId);
        
        currentProgress = videoCount || 0;
        maxProgress = criteria.count || 1;
        shouldUnlock = currentProgress >= maxProgress;
        break;

      case 'video_views':
        // This would need to be implemented based on your view tracking system
        // For now, we'll skip this check
        break;

      case 'monthly_videos':
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { count: monthlyVideos } = await supabase
          .from('videos')
          .select('*', { count: 'exact', head: true })
          .eq('player_id', playerId)
          .gte('created_at', startOfMonth.toISOString());
        
        currentProgress = monthlyVideos || 0;
        maxProgress = criteria.count || 10;
        shouldUnlock = currentProgress >= maxProgress;
        break;

      // Add more cases as needed
    }

    if (shouldUnlock) {
      await unlockAchievement(playerId, achievement.id);
    } else if (currentProgress > 0) {
      await updateAchievementProgress(playerId, achievement.id, currentProgress, maxProgress);
    }
  }
}
