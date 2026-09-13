"use client";

import { supabase } from "@/lib/supabase/client";
import { getResponsiveImageUrl } from "@/lib/images/storage";

/**
 * Resolve lesson artwork from Storage. Supplying a display width selects the
 * matching pre-generated WebP derivative; sources without a derivative keep
 * their original URL.
 */
export function resolveLessonImageUrl(value?: string | null, displayWidth?: number) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const resolved = raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:") || raw.startsWith("blob:") || raw.startsWith("/")
    ? raw
    : supabase.storage.from("vocab-images").getPublicUrl(raw).data.publicUrl;

  return displayWidth ? getResponsiveImageUrl(resolved, displayWidth) ?? resolved : resolved;
}
