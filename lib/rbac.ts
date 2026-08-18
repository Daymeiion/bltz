import { createClient } from "@/lib/supabase/server";
import { USER_ROLES, type UserRole } from "@/types/database";
import {
  getTestUser,
  TEST_PLAYER_ID,
  TEST_USER_ID,
} from "@/lib/onboarding/test-auth";

export type { UserRole } from "@/types/database";

export interface UserProfile {
  id: string;
  email: string | null;
  role: UserRole;
  display_name: string | null;
  avatar_url: string | null;
  player_id: string | null;
}

function isUserRole(role: string | null): role is UserRole {
  return role !== null && USER_ROLES.some((candidate) => candidate === role);
}

/**
 * Get the current user's profile with role information
 * Fetches from the existing profiles table in Supabase
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const testUser = await getTestUser();
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    if (testUser) {
      return {
        id: TEST_USER_ID,
        email: testUser.email,
        role: "player",
        display_name: "Demo Player",
        avatar_url: "/images/Headshot.png",
        player_id: TEST_PLAYER_ID,
      };
    }
    return null;
  }

  // Fetch user profile from profiles table
  const { data: existingProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, display_name, avatar_url, role, player_id")
    .eq("id", user.id)
    .single();

  let profile = existingProfile;

  if (profileError || !profile) {
    // If profile doesn't exist, create one
    const { data: newProfile, error: createError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email ?? null,
        display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || null
      })
      .select("id, email, display_name, avatar_url, role, player_id")
      .single();

    if (createError || !newProfile) {
      console.error("Error creating profile:", createError);
      // Return basic user info without database ID if profile creation fails
      return {
        id: user.id,
        email: user.email || null,
        role: "fan",
        display_name: user.user_metadata?.full_name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
        player_id: null,
      };
    }

    profile = newProfile;
  }

  return {
    id: profile.id,
    email: profile.email || user.email || null,
    role: isUserRole(profile.role) ? profile.role : "fan",
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    player_id: profile.player_id,
  };
}

/**
 * Check if the current user has the required role(s)
 */
export async function hasRole(allowedRoles: UserRole | UserRole[]): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  
  if (!profile) {
    return false;
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return roles.includes(profile.role);
}

/**
 * Check if the current user is a player
 */
export async function isPlayer(): Promise<boolean> {
  return hasRole("player");
}

/**
 * Check if the current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  if (await getTestUser()) return true;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    throw new Error("Unauthorized");
  }
}

/**
 * Require specific role(s) - throws error if user doesn't have required role
 */
export async function requireRole(allowedRoles: UserRole | UserRole[]) {
  const hasRequiredRole = await hasRole(allowedRoles);
  if (!hasRequiredRole) {
    throw new Error("Forbidden - Insufficient permissions");
  }
}

