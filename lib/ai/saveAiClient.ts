// lib/ai/saveAiClient.ts
import { supabase } from "@/lib/supabase/client";

async function getAccessToken() {
  try {
    // Supabase JS v2
    if (typeof (supabase.auth as any)?.getSession === "function") {
      const { data } = await (supabase.auth as any).getSession();
      return data?.session?.access_token ?? null;
    }
    // v2 alternative
    if (typeof (supabase.auth as any)?.getUser === "function") {
      const sessionResult: any = await (supabase.auth as any).getSession();
      return sessionResult?.data?.session?.access_token ?? null;
    }
    // Supabase JS v1 fallback
    if ((supabase.auth as any)?.session) {
      return (supabase.auth as any).session()?.access_token ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveAiSetClient({
  title,
  prompt,
  cards,
}: {
  title: string;
  prompt?: string;
  cards?: any[];
}) {
  const accessToken = await getAccessToken();
  const headers: any = { "Content-Type": "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const res = await fetch("/api/ai/save-set", {
    method: "POST",
    headers,
    body: JSON.stringify({ title, prompt, cards }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Save failed");

  try {
    const STORAGE_KEY = "classbloom-saved-lessons";
    const raw = localStorage.getItem(STORAGE_KEY) || "[]";
    const parsed = JSON.parse(raw);
    const savedLessons = Array.isArray(parsed) ? parsed : [];
    const newEntry = {
      id: data.id,
      name: title,
      cards: data.cards,
      createdAt: new Date().toISOString(),
      lastUsed: Date.now(),
      useCount: 0,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([newEntry, ...savedLessons]));
  } catch (e) {
    console.warn("Failed to update local saved-lessons cache:", e);
  }

  try {
    localStorage.setItem("classbloom-lesson-tray", JSON.stringify(data.cards || []));
  } catch (e) {
    console.warn("Failed to write lesson tray:", e);
  }

  return data;
}