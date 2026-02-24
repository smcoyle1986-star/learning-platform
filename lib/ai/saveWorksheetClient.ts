// lib/ai/saveWorksheetClient.ts
import { supabase } from "@/lib/supabase/client";

async function getCurrentUserId() {
  try {
    // Supabase JS v2
    if (typeof (supabase.auth as any)?.getUser === "function") {
      const { data } = await (supabase.auth as any).getUser();
      return data?.user?.id ?? null;
    }
    // Supabase JS v1 fallback
    if (typeof (supabase.auth as any)?.user === "function") {
      const u = (supabase.auth as any).user();
      return u?.id ?? null;
    }
    return (supabase.auth as any)?.currentUser?.id ?? null;
  } catch {
    return null;
  }
}

export async function saveWorksheetClient({
  title,
  cefr_level,
  worksheet_types,
  filters,
  pdf_url,
  content,
  cards,
}: {
  title: string;
  cefr_level?: string;
  worksheet_types?: string[];
  filters?: any;
  pdf_url?: string | null;
  content?: string | null;
  cards?: any[];
}) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated — could not determine user id");

  const payload = {
    teacher_id: userId,
    title,
    cefr_level: cefr_level ?? "A1",
    worksheet_types: worksheet_types ?? [],
    filters: filters ?? { cards: cards ?? [] },
    pdf_url: pdf_url ?? null,
    content: content ?? null,
  };

  const res = await fetch("/api/ai/save-worksheet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Save worksheet failed");
  return data;
}