import { createClient } from "@/lib/supabase/server";

/**
 * Revenue model constants
 * Total revenue is split as follows:
 * - Player (video owner): 60%
 * - Team Pool (tagged teammates): 15%
 * - Publisher (NFL/NCAA/School): 15%
 * - BLTZ Platform: 10%
 */
export const REVENUE_CONFIG = {
  REVENUE_PER_VIEW: 0.05, // $0.05 per view
  PLAYER_PERCENTAGE: 0.60, // 60% to video owner
  TEAM_POOL_PERCENTAGE: 0.15, // 15% to team pool (split among tagged teammates)
  PUBLISHER_PERCENTAGE: 0.15, // 15% to publisher (NFL/NCAA/School)
  PLATFORM_PERCENTAGE: 0.10, // 10% to BLTZ platform
};

/**
 * Calculate and distribute revenue for a video
 * This should be called periodically (e.g., daily) to update revenue distributions
 */
export async function calculateVideoRevenue(videoId: string): Promise<void> {
  const supabase = await createClient();

  // Get video info
  const { data: video } = await supabase
    .from('videos')
    .select('id, player_id, owner_user_id, meta, created_at')
    .eq('id', videoId)
    .single();

  if (!video) return;

  // Get total views for this video
  const { count: viewCount } = await supabase
    .from('views')
    .select('*', { count: 'exact', head: true })
    .eq('video_id', videoId);

  const totalViews = viewCount || 0;
  const viewRevenue = totalViews * REVENUE_CONFIG.REVENUE_PER_VIEW;
  
  // Get sponsor revenue from meta
  const sponsorRevenue = (video.meta as any)?.sponsor_amount || 0;
  const totalRevenue = viewRevenue + sponsorRevenue;

  // Calculate splits based on new revenue model
  const playerRevenue = totalRevenue * REVENUE_CONFIG.PLAYER_PERCENTAGE; // 60%
  const teamPoolRevenue = totalRevenue * REVENUE_CONFIG.TEAM_POOL_PERCENTAGE; // 15%
  const publisherRevenue = totalRevenue * REVENUE_CONFIG.PUBLISHER_PERCENTAGE; // 15%
  const platformRevenue = totalRevenue * REVENUE_CONFIG.PLATFORM_PERCENTAGE; // 10%

  // Get player's school/publisher info
  const { data: playerInfo } = await supabase
    .from('players')
    .select('school, meta')
    .eq('id', video.player_id)
    .single();

  const publisherName = playerInfo?.school || (playerInfo?.meta as any)?.league || 'Independent';
  const publisherType = (playerInfo?.meta as any)?.publisher_type || 'school';

  // Record platform revenue (BLTZ's 10%)
  await recordPlatformRevenue(videoId, platformRevenue);

  // Record publisher revenue (School/League's 15%)
  await recordPublisherRevenue(videoId, video.player_id, publisherName, publisherType, publisherRevenue);

  // Get tagged players who are eligible for team pool
  const { data: taggedPlayers } = await supabase
    .from('video_tags')
    .select('tagged_player_id')
    .eq('video_id', videoId);

  // Record player's revenue (60%)
  await recordDistribution(video.player_id, video.player_id, videoId, playerRevenue, 'view_revenue');
  await updatePlayerEarnings(video.player_id, playerRevenue, playerRevenue, 0);

  // Split team pool among eligible teammates (15% total)
  if (taggedPlayers && taggedPlayers.length > 0) {
    const eligibleTeammates = await getEligibleTeammates(
      video.player_id,
      taggedPlayers.map(t => t.tagged_player_id),
      video.created_at
    );

    if (eligibleTeammates.length > 0) {
      const sharePerPlayer = teamPoolRevenue / eligibleTeammates.length;
      
      for (const teammateId of eligibleTeammates) {
        await recordDistribution(video.player_id, teammateId, videoId, sharePerPlayer, 'team_pool');
        await updatePlayerEarnings(teammateId, sharePerPlayer, 0, sharePerPlayer);
      }
    }
  }
}

/**
 * Get eligible teammates for revenue sharing
 * Teammates must be from same school and have overlapping years
 */
async function getEligibleTeammates(
  sourcePlayerId: string,
  taggedPlayerIds: string[],
  videoDate: string
): Promise<string[]> {
  const supabase = await createClient();

  // Get source player's school and years
  const { data: sourcePlayer } = await supabase
    .from('players')
    .select('meta, school')
    .eq('id', sourcePlayerId)
    .single();

  if (!sourcePlayer) return [];

  const sourceMeta = (sourcePlayer.meta as any) || {};
  const sourceSchool = sourcePlayer.school || sourceMeta.school || sourceMeta.university;
  const sourceYearsStart = sourceMeta.years_start || sourceMeta.year_start;
  const sourceYearsEnd = sourceMeta.years_end || sourceMeta.year_end;

  if (!sourceSchool) return taggedPlayerIds; // If no school, include all tagged

  // Filter tagged players by school and years
  const { data: taggedPlayersData } = await supabase
    .from('players')
    .select('id, meta, school')
    .in('id', taggedPlayerIds);

  if (!taggedPlayersData) return [];

  const eligible = taggedPlayersData.filter(player => {
    const meta = (player.meta as any) || {};
    const playerSchool = player.school || meta.school || meta.university;
    const playerYearsStart = meta.years_start || meta.year_start;
    const playerYearsEnd = meta.years_end || meta.year_end;

    // Must be same school
    if (playerSchool !== sourceSchool) return false;

    // Check for overlapping years
    if (sourceYearsStart && sourceYearsEnd && playerYearsStart && playerYearsEnd) {
      // Years overlap if start1 <= end2 AND start2 <= end1
      const overlap = sourceYearsStart <= playerYearsEnd && playerYearsStart <= sourceYearsEnd;
      return overlap;
    }

    // If years not specified, include them
    return true;
  });

  return eligible.map(p => p.id);
}

