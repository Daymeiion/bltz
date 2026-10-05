import { createClient } from "@/lib/supabase/server";

export interface Video {
  id: string;
  player_id: string;
  owner_user_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  playback_url: string | null;
  duration_seconds: number | null;
  tags: string[] | null;
  visibility: 'public' | 'unlisted' | 'private';
  created_at: string;
  updated_at: string;
}

export interface VideoWithStats extends Video {
  views: number;
  watch_time: number;
  comments_count: number;
}

export interface VideoComment {
  id: number;
  video_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

/**
 * Get all videos for a player
 */
export async function getPlayerVideos(playerId: string): Promise<VideoWithStats[]> {
  const supabase = await createClient();
  
  const { data: videos, error } = await supabase
    .from('videos')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (error || !videos) {
    return [];
  }

  // Get stats for each video
  const videosWithStats = await Promise.all(
    videos.map(async (video) => {
      const { count: views } = await supabase
        .from('views')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', video.id);

      const { data: watchTimeData } = await supabase
        .from('views')
        .select('seconds_watched')
        .eq('video_id', video.id);

      const watch_time = watchTimeData?.reduce((sum, v) => sum + (v.seconds_watched || 0), 0) || 0;

      // For now, comments_count is 0 (we'll implement comments table later if needed)
      const comments_count = 0;

      return {
        ...video,
        views: views || 0,
        watch_time,
        comments_count,
      };
    })
  );

  return videosWithStats;
}

/**
 * Get a single video by ID
 */
export async function getVideoById(videoId: string): Promise<VideoWithStats | null> {
  const supabase = await createClient();
  
  const { data: video, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single();

  if (error || !video) {
    return null;
  }

  const { count: views } = await supabase
    .from('views')
    .select('*', { count: 'exact', head: true })
    .eq('video_id', video.id);

  const { data: watchTimeData } = await supabase
    .from('views')
    .select('seconds_watched')
    .eq('video_id', video.id);

  const watch_time = watchTimeData?.reduce((sum, v) => sum + (v.seconds_watched || 0), 0) || 0;

  return {
    ...video,
    views: views || 0,
    watch_time,
    comments_count: 0,
  };
}

/**
 * Create a new video
 */
export async function createVideo(data: {
  player_id: string;
  owner_user_id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  playback_url?: string;
  duration_seconds?: number;
  tags?: string[];
  visibility?: 'public' | 'unlisted' | 'private';
}) {
  const supabase = await createClient();
  
  const { data: video, error } = await supabase
    .from('videos')
    .insert({
      ...data,
      visibility: data.visibility || 'public',
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return video;
}

/**
 * Update a video
 */
export async function updateVideo(
  videoId: string,
  data: {
    title?: string;
    description?: string;
    thumbnail_url?: string;
    playback_url?: string;
    duration_seconds?: number;
    tags?: string[];
    visibility?: 'public' | 'unlisted' | 'private';
  }
) {
  const supabase = await createClient();
  
  const { data: video, error } = await supabase
    .from('videos')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', videoId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return video;
}

/**
 * Delete a video
 */
export async function deleteVideo(videoId: string) {
  const supabase = await createClient();
  
  // Delete associated views first
  await supabase
    .from('views')
    .delete()
    .eq('video_id', videoId);

  // Delete the video
  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('id', videoId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

/**
 * Get comments for a video (placeholder - implement when comments table exists)
 */
export async function getVideoComments(videoId: string): Promise<VideoComment[]> {
  // TODO: Implement when comments table is created
  return [];
}

/**
 * Delete a comment (placeholder)
 */
export async function deleteComment(commentId: number) {
  // TODO: Implement when comments table is created
  return true;
}

