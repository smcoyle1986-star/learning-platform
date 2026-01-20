"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Sparkles, X, ChevronDown, Printer } from "lucide-react";
import { getNouns } from "@/lib/supabase/nouns";
import { Noun } from "@/lib/types";
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

// 🔍 Table-specific search helpers (safe to add)
async function searchNounsByQuery(
  supabaseClient: any,
  query: string
): Promise<Card[]> {
  const searchTerm = query.trim().toLowerCase();
  if (!searchTerm) return [];

  const { data, error } = await supabaseClient
    .from("nouns")
    .select("id, lemma, image_id")
    .or(`lemma.ilike.%${searchTerm}%,themes.cs.{${searchTerm}}`);

  if (error) {
    console.error("Noun search failed:", error);
    return [];
  }

  return (data || []).map((row: NounRow) => ({
    id: row.id,
    word: row.lemma,
    image: row.image_id ?? "/placeholder.png",
    type: "noun",
  }));
}

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
      "alphabet",
      "animals_baby",
      "animals_land",
      "animals_sea",
      "body",
      "classroom",
      "clothes",
      "dates",
      "drink",
      "family",
      "fruit",
      "furniture",
      "health",
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
     Hoisted functions
     --------------------------- */

  async function handleSearch() {
    try {
      const raw = query.trim().toLowerCase();
      const normalized = raw.replace(/\s+/g, "_");

      // 🧠 Allow theme-only or query searches
      if (!raw && !activeTheme) return;

      if (activeWordType === "noun") {
        let data, error;

        const queryBuilder = supabase
          .from("nouns")
          .select("id, lemma, image_id, themes");

        if (activeTheme) {
          // 🎯 Theme search only
          queryBuilder.contains("themes", [activeTheme]);
        } else if (raw) {
          // 🔤 Word search
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

        setResults(cards);
        return;
      }

      // 🔒 Future tables (placeholders)
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

        setResults(cards);
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

        setResults(cards);
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

        setResults(cards);
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

        setResults(cards);
        return;
      }
    } catch (err) {
      console.error("Search failed:", err);
    }
  }

  function toggleLessonTrayCard(card: Card) {
    setLessonTray((prev) =>
      prev.some((c) => c.id === card.id)
        ? prev.filter((c) => c.id !== card.id)
        : [...prev, card]
    );
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

  /* ---------------------------
     Supabase save/replace handlers (with localStorage update for Dashboard)
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

      // --- NEW: update localStorage so Dashboard sees this immediately ---
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
      // ---------------------------------------------------------------

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
      // Make sure we have an existing lesson_set id to replace
      if (!existingLessonId) {
        setShowReplaceConfirm(false);
        return;
      }

      // Ensure user is authenticated (defensive)
      const userResult = await supabase.auth.getUser();
      const user = (userResult as any)?.data?.user ?? null;
      const userErr = (userResult as any)?.error ?? null;
      if (userErr || !user) {
        setNameError("You must be signed in to replace lessons");
        return;
      }

      // Delete existing cards for that lesson_set
      const { error: delErr } = await supabase
        .from("cards")
        .delete()
        .eq("lesson_set_id", existingLessonId);

      if (delErr) throw delErr;

      // Insert new cards for the lesson_set
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

      // Update lesson_set metadata (name + last_used)
      const { error: updateErr } = await supabase
        .from("lesson_sets")
        .update({
          name: lessonName.trim(),
          last_used: new Date().toISOString(),
        })
        .eq("id", existingLessonId);

      if (updateErr) throw updateErr;

      // --- NEW: update localStorage so Dashboard reflects replacement ---
      try {
        const raw = localStorage.getItem(STORAGE_KEY) || "[]";
        const parsed = JSON.parse(raw);
        const savedLessons = Array.isArray(parsed) ? parsed : [];

        // explicit type allows createdAt to be string or undefined
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

        // Find by id first
        const idx = savedLessons.findIndex(
          (s: any) => String(s.id) === String(existingLessonId)
        );
        if (idx !== -1) {
          // Preserve existing createdAt if present
          newEntry.createdAt =
            savedLessons[idx].createdAt ?? new Date().toISOString();
          savedLessons[idx] = { ...savedLessons[idx], ...newEntry };
        } else {
          // Fallback: match by name (case-insensitive)
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
            // Not found locally — prepend new
            newEntry.createdAt = new Date().toISOString();
            savedLessons.unshift(newEntry);
          }
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLessons));
      } catch (e) {
        console.warn("Failed to update local saved-lessons cache on replace:", e);
      }
      // ---------------------------------------------------------------

      // Close confirm UI and modal
      setShowReplaceConfirm(false);
      setExistingLessonId(null);

      // UI updates
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
     Render
     --------------------------- */

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg-main)]/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Brand */}
          <Link
            href="/"
            className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80"
          >
            ClassBloom
          </Link>

          {/* Center: Flashcards (centered and black) */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <nav className="flex items-center text-4xl font-bold text-black">
              Flashcards
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Games (new) */}
<button
  onClick={() => (window.location.href = "/games")}
  className="
    px-4 py-2 rounded-lg
    bg-green-200 text-green-900
    text-sm
    hover:bg-green-300
    hover:shadow-md
    transition
  "
