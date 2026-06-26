'use client';

import React, { useEffect, useState } from "react";
import PageHeader from "@/components/navigation/PageHeader";
import LessonTrayScroller from "@/components/shared/LessonTrayScroller";
import { X, Printer } from "lucide-react";
import EditorCardRow from "@/components/teacher/editor/EditorCardRow";
import { supabase } from "@/lib/supabase/client";
import { resolveLessonImageUrl } from "@/lib/lessons/image";
import {
  findExistingLessonIdByName,
  loadLessonMetadata,
  saveLessonFromClient,
} from "@/lib/lessons/repository";
import {
  clearLessonTray,
  readLastSavedTray,
  readLessonTray,
  writeLastSavedTray,
  writeLessonTray,
} from "@/lib/lessons/tray";
import { LessonCard } from "@/lib/lessons/types";

/**
 * Teacher Lesson Tray Editor (updated)
 *
 * - Save modal wording + Public/Private toggle now match Flashcards page.
 * - New lessons default to public; toggle lets user make them private.
 * - When editing an existing lesson_set (detected via URL or localStorage keys),
 *   the modal preloads the lesson name and is_public flag so edits preserve visibility.
 *
 * No other UI or flows were changed beyond adding the toggle and wiring it to saves/updates.
 */

function areCardsEqual(left: LessonCard[], right: LessonCard[]) {
  if (left.length !== right.length) return false;

  return left.every((card, index) => {
    const other = right[index];
    if (!other) return false;

    return (
      String(card.id) === String(other.id) &&
      String(card.word ?? "") === String(other.word ?? "") &&
      String(card.image ?? card.back ?? "") === String(other.image ?? other.back ?? "") &&
      String(card.type ?? "") === String(other.type ?? "")
    );
  });
}

