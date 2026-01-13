// lib/supabase/nouns.ts
import { supabase } from "./client";
import { Noun } from "@/lib/types";

type GetNounsOptions = {
  search?: string;
  themes?: string[];
  limit?: number;
};

export async function getNouns(
  options: GetNounsOptions = {}
): Promise<Noun[]> {
  let query = supabase
    .from("nouns")
    .select("*")
    .order("lemma", { ascending: true });

  if (options.search) {
    query = query.ilike("lemma", `%${options.search}%`);
  }

  if (options.themes && options.themes.length > 0) {
    query = query.overlaps("themes", options.themes);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Supabase getNouns error:", error);
    throw error;
  }

  return data ?? [];
}
