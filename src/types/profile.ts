export type UserRole = "admin" | "user";

export interface Profile {
  user_uuid: string;
  role: UserRole;
  avatar_url?: string | null;
  full_name: string;
  phone?: string | null;
  created_at?: string;
  updated_at?: string;
}
