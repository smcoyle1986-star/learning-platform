import { SupabaseClient } from "@supabase/supabase-js";

import { LESSON_CONTENT_TYPES, LessonCard, LessonRecord, SaveLessonInput, type LessonContentType } from "@/lib/lessons/types";
import { normalizeLessonCard } from "@/lib/lessons/tray";

const LESSON_NAME_CONFLICT_CODE = "LESSON_NAME_CONFLICT";

export class LessonNameConflictError extends Error {
  readonly code = LESSON_NAME_CONFLICT_CODE;
  readonly existingLessonId: string | null;

  constructor(existingLessonId: string | null) {
    super("A lesson with this name is already saved.");
    this.name = "LessonNameConflictError";
    this.existingLessonId = existingLessonId;
  }
}

function normalizeLessonNameKey(value: string) {
  return value.trim().toLocaleLowerCase();
}

function isLessonNameUniqueViolation(error: unknown) {
  const source = (error ?? {}) as { code?: unknown; message?: unknown; constraint?: unknown };
  return (
    String(source.code ?? "") === "23505" ||
    String(source.constraint ?? "") === "lesson_sets_user_name_idx" ||
    String(source.message ?? "").includes("lesson_sets_user_name_idx")
  );
}

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
    basicActive: source.basicActive !== undefined ? Boolean(source.basicActive) : source.basic_active !== undefined ? Boolean(source.basic_active) : true,
    containsPremiumImages: Boolean(source.containsPremiumImages ?? source.contains_premium_images),
    basicVersionAvailable: Boolean(source.basicVersionAvailable ?? source.basic_version_available),
    basicConversionAvailable: Boolean(source.basicConversionAvailable ?? source.basic_conversion_available),
    isLocked: Boolean(source.isLocked ?? source.is_locked),
    lockReasons: Array.isArray(source.lockReasons)
      ? source.lockReasons.filter((reason): reason is "set_limit" | "premium_images" => reason === "set_limit" || reason === "premium_images")
      : [],
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
    back: card.creator_image_id ? null : card.image ?? card.back ?? null,
    creator_image_id: card.creator_image_id ?? null,
    content_type:
      typeof card.type === "string" && LESSON_CONTENT_TYPES.includes(card.type as LessonContentType)
        ? card.type
        : null,
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
    .select("id,name")
    .eq("user_id", userId);

  if (error) throw error;
  const requestedName = normalizeLessonNameKey(lessonName);
  const existing = (data ?? []).find(
    (row) => normalizeLessonNameKey(String(row.name ?? "")) === requestedName
  );
  return existing?.id ? String(existing.id) : null;
}

export async function saveLesson(
  supabase: SupabaseClient,
  input: SaveLessonInput
) {
  const trimmedName = input.name.trim();
  if (!trimmedName) throw new Error("Lesson name is required");

  const normalizedCards = input.cards.map(normalizeLessonCard);

  if (input.lessonId) {
    const { data: updatedLesson, error: updateError } = await supabase
      .from("lesson_sets")
      .update({
        name: trimmedName,
        last_used: new Date().toISOString(),
        is_public: input.isPublic,
      })
      .eq("id", input.lessonId)
      .eq("user_id", input.userId)
      .select("id")
      .maybeSingle();

    if (updateError) {
      if (isLessonNameUniqueViolation(updateError)) {
        throw new LessonNameConflictError(
          await findExistingLessonIdByName(supabase, input.userId, trimmedName)
        );
      }
      throw updateError;
    }
    if (!updatedLesson) throw new Error("Lesson not found or does not belong to this account.");

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

  if (error) {
    if (isLessonNameUniqueViolation(error)) {
      throw new LessonNameConflictError(
        await findExistingLessonIdByName(supabase, input.userId, trimmedName)
      );
    }
    throw error;
  }
  if (!data?.id) throw new Error("Failed to create lesson");

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
    if (
      response.status === 409 &&
      String(payload?.code ?? "") === LESSON_NAME_CONFLICT_CODE
    ) {
      throw new LessonNameConflictError(
        payload?.existingLessonId ? String(payload.existingLessonId) : null
      );
    }
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
      .select("id, lesson_set_id, front, back, creator_image_id, content_type, position")
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
          creator_image_id: row.creator_image_id,
          type: row.content_type,
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

export async function loadLessonsWithAccessFromServer() {
  const {
    data: { session },
  } = await import("@/lib/supabase/client").then(({ supabase }) => supabase.auth.getSession());

  const response = await fetch("/api/lessons", {
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(String(payload?.error ?? "Could not load saved lesson sets."));
  }
  return payload.map(normalizeLesson);
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
    .select("id, lesson_set_id, front, back, creator_image_id, content_type, position")
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
        creator_image_id: row.creator_image_id,
        type: row.content_type,
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
