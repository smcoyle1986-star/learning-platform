"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Play, Edit, Trash2 } from "lucide-react";

type Lesson = {
  id: string | number;
  name: string;
  cards: any[];
  createdAt?: number | string;
  lastUsed?: number;
  useCount?: number;
};

const STORAGE_KEY = "classbloom-saved-lessons";
const RECENT_LIMIT = 8;

export default function DashboardPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [previewLesson, setPreviewLesson] = useState<any | null>(null);

  // Safe debug log (avoid JSON.parse on the literal string "undefined")
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    console.log("RAW SAVED LESSONS:", raw);
    try {
      const parsed = raw && raw !== "undefined" ? JSON.parse(raw) : [];
      console.log("PARSED:", parsed);
    } catch (err) {
      console.warn("Failed to parse saved lessons for debug log:", err, raw);
    }
  }, []);

  /* ----------------------------------
     Load lessons from localStorage (safe parse)
  -----------------------------------*/
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      if (raw === "undefined") throw new Error("invalid stored value");
      const parsed = JSON.parse(raw);
      setLessons(Array.isArray(parsed) ? parsed : []);
    } catch (err) {
      console.warn("Failed to parse stored lessons:", err, raw);
      localStorage.removeItem(STORAGE_KEY);
      setLessons([]);
    }
  }, []);

  /* ----------------------------------
     Derived views
  -----------------------------------*/
  const recentlyUsed = useMemo(() => {
    return [...lessons]
      .sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0))
      .slice(0, RECENT_LIMIT);
  }, [lessons]);

  const popularLessons = useMemo(() => {
    return [...lessons].sort(
      (a, b) => (b.useCount ?? 0) - (a.useCount ?? 0)
    );
  }, [lessons]);

  /* ----------------------------------
     Actions
  -----------------------------------*/
  const enterClassroom = (lesson: Lesson) => {
    const updated = lessons.map((l) =>
      l.id === lesson.id
        ? { ...l, useCount: (l.useCount ?? 0) + 1, lastUsed: Date.now() }
        : l
    );
    setLessons(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    window.location.href = "/flashcards/classroom";
  };

  const editLesson = (lesson: any) => {
    localStorage.setItem(
      "classbloom-lesson-tray",
      JSON.stringify(lesson.cards ?? [])
    );

    window.location.href = "/flashcards";
  };

  const deleteLesson = (lessonId: string | number) => {
    const filtered = lessons.filter((l) => l.id !== lessonId);
    setLessons(filtered);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  };

  /* ----------------------------------
     Render
  -----------------------------------*/
  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg-main)]/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Brand */}
          <Link
            href="/"
            className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80"
          >
            ClassBloom
          </Link>

          {/* Center title */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <h1 className="text-4xl font-bold text-black">Dashboard</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Flashcards */}
            <button
              onClick={() => (window.location.href = "/flashcards")}
              className="
      px-4 py-2 rounded-lg
      bg-green-200 text-green-900
      text-sm
      hover:bg-green-300
      hover:shadow-md
      transition
    "
            >
              Flashcards
            </button>

            {/* Classroom */}
            <button
              onClick={() =>
                (window.location.href = "/flashcards/classroom?from=dashboard")
              }
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
                    onClick={() =>
                      setSelectedSetId(
                        selectedSetId === idStr ? null : idStr
                      )
                    }
                    className={`
            min-w-[280px] bg-white rounded-2xl p-5 transition cursor-pointer relative
            ${
              selectedSetId === idStr
                ? "border-2 border-blue-700 shadow-md"
                : "border shadow-sm hover:shadow-md"
            }
          `}
                  >
                    {/* TOP ACTIONS */}
                    <div className="absolute top-3 right-3 flex gap-2">
                      {/* PREVIEW */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewLesson(lesson);
                        }}
                        className="
                p-2 rounded-lg
                border border-black/10
                bg-white
                hover:shadow-md
                transition
              "
                      >
                        ☰
                      </button>

                      {/* EDIT */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          editLesson(lesson);
                        }}
                        className="
                p-2 rounded-lg
                border border-black/10
                bg-white
                hover:shadow-md
                transition
              "
                      >
                        ✏️
                      </button>

                      {/* DELETE */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLesson(lesson.id);
                        }}
                        className="
                p-2 rounded-lg
                border border-red-200
                bg-white
                text-red-600
                hover:bg-red-50
                hover:shadow-md
                transition
              "
                      >
                        🗑️
                      </button>
                    </div>

                    <h3 className="font-semibold mb-1">{lesson.name}</h3>

                    <p className="text-xs text-[var(--color-text-muted)] mb-1">
                      {lesson.cards?.length ?? 0} cards
                    </p>

                    <p className="text-xs text-[var(--color-text-muted)] mb-4">
                      Last used:{" "}
                      {new Date(lesson.lastUsed ?? 0).toLocaleDateString()}
                    </p>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();

                        // ✅ IMPORTANT: put cards where classroom expects them
                        localStorage.setItem(
                          "classbloom-lesson-tray",
                          JSON.stringify(lesson.cards ?? [])
                        );

                        window.location.href =
                          "/flashcards/classroom?from=dashboard";
                      }}
                      className="
    w-full flex items-center justify-center gap-2
    px-3 py-2 rounded-lg
    bg-green-400 text-green-900
    text-sm
    hover:bg-green-600
    hover:shadow-md
    transition
  "
                    >
                      <Play size={14} />
                      Enter Classroom
                    </button>
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
                className="text-blue-600 font-medium hover:underline"
              >
                Create your first lesson
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularLessons.map((lesson) => {
                const idStr = String(lesson.id);
                return (
                  <div
                    key={lesson.id}
                    onClick={() =>
                      setSelectedSetId(selectedSetId === idStr ? null : idStr)
                    }
                    className={`
    bg-white rounded-2xl p-5 shadow-sm transition cursor-pointer
    ${
      selectedSetId === idStr
        ? "border-2 border-blue-700"
        : "border hover:shadow-lg"
    }
  `}
                  >
                    <h3 className="font-semibold text-lg mb-1">
                      {lesson.name}
                    </h3>

                    <p className="text-xs text-[var(--color-text-muted)] mb-4">
                      {lesson.cards?.length ?? 0} cards · Used{" "}
                      {lesson.useCount ?? 0} times
                    </p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => enterClassroom(lesson)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-400 text-green-900
      text-sm
      hover:bg-green-600
      hover:shadow-md
      transition"
                      >
                        <Play size={14} />
                        Enter
                      </button>

                      <button
                        onClick={() => editLesson(lesson)}
                        className="px-3 py-2 rounded-lg border border-black/10 hover:bg-gray-50 transition"
                      >
                        <Edit size={14} />
                      </button>

                      <button
                        onClick={() => deleteLesson(lesson.id)}
                        className="px-3 py-2 rounded-lg border border-black/10 hover:bg-red-50 transition"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
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
                    {card.word || card.text || "Card"}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}