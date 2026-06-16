import { supabase } from "@/lib/supabase/client";

export type UserProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
  country_region: string | null;
  avatar_url: string | null;
  created_at: string | null;
};

async function selectProfileColumns(userId: string, columns: string) {
  return supabase.from("profiles").select(columns).eq("id", userId).maybeSingle();
}

export async function fetchProfileByUserId(userId: string) {
  const fullColumns = "id, display_name, username, country_region, avatar_url, created_at";
  const fallbackColumns = "id, display_name, avatar_url, created_at";

  const { data, error } = await selectProfileColumns(userId, fullColumns);
  if (!error) {
    return data as UserProfile | null;
  }

  const { data: fallbackData, error: fallbackError } = await selectProfileColumns(userId, fallbackColumns);
  if (fallbackError) {
    throw fallbackError;
  }

  return fallbackData as UserProfile | null;
}

export function getProfileDisplayName(profile: UserProfile | null | undefined, fallbackEmail?: string | null) {
  return profile?.username || profile?.display_name || fallbackEmail || "Guest";
}
