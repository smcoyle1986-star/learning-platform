"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Search, X, Printer } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

function rankResults<T extends { lemma: string; theme?: string }>(
  data: T[],
  query: string
) {
  return data.sort((a, b) => {
    const q = query.toLowerCase();

    const score = (item: T) => {
      const lemma = item.lemma.toLowerCase();
      const theme = item.theme?.toLowerCase() ?? "";

      if (lemma === q) return 0;
      if (lemma.startsWith(q)) return 1;
      if (lemma.includes(q)) return 2;
      if (theme.includes(q)) return 3;
      return 4;
    };

    return score(a) - score(b);
  });
}

type NounRow = {
  id: string;
  lemma: string;
  image_id: string | null;
};

export type Card = {
  id: string; // UUID or identifier
  word: string;
  image: string;
  type: "noun" | "verb" | "adjective" | "phonics" | "preposition";
};

export default function FlashcardsPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Card[]>([]);
  const [lessonTray, setLessonTray] = useState<Card[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [lessonName, setLessonName] = useState("");

  const STORAGE_KEY = "classbloom-saved-lessons";
  const [nameError, setNameError] = useState("");
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [existingLessonIndex, setExistingLessonIndex] = useState<string | null>(
    null
  );
  const [existingLessonId, setExistingLessonId] = useState<string | null>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTray, setLastSavedTray] = useState<Card[]>([]);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

  const formatWord = (word: string) =>
    word.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  type WordType = "noun" | "verb" | "adjective" | "phonics" | "preposition";

  const [activeWordType, setActiveWordType] = useState<WordType>("noun");

  const [activeTheme, setActiveTheme] = useState<string | null>(null);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // --- popularity counts state (persisted in localStorage) ---
  const POP_KEY = "classbloom-card-select-counts";
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(POP_KEY);
      if (raw) setCardCounts(JSON.parse(raw));
    } catch (e) {
      console.warn("Failed to load card counts:", e);
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(POP_KEY, JSON.stringify(cardCounts));
    } catch (e) {
      /* ignore */
    }
  }, [cardCounts]);

  // Drag-and-drop state for lesson tray reordering & refs for FLIP animation
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const trayItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevRectsRef = useRef<Record<string, DOMRect>>({});

  useEffect(() => {
    // Auto-search when a theme is selected (no Enter key needed)
    if (activeWordType && activeTheme) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWordType, activeTheme]);

  useEffect(() => {
    const savedTray = localStorage.getItem("classbloom-lesson-tray");
    if (savedTray) setLessonTray(JSON.parse(savedTray));

    const lastSaved = localStorage.getItem("classbloom-last-saved-tray");
    if (lastSaved) setLastSavedTray(JSON.parse(lastSaved));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("classbloom-lesson-tray", JSON.stringify(lessonTray));
      // notify other pages that the tray updated
      try {
        window.dispatchEvent(new Event("lesson-tray-updated"));
      } catch (e) {
        /* ignore in restricted environments */
      }
    } catch (e) {
      console.warn("Failed to persist lesson tray:", e);
    }
  }, [lessonTray]);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges =
      lessonTray.length !== lastSavedTray.length ||
      lessonTray.some((card) => !lastSavedTray.find((c) => c.id === card.id));

    setHasUnsavedChanges(hasChanges);
  }, [lessonTray, lastSavedTray]);

  // Save lesson tray (local fallback - unchanged)
  function saveLesson() {
    const savedLessons = JSON.parse(
      localStorage.getItem("classbloom-saved-lessons") || "[]"
    );

    const newLesson = {
      id: Date.now(),
      name: `Lesson ${savedLessons.length + 1}`,
      cards: lessonTray,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "classbloom-saved-lessons",
      JSON.stringify([...savedLessons, newLesson])
    );

    localStorage.setItem(
      "classbloom-last-saved-tray",
      JSON.stringify(lessonTray)
    );

    setLastSavedTray([...lessonTray]);
    setShowSavedIndicator(true);
    setTimeout(() => setShowSavedIndicator(false), 2000);
  }

  const THEMES = {
    noun: [
      "food",
      "places",
      "animals baby",
      "animals land",
      "animals sea",
      "body",
      "classroom",
      "clothes",
      "dates",
      "drink",
      "family",
      "fruit",
      "furniture",
      "health",
      "holidays",
      "jobs",
      "nature",
      "numbers",
      "people",
      "rooms",
      "sports",
      "subjects",
      "time",
      "toys",
      "transport",
      "utensils",
      "vegetables",
      "weather",
    ],
    verb: ["action", "mental processes", "communication", "sensing"],
    adjective: [
      "condition",
      "size",
      "appearance",
      "personality",
      "feelings",
      "colors",
    ],
    phonics: [
      "alphabet",
      "short a",
      "short e",
      "short i",
      "short o",
      "short u",
      "long a",
      "long i",
      "long o",
      "long u",
      "double consonants",
      "double vowel",
      "sight words",
    ],
    preposition: ["place", "movement"],
  };

  const wordTypeButton = (active: boolean) =>
    `px-4 py-2 rounded-full text-sm font-semibold transition-all
   ${
     active
       ? "bg-blue-700 text-white"
       : "bg-green-100 text-green-900 hover:bg-blue-500 hover:text-white"
   }`;

  /* ---------------------------
     Utility helpers
     --------------------------- */

  // Score for query tie-breaker (stability + ranking): lower is better
  function scoreForCard(card: Card, rawQuery: string) {
    const q = (rawQuery || "").toLowerCase();
    const lemma = (card.word || "").toLowerCase();
    if (!q) return 999;
    if (lemma === q) return 0;
    if (lemma.startsWith(q)) return 1;
    if (lemma.includes(q)) return 2;
    return 3;
  }

  // Stable popularity sort that uses scoreForCard as tie-breaker and finally the card.word
  function sortByPopularity(cards: Card[], rawQuery = "") {
    return [...cards].sort((a, b) => {
      const ca = cardCounts[a.id] ?? 0;
      const cb = cardCounts[b.id] ?? 0;
      if (cb !== ca) return cb - ca; // higher popularity first

      // tie-break with ranking by query relevance
      const sa = scoreForCard(a, rawQuery);
      const sb = scoreForCard(b, rawQuery);
      if (sa !== sb) return sa - sb;

      // final deterministic tie-breaker
      return a.word.localeCompare(b.word);
    });
  }

  /* ---------------------------
     Search helpers
     --------------------------- */

  async function handleSearch() {
    try {
      const raw = query.trim().toLowerCase();
      const normalized = raw.replace(/\s+/g, "_");

      // Allow theme-only or query searches
      if (!raw && !activeTheme) return;

      if (activeWordType === "noun") {
        let data, error;

        const queryBuilder = supabase
          .from("nouns")
          .select("id, lemma, image_id, themes");

        if (activeTheme) {
          // Theme search only
          queryBuilder.contains("themes", [activeTheme]);
        } else if (raw) {
          // Word search
          queryBuilder.or(`lemma.ilike.%${raw}%,themes.cs.{${raw}}`);
        }

        ({ data, error } = await queryBuilder);

        if (error) throw error;

        const cards: Card[] = (data || []).map((noun: any) => ({
          id: noun.id,
          word: noun.lemma,
          image: noun.image_id ?? "/placeholder.png",
          type: "noun",
        }));

        setResults(sortByPopularity(cards, raw));
        return;
      }

      if (activeWordType === "verb") {
        const { data, error } = await supabase
          .from("verbs")
          .select("id, lemma, image_id, themes")
          .or(
            activeTheme
              ? `themes.cs.{${activeTheme}}`
              : `lemma.ilike.%${raw}%,themes.cs.{${raw}}`
          );

        if (error) throw error;

        const cards: Card[] = (data || []).map((verb: any) => ({
          id: verb.id,
          word: verb.lemma,
          image: verb.image_id ?? "/placeholder.png",
          type: "verb",
        }));

        setResults(sortByPopularity(cards, raw));
        return;
      }

      if (activeWordType === "adjective") {
        const { data, error } = await supabase
          .from("adjectives")
          .select("id, lemma, image_id, themes")
          .or(
            activeTheme
              ? `themes.cs.{${activeTheme}}`
              : `lemma.ilike.%${raw}%,themes.cs.{${raw}}`
          );

        if (error) throw error;

        const cards: Card[] = (data || []).map((adj: any) => ({
          id: adj.id,
          word: adj.lemma,
          image: adj.image_id ?? "/placeholder.png",
          type: "adjective",
        }));

        setResults(sortByPopularity(cards, raw));
        return;
      }

      if (activeWordType === "phonics") {
        const { data, error } = await supabase
          .from("phonics")
          .select("id, lemma, image_id, theme")
          .or(
            activeTheme
              ? `theme.ilike.%${activeTheme}%`
              : `lemma.ilike.%${raw}%,theme.ilike.%${raw}%`
          );

        if (error) throw error;

        const ranked = rankResults(data || [], raw);

        const cards: Card[] = ranked.map((ph: any) => ({
          id: ph.id,
          word: ph.lemma,
          image: ph.image_id ?? "/placeholder.png",
          type: "phonics",
        }));

        setResults(sortByPopularity(cards, raw));
        return;
      }

      if (activeWordType === "preposition") {
        const { data, error } = await supabase
          .from("prepositions")
          .select("id, lemma, image_id, themes")
          .or(
            activeTheme
              ? `themes.cs.{${activeTheme}}`
              : `lemma.ilike.%${raw}%,themes.cs.{${raw}}`
          );

        if (error) throw error;

        const cards: Card[] = (data || []).map((prep: any) => ({
          id: prep.id,
          word: prep.lemma,
          image: prep.image_id ?? "/placeholder.png",
          type: "preposition",
        }));

        setResults(sortByPopularity(cards, raw));
        return;
      }
    } catch (err) {
      console.error("Search failed:", err);
    }
  }

  /* ---------------------------
     Lesson tray manipulation (toggling + drag reorder + keyboard + animated FLIP)
     --------------------------- */

  function incrementCardCount(cardId: string) {
    setCardCounts((prevCounts) => {
      const next = { ...(prevCounts || {}) };
      next[cardId] = (next[cardId] ?? 0) + 1;
      return next;
    });
  }

  function toggleLessonTrayCard(card: Card) {
    setLessonTray((prev) => {
      const exists = prev.some((c) => c.id === card.id);
      if (exists) {
        return prev.filter((c) => c.id !== card.id);
      } else {
        // increment popularity count for this card when teacher picks it
        incrementCardCount(card.id);
        return [...prev, card];
      }
    });
  }

  function removeFromLessonTray(id: string) {
    setLessonTray((prev) => prev.filter((c) => c.id !== id));
  }

  function clearLessonTray() {
    setLessonTray([]);
    localStorage.removeItem("classbloom-lesson-tray");
    try {
      window.dispatchEvent(new Event("lesson-tray-updated"));
    } catch (e) {
      /* ignore */
    }
  }

  // FLIP helpers for smooth reorder animation
  function captureRects() {
    const map: Record<string, DOMRect> = {};
    lessonTray.forEach((card) => {
      const el = trayItemRefs.current[card.id];
      if (el) map[card.id] = el.getBoundingClientRect();
    });
    return map;
  }

  function animateFlip(oldRects: Record<string, DOMRect>, newRects: Record<string, DOMRect>) {
    Object.keys(newRects).forEach((id) => {
      const el = trayItemRefs.current[id];
      const oldRect = oldRects[id];
      const newRect = newRects[id];
      if (!el || !oldRect || !newRect) return;

      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top - newRect.top;
      if (dx === 0 && dy === 0) return;

      // apply transform to invert movement, then transition to none
      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      // force reflow
      void el.offsetWidth;
      el.style.transition = "transform 260ms cubic-bezier(.2,.9,.3,1)";
      el.style.transform = "";
      const cleanup = () => {
        el.style.transition = "";
        el.style.transform = "";
        el.removeEventListener("transitionend", cleanup);
      };
      el.addEventListener("transitionend", cleanup);
      // fallback cleanup
      setTimeout(cleanup, 350);
    });
  }

  function reorderWithAnimation(from: number, to: number) {
    if (from === to) return;
    // capture old rects
    const oldRects = captureRects();

    // compute new order synchronously
    setLessonTray((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });

    // animate on next frames after DOM updates
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const newRects: Record<string, DOMRect> = {};
        // gather current DOM rects from refs (they are updated after setLessonTray)
        Object.keys(trayItemRefs.current).forEach((id) => {
          const el = trayItemRefs.current[id];
          if (el) newRects[id] = el.getBoundingClientRect();
        });
        animateFlip(oldRects, newRects);
      });
    });
  }

  // Drag handlers
  function onDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index);
    // store rects in case we want them later
    prevRectsRef.current = captureRects();
    try {
      e.dataTransfer.setData("text/plain", String(index));
      // show copy cursor
      e.dataTransfer.effectAllowed = "move";
    } catch {}
  }

  function onDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function onDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    const from =
      draggedIndex ??
      parseInt(e.dataTransfer.getData("text/plain") || "-1", 10);
    const to = index;
    if (from < 0 || to < 0 || from === to) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Use animated reorder
    reorderWithAnimation(from, to);

    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function onDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  // Keyboard accessibility: focus + ArrowLeft/ArrowRight to reorder
  function onTrayItemKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      if (index > 0) {
        reorderWithAnimation(index, index - 1);
        // focus the moved element after slight delay
        setTimeout(() => {
          const movedId = lessonTray[index - 1]?.id;
          trayItemRefs.current[movedId ?? ""]?.focus();
        }, 260);
      }
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      if (index < lessonTray.length - 1) {
        reorderWithAnimation(index, index + 1);
        setTimeout(() => {
          const movedId = lessonTray[index + 1]?.id;
          trayItemRefs.current[movedId ?? ""]?.focus();
        }, 260);
      }
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      const id = lessonTray[index]?.id;
      if (id) removeFromLessonTray(id);
    }
  }

  /* ---------------------------
     Supabase save/replace handlers (unchanged except local cache updates already present)
     --------------------------- */

  async function handleSaveLesson() {
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

      // Check for existing lesson_set (case-insensitive)
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

      // Insert new lesson_set
      const { data: insertedLesson, error: insertErr } = await supabase
        .from("lesson_sets")
        .insert({
          name: trimmedName,
          user_id: user.id,
          last_used: new Date().toISOString(),
        })
        .select("id, created_at")
        .single();

      if (insertErr) throw insertErr;

      const lessonSetId = (insertedLesson as any).id;

      // Insert cards
      if (lessonTray.length > 0) {
        const cardsToInsert = lessonTray.map((card, idx) => ({
          lesson_set_id: lessonSetId,
          front: card.word,
          back: card.image ?? null,
          position: idx,
        }));

        const { error: cardsErr } = await supabase.from("cards").insert(cardsToInsert);
        if (cardsErr) throw cardsErr;
      }

      // update localStorage so Dashboard sees this immediately
      try {
        const raw = localStorage.getItem(STORAGE_KEY) || "[]";
        const parsed = JSON.parse(raw);
        const savedLessons = Array.isArray(parsed) ? parsed : [];
        const newEntry = {
          id: String(lessonSetId),
          name: trimmedName,
          cards: lessonTray,
          createdAt:
            (insertedLesson as any).created_at ?? new Date().toISOString(),
          lastUsed: Date.now(),
          useCount: 0,
        };
        const updatedLocal = [newEntry, ...savedLessons];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLocal));
      } catch (e) {
        console.warn("Failed to update local saved-lessons cache:", e);
      }

      // UI updates
      setLastSavedTray([...lessonTray]);
      setShowSavedIndicator(true);
      setTimeout(() => setShowSavedIndicator(false), 2000);

      finishSave();
    } catch (err: any) {
      console.error("Save failed:", err);
      setNameError(err?.message || "Save failed. Please try again.");
    }
  }

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

      const { error: delErr } = await supabase
        .from("cards")
        .delete()
        .eq("lesson_set_id", existingLessonId);

      if (delErr) throw delErr;

      if (lessonTray.length > 0) {
        const cardsToInsert = lessonTray.map((card, idx) => ({
          lesson_set_id: existingLessonId,
          front: card.word,
          back: card.image ?? null,
          position: idx,
        }));

        const { error: insertCardsErr } = await supabase.from("cards").insert(cardsToInsert);
        if (insertCardsErr) throw insertCardsErr;
      }

      const { error: updateErr } = await supabase
        .from("lesson_sets")
        .update({
          name: lessonName.trim(),
          last_used: new Date().toISOString(),
        })
        .eq("id", existingLessonId);

      if (updateErr) throw updateErr;

      // update local cache
      try {
        const raw = localStorage.getItem(STORAGE_KEY) || "[]";
        const parsed = JSON.parse(raw);
        const savedLessons = Array.isArray(parsed) ? parsed : [];

        const newEntry: {
          id: string;
          name: string;
          cards: Card[];
          createdAt?: string;
          lastUsed: number;
          useCount: number;
        } = {
          id: existingLessonId,
          name: lessonName.trim(),
          cards: lessonTray,
          createdAt: undefined,
          lastUsed: Date.now(),
          useCount: 0,
        };

        const idx = savedLessons.findIndex(
          (s: any) => String(s.id) === String(existingLessonId)
        );
        if (idx !== -1) {
          newEntry.createdAt =
            savedLessons[idx].createdAt ?? new Date().toISOString();
          savedLessons[idx] = { ...savedLessons[idx], ...newEntry };
        } else {
          const nameIdx = savedLessons.findIndex(
            (s: any) =>
              String(s.name).toLowerCase() ===
              String(lessonName.trim()).toLowerCase()
          );
          if (nameIdx !== -1) {
            newEntry.createdAt =
              savedLessons[nameIdx].createdAt ?? new Date().toISOString();
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

      setLastSavedTray([...lessonTray]);
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
    setExistingLessonIndex(null);
    setExistingLessonId(null);
    setShowSaveModal(false);
  }

  /* ---------------------------
     Close dropdown when clicking outside
     --------------------------- */
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!openDropdown) return;
      const target = e.target as HTMLElement | null;
      if (!target) {
        setOpenDropdown(null);
        return;
      }

      const inDropdown = target.closest(`[data-dropdown-type="${openDropdown}"]`);
      const inBtn = target.closest(`[data-dropdown-btn="${openDropdown}"]`);

      if (!inDropdown && !inBtn) {
        setOpenDropdown(null);
      }
    }

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [openDropdown]);

  /* ---------------------------
     Render
     --------------------------- */

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg-main)]/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80">
            ClassBloom
          </Link>

          <div className="absolute left-1/2 transform -translate-x-1/2">
            <nav className="flex items-center text-4xl font-bold text-black">
              Flashcards
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => (window.location.href = "/games")}
              className="px-4 py-2 rounded-lg bg-green-200 text-green-900 text-sm hover:bg-green-300 hover:shadow-md transition"
            >
              Games
            </button>

            <button
              onClick={() => (window.location.href = "/dashboard")}
              className="px-4 py-2 rounded-lg bg-green-200 text-green-900 text-sm hover:bg-green-300 hover:shadow-md transition"
            >
              Dashboard
            </button>

            <button
              onClick={() => (window.location.href = "/flashcards/classroom")}
              className="px-4 py-2 rounded-lg bg-green-400 text-green-900 text-sm hover:bg-green-600 hover:shadow-md transition"
            >
              Classroom
            </button>
          </div>
        </div>
      </header>

      {/* Lesson Tray (sticky) */}
      <section className="sticky top-[72px] z-40 bg-white border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-2">
          {/* Row 1: Lesson Tray cards (scrollable) */}
          <div className="flex items-center gap-3 overflow-x-auto scroll-smooth">
            {lessonTray.length === 0 && (
              <div className="px-4 py-2 rounded-lg border border-dashed border-black/20 text-sm text-[var(--color-text-muted)] whitespace-nowrap">
                Click flashcards to add
              </div>
            )}

            {lessonTray.map((card, idx) => (
              <div
                key={card.id}
                ref={(el) => { trayItemRefs.current[card.id] = el; }}
                draggable
                onDragStart={(e) => onDragStart(e, idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDrop={(e) => onDrop(e, idx)}
                onDragEnd={onDragEnd}
                tabIndex={0}
                onKeyDown={(e) => onTrayItemKeyDown(e, idx)}
                aria-label={`Tray card ${formatWord(card.word)} — position ${idx + 1}`}
                role="button"
                className={`relative px-3 py-2 rounded-lg border bg-[var(--color-bg-soft)] text-sm whitespace-nowrap select-none transition transform will-change-transform
                  ${draggedIndex === idx ? "opacity-60 scale-95 cursor-grabbing" : "cursor-grab"}
                  ${dragOverIndex === idx && draggedIndex !== null ? "ring-2 ring-dashed ring-[var(--color-primary)]" : ""}`}
                title={`${formatWord(card.word)} — use Left/Right to move, Delete to remove`}
              >
                <span className="text-xs">{formatWord(card.word)}</span>
                <button
                  onClick={() => removeFromLessonTray(card.id)}
                  className="absolute -top-0 -right-2 bg-white rounded-full border shadow p-0.5 hover:bg-red-50"
                  aria-label={`Remove ${formatWord(card.word)} from tray`}
                >
                  <X size={12} className="text-red-500" />
                </button>
              </div>
            ))}
          </div>

          {/* Row 2: Save / Print / Remove / Unsaved/Saved indicators */}
          <div className="flex items-center gap-3 flex-wrap">
            {lessonTray.length > 0 && (
              <>
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90 transition-all"
                >
                  Save To Dashboard
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    try {
                      localStorage.setItem("classbloom-lesson-tray", JSON.stringify(lessonTray || []));
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
                  className="px-4 py-2 rounded-lg bg-white text-blue-700 border border-black/10 text-sm hover:bg-blue-50 transition flex items-center gap-2"
                  title="Print lesson"
                >
                  <Printer size={16} />
                  Print
                </button>

                <button
                  onClick={clearLessonTray}
                  className="px-3 py-2 rounded-lg text-sm text-red-600 border border-red-200 hover:bg-red-50"
                >
                  Remove all
                </button>
              </>
            )}

            {showSavedIndicator && (
              <span className="text-sm text-green-600 font-medium animate-pulse">
                Saved!
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 pt-10 pb-32">
        {/* Search + AI */}
        <div className="mb-8">
          <div className="flex items-center gap-3 max-w-4xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    await handleSearch();
                  }
                }}
                placeholder="Select a tab before searching"
                className="w-full pl-12 pr-4 py-2 rounded-lg border border-black/10 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <button
              onClick={handleSearch}
              className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90 whitespace-nowrap"
            >
              Search
            </button>

            <button
              type="button"
              onClick={() => {
                setResults([]);
                setQuery("");
              }}
              className="px-4 py-2 rounded-lg bg-[var(--color-bg-soft)] border border-black/10 text-sm flex items-center gap-2 hover:bg-white whitespace-nowrap"
            >
              <X size={16} />
              Clear Grid
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mt-4 relative">
          {(
            ["noun", "verb", "adjective", "phonics", "preposition"] as const
          ).map((type) => {
            const isSelectedType = activeWordType === type;

            return (
              <div key={type} className="relative" data-dropdown-type={type}>
                {/* Main type button */}
                <button
                  className={wordTypeButton(isSelectedType)}
                  onClick={() => {
                    setOpenDropdown(openDropdown === type ? null : type);
                    setActiveWordType(type);
                    setActiveTheme(null);
                  }}
                  data-dropdown-btn={type}
                >
                  {activeWordType === type && activeTheme ? activeTheme : type}
                </button>

                {/* Theme dropdown */}
                {openDropdown === type && (
                  <div className="absolute z-50 mt-2 w-48 rounded-xl bg-white shadow-lg border p-2 max-h-64 overflow-y-auto overscroll-contain" data-dropdown-type={type}>
                    {THEMES[type].map((theme) => (
                      <button
                        key={theme}
                        onClick={() => {
                          setActiveTheme(theme);
                          setActiveWordType(type);
                          setOpenDropdown(null);
                          setTimeout(() => {
                            handleSearch();
                          }, 0);
                        }}
                        className={`block w-full text-left px-3 py-2 rounded-lg text-sm
                                ${activeTheme === theme ? "bg-blue-600 text-white" : "hover:bg-blue-100"}`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {results.length === 0 && (
          <div className="text-center py-24 text-[var(--color-text-muted)]">
            <p className="text-lg mb-2">Select a tab to load flashcards</p>
          </div>
        )}

        {/* Results grid */}
        {results.length > 0 && (
          <section className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {results.map((card) => (
              <div
                key={card.id}
                onClick={() => toggleLessonTrayCard(card)}
                className={`group cursor-pointer rounded-xl bg-white p-4 shadow-sm hover:shadow-lg transition ${
                  lessonTray.find((c) => c.id === card.id) ? "border-2 border-blue-700" : ""
                }`}
              >
                <div className="aspect-square rounded-lg bg-gray-100 mb-3 flex items-center justify-center text-gray-400">
                  image
                </div>
                <h3 className="font-semibold">{card.word.replaceAll("_", " ")}</h3>

                <p className="text-xs text-[var(--color-text-muted)] capitalize">
                  {card.type}
                </p>
                {lessonTray.find((c) => c.id === card.id) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromLessonTray(card.id);
                    }}
                    className="absolute -top-2 -right-2 bg-white rounded-full border shadow p-0.5 hover:bg-red-50"
                  >
                    <X size={12} className="text-red-500" />
                  </button>
                )}
              </div>
            ))}
          </section>
        )}

        {showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl w-[90%] max-w-md p-6">
              <h2 className="text-lg font-semibold mb-4">Save To Dashboard</h2>

              <input
                type="text"
                value={lessonName}
                onChange={(e) => setLessonName(e.target.value)}
                placeholder="Enter lesson name"
                className="w-full mb-5 px-3 py-2 rounded-lg border border-black/10 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />

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
      </main>
    </div>
  );
}