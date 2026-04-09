"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Play, Edit, Trash2, Printer } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import Button from "@/components/ui/Button"; // ADDED: use design-system Button for header actions

type Lesson = {
  id: string | number;
  name: string;
  cards: any[];
  createdAt?: number | string;
  lastUsed?: number | null;
  useCount?: number;
  // NEW: visibility flag for badge
  isPublic?: boolean;
};

const STORAGE_KEY = "classendo-saved-lessons";
const LESSON_TRAY_KEY = "classendo-lesson-tray";
const RECENT_LIMIT = 8;

/* -------------------------
   Helper utilities (defensive)
   -------------------------*/

// Normalize a saved lesson object so downstream code sees a stable shape
function normalizeLessonCard(raw: any) {
  return {
    ...raw,
    id: raw?.id ?? String(Date.now()),
    word: raw?.word ?? raw?.front ?? raw?.text ?? "",
    image: raw?.image ?? raw?.back ?? raw?.image_url ?? raw?.img ?? null,
    back: raw?.back ?? raw?.image ?? raw?.image_url ?? raw?.img ?? null,
    image_id: raw?.image_id ?? null,
    position: raw?.position ?? 0,
  };
}

function normalizeLesson(raw: any): Lesson {
  const id = raw?.id ?? String(Date.now());
  const name = raw?.name ?? "Untitled";
  const cards = Array.isArray(raw?.cards)
    ? raw.cards.filter(Boolean).map(normalizeLessonCard)
    : [];
  const useCount = Number(raw?.useCount ?? 0);
  const lastUsed =
    raw?.lastUsed === undefined || raw?.lastUsed === null
      ? null
      : typeof raw.lastUsed === "string"
      ? Date.parse(raw.lastUsed) || null
      : Number(raw?.lastUsed) || null;

  // Accept both isPublic and is_public from different sources
  const isPublic =
    raw?.isPublic !== undefined
      ? Boolean(raw.isPublic)
      : raw?.is_public !== undefined
      ? Boolean(raw.is_public)
      : undefined;

  return {
    id,
    name,
    cards,
    createdAt: raw?.createdAt,
    lastUsed,
    useCount,
    isPublic,
  };
}

