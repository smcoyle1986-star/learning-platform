import { LESSON_CONTENT_TYPES, LessonCard, type LessonContentType } from "@/lib/lessons/types";

export const LESSON_TRAY_KEY = "classendo-lesson-tray";
export const GUEST_LESSON_TRAY_KEY = "classendo-guest-lesson-tray";
export const GUEST_LESSON_TRAY_LIMIT = 6;
export const LAST_SAVED_TRAY_KEY = "classendo-last-saved-tray";
export const EDITING_LESSON_SET_ID_KEY = "editingLessonSetId";

export type LessonTrayScope = "account" | "guest";

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
    creator_image_id:
      typeof (source.creator_image_id ?? source.creatorImageId) === "string"
        ? String(source.creator_image_id ?? source.creatorImageId)
        : null,
    position:
      typeof source.position === "number" ? source.position : 0,
    type:
      typeof source.type === "string" && LESSON_CONTENT_TYPES.includes(source.type as LessonContentType)
        ? (source.type as LessonContentType)
        : undefined,
  };
}

function trayStorage(scope: LessonTrayScope) {
  return scope === "guest" ? window.sessionStorage : window.localStorage;
}

function trayKey(scope: LessonTrayScope) {
  return scope === "guest" ? GUEST_LESSON_TRAY_KEY : LESSON_TRAY_KEY;
}

function readCardArray(key: string, storage?: Storage): LessonCard[] {
  if (!isBrowser()) return [];

  try {
    const raw = (storage ?? window.localStorage).getItem(key);
    if (!raw || raw === "undefined") return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(Boolean).map(normalizeLessonCard);
  } catch (error) {
    console.warn(`Failed to read ${key}:`, error);
    return [];
  }
}

function writeCardArray(
  key: string,
  cards: LessonCard[],
  storage?: Storage,
) {
  if (!isBrowser()) return;

  try {
    const normalized = Array.isArray(cards) ? cards.filter(Boolean).map(normalizeLessonCard) : [];
    (storage ?? window.localStorage).setItem(key, JSON.stringify(normalized));
  } catch (error) {
    console.error(`Failed to write ${key}:`, error);
  }
}

export function readLessonTray(scope: LessonTrayScope = "account") {
  if (!isBrowser()) return [];
  const cards = readCardArray(trayKey(scope), trayStorage(scope));
  return scope === "guest" ? cards.slice(0, GUEST_LESSON_TRAY_LIMIT) : cards;
}

export function writeLessonTray(
  cards: LessonCard[],
  scope: LessonTrayScope = "account",
) {
  if (!isBrowser()) return;
  const scopedCards = scope === "guest"
    ? cards.slice(0, GUEST_LESSON_TRAY_LIMIT)
    : cards;
  writeCardArray(trayKey(scope), scopedCards, trayStorage(scope));

  if (!isBrowser()) return;

  try {
    window.dispatchEvent(new Event("lesson-tray-updated"));
  } catch {}
}

export function clearLessonTray(scope: LessonTrayScope = "account") {
  if (!isBrowser()) return;

  trayStorage(scope).removeItem(trayKey(scope));

  try {
    window.dispatchEvent(new Event("lesson-tray-updated"));
  } catch {}
}

export function subscribeToLessonTray(
  onChange: (cards: LessonCard[]) => void,
  scope: LessonTrayScope = "account",
) {
  if (!isBrowser()) {
    onChange([]);
    return () => {};
  }

  const emit = () => {
    onChange(readLessonTray(scope));
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key === trayKey(scope)) emit();
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

export function adoptGuestLessonTray() {
  if (!isBrowser()) return [];
  const guestCards = readLessonTray("guest");
  if (guestCards.length === 0) return readLessonTray("account");

  const accountCards = readLessonTray("account");
  const seen = new Set<string>();
  const merged = [...guestCards, ...accountCards].filter((card) => {
    const identity = card.id || card.image || `${card.type}:${card.word}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });

  writeCardArray(LESSON_TRAY_KEY, merged, window.localStorage);
  window.sessionStorage.removeItem(GUEST_LESSON_TRAY_KEY);
  try {
    window.dispatchEvent(new Event("lesson-tray-updated"));
  } catch {}
  return merged;
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
