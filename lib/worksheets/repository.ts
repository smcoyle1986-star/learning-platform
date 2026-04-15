import { SupabaseClient } from "@supabase/supabase-js";

import { LessonCard } from "@/lib/lessons/types";
import { normalizeLessonCard } from "@/lib/lessons/tray";
import { SavedWorksheetRecord, WorksheetDraft, WorksheetType } from "@/lib/worksheets/types";

type SaveWorksheetInput = {
  worksheetId?: string | null;
  userId: string;
  name: string;
  worksheetType: WorksheetType;
  isPublic: boolean;
  cards: LessonCard[];
  draft: WorksheetDraft;
};

function normalizeWorksheetType(value: unknown): WorksheetType {
  if (value === "ladders-and-slides") return "bullseye";
  if (value === "bullseye") return "bullseye";
  if (value === "crossword") return "crossword";
  if (value === "matching") return "matching";
  if (value === "questions") return "questions";
  if (value === "reading") return "reading";
  if (value === "sentence-scramble") return "sentence-scramble";
  if (value === "tic-tac-toe") return "tic-tac-toe";
  if (value === "wordsearch") return "wordsearch";
  if (value === "writing") return "writing";
  return "crossword";
}

function normalizeWorksheet(raw: any): SavedWorksheetRecord {
  const draft = raw.draft ?? {};
  return {
    id: String(raw.id),
    name: String(raw.name ?? "Untitled Worksheet"),
    userId: String(raw.user_id),
    worksheetType: normalizeWorksheetType(raw.worksheet_type),
    isPublic: Boolean(raw.is_public ?? true),
    cards: Array.isArray(raw.cards) ? raw.cards.map(normalizeLessonCard) : [],
    draft: {
      type: normalizeWorksheetType(draft.type),
      title: String(draft.title ?? ""),
      instructions: String(draft.instructions ?? ""),
      difficulty: draft.difficulty ?? "medium",
      clueMode: draft.clueMode ?? "both",
      bullseyeVersion: draft.bullseyeVersion ?? "points",
      bullseyeImageMode: draft.bullseyeImageMode ?? "image",
      bullseyeInkSaver: Boolean(draft.bullseyeInkSaver ?? false),
      shuffleSeed: Number(draft.shuffleSeed ?? Date.now()),
    },
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export async function saveWorksheet(
  supabase: SupabaseClient,
  input: SaveWorksheetInput
) {
  const payload = {
    name: input.name.trim(),
    user_id: input.userId,
    worksheet_type: input.worksheetType,
    is_public: input.isPublic,
    cards: input.cards.map(normalizeLessonCard),
    draft: input.draft,
    updated_at: new Date().toISOString(),
  };

  if (!payload.name) throw new Error("Worksheet name is required");

  if (input.worksheetId) {
    const { data, error } = await supabase
      .from("worksheets")
      .update(payload)
      .eq("id", input.worksheetId)
      .select("*")
      .single();
    if (error || !data) throw error ?? new Error("Failed to update worksheet");
    return normalizeWorksheet(data);
  }

  const { data, error } = await supabase
    .from("worksheets")
    .insert({
      ...payload,
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Failed to create worksheet");
  return normalizeWorksheet(data);
}

export async function loadWorksheetById(supabase: SupabaseClient, worksheetId: string) {
  const { data, error } = await supabase
    .from("worksheets")
    .select("*")
    .eq("id", worksheetId)
    .single();
  if (error) throw error;
  return normalizeWorksheet(data);
}

export async function loadWorksheetsForUser(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("worksheets")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map(normalizeWorksheet);
}

export async function deleteWorksheet(supabase: SupabaseClient, worksheetId: string) {
  const { error } = await supabase.from("worksheets").delete().eq("id", worksheetId);
  if (error) throw error;
}
