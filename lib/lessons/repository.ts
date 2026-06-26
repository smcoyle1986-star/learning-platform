import { SupabaseClient } from "@supabase/supabase-js";

import { LessonCard, LessonRecord, SaveLessonInput } from "@/lib/lessons/types";
import { normalizeLessonCard } from "@/lib/lessons/tray";

function normalizeTimestamp(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return Date.parse(value) || null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  return null;
}

export function normalizeLesson(raw: unknown): LessonRecord {
  const source = (raw ?? {}) as Record<string, unknown>;

  return {
    id: String(source.id ?? Date.now()),
    name: String(source.name ?? "Untitled"),
    cards: Array.isArray(source.cards) ? source.cards.filter(Boolean).map(normalizeLessonCard) : [],
    createdAt:
      typeof source.createdAt === "string" || typeof source.createdAt === "number"
        ? source.createdAt
        : typeof source.created_at === "string" || typeof source.created_at === "number"
          ? source.created_at
          : undefined,
    lastUsed: normalizeTimestamp(source.lastUsed ?? source.last_used),
    useCount: Number(source.useCount ?? source.use_count ?? 0),
    isPublic:
      source.isPublic !== undefined
        ? Boolean(source.isPublic)
        : source.is_public !== undefined
          ? Boolean(source.is_public)
          : undefined,
  };
}

async function replaceLessonCards(
  supabase: SupabaseClient,
  lessonId: string,
  cards: LessonCard[]
) {
  const { error: deleteError } = await supabase.from("cards").delete().eq("lesson_set_id", lessonId);
  if (deleteError) throw deleteError;

  if (cards.length === 0) return;

  const rows = cards.map((card, index) => ({
    lesson_set_id: lessonId,
    front: card.word,
    back: card.image ?? card.back ?? null,
    position: index,
  }));

  const { error: insertError } = await supabase.from("cards").insert(rows);
  if (insertError) throw insertError;
}

export async function loadLessonMetadata(
  supabase: SupabaseClient,
  lessonId: string
) {
  const { data, error } = await supabase
    .from("lesson_sets")
    .select("name,is_public")
    .eq("id", lessonId)
    .single();

  if (error) throw error;
  return data;
}

export async function findExistingLessonIdByName(
  supabase: SupabaseClient,
  userId: string,
  lessonName: string
) {
  const { data, error } = await supabase
    .from("lesson_sets")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", lessonName)
    .limit(1);

  if (error) throw error;
  return data?.[0]?.id ? String(data[0].id) : null;
}

export async function saveLesson(
  supabase: SupabaseClient,
  input: SaveLessonInput
) {
  const trimmedName = input.name.trim();
  if (!trimmedName) throw new Error("Lesson name is required");

  const normalizedCards = input.cards.map(normalizeLessonCard);

  if (input.lessonId) {
    const { error: updateError } = await supabase
      .from("lesson_sets")
      .update({
        name: trimmedName,
        last_used: new Date().toISOString(),
        is_public: input.isPublic,
      })
      .eq("id", input.lessonId);

    if (updateError) throw updateError;

    await replaceLessonCards(supabase, input.lessonId, normalizedCards);

    const metadata = await loadLessonById(supabase, input.lessonId);
    if (!metadata) throw new Error("Lesson was saved but could not be reloaded.");
    return metadata;
  }

  const { data, error } = await supabase
    .from("lesson_sets")
    .insert({
      name: trimmedName,
      user_id: input.userId,
      last_used: new Date().toISOString(),
      is_public: input.isPublic,
    })
    .select("id")
    .single();

  if (error || !data?.id) throw error ?? new Error("Failed to create lesson");

  const lessonId = String(data.id);
  await replaceLessonCards(supabase, lessonId, normalizedCards);

  const saved = await loadLessonById(supabase, lessonId);
  if (!saved) throw new Error("Lesson was created but could not be reloaded.");
  return saved;
}

