'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X, Printer } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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

type TrayCard = {
  id: string;
  word?: string;
  image?: string | null;
  image_id?: string | null;
  [k: string]: any;
};

const STORAGE_KEY = "classbloom-saved-lessons";

export default function TeacherLessonTrayEditor() {
  const router = useRouter();

  const [trayCards, setTrayCards] = useState<TrayCard[]>([]);
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
  const [lastSavedTray, setLastSavedTray] = useState<TrayCard[]>([]);
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
      } else {
        const possibleKeys = [
          "editingLessonSetId",
          "editing-lesson-set-id",
          "editing_lesson_set_id",
          "editLessonSetId",
        ];
        for (const k of possibleKeys) {
          const v = localStorage.getItem(k);
          if (v) {
            setEditingLessonSetId(v);
            break;
          }
        }
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
        const { data, error } = await supabase
          .from("lesson_sets")
          .select("name,is_public")
          .eq("id", editingLessonSetId)
          .single();
        if (!error && data?.name) {
          setLessonName(data.name);
          setIsPublic(Boolean(data.is_public ?? true));
        }
      } catch (e) {
        console.error("Failed to load lesson_set metadata for editing:", e);
      }
    })();
  }, [editingLessonSetId]);

  useEffect(() => {
    // Load initial tray like Printables: try lesson-tray first, fallback to saved lessons
    try {
      const trayRaw = localStorage.getItem("classbloom-lesson-tray");
      if (trayRaw && trayRaw !== "undefined") {
        const parsed = JSON.parse(trayRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map((c: any) => ({
            id: String(c.id ?? c.card_id ?? c.word),
            word: c.word ?? c.front ?? c.text ?? "",
            image: c.image ?? c.back ?? null,
            image_id: c.image_id ?? null,
            ...c,
          }));
          setTrayCards(normalized);
          // also attempt to load last-saved-tray
          try {
            const lastSavedRaw = localStorage.getItem("classbloom-last-saved-tray");
            const lastSavedParsed = lastSavedRaw ? JSON.parse(lastSavedRaw) : [];
            setLastSavedTray(Array.isArray(lastSavedParsed) ? lastSavedParsed : []);
          } catch {
            setLastSavedTray([]);
          }
          setLoading(false);
          return;
        }
      }

      // fallback to saved lessons (use first saved lesson's cards)
      const savedRaw = localStorage.getItem(STORAGE_KEY);
      if (savedRaw && savedRaw !== "undefined") {
        const parsedSaved = JSON.parse(savedRaw);
        if (Array.isArray(parsedSaved) && parsedSaved.length > 0) {
          const first = parsedSaved[0];
          if (first?.cards && Array.isArray(first.cards) && first.cards.length) {
            const normalized = first.cards.map((c: any) => ({
              id: String(c.id ?? c.card_id ?? c.word),
              word: c.word ?? c.front ?? c.text ?? "",
              image: c.image ?? c.back ?? null,
              image_id: c.image_id ?? null,
              ...c,
            }));
            setTrayCards(normalized);
            setLastSavedTray(normalized);
            setLoading(false);
            return;
          }
        }
      }

      // nothing found
      setTrayCards([]);
      setLastSavedTray([]);
    } catch (err) {
      console.error("Failed to load lesson tray:", err);
      setTrayCards([]);
      setLastSavedTray([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // persist lesson tray to localStorage so other pages can pick it up
  useEffect(() => {
    try {
      localStorage.setItem("classbloom-lesson-tray", JSON.stringify(trayCards));
      try {
        window.dispatchEvent(new Event("lesson-tray-updated"));
      } catch (e) {
        /* ignore */
      }
    } catch (e) {
      console.warn("Failed to persist lesson tray:", e);
    }
  }, [trayCards]);

  // track unsaved changes similar to Flashcards (visual only; no blocking)
  useEffect(() => {
    const hasChanges =
      trayCards.length !== lastSavedTray.length ||
      trayCards.some((card) => !lastSavedTray.find((c) => c.id === card.id));
    setHasUnsavedChanges(hasChanges);
  }, [trayCards, lastSavedTray]);

  // navigation without guard (no popup)
  function navigateDirect(href: string) {
    // Use same style as Flashcards for navigation (direct location change)
    window.location.href = href;
  }

  // Editor handlers
  function updateCardField(id: string, field: keyof TrayCard, value: any) {
    setTrayCards((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }

  function removeFromTray(id: string) {
    setTrayCards((prev) => prev.filter((c) => c.id !== id));
  }

  function clearTray() {
    setTrayCards([]);
    localStorage.removeItem("classbloom-lesson-tray");
    try {
      window.dispatchEvent(new Event("lesson-tray-updated"));
    } catch (e) {
      /* ignore */
    }
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

      // Check for existing lesson_set for this user (case-insensitive)
      const { data: existing, error: existingErr } = await supabase
        .from("lesson_sets")
        .select("id")
        .eq("user_id", user.id)
        .ilike("name", trimmedName)
        .limit(1);

      if (existingErr) throw existingErr;

      if (existing && existing.length > 0) {
        setExistingLessonId(existing[0].id);
        setShowReplaceConfirm(true);
        return;
      }

      // Insert new lesson_set with user_id, last_used and is_public
      const { data: insertedLesson, error: insertErr } = await supabase
        .from("lesson_sets")
        .insert({
          name: trimmedName,
          user_id: user.id,
          last_used: new Date().toISOString(),
          is_public: isPublic,
        })
        .select("id, created_at")
        .single();

      if (insertErr) throw insertErr;

      const lessonSetId = (insertedLesson as any).id;

      // Insert cards (if any)
      if (trayCards.length > 0) {
        const cardsToInsert = trayCards.map((card, idx) => ({
          lesson_set_id: lessonSetId,
          front: card.word ?? card.front ?? card.text ?? "",
          back: card.image ?? card.back ?? null,
          position: idx,
        }));

        const { error: cardsErr } = await supabase.from("cards").insert(cardsToInsert);
        if (cardsErr) throw cardsErr;
      }

      // update localStorage saved lessons cache (so Dashboard shows it immediately)
      try {
        const raw = localStorage.getItem(STORAGE_KEY) || "[]";
        const parsed = JSON.parse(raw);
        const savedLessons = Array.isArray(parsed) ? parsed : [];
        const newEntry = {
          id: String(lessonSetId),
          name: trimmedName,
          cards: trayCards,
          createdAt: (insertedLesson as any).created_at ?? new Date().toISOString(),
          lastUsed: Date.now(),
          useCount: 0,
          isPublic: isPublic,
        };
        const updatedLocal = [newEntry, ...savedLessons];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLocal));
      } catch (e) {
        console.warn("Failed to update local saved-lessons cache:", e);
      }

      // UI updates
      setLastSavedTray([...trayCards]);
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

      const userResult = await supabase.auth.getUser();
      const user = (userResult as any)?.data?.user ?? null;
      const userErr = (userResult as any)?.error ?? null;
      if (userErr || !user) {
        setNameError("You must be signed in to replace lessons");
        return;
      }

      // delete existing cards
      const { error: delErr } = await supabase.from("cards").delete().eq("lesson_set_id", existingLessonId);
      if (delErr) throw delErr;

      // insert new cards
      if (trayCards.length > 0) {
        const cardsToInsert = trayCards.map((card, idx) => ({
          lesson_set_id: existingLessonId,
          front: card.word ?? card.front ?? card.text ?? "",
          back: card.image ?? card.back ?? null,
          position: idx,
        }));

        const { error: insertCardsErr } = await supabase.from("cards").insert(cardsToInsert);
        if (insertCardsErr) throw insertCardsErr;
      }

      // update lesson_sets metadata (include is_public)
      const { error: updateErr } = await supabase
        .from("lesson_sets")
        .update({ name: lessonName.trim(), last_used: new Date().toISOString(), is_public: isPublic })
        .eq("id", existingLessonId);

      if (updateErr) throw updateErr;

      // update local saved-lessons cache similar to Flashcards
      try {
        const raw = localStorage.getItem(STORAGE_KEY) || "[]";
        const parsed = JSON.parse(raw);
        const savedLessons = Array.isArray(parsed) ? parsed : [];

        const newEntry: any = {
          id: existingLessonId,
          name: lessonName.trim(),
          cards: trayCards,
          createdAt: undefined,
          lastUsed: Date.now(),
          useCount: 0,
          isPublic: isPublic,
        };

        const idx = savedLessons.findIndex((s: any) => String(s.id) === String(existingLessonId));
        if (idx !== -1) {
          newEntry.createdAt = savedLessons[idx].createdAt ?? new Date().toISOString();
          savedLessons[idx] = { ...savedLessons[idx], ...newEntry };
        } else {
          const nameIdx = savedLessons.findIndex(
            (s: any) => String(s.name).toLowerCase() === String(lessonName.trim()).toLowerCase()
          );
          if (nameIdx !== -1) {
            newEntry.createdAt = savedLessons[nameIdx].createdAt ?? new Date().toISOString();
            savedLessons[nameIdx] = { ...savedLessons[nameIdx], ...newEntry };
          } else {
            newEntry.createdAt = new Date().toISOString();
            savedLessons.unshift(newEntry);
          }
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLessons));
      } catch (e) {
        console.warn("Failed to update local saved-lessons cache on replace:", e);
      }

      setShowReplaceConfirm(false);
      setExistingLessonId(null);

      setLastSavedTray([...trayCards]);
      setShowSavedIndicator(true);
      setTimeout(() => setShowSavedIndicator(false), 2000);

      finishSave();
    } catch (err: any) {
      console.error("Replace failed:", err);
      setNameError(err?.message || "Replace failed. Please try again.");
    }
  }

  function finishSave() {
    setLessonName("");
    setNameError("");
    setShowSaveModal(false);
    setShowReplaceConfirm(false);
    setIsPublic(true); // reset to default for next creation
    // do not navigate automatically — keep teacher on editor page
  }

  // UI helper to format labels — preserve original case, only replace underscores with spaces
  const formatWord = (word?: string) => (word ?? "").toString().replace(/_/g, " ");

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
        <header className="sticky top-0 z-50 bg-[var(--color-bg-main)]/80 backdrop-blur-md border-b border-black/5">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-4xl md:text-5xl font-extrabold text-blue-700">
              ClassBloom
            </Link>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 pt-12 pb-32">
          <p>Loading lesson tray…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
      {/* Header (matches Flashcards/Dashboard) */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg-main)]/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80">
            ClassBloom
          </Link>

          <div className="absolute left-1/2 transform -translate-x-1/2">
            <nav className="flex items-center text-4xl font-bold text-black">
              Edit Lesson Tray
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => navigateDirect("/games")} className="btn btn-secondary">
              Games
            </button>

            <button onClick={() => navigateDirect("/dashboard")} className="btn btn-secondary">
              Dashboard
            </button>

            <button onClick={() => navigateDirect("/flashcards/classroom")} className="btn btn-secondary">
              Classroom
            </button>
          </div>
        </div>
      </header>

      {/* Sticky lesson tray header */}
      <section className="sticky top-[72px] z-40 bg-white border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-2">
          <div className="flex items-center gap-3 overflow-x-auto scroll-smooth">
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
                <span className="text-xs">{formatWord(card.word)}</span>
                <button
                  onClick={() => removeFromTray(card.id)}
                  className="absolute -top-0 -right-2 bg-white rounded-full border shadow p-0.5 hover:bg-red-50"
                  aria-label={`Remove ${formatWord(card.word)} from tray`}
                >
                  <X size={12} className="text-red-500" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {trayCards.length > 0 && (
              <>
                <button onClick={() => setShowSaveModal(true)} className="btn btn-primary px-4 py-2">
                  Save To Dashboard
                </button>

                <button
                  onClick={() => {
                    try {
                      localStorage.setItem("classbloom-lesson-tray", JSON.stringify(trayCards || []));
                      try {
                        window.dispatchEvent(new Event("lesson-tray-updated"));
                      } catch (err) {
                        /* ignore */
                      }
                    } catch (err) {
                      console.error("Failed to set lesson tray for printing:", err);
                    }
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
        </div>

        {trayCards.length === 0 ? (
          <div className="p-6 bg-white rounded shadow-sm">
            <p className="text-gray-700">No cards in the lesson tray. Add cards from Flashcards to edit them here.</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => navigateDirect("/flashcards")} className="btn btn-primary px-3 py-2">Open Flashcards</button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {trayCards.map((card, idx) => (
              <div key={card.id} className="flex gap-4 p-4 border rounded bg-white">
                <div className="w-24 flex-shrink-0">
                  {card.image_id ? (
                    <div className="w-24 h-16 border rounded flex items-center justify-center text-xs text-gray-600">{card.image_id}</div>
                  ) : card.image ? (
                    <div className="w-24 h-16 border rounded flex items-center justify-center text-xs text-gray-400">image</div>
                  ) : (
                    <div className="w-24 h-16 border rounded flex items-center justify-center text-xs text-gray-300">No image</div>
                  )}

                  <button
                    className="mt-2 text-xs text-[var(--color-text-main)] underline underline-offset-4"
                    onClick={() => {
                      console.log("Change image pressed for", card.id);
                      alert("Change image handler not implemented. (stub)");
                    }}
                  >
                    Change image
                  </button>
                </div>

                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600">Front</label>
                  <input
                    value={card.word ?? card.front ?? ""}
                    onChange={(e) => updateCardField(card.id, "word", e.target.value)}
                    className="w-full p-2 border rounded mt-1"
                    placeholder="Front text"
                  />

                  <label className="block text-xs font-semibold text-gray-600 mt-3">Back</label>
                  <input
                    value={card.image ?? card.back ?? ""}
                    onChange={(e) => updateCardField(card.id, "image", e.target.value)}
                    className="w-full p-2 border rounded mt-1"
                    placeholder="Back text (or image id)"
                  />
                </div>

                <div className="w-32 flex flex-col items-end justify-between">
                  <div className="text-xs text-gray-500">#{idx + 1}</div>

                  <button
                    onClick={() => {
                      const saved = lastSavedTray.find((c) => c.id === card.id);
                      if (saved) {
                        setTrayCards((prev) => prev.map((p) => (p.id === card.id ? saved : p)));
                      }
                    }}
                    className="btn btn-secondary px-3 py-1 text-sm"
                  >
                    Reset
                  </button>
                </div>
              </div>
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