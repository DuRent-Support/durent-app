export type UserRole = "admin" | "user";

export interface Profile {
  id: string;
  user_id: string; 
  role: UserRole;
  profile_image_url?: string;
  created_at?: string;
  updated_at?: string;
}
