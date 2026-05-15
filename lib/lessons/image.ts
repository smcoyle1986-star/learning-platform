"use client";

import { supabase } from "@/lib/supabase/client";

export function resolveLessonImageUrl(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
  if (raw.startsWith("/")) return raw;
  return supabase.storage.from("vocab-images").getPublicUrl(raw).data.publicUrl;
}