export default function TeacherLessonTrayEditor() {
  const [trayCards, setTrayCards] = useState<LessonCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Save modal & name state (mirrors Flashcards)
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [lessonName, setLessonName] = useState("");
  const [nameError, setNameError] = useState("");
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [existingLessonId, setExistingLessonId] = useState<string | null>(null);

  // NEW: Editing mode detection (lesson_set id passed when Dashboard -> Edit)
  const [editingLessonSetId, setEditingLessonSetId] = useState<string | null>(null);

  // NEW: public/private toggle state for Save modal (default true)
  const [isPublic, setIsPublic] = useState<boolean>(true);

  // Unsaved change tracking
  const [lastSavedTray, setLastSavedTray] = useState<LessonCard[]>([]);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    // Try to detect editing lesson_set id passed via query or localStorage (same pattern as Flashcards)
    try {
      const params = new URLSearchParams(window.location.search);
      const idFromQuery =
        params.get("lesson_set_id") ||
        params.get("lessonSetId") ||
        params.get("id") ||
        null;
      if (idFromQuery) {
        setEditingLessonSetId(idFromQuery);
      }
    } catch (e) {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    // If we detected an editingLessonSetId, load its name + is_public so the modal preloads correctly
    if (!editingLessonSetId) return;
    (async () => {
      try {
        const data = await loadLessonMetadata(supabase, editingLessonSetId);
        if (data?.name) {
          setLessonName(data.name);
          setIsPublic(Boolean(data.is_public ?? true));
        }
      } catch (e) {
        console.error("Failed to load lesson_set metadata for editing:", e);
      }
    })();
  }, [editingLessonSetId]);

  useEffect(() => {
    try {
      setTrayCards(readLessonTray());
      setLastSavedTray(readLastSavedTray());
    } catch (err) {
      console.error("Failed to load lesson tray:", err);
      setTrayCards([]);
      setLastSavedTray([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const syncTrayFromStorage = () => {
      try {
        const nextTray = readLessonTray();
        const nextSavedTray = readLastSavedTray();
        setTrayCards((current) => (areCardsEqual(current, nextTray) ? current : nextTray));
        setLastSavedTray((current) =>
          areCardsEqual(current, nextSavedTray) ? current : nextSavedTray
        );
      } catch (err) {
        console.error("Failed to refresh lesson tray:", err);
      }
    };

    window.addEventListener("focus", syncTrayFromStorage);
    window.addEventListener("storage", syncTrayFromStorage);

    return () => {
      window.removeEventListener("focus", syncTrayFromStorage);
      window.removeEventListener("storage", syncTrayFromStorage);
    };
  }, []);

  // persist lesson tray to localStorage so other pages can pick it up
  useEffect(() => {
    writeLessonTray(trayCards);
  }, [trayCards]);

  // track unsaved changes similar to Flashcards (visual only; no blocking)
  useEffect(() => {
    setHasUnsavedChanges(!areCardsEqual(trayCards, lastSavedTray));
  }, [trayCards, lastSavedTray]);

  // navigation without guard (no popup)
  function navigateDirect(href: string) {
    // Use same style as Flashcards for navigation (direct location change)
    window.location.href = href;
  }

  // Editor handlers
  function updateCardWord(id: string, value: string) {
    setTrayCards((prev) =>
      prev.map((card) => (card.id === id ? { ...card, word: value } : card))
    );
  }

  function removeFromTray(id: string) {
    setTrayCards((prev) => prev.filter((c) => c.id !== id));
  }

  function clearTray() {
    setTrayCards([]);
    clearLessonTray();
  }

  /* -------------------------------
     Save logic (copied/adapted from Flashcards)
     ------------------------------- */

  async function handleSaveLesson() {
    setNameError("");
    if (!lessonName.trim()) {
      setNameError("Lesson name is required");
      return;
    }

    try {
      // Ensure user is authenticated
      const { data, error: userErr } = await supabase.auth.getUser();
      const user = data?.user ?? null;

      if (userErr || !user) {
        setNameError("You must be signed in to save lessons");
        return;
      }

      const trimmedName = lessonName.trim();
      if (!editingLessonSetId) {
        const existingId = await findExistingLessonIdByName(supabase, user.id, trimmedName);
        if (existingId) {
          setExistingLessonId(existingId);
          setShowReplaceConfirm(true);
          return;
        }
      }

      const savedLesson = await saveLessonFromClient(supabase, {
        lessonId: editingLessonSetId,
        userId: user.id,
        name: trimmedName,
        isPublic,
        cards: trayCards,
      });

      applySavedLessonState(savedLesson);
      setShowSavedIndicator(true);
      setTimeout(() => setShowSavedIndicator(false), 2000);

      finishSave();
    } catch (err: any) {
      console.error("Save failed:", err);
      setNameError(err?.message || "Save failed. Please try again.");
    }
  }

  // Replace existing lesson flow (same as Flashcards) but includes is_public update
  async function replaceLesson() {
    try {
      if (!existingLessonId) {
        setShowReplaceConfirm(false);
        return;
      }

      const { data, error: userErr } = await supabase.auth.getUser();
      const user = data?.user ?? null;
      if (userErr || !user) {
        setNameError("You must be signed in to replace lessons");
        return;
      }

      const savedLesson = await saveLessonFromClient(supabase, {
        lessonId: existingLessonId,
        userId: user.id,
        name: lessonName.trim(),
        isPublic,
        cards: trayCards,
      });

      setShowReplaceConfirm(false);
      setExistingLessonId(null);

      applySavedLessonState(savedLesson);
      setShowSavedIndicator(true);
      setTimeout(() => setShowSavedIndicator(false), 2000);

      finishSave();
    } catch (err: any) {
      console.error("Replace failed:", err);
      setNameError(err?.message || "Replace failed. Please try again.");
    }
  }

  function applySavedLessonState(savedLesson: { id: string; name: string; cards: LessonCard[]; isPublic?: boolean }) {
    setTrayCards(savedLesson.cards);
    setLastSavedTray(savedLesson.cards);
    writeLessonTray(savedLesson.cards);
    writeLastSavedTray(savedLesson.cards);
    setEditingLessonSetId(savedLesson.id);
    setLessonName(savedLesson.name);
    setIsPublic(Boolean(savedLesson.isPublic ?? true));
  }

  function finishSave() {
    setNameError("");
    setShowSaveModal(false);
    setShowReplaceConfirm(false);
  }

  // UI helper to format labels — preserve original case, only replace underscores with spaces
  const formatWord = (word?: string) => (word ?? "").toString().replace(/_/g, " ");

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
        <PageHeader
          title="Editor"
          primaryItems={[
            { label: "Classroom", href: "/flashcards/classroom", tone: "classroom" },
          ]}
          secondaryItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Printables", href: "/printables" },
            { label: "Worksheets", href: "/worksheets" },
            { label: "Lesson Plans", href: "/lessons" },
            { label: "Games", href: "/games" },
          ]}
        />

        <main className="max-w-7xl mx-auto px-6 pt-12 pb-32">
          <p>Loading lesson tray…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
      <PageHeader
        title="Editor"
        primaryItems={[
          { label: "Classroom", onClick: () => navigateDirect("/flashcards/classroom"), tone: "classroom" },
        ]}
        secondaryItems={[
          { label: "Dashboard", onClick: () => navigateDirect("/dashboard") },
          { label: "Printables", onClick: () => navigateDirect("/printables") },
          { label: "Worksheets", onClick: () => navigateDirect("/worksheets") },
          { label: "Lesson Plans", onClick: () => navigateDirect("/lessons") },
          { label: "Games", onClick: () => navigateDirect("/games") },
        ]}
      />

      {/* Sticky lesson tray header */}
      <section className="sticky top-[72px] z-40 bg-white border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-2">
          <LessonTrayScroller className="pb-1" contentClassName="gap-3">
            {trayCards.length === 0 && (
              <div className="px-4 py-2 rounded-lg border border-dashed border-black/20 text-sm text-[var(--color-text-muted)] whitespace-nowrap">
                No cards in lesson tray
              </div>
            )}

            {trayCards.map((card, idx) => (
              <div
                key={card.id}
                className="relative px-3 py-2 rounded-lg border bg-[var(--color-bg-soft)] text-sm whitespace-nowrap select-none"
                title={`${formatWord(card.word)} — position ${idx + 1}`}
              >
                <div className="flex items-center gap-2">
                  {resolveLessonImageUrl(card.image ?? card.image_id ?? card.back) ? (
                    <img
                      src={resolveLessonImageUrl(card.image ?? card.image_id ?? card.back)}
                      alt={formatWord(card.word)}
                      className="h-8 w-8 rounded-md border object-cover bg-white"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-md border bg-white text-[10px] text-gray-400 flex items-center justify-center">
                      No img
                    </div>
                  )}
                  <span className="text-xs">{formatWord(card.word)}</span>
                </div>
                <button
                  onClick={() => removeFromTray(card.id)}
                  className="absolute -top-0 -right-2 bg-white rounded-full border shadow p-0.5 hover:bg-red-50"
                  aria-label={`Remove ${formatWord(card.word)} from tray`}
                >
                  <X size={12} className="text-red-500" />
                </button>
              </div>
            ))}
          </LessonTrayScroller>

          <div className="flex items-center gap-3 flex-wrap">
            {trayCards.length > 0 && (
              <>
                <button onClick={() => setShowSaveModal(true)} className="btn btn-primary px-4 py-2">
                  Save To Dashboard
                </button>

                <button
                  onClick={() => {
                    writeLessonTray(trayCards);
                    window.location.href = "/printables?from=flashcards";
                  }}
                  className="btn btn-secondary px-4 py-2 flex items-center gap-2"
                  title="Print lesson"
                >
                  <Printer size={16} />
                  Print
                </button>

                <button onClick={clearTray} className="btn btn-secondary px-3 py-2 text-sm">
                  Remove all
                </button>
              </>
            )}

            {showSavedIndicator && <span className="text-sm text-green-600 font-medium animate-pulse">Saved!</span>}
            <div className="ml-auto text-sm text-gray-500">{hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}</div>
          </div>
        </div>
      </section>

      {/* Main editable list */}
      <main className="max-w-7xl mx-auto px-6 pt-10 pb-32">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Edit Lesson Tray Cards</h1>
          <p className="text-sm text-gray-600 mt-1">Edit the front/back text for each card. Click Save to persist to Dashboard.</p>
          <p className="text-xs text-gray-500 mt-2">
            Use this lesson card editor to update vocabulary, phrases, and classroom flashcards for future lessons, printable activities, worksheet creation, and interactive teaching games.
          </p>
        </div>

        {trayCards.length === 0 ? (
          <div className="p-6 bg-white rounded shadow-sm">
            <p className="text-gray-700">No cards in the lesson tray. Add cards from Flashcards to edit them here.</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => navigateDirect("/dashboard")} className="btn btn-primary px-3 py-2">
                Redirect to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {trayCards.map((card, idx) => (
              <EditorCardRow
                key={card.id}
                card={card}
                index={idx}
                    imageUrl={resolveLessonImageUrl(card.image ?? card.image_id ?? card.back)}
                onWordChange={updateCardWord}
                onReset={(id) => {
                  const saved = lastSavedTray.find((entry) => entry.id === id);
                  if (!saved) return;

                  setTrayCards((prev) =>
                    prev.map((entry) => (entry.id === id ? saved : entry))
                  );
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-[90%] max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Save To Dashboard</h2>

            <input
              type="text"
              value={lessonName}
              onChange={(e) => setLessonName(e.target.value)}
              placeholder="Enter lesson name"
              className="w-full mb-3 px-3 py-2 rounded-lg border border-black/10 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />

            {/* Public / Private toggle (matches Flashcards wording/behavior) */}
            <div className="flex items-center justify-between mb-5">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={() => setIsPublic((p) => !p)}
                  aria-label="Make lesson public"
                  className="w-4 h-4"
                />
                <span className="select-none">
                  {isPublic ? "Public — visible in Community" : "Private — only visible to you"}
                </span>
              </label>
            </div>

            {nameError && <div className="text-sm text-red-600 mb-3">{nameError}</div>}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setLessonName("");
                  setShowSaveModal(false);
                }}
                className="px-4 py-2 rounded-lg border border-black/10 bg-[var(--color-bg-soft)] text-sm hover:bg-white transition"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveLesson}
                className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90 transition"
              >
                Save Lesson
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replace confirm modal */}
      {showReplaceConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Lesson already exists</h3>

            <p className="text-sm text-[var(--color-text-muted)] mb-6">
              A lesson with this name is already saved. Do you want to replace it
              or change the name?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowReplaceConfirm(false)}
                className="px-4 py-2 rounded-lg border border-black/10 bg-[var(--color-bg-soft)] text-sm hover:bg-white transition"
              >
                Change name
              </button>

              <button
                onClick={replaceLesson}
                className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90 transition"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
