"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Sparkles, X } from "lucide-react";
import { getNouns } from "@/lib/supabase/nouns";
import { Noun } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";


type Card = {
  id: string;       // ✅ UUID
  word: string;
  image: string;
  type: "noun";
};

export default function FlashcardsPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Card[]>([]);
  const [lessonTray, setLessonTray] = useState<Card[]>([]);
  const [selectedKindergarten, setSelectedKindergarten] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTray, setLastSavedTray] = useState<Card[]>([]);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

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

  const grades = ["1", "2", "3", "4", "5", "6"];
  const levels = ["1 - Beginner", "2 - Intermediate", "3 - Advanced"];

const handleSearch = async () => {
  try {
    const searchTerm = query.trim().toLowerCase();
    if (!searchTerm) return;

    const { data, error } = await supabase
      .from("nouns")
      .select("*")
      .or(
        `lemma.ilike.%${searchTerm}%,themes.cs.{${searchTerm}}`
      );

    if (error) throw error;

    const cards: Card[] = (data || []).map((noun) => ({
      id: noun.id,
      word: noun.lemma,
      image: "/placeholder.png",
      type: "noun",
    }));

    setResults(cards);
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


  // Toggle functions for filters
  const toggleKindergarten = () => {
    setSelectedKindergarten((prev) => !prev);
    if (selectedGrade) setSelectedGrade(null);
  };

  const toggleGrade = (grade: string) => {
    if (selectedGrade === grade) {
      setSelectedGrade(null);
    } else {
      setSelectedGrade(grade);
      setSelectedKindergarten(false);
    }
  };

  const toggleLevel = (level: string) => {
    if (selectedLevel === level) {
      setSelectedLevel(null);
    } else {
      setSelectedLevel(level);
    }
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

          {/* Classroom mode */}
          <div className="flex-shrink-0">
            <button
  onClick={() => {
    localStorage.setItem("classbloom-lesson-tray", JSON.stringify(lessonTray));
    window.location.href = "/flashcards/classroom";
  }}
  className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90"
>
  Classroom Mode
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
      {card.word}
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
        onClick={() => {
          const savedLessons =
            JSON.parse(localStorage.getItem("classbloom-saved-lessons") || "[]");
          setLastSavedTray([...lessonTray]); // update last saved tray
          setShowSavedIndicator(true);        // show the "Saved!" indicator

          // hide the "Saved!" message after 3 seconds
          setTimeout(() => setShowSavedIndicator(false), 2000);

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
        }}
        className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90 transition-all"
      >
        Save Lesson
      </button>

      <button
        onClick={clearLessonTray}
        className="px-3 py-2 rounded-lg text-sm text-red-600 border border-red-200 hover:bg-red-50"
      >
        Remove all
      </button>
    </>
  )}

  {/* Unsaved / Saved indicators */}
  {hasUnsavedChanges && (
    <span className="text-sm text-orange-600 font-medium">
      Unsaved changes
    </span>
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
        onKeyDown={(e) => {
  if (e.key === "Enter") {
    handleSearch();
  }
}}

        placeholder="Search vocabulary (e.g. food, verbs, animals)"
        className="w-full pl-12 pr-4 py-2 rounded-lg border border-black/10 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
      />
    </div>

    {/* Search button */}
    <button
      onClick={handleSearch}
      className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90 whitespace-nowrap"
    >
      Search
    </button>

    {/* AI Generate button */}
    <button
      type="button"
      className="px-4 py-2 rounded-lg bg-[var(--color-bg-soft)] border border-black/10 text-sm flex items-center gap-2 hover:bg-white whitespace-nowrap"
    >
      <Sparkles size={16} />
      AI Generate
    </button>
  </div>
</div>



        {/* Filters */}
        <div className="flex gap-3 mb-10 flex-wrap">
          {/* Kindergarten Button */}
          <button
            onClick={toggleKindergarten}
            className={`px-4 py-2 rounded-full text-sm border border-black/10 ${
              selectedKindergarten ? "text-blue-700" : "bg-white"
            } hover:bg-[var(--color-bg-soft)]`}
          >
            Kindergarten
          </button>

          {/* Elementary Grade Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowGradeDropdown(!showGradeDropdown);
                if (!showGradeDropdown) setSelectedKindergarten(false);
              }}
              className={`px-4 py-2 rounded-full text-sm border border-black/10 ${
                selectedGrade ? "text-blue-700" : "bg-white"
              } hover:bg-[var(--color-bg-soft)]`}
            >
              {selectedGrade ? `Grade ${selectedGrade}` : "Elementary Grade"} ▾
            </button>
            {showGradeDropdown && (
              <div className="absolute mt-2 bg-white border border-black/10 rounded-lg shadow-lg">
                {grades.map((grade) => (
                  <button
                    key={grade}
                    onClick={() => {
                      toggleGrade(grade);
                      setShowGradeDropdown(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-bg-soft)]"
                  >
                    Grade {grade}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Level Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowLevelDropdown(!showLevelDropdown);
              }}
              className={`px-4 py-2 rounded-full text-sm border border-black/10 ${
                selectedLevel ? "text-blue-700" : "bg-white"
              } hover:bg-[var(--color-bg-soft)]`}
            >
              {selectedLevel || "Level"} ▾
            </button>
            {showLevelDropdown && (
              <div className="absolute mt-2 bg-white border border-black/10 rounded-lg shadow-lg">
                {levels.map((level) => (
                  <button
                    key={level}
                    onClick={() => {
                      toggleLevel(level);
                      setShowLevelDropdown(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-bg-soft)]"
                  >
                    {level}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Empty State */}
        {results.length === 0 && (
          <div className="text-center py-24 text-[var(--color-text-muted)]">
            <p className="text-lg mb-2">No flashcards loaded</p>
            <p className="text-sm">Search or use AI to build a lesson</p>
          </div>
        )}

        {/* Results grid */}
        {results.length > 0 && (
          <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {results.map((card) => (
              <div
                key={card.id}
                onClick={() => toggleLessonTrayCard(card)}
                className={`group cursor-pointer rounded-xl bg-white p-4 shadow-sm hover:shadow-lg transition ${
                  lessonTray.find((c) => c.id === card.id)
                    ? "border-2 border-blue-700"
                    : ""
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
      </main>
    </div>
  );
  }