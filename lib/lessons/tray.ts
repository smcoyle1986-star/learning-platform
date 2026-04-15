import { LessonCard } from "@/lib/lessons/types";

export const LESSON_TRAY_KEY = "classendo-lesson-tray";
export const LAST_SAVED_TRAY_KEY = "classendo-last-saved-tray";
export const EDITING_LESSON_SET_ID_KEY = "editingLessonSetId";

function isBrowser() {
  return typeof window !== "undefined";
}

export function normalizeLessonCard(raw: unknown): LessonCard {
  const source = (raw ?? {}) as Record<string, unknown>;

  return {
    ...source,
    id: String(
      source.id ??
        source.card_id ??
        source.lesson_card_id ??
        source.word ??
        source.front ??
        Date.now()
    ),
    word: String(source.word ?? source.front ?? source.text ?? ""),
    image:
      typeof (source.image ?? source.back ?? source.image_url ?? source.img) === "string"
        ? String(source.image ?? source.back ?? source.image_url ?? source.img)
        : null,
    back:
      typeof (source.back ?? source.image ?? source.image_url ?? source.img) === "string"
        ? String(source.back ?? source.image ?? source.image_url ?? source.img)
        : null,
    image_id:
      typeof source.image_id === "string" ? source.image_id : null,
    position:
      typeof source.position === "number" ? source.position : 0,
    type: typeof source.type === "string" ? source.type : undefined,
  };
}

function readCardArray(key: string): LessonCard[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw || raw === "undefined") return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(Boolean).map(normalizeLessonCard);
  } catch (error) {
    console.warn(`Failed to read ${key}:`, error);
    return [];
  }
}

function writeCardArray(key: string, cards: LessonCard[]) {
  if (!isBrowser()) return;

  try {
    const normalized = Array.isArray(cards) ? cards.filter(Boolean).map(normalizeLessonCard) : [];
    window.localStorage.setItem(key, JSON.stringify(normalized));
  } catch (error) {
    console.error(`Failed to write ${key}:`, error);
  }
}

export function readLessonTray() {
  return readCardArray(LESSON_TRAY_KEY);
}

export function writeLessonTray(cards: LessonCard[]) {
  writeCardArray(LESSON_TRAY_KEY, cards);

  if (!isBrowser()) return;

  try {
    window.dispatchEvent(new Event("lesson-tray-updated"));
  } catch {}
}

export function clearLessonTray() {
  if (!isBrowser()) return;

  window.localStorage.removeItem(LESSON_TRAY_KEY);

  try {
    window.dispatchEvent(new Event("lesson-tray-updated"));
  } catch {}
}

export function subscribeToLessonTray(onChange: (cards: LessonCard[]) => void) {
  if (!isBrowser()) {
    onChange([]);
    return () => {};
  }

  const emit = () => {
    onChange(readLessonTray());
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key === LESSON_TRAY_KEY) emit();
  };
  const onFocus = () => emit();
  const onVisibility = () => {
    if (!document.hidden) emit();
  };
  const onCustom = () => emit();

  emit();
  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", onFocus);
  window.addEventListener("lesson-tray-updated", onCustom as EventListener);
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("lesson-tray-updated", onCustom as EventListener);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

export function readLastSavedTray() {
  return readCardArray(LAST_SAVED_TRAY_KEY);
}

export function writeLastSavedTray(cards: LessonCard[]) {
  writeCardArray(LAST_SAVED_TRAY_KEY, cards);
}

export function getEditingLessonSetId() {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(EDITING_LESSON_SET_ID_KEY);
}

export function setEditingLessonSetId(lessonId: string | null) {
  if (!isBrowser()) return;

  if (!lessonId) {
    window.localStorage.removeItem(EDITING_LESSON_SET_ID_KEY);
    return;
  }

  window.localStorage.setItem(EDITING_LESSON_SET_ID_KEY, lessonId);
}