>
  Games
</button>
            {/* Dashboard */}
            <button
              onClick={() => (window.location.href = "/dashboard")}
              className="
      px-4 py-2 rounded-lg
      bg-green-200 text-green-900
      text-sm
      hover:bg-green-300
      hover:shadow-md
      transition
    "
            >
              Dashboard
            </button>

            {/* Classroom */}
            <button
              onClick={() => (window.location.href = "/flashcards/classroom")}
              className="px-4 py-2 rounded-lg
      bg-green-400 text-green-900
      text-sm
      hover:bg-green-600
      hover:shadow-md
      transition"
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
      {/* If the lesson tray is empty */}
      {lessonTray.length === 0 && (
        <div className="px-4 py-2 rounded-lg border border-dashed border-black/20 text-sm text-[var(--color-text-muted)] whitespace-nowrap">
          Click flashcards to add
        </div>
      )}

      {/* Render each card in the lesson tray */}
      {lessonTray.map((card) => (
        <div
          key={card.id}
          className="relative px-3 py-2 rounded-lg border bg-[var(--color-bg-soft)] text-sm whitespace-nowrap"
        >
          <span className="text-xs">{formatWord(card.word)}</span>
          <button
            onClick={() => removeFromLessonTray(card.id)}
            className="absolute -top-0 -right-2 bg-white rounded-full border shadow p-0.5 hover:bg-red-50"
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

          {/* Print button (new) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              try {
                // ensure the tray is persisted (your existing effect also keeps this in sync)
                localStorage.setItem("classbloom-lesson-tray", JSON.stringify(lessonTray || []));
                try {
                  window.dispatchEvent(new Event("lesson-tray-updated"));
                } catch (err) {
                  /* ignore */
                }
              } catch (err) {
                console.error("Failed to set lesson tray for printing:", err);
              }
              // navigate to printables; it will read the same localStorage key
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
            {/* Search input */}
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
              <div key={type} className="relative">
                {/* Main type button */}
                <button
                  className={wordTypeButton(isSelectedType)}
                  onClick={() => {
                    setOpenDropdown(openDropdown === type ? null : type);
                    setActiveWordType(type);
                    setActiveTheme(null);
                  }}
                >
                  {activeWordType === type && activeTheme ? activeTheme : type}
                </button>

                {/* Theme dropdown */}
                {openDropdown === type && (
                  <div className="absolute z-50 mt-2 w-48 rounded-xl bg-white shadow-lg border p-2 max-h-64 overflow-y-auto overscroll-contain">
                    {THEMES[type].map((theme) => (
                      <button
                        key={theme}
                        onClick={() => {
                          // Use updater function to ensure state is updated before search
                          setActiveTheme(theme);
                          setActiveWordType(type);

                          setOpenDropdown(null);

                          // Schedule search on next tick
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
            <p className="text-lg mb-2">Selecte a tab to load flashcards</p>
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
              {/* Modal title */}
              <h2 className="text-lg font-semibold mb-4">Save To Dashboard</h2>

              {/* Lesson name input */}
              <input
                type="text"
                value={lessonName}
                onChange={(e) => setLessonName(e.target.value)}
                placeholder="Enter lesson name"
                className="
          w-full mb-5 px-3 py-2
          rounded-lg
          border border-black/10
          focus:outline-none
          focus:ring-2 focus:ring-[var(--color-primary)]
        "
              />

              {/* Buttons — YOUR CODE (unchanged) */}
              <div className="flex justify-end gap-3">
                {/* Cancel */}
                <button
                  onClick={() => {
                    setLessonName("");
                    setShowSaveModal(false);
                  }}
                  className="
            px-4 py-2
            rounded-lg
            border border-black/10
            bg-[var(--color-bg-soft)]
            text-sm
            hover:bg-white
            transition
          "
                >
                  Cancel
                </button>

                {/* Save */}
                <button
                  onClick={handleSaveLesson}
                  className="
            px-4 py-2
            rounded-lg
            bg-[var(--color-primary)]
            text-white
            text-sm
            hover:opacity-90
            transition
          "
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
                  className="
            px-4 py-2
            rounded-lg
            border border-black/10
            bg-[var(--color-bg-soft)]
            text-sm
            hover:bg-white
            transition
          "
                >
                  Change name
                </button>

                <button
                  onClick={replaceLesson}
                  className="
            px-4 py-2
            rounded-lg
            bg-[var(--color-primary)]
            text-white
            text-sm
            hover:opacity-90
            transition
          "

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
