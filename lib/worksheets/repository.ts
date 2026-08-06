import { SupabaseClient } from "@supabase/supabase-js";

import { LessonCard, type LessonContentType } from "@/lib/lessons/types";
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
  if (value === "battleship") return "battleship";
  if (value === "questions") return "questions";
  if (value === "reading") return "reading";
  if (value === "sentence-scramble") return "sentence-scramble";
  if (value === "tic-tac-toe") return "tic-tac-toe";
  if (value === "wordsearch") return "wordsearch";
  if (value === "writing") return "writing";
  return "crossword";
}

function enumOrFallback<T extends string>(value: unknown, fallback: T): T {
  return typeof value === "string" && value.trim() ? (value as T) : fallback;
}

export function normalizeWorksheet(raw: unknown): SavedWorksheetRecord {
  const source = (raw ?? {}) as Record<string, unknown>;
  const draft = (source.draft ?? {}) as Record<string, unknown>;
  return {
    id: String(source.id),
    name: String(source.name ?? "Untitled Worksheet"),
    userId: String(source.user_id),
    worksheetType: normalizeWorksheetType(source.worksheet_type),
    isPublic: Boolean(source.is_public ?? true),
    cards: Array.isArray(source.cards) ? source.cards.map(normalizeLessonCard) : [],
    draft: {
      type: normalizeWorksheetType(draft.type),
      title: String(draft.title ?? ""),
      instructions: String(draft.instructions ?? ""),
      questionBuilderPrompts: Array.isArray(draft.questionBuilderPrompts)
        ? draft.questionBuilderPrompts.map((item: unknown) => String(item ?? ""))
        : [],
      readingLines: Array.isArray(draft.readingLines)
        ? draft.readingLines.map((item: unknown) => String(item ?? ""))
        : [],
      writingLines: Array.isArray(draft.writingLines)
        ? draft.writingLines.map((item: unknown) => String(item ?? ""))
        : [],
      writingImageMode: enumOrFallback(draft.writingImageMode, "both"),
      writingTraceable: Boolean(draft.writingTraceable ?? false),
      writingTraceRepeats: [1, 2, 3].includes(Number(draft.writingTraceRepeats))
        ? (Number(draft.writingTraceRepeats) as 1 | 2 | 3)
        : 1,
      sentenceScrambleLines: Array.isArray(draft.sentenceScrambleLines)
        ? draft.sentenceScrambleLines.map((item: unknown) => String(item ?? ""))
        : [],
      sentenceScrambleLevel: enumOrFallback(draft.sentenceScrambleLevel, "medium"),
      ticTacToeImageMode: enumOrFallback(draft.ticTacToeImageMode, "both"),
      ticTacToeBoardCount: [1, 2, 4, 8].includes(Number(draft.ticTacToeBoardCount))
        ? (Number(draft.ticTacToeBoardCount) as 1 | 2 | 4 | 8)
        : 1,
      battleshipImageMode: enumOrFallback(draft.battleshipImageMode, "image"),
      battleshipBoardMode: draft.battleshipBoardMode === "ships" ? "ships" : "empty",
      battleshipWorksheetCount: Number.isFinite(Number(draft.battleshipWorksheetCount))
        ? Math.max(1, Math.floor(Number(draft.battleshipWorksheetCount)))
        : 1,
      wordsearchListMode: enumOrFallback(draft.wordsearchListMode, "both"),
      wordsearchAddRandomLetters: Boolean(draft.wordsearchAddRandomLetters ?? false),
      difficulty: enumOrFallback(draft.difficulty, "medium"),
      clueMode: enumOrFallback(draft.clueMode, "both"),
      bullseyeVersion: enumOrFallback(draft.bullseyeVersion, "points"),
      bullseyeImageMode: enumOrFallback(draft.bullseyeImageMode, "image"),
      bullseyeInkSaver: Boolean(draft.bullseyeInkSaver ?? false),
      shuffleSeed: Number(draft.shuffleSeed ?? Date.now()),
    },
    createdAt: typeof source.created_at === "string" ? source.created_at : undefined,
    updatedAt: typeof source.updated_at === "string" ? source.updated_at : undefined,
    lastUsed: typeof source.last_used === "string" ? source.last_used : null,
    useCount: Number(source.use_count ?? 0),
    downloadCount: Number(source.download_count ?? 0),
    copiedFrom: source.copied_from ? String(source.copied_from) : null,
    isFavorite: Boolean(source.is_favorite ?? false),
    archivedAt: typeof source.archived_at === "string" ? source.archived_at : null,
    contentTypes: Array.isArray(source.content_types)
      ? source.content_types.map(String).filter((value): value is LessonContentType =>
          ["noun", "verb", "adjective", "preposition", "phonics"].includes(value))
      : [],
    tags: Array.isArray(source.tags) ? source.tags.map(String) : [],
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
      .eq("user_id", input.userId)
      .select("*")
      .maybeSingle();
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

export async function saveWorksheetFromClient(
  supabase: SupabaseClient,
  input: SaveWorksheetInput
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch("/api/worksheets/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    throw new Error(String(payload?.error ?? "Failed to save worksheet."));
  }

  return normalizeWorksheet(payload);
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

export async function recordWorksheetUsage(
  supabase: SupabaseClient,
  worksheet: SavedWorksheetRecord,
) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("worksheets")
    .update({ last_used: now, use_count: (worksheet.useCount ?? 0) + 1 })
    .eq("id", worksheet.id)
    .eq("user_id", worksheet.userId);
  if (error) throw error;
  return { lastUsed: now, useCount: (worksheet.useCount ?? 0) + 1 };
}

export async function updateWorksheetLibraryStateFromServer(
  worksheetId: string,
  changes: { isFavorite?: boolean; archived?: boolean },
) {
  const { data: { session } } = await import("@/lib/supabase/client").then(({ supabase }) => supabase.auth.getSession());
  const response = await fetch(`/api/worksheets/${encodeURIComponent(worksheetId)}/library-state`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(changes),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    throw new Error(String(payload?.error ?? "Could not update this worksheet."));
  }
  return normalizeWorksheet(payload);
}
