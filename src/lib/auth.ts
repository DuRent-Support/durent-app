import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types";

/**
 * Get the current user's profile including role
 * @returns Profile object or null if not found
 */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_uuid", user.id)
    .single<Profile>();

  if (error || !profile) {
    console.error("Profile fetch error:", error);
    return null;
  }

  return profile;
}

/**
 * Check if current user has a specific role
 * @param role - The role to check
 * @returns true if user has the specified role, false otherwise
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  return profile?.role === role;
}

/**
 * Check if current user is an admin
 * @returns true if user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole("admin");
}
