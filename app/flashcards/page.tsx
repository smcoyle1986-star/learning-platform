"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Sparkles, X, ChevronDown } from "lucide-react";
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
  supabase: any,
  query: string
): Promise<Card[]> {
  const searchTerm = query.trim().toLowerCase();
  if (!searchTerm) return [];

  const { data, error } = await supabase
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
  id: string;          // UUID
  word: string;        // lemma
  image: string;       // image url or placeholder
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
const [existingLessonIndex, setExistingLessonIndex] = useState<number | null>(null);


  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTray, setLastSavedTray] = useState<Card[]>([]);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const formatWord = (word: string) =>
    
  word.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
type WordType = "noun" | "verb" | "adjective" | "phonics" | "preposition";

const [activeWordType, setActiveWordType] = useState<
  "noun" | "verb" | "adjective" | "phonics" | "preposition"
>("noun");

const [activeTheme, setActiveTheme] = useState<string | null>(null);

const [openDropdown, setOpenDropdown] = useState<string | null>(null);

useEffect(() => {
  // Auto-search when a theme is selected (no Enter key needed)
  if (activeWordType && activeTheme) {
    handleSearch();
  }
}, [activeWordType, activeTheme]);

useEffect(() => {
  const savedTray = localStorage.getItem("classbloom-lesson-tray");
  if (savedTray) setLessonTray(JSON.parse(savedTray));

  const lastSaved = localStorage.getItem("classbloom-last-saved-tray");
  if (lastSaved) setLastSavedTray(JSON.parse(lastSaved));

}, []);
useEffect(() => {
  localStorage.setItem("classbloom-lesson-tray", JSON.stringify(lessonTray));
}, [lessonTray]);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges =
      lessonTray.length !== lastSavedTray.length ||
      lessonTray.some((card) => !lastSavedTray.find((c) => c.id === card.id));

    setHasUnsavedChanges(hasChanges);
  }, [lessonTray, lastSavedTray]);

  // Save lesson tray
  const saveLesson = () => {
    const savedLessons =
      JSON.parse(localStorage.getItem("classbloom-saved-lessons") || "[]");

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
  };
  const THEMES = {
  noun: [
    "food", "places", "alphabet", "animals_baby", "animals_land", "animals_sea", 
    "body", "classroom", "clothes", "dates", "drink", "family", "fruit", 
    "furniture", "health", "jobs", "nature", "numbers", "people", "rooms", 
    "sports", "subjects", "time", "toys", "transport", "utensils", "vegetables", "weather"
  ],
  verb: ["action", "mental processes", "communication", "sensing"],
  adjective: ["condition", "size", "appearance", "personality", "feelings", "colors"],
  phonics: ["short a", "short e", "short i", "short o", "short u", "long a", "long i", "long o", "long u", "double consonants", "double vowel", "sight words"],
  preposition: ["place", "movement"],
};


const wordTypeButton = (active: boolean) =>
  `px-4 py-2 rounded-full text-sm font-semibold transition-all
   ${
     active
       ? "bg-blue-700 text-white"
       : "bg-green-100 text-green-900 hover:bg-blue-500 hover:text-white"
   }`;


const handleSearch = async () => {
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
        queryBuilder.or(
          `lemma.ilike.%${raw}%,themes.cs.{${raw}}`
        );
      }

      ({ data, error } = await queryBuilder);

      if (error) throw error;

      const cards: Card[] = (data || []).map((noun) => ({
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
      // You’ll later replace this with `searchVerbsByQuery(supabase, query)`
      const { data, error } = await supabase
        .from("verbs")
        .select("id, lemma, image_id, themes")
        .or(
  activeTheme
    ? `themes.cs.{${activeTheme}}`
    : `lemma.ilike.%${raw}%,themes.cs.{${raw}}`
);


      if (error) throw error;

      const cards: Card[] = (data || []).map((verb) => ({
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

      const cards: Card[] = (data || []).map((adj) => ({
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

  const cards: Card[] = ranked.map((ph) => ({
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

      const cards: Card[] = (data || []).map((prep) => ({
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
};


  const toggleLessonTrayCard = (card: Card) => {
  setLessonTray((prev) =>
    prev.some((c) => c.id === card.id)
      ? prev.filter((c) => c.id !== card.id)
      : [...prev, card]
  );
};


  const removeFromLessonTray = (id: string) => {
  setLessonTray((prev) => prev.filter((c) => c.id !== id));
};

const isInLessonTray = (id: string) => {
  return lessonTray.some((c) => c.id === id);
};


  const clearLessonTray = () => {
  setLessonTray([]);
  localStorage.removeItem("classbloom-lesson-tray");
};

const handleSaveLesson = () => {
  if (!lessonName.trim()) {
    setNameError("Lesson name is required");
    return;
  }

  const savedLessons = JSON.parse(
    localStorage.getItem(STORAGE_KEY) || "[]"
  );

  const existingIndex = savedLessons.findIndex(
    (lesson: any) =>
      lesson.name.toLowerCase() === lessonName.trim().toLowerCase()
  );

  if (existingIndex !== -1) {
    setExistingLessonIndex(existingIndex);
    setShowReplaceConfirm(true); // OPEN CONFIRM MODAL
    return;
  }

  // New lesson (safe)
  const newLesson = {
    id: crypto.randomUUID(),
    name: lessonName.trim(),
    cards: lessonTray,
    createdAt: Date.now(),
    lastUsed: Date.now(),
    useCount: 0,
  };

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([newLesson, ...savedLessons])
  );

  finishSave();
};

const replaceLesson = () => {
  const savedLessons = JSON.parse(
    localStorage.getItem(STORAGE_KEY) || "[]"
  );

  if (existingLessonIndex === null) return;

  savedLessons[existingLessonIndex] = {
    ...savedLessons[existingLessonIndex],
    cards: lessonTray,
    lastUsed: Date.now(),
  };

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(savedLessons)
  );

  setShowReplaceConfirm(false);
  finishSave();
};

const finishSave = () => {
  setLessonName("");
  setNameError("");
  setExistingLessonIndex(null);
  setShowSaveModal(false);
};


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
  {/* Flashcards */}
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
      key={card.id }
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

  {/* Row 2: Save / Remove / Unsaved/Saved indicators */}
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
          placeholder="Select a theme from a tab and search"
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
    {(["noun", "verb", "adjective", "phonics", "preposition"] as const).map(
      (type) => {
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
              <div
  className="absolute z-50 mt-2 w-48 rounded-xl bg-white shadow-lg border p-2
             max-h-64 overflow-y-auto overscroll-contain"
>

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
      }
    )}
  </div>

  {/* Empty State */}
  {results.length === 0 && (
    <div className="text-center py-24 text-[var(--color-text-muted)]">
      <p className="text-lg mb-2">No flashcards loaded</p>
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
      <h2 className="text-lg font-semibold mb-4">
        Save To Dashboard
      </h2>

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
      <h3 className="text-lg font-semibold mb-2">
        Lesson already exists
      </h3>

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