/**
 * Record a revenue distribution
 */
async function recordDistribution(
  sourcePlayerId: string,
  recipientPlayerId: string,
  videoId: string,
  amount: number,
  type: 'view_revenue' | 'sponsor_revenue' | 'team_pool'
): Promise<void> {
  const supabase = await createClient();

  await supabase.from('revenue_distributions').insert({
    video_id: videoId,
    source_player_id: sourcePlayerId,
    recipient_player_id: recipientPlayerId,
    amount: amount.toFixed(2),
    distribution_type: type,
  });
}

/**
 * Update player's accumulated earnings
 */
async function updatePlayerEarnings(
  playerId: string,
  totalAmount: number,
  ownVideoAmount: number,
  teamPoolAmount: number
): Promise<void> {
  const supabase = await createClient();

  // Get current earnings
  const { data: currentEarnings } = await supabase
    .from('player_earnings')
    .select('*')
    .eq('player_id', playerId)
    .single();

  if (currentEarnings) {
    // Update existing record
    await supabase
      .from('player_earnings')
      .update({
        total_earnings: (parseFloat(currentEarnings.total_earnings) + totalAmount).toFixed(2),
        earnings_from_own_videos: (parseFloat(currentEarnings.earnings_from_own_videos) + ownVideoAmount).toFixed(2),
        earnings_from_team_pool: (parseFloat(currentEarnings.earnings_from_team_pool) + teamPoolAmount).toFixed(2),
        last_calculated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('player_id', playerId);
  } else {
    // Create new record
    await supabase.from('player_earnings').insert({
      player_id: playerId,
      total_earnings: totalAmount.toFixed(2),
      earnings_from_own_videos: ownVideoAmount.toFixed(2),
      earnings_from_team_pool: teamPoolAmount.toFixed(2),
    });
  }
}

/**
 * Get player's total earnings
 */
export async function getPlayerEarnings(playerId: string): Promise<{
  total: number;
  fromOwnVideos: number;
  fromTeamPool: number;
}> {
  const supabase = await createClient();

  const { data: earnings } = await supabase
    .from('player_earnings')
    .select('*')
    .eq('player_id', playerId)
    .single();

  if (!earnings) {
    return { total: 0, fromOwnVideos: 0, fromTeamPool: 0 };
  }

  return {
    total: parseFloat(earnings.total_earnings),
    fromOwnVideos: parseFloat(earnings.earnings_from_own_videos),
    fromTeamPool: parseFloat(earnings.earnings_from_team_pool),
  };
}

/**
 * Get count of team videos where player is tagged
 */
export async function getTeamVideosCount(playerId: string): Promise<number> {
  const supabase = await createClient();

  // Get player's school and years
  const { data: player } = await supabase
    .from('players')
    .select('meta, school')
    .eq('id', playerId)
    .single();

  if (!player) return 0;

  const meta = (player.meta as any) || {};
  const playerSchool = player.school || meta.school || meta.university;
  const playerYearsStart = meta.years_start || meta.year_start;
  const playerYearsEnd = meta.years_end || meta.year_end;

  if (!playerSchool) {
    // Just count videos where player is tagged
    const { count } = await supabase
      .from('video_tags')
      .select('*', { count: 'exact', head: true })
      .eq('tagged_player_id', playerId);
    
    return count || 0;
  }

  // Get all teammates from same school with overlapping years
  const { data: allPlayers } = await supabase
    .from('players')
    .select('id, meta, school')
    .eq('school', playerSchool);

  if (!allPlayers) return 0;

  const eligiblePlayerIds = allPlayers.filter(p => {
    if (p.id === playerId) return false; // Exclude self
    
    const pMeta = (p.meta as any) || {};
    const pYearsStart = pMeta.years_start || pMeta.year_start;
    const pYearsEnd = pMeta.years_end || pMeta.year_end;

    // Check for overlapping years
    if (playerYearsStart && playerYearsEnd && pYearsStart && pYearsEnd) {
      return playerYearsStart <= pYearsEnd && pYearsStart <= playerYearsEnd;
    }

    return true; // Include if years not specified
  }).map(p => p.id);

  // Count videos from these players where current player is tagged OR from same school/period
  const { count } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .in('player_id', eligiblePlayerIds)
    .eq('visibility', 'public');

  return count || 0;
}

/**
 * Tag players in a video
 */
export async function tagPlayersInVideo(videoId: string, playerIds: string[]): Promise<void> {
  const supabase = await createClient();

  const tags = playerIds.map(playerId => ({
    video_id: videoId,
    tagged_player_id: playerId,
  }));

  await supabase.from('video_tags').insert(tags);
}

/**
 * Get players tagged in a video
 */
export async function getTaggedPlayers(videoId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data: tags } = await supabase
    .from('video_tags')
    .select('tagged_player_id')
    .eq('video_id', videoId);

  return tags?.map(t => t.tagged_player_id) || [];
}

/**
 * Record platform revenue (BLTZ's 10%)
 */
async function recordPlatformRevenue(
  videoId: string,
  amount: number
): Promise<void> {
  const supabase = await createClient();

  await supabase.from('platform_revenue').insert({
    video_id: videoId,
    amount: amount.toFixed(2),
    percentage: REVENUE_CONFIG.PLATFORM_PERCENTAGE * 100,
  });
}

/**
 * Record publisher revenue (School/League's 15%)
 */
async function recordPublisherRevenue(
  videoId: string,
  playerId: string,
  publisherName: string,
  publisherType: 'league' | 'school' | 'organization',
  amount: number
): Promise<void> {
  const supabase = await createClient();

  await supabase.from('publisher_revenue').insert({
    video_id: videoId,
    player_id: playerId,
    publisher_name: publisherName,
    publisher_type: publisherType,
    amount: amount.toFixed(2),
    percentage: REVENUE_CONFIG.PUBLISHER_PERCENTAGE * 100,
  });
}

/**
 * Get platform total revenue
 */
export async function getPlatformTotalRevenue(): Promise<number> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('platform_revenue')
    .select('amount');

  if (!data) return 0;

  return data.reduce((sum, record) => sum + parseFloat(record.amount), 0);
}

