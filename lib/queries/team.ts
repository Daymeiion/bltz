import { createClient } from "@/lib/supabase/server";
import { PlayerTeammate, TeamInvite } from "@/types/database";

export interface TeammateWithPlayer {
  id: string;
  player_id: string;
  teammate_player_id: string;
  games_played_together: number | null;
  last_played_together: string | null;
  teammate: {
    id: string;
    name: string | null;
    full_name: string | null;
    profile_image: string | null;
    position: string | null;
    team: string | null;
    slug: string | null;
    user_id: string | null;
  };
}

export interface InviteWithInviter {
  id: string;
  inviter_user_id: string;
  inviter_player_id: string | null;
  invitee_email: string;
  invitee_name: string | null;
  status: string;
  invite_code: string;
  message: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  created_at: string;
  inviter: {
    display_name: string | null;
    avatar_url: string | null;
  };
  inviter_player: {
    name: string | null;
    full_name: string | null;
    profile_image: string | null;
  } | null;
}

/**
 * Get all teammates for the current user's player profile
 */
export async function getMyTeammates(): Promise<TeammateWithPlayer[]> {
  const supabase = await createClient();
  
  // Get current user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("player_id")
    .eq("id", (await supabase.auth.getUser()).data.user?.id || "")
    .single();

  if (!profile?.player_id) {
    return [];
  }

  // Get teammates with player details
  const { data, error } = await supabase
    .from("player_teammates")
    .select(`
      id,
      player_id,
      teammate_player_id,
      games_played_together,
      last_played_together,
      teammate:players!player_teammates_teammate_player_id_fkey(
        id,
        name,
        full_name,
        profile_image,
        position,
        team,
        slug,
        user_id
      )
    `)
    .eq("player_id", profile.player_id)
    .order("last_played_together", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("Error fetching teammates:", error);
    return [];
  }

  if (!data) {
    return [];
  }

  // Map the data to ensure teammate is a single object, not an array
  return data.map((item: any) => ({
    id: item.id,
    player_id: item.player_id,
    teammate_player_id: item.teammate_player_id,
    games_played_together: item.games_played_together,
    last_played_together: item.last_played_together,
    teammate: Array.isArray(item.teammate) ? item.teammate[0] : item.teammate,
  })) as TeammateWithPlayer[];
}

/**
 * Get pending invites sent by the current user
 */
export async function getMySentInvites(): Promise<InviteWithInviter[]> {
  const supabase = await createClient();
  
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("team_invites")
    .select(`
      *,
      inviter:profiles!team_invites_inviter_user_id_fkey(
        display_name,
        avatar_url
      ),
      inviter_player:players!team_invites_inviter_player_id_fkey(
        name,
        full_name,
        profile_image
      )
    `)
    .eq("inviter_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching sent invites:", error);
    return [];
  }

  return data as InviteWithInviter[];
}

/**
 * Get invites received by the current user
 */
export async function getMyReceivedInvites(): Promise<InviteWithInviter[]> {
  const supabase = await createClient();
  
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) {
    return [];
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  if (!profile?.email) {
    return [];
  }

  const { data, error } = await supabase
    .from("team_invites")
    .select(`
      *,
      inviter:profiles!team_invites_inviter_user_id_fkey(
        display_name,
        avatar_url
      ),
      inviter_player:players!team_invites_inviter_player_id_fkey(
        name,
        full_name,
        profile_image
      )
    `)
    .eq("invitee_email", profile.email)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching received invites:", error);
    return [];
  }

  return data as InviteWithInviter[];
}

/**
 * Search for players by name (for adding teammates)
 */
export async function searchPlayers(query: string): Promise<any[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("players")
    .select("id, name, full_name, profile_image, position, team, slug, user_id")
    .or(`name.ilike.%${query}%,full_name.ilike.%${query}%`)
    .not("user_id", "is", null) // Only players with accounts
    .limit(20);

  if (error) {
    console.error("Error searching players:", error);
    return [];
  }

  return data || [];
}

