"use client";

import { useEffect, useMemo, useState } from "react";
import BrandButton from "@/components/BrandButton";
import LessonPlanSection from "@/components/lessons/LessonPlanSection";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { loadLessonsForUser } from "@/lib/lessons/repository";
import { LessonRecord } from "@/lib/lessons/types";
import { writeLessonTray } from "@/lib/lessons/tray";
import {
  createDraftFromLesson,
  EMPTY_LESSON_PLAN_DRAFT,
  LESSON_PLAN_DRAFT_KEY,
  LessonPlanDraft,
} from "@/lib/lesson-plans/types";

function readDraft(): LessonPlanDraft {
  try {
    const raw = localStorage.getItem(LESSON_PLAN_DRAFT_KEY);
    if (!raw) return EMPTY_LESSON_PLAN_DRAFT;
    const parsed = JSON.parse(raw);
    return { ...EMPTY_LESSON_PLAN_DRAFT, ...parsed };
  } catch {
    return EMPTY_LESSON_PLAN_DRAFT;
  }
}

export default function LessonsPage() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<LessonPlanDraft>(EMPTY_LESSON_PLAN_DRAFT);

  useEffect(() => {
    setDraft(readDraft());
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setLessons([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    loadLessonsForUser(supabase, user.id)
      .then((nextLessons) => {
        if (mounted) setLessons(nextLessons);
      })
      .catch((error) => {
        console.error("Failed to load lessons for lesson planning:", error);
        if (mounted) setLessons([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    localStorage.setItem(LESSON_PLAN_DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  const selectedLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === draft.selectedLessonId) ?? null,
    [lessons, draft.selectedLessonId]
  );

  function applyLesson(lesson: LessonRecord) {
    setDraft(createDraftFromLesson(lesson));
  }

  function updateDraft<K extends keyof LessonPlanDraft>(key: K, value: LessonPlanDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function clearDraft() {
    setDraft(EMPTY_LESSON_PLAN_DRAFT);
    localStorage.removeItem(LESSON_PLAN_DRAFT_KEY);
  }

  function openLessonInPrintables() {
    if (!selectedLesson) return;
    writeLessonTray(selectedLesson.cards);
    window.location.href = "/printables?from=dashboard";
  }

  function openLessonInFlashcards() {
    if (!selectedLesson) return;
    writeLessonTray(selectedLesson.cards);
    window.location.href = `/flashcards?lesson_set_id=${selectedLesson.id}`;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
      <header className="sticky top-0 z-50 bg-[var(--color-bg-main)]/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <BrandButton className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80" />

          <div className="absolute left-1/2 -translate-x-1/2">
            <h1 className="text-4xl font-bold text-black">Lesson Plans</h1>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => (window.location.href = "/dashboard")} className="btn btn-secondary">
              Dashboard
            </button>
            <button onClick={() => (window.location.href = "/printables")} className="btn btn-secondary">
              Printables
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-10 pb-32 grid grid-cols-12 gap-6">
        <aside className="col-span-12 lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <h2 className="text-xl font-semibold mb-2">Choose a Lesson</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Start from a saved lesson so the plan, printables, and classroom flow stay connected.
            </p>

            {loading ? (
              <div className="text-sm text-[var(--color-text-muted)]">Loading saved lessons…</div>
            ) : lessons.length === 0 ? (
              <div className="text-sm text-[var(--color-text-muted)]">
                No saved lessons yet. Build one in Flashcards first.
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {lessons.map((lesson) => {
                  const active = lesson.id === draft.selectedLessonId;

                  return (
                    <button
                      key={lesson.id}
                      onClick={() => applyLesson(lesson)}
                      className={`w-full text-left rounded-2xl border p-4 transition ${
                        active
                          ? "border-[var(--color-primary)] bg-[var(--color-bg-soft)] shadow-sm"
                          : "bg-white hover:bg-[var(--color-bg-soft)]"
                      }`}
                    >
                      <div className="font-semibold">{lesson.name}</div>
                      <div className="text-xs text-[var(--color-text-muted)] mt-1">
                        {lesson.cards.length} cards
                        {lesson.lastUsed ? ` · Used ${new Date(lesson.lastUsed).toLocaleDateString()}` : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
            <h2 className="text-xl font-semibold">Plan Actions</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              Use this page to sketch the lesson flow first, then send the selected lesson into other tools when you are ready.
            </p>

            <button
              onClick={openLessonInFlashcards}
              disabled={!selectedLesson}
              className="btn btn-primary w-full disabled:opacity-50"
            >
              Open Selected Lesson in Flashcards
            </button>

            <button
              onClick={openLessonInPrintables}
              disabled={!selectedLesson}
              className="btn btn-secondary w-full disabled:opacity-50"
            >
              Send Selected Lesson to Printables
            </button>

            <button onClick={clearDraft} className="btn btn-secondary w-full">
              Clear Draft
            </button>
          </div>
        </aside>

        <section className="col-span-12 lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-2">Lesson Plan Title</label>
                <input
                  value={draft.title}
                  onChange={(event) => updateDraft("title", event.target.value)}
                  placeholder="Example: Clothing Review Lesson Plan"
                  className="w-full rounded-xl border border-black/10 bg-[var(--color-bg-main)] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div className="min-w-[220px] rounded-2xl bg-[var(--color-bg-soft)] border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                  Selected Lesson
                </div>
                <div className="font-semibold">
                  {selectedLesson ? selectedLesson.name : "No lesson selected"}
                </div>
                <div className="text-xs text-[var(--color-text-muted)] mt-1">
                  {selectedLesson
                    ? `${selectedLesson.cards.length} cards ready for planning and printables`
                    : "Choose a saved lesson to prefill the draft"}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <LessonPlanSection
              label="Lesson Focus"
              value={draft.focus}
              placeholder="What topic or language focus is this lesson targeting?"
              onChange={(value) => updateDraft("focus", value)}
            />
            <LessonPlanSection
              label="Objective"
              value={draft.objective}
              placeholder="What should students be able to do by the end of the lesson?"
              onChange={(value) => updateDraft("objective", value)}
            />
            <LessonPlanSection
              label="Materials"
              value={draft.materials}
              placeholder="List the materials, tools, and lesson set resources needed."
              onChange={(value) => updateDraft("materials", value)}
            />
            <LessonPlanSection
              label="Assessment"
              value={draft.assessment}
              placeholder="How will you check whether students understood the target language?"
              onChange={(value) => updateDraft("assessment", value)}
            />
          </div>

          <LessonPlanSection
            label="Warm-Up"
            value={draft.warmUp}
            placeholder="Describe the opening activity that activates prior knowledge."
            rows={5}
            onChange={(value) => updateDraft("warmUp", value)}
          />
          <LessonPlanSection
            label="Guided Practice"
            value={draft.guidedPractice}
            placeholder="Describe teacher-led modeling, checking, and supported practice."
            rows={6}
            onChange={(value) => updateDraft("guidedPractice", value)}
          />
          <LessonPlanSection
            label="Independent Practice"
            value={draft.independentPractice}
            placeholder="Describe the task students complete more independently."
            rows={6}
            onChange={(value) => updateDraft("independentPractice", value)}
          />
          <LessonPlanSection
            label="Wrap-Up / Exit Task"
            value={draft.wrapUp}
            placeholder="How will you close the lesson and reinforce the key learning?"
            rows={4}
            onChange={(value) => updateDraft("wrapUp", value)}
          />
          <LessonPlanSection
            label="Teacher Notes"
            value={draft.notes}
            placeholder="Differentiation ideas, classroom notes, follow-up tasks, or reminders."
            rows={5}
            onChange={(value) => updateDraft("notes", value)}
          />
        </section>
      </main>
    </div>
  );
}