export async function saveLessonFromClient(
  supabase: SupabaseClient,
  input: SaveLessonInput
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch("/api/lessons/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(input),
  });

  const rawText = await response.text();
  let payload: Record<string, unknown> | null = null;

  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload) {
    throw new Error(
      String(
        payload?.error ??
          rawText?.trim() ??
          `Failed to save lesson (status ${response.status}).`
      )
    );
  }

  return normalizeLesson(payload);
}

export async function loadLessonsForUser(
  supabase: SupabaseClient,
  userId: string
) {
  const { data: sets, error: setsError } = await supabase
    .from("lesson_sets")
    .select("id, name, created_at, last_used, is_public, use_count")
    .eq("user_id", userId)
    .order("last_used", { ascending: false });

  if (setsError) throw setsError;

  const lessonIds = (sets ?? []).map((row) => String(row.id));
  let cardsByLessonId: Record<string, LessonCard[]> = {};

  if (lessonIds.length > 0) {
    const { data: cards, error: cardsError } = await supabase
      .from("cards")
      .select("id, lesson_set_id, front, back, position")
      .in("lesson_set_id", lessonIds)
      .order("position", { ascending: true });

    if (cardsError) throw cardsError;

    cardsByLessonId = (cards ?? []).reduce<Record<string, LessonCard[]>>((acc, row) => {
      const lessonId = String(row.lesson_set_id);
      if (!acc[lessonId]) acc[lessonId] = [];
      acc[lessonId].push(
        normalizeLessonCard({
          id: row.id,
          word: row.front,
          image: row.back,
          back: row.back,
          position: row.position,
        })
      );
      return acc;
    }, {});
  }

  return (sets ?? []).map((row) =>
    normalizeLesson({
      ...row,
      cards: cardsByLessonId[String(row.id)] ?? [],
    })
  );
}

export async function loadLessonById(
  supabase: SupabaseClient,
  lessonId: string
) {
  const lessons = await loadLessonsByIds(supabase, [lessonId]);
  return lessons[0] ?? null;
}

async function loadLessonsByIds(
  supabase: SupabaseClient,
  lessonIds: string[]
) {
  if (lessonIds.length === 0) return [];

  const { data: sets, error: setError } = await supabase
    .from("lesson_sets")
    .select("id, name, created_at, last_used, is_public, use_count")
    .in("id", lessonIds);

  if (setError) throw setError;

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("id, lesson_set_id, front, back, position")
    .in("lesson_set_id", lessonIds)
    .order("position", { ascending: true });

  if (cardsError) throw cardsError;

  const cardsByLessonId = (cards ?? []).reduce<Record<string, LessonCard[]>>((acc, row) => {
    const id = String(row.lesson_set_id);
    if (!acc[id]) acc[id] = [];
    acc[id].push(
      normalizeLessonCard({
        id: row.id,
        word: row.front,
        image: row.back,
        back: row.back,
        position: row.position,
      })
    );
    return acc;
  }, {});

  return (sets ?? []).map((row) =>
    normalizeLesson({
      ...row,
      cards: cardsByLessonId[String(row.id)] ?? [],
    })
  );
}

export async function deleteLesson(
  supabase: SupabaseClient,
  lessonId: string
) {
  const { error } = await supabase.from("lesson_sets").delete().eq("id", lessonId);
  if (error) throw error;
}

export async function recordLessonUsage(
  supabase: SupabaseClient,
  lesson: LessonRecord
) {
  const nextUseCount = (lesson.useCount ?? 0) + 1;
  const nextLastUsed = Date.now();

  const { error } = await supabase
    .from("lesson_sets")
    .update({
      last_used: new Date(nextLastUsed).toISOString(),
      use_count: nextUseCount,
    })
    .eq("id", lesson.id);

  if (error) throw error;

  return normalizeLesson({
    ...lesson,
    useCount: nextUseCount,
    lastUsed: nextLastUsed,
  });
}
