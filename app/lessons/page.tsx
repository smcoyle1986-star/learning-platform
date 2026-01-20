"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Card = {
  id: number;
  word: string;
  image: string;
  type: string;
};

type Lesson = {
  id: number;
  name: string;
  cards: Card[];
  createdAt: string;
};

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("classbloom-saved-lessons");
    if (stored) {
      setLessons(JSON.parse(stored));
    }
  }, []);

  const loadLesson = (lesson: Lesson) => {
    localStorage.setItem(
      "classbloom-lesson-tray",
      JSON.stringify(lesson.cards)
    );
    // notify other pages that the lesson tray was updated
    window.dispatchEvent(new Event("lesson-tray-updated"));

    localStorage.setItem(
      "classbloom-last-saved-tray",
      JSON.stringify(lesson.cards)
    );
    window.location.href = "/flashcards";
  };

  const deleteLesson = (id: number) => {
    const updated = lessons.filter((l) => l.id !== id);
    setLessons(updated);
    localStorage.setItem(
      "classbloom-saved-lessons",
      JSON.stringify(updated)
    );
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] px-6 py-10 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-extrabold">Saved Lessons</h1>
        <Link
          href="/flashcards"
          className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90"
        >
          Back to Flashcards
        </Link>
      </div>

      {lessons.length === 0 && (
        <p className="text-gray-500">No saved lessons yet.</p>
      )}

      <div className="grid gap-4">
        {lessons.map((lesson) => (
          <div
            key={lesson.id}
            className="bg-white rounded-xl border p-5 flex justify-between items-center"
          >
            <div>
              <h2 className="text-xl font-semibold">{lesson.name}</h2>
              <p className="text-sm text-gray-500">
                {lesson.cards.length} cards ·{" "}
                {new Date(lesson.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => loadLesson(lesson)}
                className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90"
              >
                Load
              </button>

              <button
                onClick={() => deleteLesson(lesson.id)}
                className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