// Safely read "classendo-lesson-tray" and ensure an array is returned.
// Returns [] for missing, "undefined", invalid JSON, or non-array data.
function readLessonTray(): any[] {
  try {
    const raw = localStorage.getItem(LESSON_TRAY_KEY);
    if (!raw || raw === "undefined") {
      if (raw === "undefined") {
        console.warn(
          `Invalid lesson-tray stored value ("undefined"), auto-recovering to empty tray.`
        );
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(
        `Lesson tray data was not an array, auto-recovering to empty tray.`,
        parsed
      );
      return [];
    }
    // strip falsy/undefined entries
    const filtered = parsed.filter(Boolean);
    if (filtered.length !== parsed.length) {
      console.warn("Removed invalid entries from lesson tray during load.");
    }
    return filtered;
  } catch (err) {
    console.warn("Failed to parse lesson tray from localStorage, recovering to []:", err);
    return [];
  }
}

// Safely write lesson tray ensuring it's always an array and stripping undefined entries.
function writeLessonTray(cards: any[]) {
  try {
    const arr = Array.isArray(cards) ? cards.filter(Boolean) : [];
    localStorage.setItem(LESSON_TRAY_KEY, JSON.stringify(arr));
    try {
      window.dispatchEvent(new Event("lesson-tray-updated"));
    } catch (e) {
      /* ignore in restricted environments */
    }
  } catch (err) {
    console.error("Failed to write lesson tray to localStorage:", err);
  }
}

// Safe read of saved lessons list (normalizes each lesson) — local fallback only
function safeReadSavedLessons(): Lesson[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    if (raw === "undefined") {
      console.warn(
        `Invalid saved-lessons stored value ("undefined"), clearing saved lessons.`
      );
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn("Saved lessons data was not an array, clearing saved lessons.", parsed);
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    return parsed.map(normalizeLesson);
  } catch (err) {
    console.warn("Failed to parse saved lessons from localStorage, clearing:", err);
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

// Safe write of saved lessons (normalizes each lesson before writing) — local-only
function safeWriteSavedLessons(lessons: any[]) {
  try {
    const arr = Array.isArray(lessons) ? lessons.map(normalizeLesson) : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch (err) {
    console.error("Failed to persist saved lessons to localStorage:", err);
  }
}

/*
  DashboardPage
  - Loads saved lessons from Supabase for authenticated user (primary source).
  - Falls back to localStorage when no user is authenticated.
  - Keeps existing UI and actions; only changes loading source and ensures lesson.cards are available.
*/

export default function DashboardPage() {
  const { user } = useAuth();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [previewLesson, setPreviewLesson] = useState<any | null>(null);
  

  // Delete modal state (new)
  const [lessonSetPendingDelete, setLessonSetPendingDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debug log (safe)
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    console.log("RAW SAVED LESSONS (local cache):", raw);
    try {
      const parsed = raw && raw !== "undefined" ? JSON.parse(raw) : [];
      console.log("PARSED (local cache):", parsed);
    } catch (err) {
      console.warn("Failed to parse saved lessons for debug log:", err, raw);
    }
  }, []);

  /* ----------------------------------
     Load lessons
     - If user is authenticated: load from Supabase (primary source)
       and attach cards (single cards query + grouping).
     - If no user: fall back to localStorage cache using safeReadSavedLessons().
  -----------------------------------*/
  useEffect(() => {
    let mounted = true;

    async function loadFromSupabase(userId: string) {
      try {
        // 1) Get lesson sets for this user (include is_public for badge)
        const { data: sets, error: setsErr } = await supabase
          .from("lesson_sets")
          .select("id, name, created_at, last_used, is_public, use_count")
          .eq("user_id", userId)
          .order("last_used", { ascending: false });

        if (setsErr) {
          console.error("Failed to fetch lesson_sets from Supabase:", setsErr);
          // fall back to local cached saved lessons
          if (mounted) setLessons(safeReadSavedLessons());
          return;
        }

        const setIds = (sets || []).map((s: any) => s.id);
        let cards: any[] = [];
        if (setIds.length > 0) {
          const { data: cardRows, error: cardsErr } = await supabase
            .from("cards")
            .select("id, lesson_set_id, front, back, position")
            .in("lesson_set_id", setIds)
            .order("position", { ascending: true });

          if (cardsErr) {
            console.error("Failed to fetch cards for lesson_sets:", cardsErr);
            // continue with empty cards
          } else {
            cards = cardRows || [];
          }
        }

        // Group cards by lesson_set_id
        const cardsBySet: Record<string, any[]> = {};
        cards.forEach((c: any) => {
          const lid = String(c.lesson_set_id);
          if (!cardsBySet[lid]) cardsBySet[lid] = [];
          cardsBySet[lid].push({
            id: c.id,
            word: c.front,
            image: c.back,
            back: c.back,
            image_id: null,
            position: c.position,
          });
        });

        // Merge Supabase data with local cache for stable lastUsed/useCount
        const localCache = safeReadSavedLessons();
        const localById = new Map(localCache.map((l) => [String(l.id), l]));

        // Compose normalized lessons (include is_public -> isPublic)
        const normalized = (sets || []).map((s: any) => {
          const local = localById.get(String(s.id));
          const supaLast =
            s.last_used !== undefined && s.last_used !== null
              ? Date.parse(String(s.last_used)) || Number(s.last_used) || null
              : null;
          const localLast = local?.lastUsed ?? null;
          const mergedLast =
            supaLast && localLast ? Math.max(supaLast, localLast) : supaLast ?? localLast ?? null;
          const mergedUse = Math.max(
            Number.isFinite(Number(s.use_count)) ? Number(s.use_count) : 0,
            local?.useCount ?? 0
          );

          return normalizeLesson({
            id: s.id,
            name: s.name,
            cards: cardsBySet[String(s.id)] ?? [],
            createdAt: s.created_at,
            lastUsed: mergedLast,
            useCount: mergedUse,
            is_public: s.is_public,
          });
        });

        if (mounted) setLessons(normalized);
      } catch (err) {
        console.error("Unexpected error loading lessons from Supabase:", err);
        if (mounted) setLessons(safeReadSavedLessons());
      }
    }

    if (user?.id) {
      loadFromSupabase(user.id);
    } else {
      // fallback: load from localStorage cache
      const data = safeReadSavedLessons();
      setLessons(data);
    }

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /* ----------------------------------
     Derived views
  -----------------------------------*/
  const recentlyUsed = useMemo(() => {
    return [...lessons]
      .sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0))
      .slice(0, RECENT_LIMIT);
  }, [lessons]);

  const popularLessons = useMemo(() => {
    return [...lessons].sort((a, b) => (b.useCount ?? 0) - (a.useCount ?? 0));
  }, [lessons]);

  /* ----------------------------------
     Actions (preserved behavior, hardened)
     Note: These continue to update local cache; Supabase updates are not introduced here
     to avoid changing backend write patterns beyond needed fix.
  -----------------------------------*/
  const enterClassroom = (lesson: Lesson) => {
    // update local in-memory + local cache
    const updated = lessons.map((l) =>
      l.id === lesson.id
        ? { ...normalizeLesson(l), useCount: (l.useCount ?? 0) + 1, lastUsed: Date.now() }
        : normalizeLesson(l)
    );
    setLessons(updated);
    safeWriteSavedLessons(updated);

    // Best-effort update to Supabase so recently-used ordering stays stable
    if (user?.id) {
      supabase
        .from("lesson_sets")
        .update({
          last_used: new Date().toISOString(),
          use_count: (lesson.useCount ?? 0) + 1,
        })
        .eq("id", lesson.id)
        .then(({ error }) => {
          if (error) console.warn("Failed to update lesson last_used/use_count:", error);
        });
    }

    // load lesson cards to lesson tray deterministically via localStorage helper
    const cardsToCopy = Array.isArray(lesson.cards) ? lesson.cards.filter(Boolean) : [];
    if (!Array.isArray(cardsToCopy) || cardsToCopy.length === 0) {
      console.warn("enterClassroom: lesson has no cards, skipping tray update and navigation.");
      return;
    }
    writeLessonTray(cardsToCopy);

    window.location.href = "/flashcards/classroom?from=dashboard";
  };

  const editLesson = (lesson: any) => {
    const cards = Array.isArray(lesson.cards) ? lesson.cards.filter(Boolean) : [];
    if (!cards.length) {
      console.warn("editLesson: lesson has no cards, aborting edit navigation.");
      return;
    }

    writeLessonTray(cards);
    window.location.href = "/flashcards";
  };

  // Keep original local-only delete helper (not used for Supabase delete flow)
  const deleteLesson = (lessonId: string | number) => {
    const filtered = lessons.filter((l) => l.id !== lessonId).map(normalizeLesson);
    setLessons(filtered);
    safeWriteSavedLessons(filtered);
  };

  // Open confirm modal (does not delete)
  function openDeleteModal(lessonId: string | number) {
    setLessonSetPendingDelete(String(lessonId));
    setIsDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    setIsDeleteModalOpen(false);
    setLessonSetPendingDelete(null);
  }

  // Confirm deletion: call Supabase, then update UI only on success
  async function confirmDelete() {
    if (!lessonSetPendingDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("lesson_sets")
        .delete()
        .eq("id", lessonSetPendingDelete);

      if (error) {
        console.error("Failed to delete lesson_set:", error);
        // Keep modal open so user can retry or cancel
        // Do not remove from state
        setIsDeleting(false);
        return;
      }

      // Success: remove from local state and persist local cache
      const filtered = lessons.filter((l) => String(l.id) !== String(lessonSetPendingDelete)).map(normalizeLesson);
      setLessons(filtered);
      safeWriteSavedLessons(filtered);

      // Close modal and clear pending id
      setIsDeleteModalOpen(false);
      setLessonSetPendingDelete(null);
    } catch (err) {
      console.error("Unexpected error deleting lesson_set:", err);
      // Leave modal open; do not remove from state
    } finally {
      setIsDeleting(false);
    }
  }

  // Print lesson — writes to lesson tray and navigates to printables
  const printLesson = (e: React.MouseEvent, lesson: Lesson) => {
    e.stopPropagation();

    const cards = Array.isArray(lesson.cards) ? lesson.cards.filter(Boolean) : [];
    if (!cards.length) {
      console.warn("printLesson: lesson has no cards, aborting print.");
      return;
    }

    writeLessonTray(cards);
    window.location.href = "/printables?from=dashboard";
  };

  /* ---------------------------
     Title overflow / marquee detection logic
     - Adds CSS vars / classes on overflowing title elements so marquee runs only when needed.
     - Allows manual scroll on hover (overflow-x:auto) and pauses animation on hover.
     ---------------------------*/
  useEffect(() => {
    function updateTitleElements() {
      const outers = Array.from(document.querySelectorAll<HTMLElement>(".cb-title-outer"));
      outers.forEach((outer) => {
        const inner = outer.querySelector<HTMLElement>(".cb-title-inner");
        if (!inner) return;
        // reset
        inner.style.removeProperty("--scroll-diff");
        inner.style.removeProperty("--scroll-duration");
        outer.classList.remove("cb-has-scroll");
        inner.classList.remove("cb-marquee");

        const diff = inner.scrollWidth - outer.clientWidth;
        if (diff > 6) {
          // set CSS vars
          inner.style.setProperty("--scroll-diff", String(diff));
          // duration proportional to diff (20px => 1s baseline)
          const duration = Math.max(6, Math.min(30, Math.round(diff / 20)));
          inner.style.setProperty("--scroll-duration", `${duration}s`);
          // mark to enable marquee
          outer.classList.add("cb-has-scroll");
          inner.classList.add("cb-marquee");
        }
      });
    }

    // run after render / lessons update
    updateTitleElements();
    // update on resize
    window.addEventListener("resize", updateTitleElements);
    return () => window.removeEventListener("resize", updateTitleElements);
  }, [lessons]);

  /* ----------------------------------
     Render
  -----------------------------------*/
  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
      {/* inject lightweight CSS for marquee/hover-scroll */}
      <style>{`
        /* Reserve space so title cannot extend under top-right action buttons.
           Increased padding-right and flex shrink to ensure title never overlaps buttons. */
        .cb-title-wrap { display: flex; align-items: center; gap: 8px; min-width: 0; padding-right: 120px; }
        /* outer is the visible clip area: allow it to shrink (flex:1) so it won't overflow */
        .cb-title-outer { flex: 1 1 auto; min-width: 0; overflow: hidden; position: relative; z-index: 1; }
        /* inner holds the long text */
        .cb-title-inner { display: inline-block; white-space: nowrap; }
        /* ensure action cluster sits above the title visually and for pointer events */
        .cb-action-cluster { position: absolute; top: 0.75rem; right: 0.75rem; z-index: 30; }
        /* when marquee is enabled, animate using computed scroll diff and duration vars */
        .cb-title-inner.cb-marquee {
          animation-name: cb-scroll;
          animation-duration: var(--scroll-duration, 8s);
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          animation-delay: 1s;
        }
        @keyframes cb-scroll {
          0% { transform: translateX(0); }
          45% { transform: translateX(calc(var(--scroll-diff) * -1)); }
          55% { transform: translateX(calc(var(--scroll-diff) * -1)); }
          100% { transform: translateX(0); }
        }
        /* On hover, allow manual scrolling and pause animation */
        .cb-title-outer:hover { overflow-x: auto; }
        .cb-title-outer:hover .cb-title-inner { animation-play-state: paused; }
        /* hide default scrollbar but show on hover (basic) */
        .cb-title-outer { scrollbar-width: none; -ms-overflow-style: none; }
        .cb-title-outer::-webkit-scrollbar { height: 6px; display: none; }
        .cb-title-outer:hover::-webkit-scrollbar { display: block; height: 6px; }
        .cb-badge-icon { width: 28px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; }
      `}</style>

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg-main)]/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Brand */}
          <Link
            href="/"
            className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80"
          >
            Classendo
          </Link>

          {/* Center title */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <h1 className="text-4xl font-bold text-black">Dashboard</h1>
          </div>
          

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={() => (window.location.href = "/flashcards")}
            >
              Flashcards
            </Button>

            <Button
              variant="secondary"
              onClick={() => (window.location.href = "/teacher/community")}
              aria-label="Community"
            >
              Community
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-6 pt-12 pb-32 space-y-16">
        {/* RECENTLY USED */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Recently Used</h2>

          {recentlyUsed.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No recent lessons yet.
            </p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {recentlyUsed.map((lesson) => {
                const idStr = String(lesson.id);
                return (
                  <div
                    key={lesson.id}
                    /* tile is no longer clickable — remove onClick and cursor styles */
                  className={`
            min-w-[360px] w-[360px] bg-white rounded-2xl p-5 transition relative
            border shadow-sm hover:shadow-md
          `}
                  >
                    {/* Title (full-width row) */}
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="font-semibold text-[var(--color-text-main)] truncate"
                        title={lesson.name}
                        aria-label={lesson.name}
                      >
                        {lesson.name}
                      </div>
                    </div>

                    {/* Middle row: actions left, meta right */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 mt-7">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewLesson(lesson);
                          }}
                          className="btn btn-secondary px-2 py-1.5 text-xs"
                          title="Preview"
                        >
                          ☰
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            editLesson(lesson);
                          }}
                          className="btn btn-secondary px-2 py-1.5 text-xs"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const cardsToCopy = Array.isArray(lesson.cards)
                                ? lesson.cards.filter(Boolean)
                                : [];
                              if (!cardsToCopy.length) {
                                console.warn("Games: lesson has no cards, aborting navigation.");
                                return;
                              }
                              writeLessonTray(cardsToCopy);

                              const updated = lessons.map((l) =>
                                l.id === lesson.id
                                  ? { ...normalizeLesson(l), useCount: (l.useCount ?? 0) + 1, lastUsed: Date.now() }
                                  : normalizeLesson(l)
                              );
                              setLessons(updated);
                              safeWriteSavedLessons(updated);

                              if (user?.id) {
                                supabase
                                  .from("lesson_sets")
                                  .update({
                                    last_used: new Date().toISOString(),
                                    use_count: (lesson.useCount ?? 0) + 1,
                                  })
                                  .eq("id", lesson.id)
                                  .then(({ error }) => {
                                    if (error) console.warn("Failed to update lesson last_used/use_count (games):", error);
                                  });
                              }

                              window.location.href = "/games";
                            }}
                            className="btn btn-secondary px-2 py-1.5 text-xs"
                            title="Games"
                            aria-label="Open Games"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M6 12c0-1.333-.667-2-2-2S2 10.667 2 12s.667 2 2 2 2-.667 2-2z" /><path d="M22 12c0-1.333-.667-2-2-2s-2 .667-2 2 .667 2 2 2 2-.667 2-2z" /><path d="M4.5 12h15a3.5 3.5 0 0 1 3.5 3.5V17a3.5 3.5 0 0 1-3.5 3.5H4.5A3.5 3.5 0 0 1 1 17v-1.5A3.5 3.5 0 0 1 4.5 12z" /><path d="M9 15v.01" /><path d="M12 13v4" /><path d="M15 15v.01" /></svg>
                          </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteModal(lesson.id);
                          }}
                          className="btn btn-secondary px-2 py-1.5 text-xs bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Meta on the right */}
                      <div className="text-right text-xs text-[var(--color-text-muted)] flex flex-col gap-2 mt-7">
                        <div>{lesson.cards?.length ?? 0} cards</div>
                        <div>{lesson.useCount ?? 0} uses</div>
                        <div
                          className="self-end cb-badge-icon text-[var(--color-text-muted)]"
                          title={lesson.isPublic ? "Public" : "Private"}
                          aria-label={lesson.isPublic ? "Public" : "Private"}
                        >
                          {lesson.isPublic ? "🌍" : "🔒"}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          enterClassroom(lesson);
                        }}
                        className="btn btn-primary flex-1 px-2.5 py-1.5 text-xs"
                      >
                        <Play size={14} />
                        Enter Classroom
                      </button>

                      {/* Secondary small Print button (visible under the main action too, keeps spacing clear) */}
                      <button
                        onClick={(e) => printLesson(e, lesson)}
                        className="btn btn-secondary px-2.5 py-1.5 flex items-center gap-2 text-xs"
                      >
                        <Printer size={14} />
                        Print
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SAVED LESSONS */}
        <section>
          <h2 className="text-xl font-semibold mb-6">Saved Lessons</h2>

          {popularLessons.length === 0 ? (
            <div className="text-center py-20 text-[var(--color-text-muted)]">
              <p className="text-lg mb-3">You haven’t saved any lessons yet.</p>
              <Link
                href="/flashcards"
                className="text-[var(--color-text-main)] font-medium underline underline-offset-4"
              >
                Create your first lesson
              </Link>
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: "calc(12 * 8rem)" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-1">
                {popularLessons.map((lesson) => {
                  const idStr = String(lesson.id);
                  return (
                    <div
                      key={lesson.id}
                      /* tile is no longer clickable */
                      className={`
                bg-white rounded-2xl p-5 transition relative
                border shadow-sm hover:shadow-md
              `}
                    >
                      {/* Title (full-width row) */}
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="font-semibold text-[var(--color-text-main)] truncate"
                          title={lesson.name}
                          aria-label={lesson.name}
                        >
                          {lesson.name}
                        </div>
                      </div>

                      {/* Middle row: actions left, meta right */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2 mt-7">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewLesson(lesson);
                            }}
                            className="btn btn-secondary px-2 py-1.5 text-xs"
                            title="Preview"
                          >
                            ☰
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              editLesson(lesson);
                            }}
                            className="btn btn-secondary px-2 py-1.5 text-xs"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const cardsToCopy = Array.isArray(lesson.cards) ? lesson.cards.filter(Boolean) : [];
                                if (!cardsToCopy.length) {
                                  console.warn("Games: lesson has no cards, aborting navigation.");
                                  return;
                                }
                                writeLessonTray(cardsToCopy);

                                const updated = lessons.map((l) =>
                                  l.id === lesson.id
                                    ? { ...normalizeLesson(l), useCount: (l.useCount ?? 0) + 1, lastUsed: Date.now() }
                                    : normalizeLesson(l)
                                );
                                setLessons(updated);
                                safeWriteSavedLessons(updated);

                                if (user?.id) {
                                  supabase
                                    .from("lesson_sets")
                                    .update({
                                      last_used: new Date().toISOString(),
                                      use_count: (lesson.useCount ?? 0) + 1,
                                    })
                                    .eq("id", lesson.id)
                                    .then(({ error }) => {
                                      if (error) console.warn("Failed to update lesson last_used/use_count (games):", error);
                                    });
                                }

                                window.location.href = "/games";
                              }}
                              className="btn btn-secondary px-2 py-1.5 text-xs"
                              title="Games"
                              aria-label="Open Games"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M6 12c0-1.333-.667-2-2-2S2 10.667 2 12s.667 2 2 2 2-.667 2-2z" /><path d="M22 12c0-1.333-.667-2-2-2s-2 .667-2 2 .667 2 2 2 2-.667 2-2z" /><path d="M4.5 12h15a3.5 3.5 0 0 1 3.5 3.5V17a3.5 3.5 0 0 1-3.5 3.5H4.5A3.5 3.5 0 0 1 1 17v-1.5A3.5 3.5 0 0 1 4.5 12z" /><path d="M9 15v.01" /><path d="M12 13v4" /><path d="M15 15v.01" /></svg>
                            </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteModal(lesson.id);
                            }}
                            className="btn btn-secondary px-2 py-1.5 text-xs bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Meta on the right */}
                        <div className="text-right text-xs text-[var(--color-text-muted)] flex flex-col gap-2 mt-7">
                          <div>{lesson.cards?.length ?? 0} cards</div>
                          <div>{lesson.useCount ?? 0} uses</div>
                          <div
                            className="self-end cb-badge-icon text-[var(--color-text-muted)]"
                            title={lesson.isPublic ? "Public" : "Private"}
                            aria-label={lesson.isPublic ? "Public" : "Private"}
                          >
                            {lesson.isPublic ? "🌍" : "🔒"}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            enterClassroom(lesson);
                          }}
                          className="btn btn-primary flex-1 px-3 py-2 text-sm"
                        >
                          <Play size={14} />
                          Enter Classroom
                        </button>

                        <button
                          onClick={(e) => printLesson(e, lesson)}
                          className="btn btn-secondary px-3 py-2 flex items-center gap-2 text-sm"
                        >
                          <Printer size={14} />
                          Print
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {previewLesson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{previewLesson.name}</h3>
                <button
                  onClick={() => setPreviewLesson(null)}
                  className="text-sm text-gray-500 hover:text-black"
                >
                  Close
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto grid grid-cols-2 gap-3">
                {previewLesson?.cards?.map((card: any, index: number) => (
                  <div
                    key={index}
                    className="border rounded-lg p-3 text-sm bg-[var(--color-bg-soft)]"
                  >
                    {card.image ? (
                      <div className="mb-2 w-full h-24 rounded-md bg-white border border-black/5 overflow-hidden flex items-center justify-center">
                        <img
                          src={card.image}
                          alt={card.word || card.text || "Card image"}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : null}
                    {card.word || card.text || "Card"}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h3 className="text-lg font-semibold mb-3">Delete lesson set</h3>
              <p className="text-sm text-[var(--color-text-muted)] mb-6">
                This will permanently delete this lesson set. This action cannot be undone.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => closeDeleteModal()}
                  className="px-4 py-2 rounded-lg border border-black/10 bg-[var(--color-bg-soft)] text-sm hover:bg-white transition"
                >
                  Cancel
                </button>

                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:opacity-90 transition"
                >
                  {isDeleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