/**
 * Get publisher revenue by name
 */
export async function getPublisherRevenue(publisherName: string): Promise<number> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('publisher_revenue')
    .select('amount')
    .eq('publisher_name', publisherName);

  if (!data) return 0;

  return data.reduce((sum, record) => sum + parseFloat(record.amount), 0);
}

/**
 * Get admin revenue summary for date range
 */
export async function getAdminRevenueSummary(
  startDate?: string,
  endDate?: string
): Promise<{
  totalPlatformRevenue: number;
  totalPublisherRevenue: number;
  totalPlayerRevenue: number;
  totalTeamPoolRevenue: number;
  totalVideosProcessed: number;
  byPublisher: { name: string; type: string; amount: number }[];
}> {
  const supabase = await createClient();

  // Get platform revenue
  let platformQuery = supabase.from('platform_revenue').select('amount');
  if (startDate) platformQuery = platformQuery.gte('calculation_date', startDate);
  if (endDate) platformQuery = platformQuery.lte('calculation_date', endDate);
  const { data: platformData } = await platformQuery;

  // Get publisher revenue
  let publisherQuery = supabase.from('publisher_revenue').select('amount, publisher_name, publisher_type');
  if (startDate) publisherQuery = publisherQuery.gte('calculation_date', startDate);
  if (endDate) publisherQuery = publisherQuery.lte('calculation_date', endDate);
  const { data: publisherData } = await publisherQuery;

  // Get player revenue
  let playerQuery = supabase
    .from('revenue_distributions')
    .select('amount, distribution_type');
  if (startDate) playerQuery = playerQuery.gte('calculation_date', startDate);
  if (endDate) playerQuery = playerQuery.lte('calculation_date', endDate);
  const { data: distributionData } = await playerQuery;

  const totalPlatformRevenue = platformData?.reduce((sum, r) => sum + parseFloat(r.amount), 0) || 0;
  const totalPublisherRevenue = publisherData?.reduce((sum, r) => sum + parseFloat(r.amount), 0) || 0;

  const totalPlayerRevenue = distributionData
    ?.filter(d => d.distribution_type === 'view_revenue')
    .reduce((sum, r) => sum + parseFloat(r.amount), 0) || 0;

  const totalTeamPoolRevenue = distributionData
    ?.filter(d => d.distribution_type === 'team_pool')
    .reduce((sum, r) => sum + parseFloat(r.amount), 0) || 0;

  // Group by publisher
  const publisherMap = new Map<string, { type: string; amount: number }>();
  publisherData?.forEach(p => {
    const key = p.publisher_name;
    if (publisherMap.has(key)) {
      publisherMap.get(key)!.amount += parseFloat(p.amount);
    } else {
      publisherMap.set(key, {
        type: p.publisher_type,
        amount: parseFloat(p.amount),
      });
    }
  });

  const byPublisher = Array.from(publisherMap.entries()).map(([name, data]) => ({
    name,
    type: data.type,
    amount: data.amount,
  }));

  return {
    totalPlatformRevenue,
    totalPublisherRevenue,
    totalPlayerRevenue,
    totalTeamPoolRevenue,
    totalVideosProcessed: platformData?.length || 0,
    byPublisher,
  };
}

