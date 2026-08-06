"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/navigation/PageHeader";
import { PAGE_CONTENT } from "@/lib/seo/page-content";
import LessonPlanSection from "@/components/lessons/LessonPlanSection";
import { useAuth } from "@/components/AuthProvider";
import { loadLessonsWithAccessFromServer } from "@/lib/lessons/repository";
import { LessonCard, LessonRecord } from "@/lib/lessons/types";
import { subscribeToLessonTray, writeLessonTray } from "@/lib/lessons/tray";
import {
  DEFAULT_LESSON_PLAN_PREFERENCES,
  EMPTY_LESSON_PLAN_DRAFT,
  GUEST_LESSON_PLAN_DRAFT_KEY,
  LESSON_PLAN_DRAFT_KEY,
  LessonAgeGroup,
  LessonClassFormat,
  LessonDurationMinutes,
  LessonLevel,
  LessonPlanDraft,
  LessonPlanPreferences,
  LessonPurpose,
  LessonSkillFocus,
  LessonSupportLevel,
} from "@/lib/lesson-plans/types";
import { buildLessonPlanDraft } from "@/lib/lesson-plans/generate";

type LessonPlanStorageScope = "account" | "guest";

function storageForScope(scope: LessonPlanStorageScope) {
  return scope === "guest" ? window.sessionStorage : window.localStorage;
}

function draftKeyForScope(scope: LessonPlanStorageScope) {
  return scope === "guest" ? GUEST_LESSON_PLAN_DRAFT_KEY : LESSON_PLAN_DRAFT_KEY;
}

function emptyDraftForScope(scope: LessonPlanStorageScope): LessonPlanDraft {
  return scope === "guest"
    ? {
        ...EMPTY_LESSON_PLAN_DRAFT,
        preferences: { ...DEFAULT_LESSON_PLAN_PREFERENCES },
      }
    : EMPTY_LESSON_PLAN_DRAFT;
}

function readDraft(scope: LessonPlanStorageScope): LessonPlanDraft {
  try {
    const raw = storageForScope(scope).getItem(draftKeyForScope(scope));
    if (!raw) return emptyDraftForScope(scope);
    const parsed = JSON.parse(raw);
    const preferences = {
      ...DEFAULT_LESSON_PLAN_PREFERENCES,
      ...(parsed.preferences ?? {}),
    };
    return {
      ...EMPTY_LESSON_PLAN_DRAFT,
      ...parsed,
      preferences,
      stages: Array.isArray(parsed.stages) ? parsed.stages : [],
      recommendedTools: Array.isArray(parsed.recommendedTools) ? parsed.recommendedTools : [],
    };
  } catch {
    return emptyDraftForScope(scope);
  }
}

function guestLessonId(cards: LessonCard[]) {
  const signature = cards.map((card) => `${card.id}:${card.word}:${card.image ?? ""}`).join("|");
  let hash = 2166136261;
  for (let index = 0; index < signature.length; index += 1) {
    hash ^= signature.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `guest-session-${(hash >>> 0).toString(36)}`;
}

function createGuestLesson(cards: LessonCard[]): LessonRecord {
  return {
    id: guestLessonId(cards),
    name: "My Guest Lesson",
    cards,
  };
}

export default function LessonsPage() {
  const { user, loading: authLoading } = useAuth();
  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<LessonPlanDraft>(EMPTY_LESSON_PLAN_DRAFT);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const isGuest = !authLoading && !user;
  const storageScope: LessonPlanStorageScope = user ? "account" : "guest";

  useEffect(() => {
    if (authLoading) return;
    setDraftHydrated(false);
    setDraft(readDraft(user ? "account" : "guest"));
    setDraftHydrated(true);
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.id) {
      const syncGuestLesson = (cards: LessonCard[]) => {
        setLessons(cards.length > 0 ? [createGuestLesson(cards)] : []);
      };
      const unsubscribe = subscribeToLessonTray(syncGuestLesson, "guest");
      setLoading(false);
      return unsubscribe;
    }

    let mounted = true;
    setLoading(true);

    loadLessonsWithAccessFromServer()
      .then((nextLessons) => {
        if (mounted) setLessons(nextLessons.filter((lesson) => !lesson.isLocked));
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
  }, [authLoading, user?.id]);

  useEffect(() => {
    if (authLoading || !draftHydrated || loading || user || lessons.length === 0) return;
    const guestLesson = lessons[0];
    setDraft((current) => {
      if (
        current.selectedLessonId === guestLesson.id
        && current.stages.length > 0
      ) {
        return current;
      }
      return buildLessonPlanDraft(
        guestLesson,
        current.level,
        current.variant + 1,
        current.preferences,
      );
    });
  }, [authLoading, draftHydrated, lessons, loading, user]);

  useEffect(() => {
    if (!draftHydrated || authLoading) return;
    storageForScope(storageScope).setItem(draftKeyForScope(storageScope), JSON.stringify(draft));
  }, [authLoading, draft, draftHydrated, storageScope]);

  const selectedLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === draft.selectedLessonId) ?? null,
    [lessons, draft.selectedLessonId]
  );

  function applyLesson(lesson: LessonRecord) {
    setDraft(
      buildLessonPlanDraft(
        lesson,
        draft.level,
        draft.variant + 1,
        draft.preferences,
      ),
    );
  }

  function regeneratePlan(nextLevel = draft.level) {
    if (!selectedLesson) {
      setDraft((current) => ({
        ...current,
        level: nextLevel,
        variant: current.variant + 1,
      }));
      return;
    }
    setDraft(
      buildLessonPlanDraft(
        selectedLesson,
        nextLevel,
        draft.variant + 1,
        draft.preferences,
      ),
    );
  }

  function updateDraft<K extends keyof LessonPlanDraft>(key: K, value: LessonPlanDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updatePreference<K extends keyof LessonPlanPreferences>(
    key: K,
    value: LessonPlanPreferences[K],
  ) {
    const nextPreferences = { ...draft.preferences, [key]: value };
    if (selectedLesson) {
      setDraft(
        buildLessonPlanDraft(
          selectedLesson,
          draft.level,
          draft.variant + 1,
          nextPreferences,
        ),
      );
      return;
    }
    setDraft((current) => ({
      ...current,
      preferences: nextPreferences,
    }));
  }

  function clearDraft() {
    setDraft({
      ...EMPTY_LESSON_PLAN_DRAFT,
      preferences: DEFAULT_LESSON_PLAN_PREFERENCES,
    });
    storageForScope(storageScope).removeItem(draftKeyForScope(storageScope));
  }

  function openLessonInPrintables() {
    if (!selectedLesson) return;
    writeLessonTray(selectedLesson.cards, storageScope);
    window.location.href = "/printables?from=lessons";
  }

  function openLessonInFlashcards() {
    if (!selectedLesson) return;
    writeLessonTray(selectedLesson.cards, storageScope);
    window.location.href = isGuest
      ? "/flashcards"
      : `/flashcards?lesson_set_id=${selectedLesson.id}`;
  }

  function openLessonInClassroom() {
    if (!selectedLesson) return;
    writeLessonTray(selectedLesson.cards, storageScope);
    window.location.href = "/flashcards/classroom?from=lessons";
  }

  async function exportLessonPlanPdf() {
    if (!selectedLesson || !draft.selectedLessonId) return;

    setIsPdfExporting(true);
    try {
      const response = await fetch("/api/lesson-plans/export-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lesson: selectedLesson,
          draft,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download =
        `${(draft.title || `${selectedLesson.name} Lesson Plan`)
          .trim()
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-+|-+$/g, "") || "lesson-plan"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      console.error("Failed to export lesson plan PDF:", error);
    } finally {
      setIsPdfExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
      <PageHeader
        title="Lesson Plans"
        description={PAGE_CONTENT.lessons.description}
        primaryItems={[
          { label: "Classroom", href: "/flashcards/classroom", tone: "classroom" },
        ]}
        secondaryItems={user ? [
          { label: "Flashcards", href: "/flashcards" },
          { label: "Dashboard", href: "/dashboard" },
          { label: "Community", href: "/teacher/community" },
        ] : [
          { label: "Flashcards", href: "/flashcards" },
          { label: "Printables", href: "/printables" },
        ]}
      />

      <main className="max-w-7xl mx-auto px-6 pt-10 pb-32 grid grid-cols-12 gap-6">
        {isGuest ? (
          <section className="col-span-12 rounded-2xl border border-[#d7e3d0] bg-[#f2f7ee] px-5 py-4 shadow-sm">
            <p className="text-sm font-semibold text-[#40533b]">Guest Lesson Plan — no sign-up needed</p>
            <p className="mt-1 text-xs leading-5 text-[#63705f]">
              Build and export a lesson plan from up to 6 free Image 1 flashcards. Your cards and draft are temporary for this browser session. Classroom Mode and basic Printables are also available without an account; saving, Community, games, worksheets, and premium images require an account.
            </p>
          </section>
        ) : null}
        <aside className="col-span-12 lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <h2 className="text-xl font-semibold mb-2">{isGuest ? "Your Guest Lesson" : "Choose a Lesson"}</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              {isGuest
                ? "Use the temporary cards you selected in Flashcards to generate a classroom-ready plan."
                : "Start from a saved lesson so the plan, printables, and classroom flow stay connected."}
            </p>

            {loading ? (
              <div className="text-sm text-[var(--color-text-muted)]">Loading saved lessons…</div>
            ) : lessons.length === 0 ? (
              <div className="text-sm text-[var(--color-text-muted)]">
                {isGuest ? (
                  <>Your temporary tray is empty. <Link href="/flashcards" className="font-semibold text-[#58734d] underline">Choose up to 6 free flashcards</Link> first.</>
                ) : "No saved lessons yet. Build one in Flashcards first."}
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
              onClick={openLessonInClassroom}
              disabled={!selectedLesson}
              className="btn btn-secondary w-full border-[#7ea76a] bg-[#89ad70] text-white hover:bg-[#7ea76a] disabled:opacity-50"
            >
              Teach Selected Lesson in Classroom
            </button>

            <button
              onClick={openLessonInPrintables}
              disabled={!selectedLesson}
              className="btn btn-secondary w-full disabled:opacity-50"
            >
              Send Selected Lesson to Printables
            </button>

            <button
              onClick={exportLessonPlanPdf}
              disabled={!selectedLesson || isPdfExporting}
              className="btn btn-primary w-full disabled:opacity-50"
            >
              {isPdfExporting ? "Generating PDF…" : "Export Lesson Plan PDF"}
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

            <div className="mt-5 rounded-2xl border border-black/5 bg-[linear-gradient(135deg,rgba(127,163,106,0.10),rgba(255,255,255,0.92))] p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
                    Student level
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["beginner", "middle", "high"] as LessonLevel[]).map((level) => {
                      const active = draft.level === level;
                      return (
                        <button
                          key={level}
                          onClick={() => regeneratePlan(level)}
                          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                            active
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-sm"
                              : "border-black/10 bg-white text-[var(--color-text-main)] hover:-translate-y-0.5"
                          }`}
                        >
                          {level[0].toUpperCase() + level.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button onClick={() => regeneratePlan(draft.level)} className="btn btn-primary px-4 py-3 text-sm">
                  Generate fresh plan
                </button>
              </div>

              <details className="mt-5 rounded-2xl border border-black/5 bg-white shadow-sm">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--color-text-main)]">
                  <span className="flex items-center justify-between gap-3">
                    Customise lesson
                    <span className="rounded-full bg-[var(--color-bg-soft)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)]">
                      {draft.preferences.durationMinutes} min · {draft.preferences.purpose}
                    </span>
                  </span>
                </summary>

                <div className="border-t border-black/5 p-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                      Duration
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {([30, 40, 50, 60, 90, 120] as LessonDurationMinutes[]).map((duration) => (
                        <button
                          key={duration}
                          type="button"
                          onClick={() => updatePreference("durationMinutes", duration)}
                          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                            draft.preferences.durationMinutes === duration
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                              : "border-black/10 bg-[var(--color-bg-main)] hover:bg-[var(--color-bg-soft)]"
                          }`}
                        >
                          {duration} min
                        </button>
                      ))}
                    </div>
                    {draft.preferences.durationMinutes >= 90 ? (
                      <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">
                        Includes a 10-minute midpoint break and two{" "}
                        {(draft.preferences.durationMinutes - 10) / 2}-minute teaching blocks.
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <label className="text-sm font-semibold">
                      Lesson purpose
                      <select
                        value={draft.preferences.purpose}
                        onChange={(event) =>
                          updatePreference("purpose", event.target.value as LessonPurpose)
                        }
                        className="mt-2 w-full rounded-xl border border-black/10 bg-[var(--color-bg-main)] px-3 py-2.5 text-sm font-normal"
                      >
                        <option value="teach">Teach new content</option>
                        <option value="practice">Practise</option>
                        <option value="review">Review</option>
                      </select>
                    </label>

                    <label className="text-sm font-semibold">
                      Class format
                      <select
                        value={draft.preferences.classFormat}
                        onChange={(event) =>
                          updatePreference(
                            "classFormat",
                            event.target.value as LessonClassFormat,
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-black/10 bg-[var(--color-bg-main)] px-3 py-2.5 text-sm font-normal"
                      >
                        <option value="individual">Individual</option>
                        <option value="small-group">Small group</option>
                        <option value="whole-class">Whole class</option>
                      </select>
                    </label>

                    <label className="text-sm font-semibold">
                      Age group
                      <select
                        value={draft.preferences.ageGroup}
                        onChange={(event) =>
                          updatePreference("ageGroup", event.target.value as LessonAgeGroup)
                        }
                        className="mt-2 w-full rounded-xl border border-black/10 bg-[var(--color-bg-main)] px-3 py-2.5 text-sm font-normal"
                      >
                        <option value="early-years">Early years</option>
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                        <option value="adult">Adult</option>
                      </select>
                    </label>

                    <label className="text-sm font-semibold">
                      Skill focus
                      <select
                        value={draft.preferences.skillFocus}
                        onChange={(event) =>
                          updatePreference(
                            "skillFocus",
                            event.target.value as LessonSkillFocus,
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-black/10 bg-[var(--color-bg-main)] px-3 py-2.5 text-sm font-normal"
                      >
                        <option value="balanced">Balanced</option>
                        <option value="speaking">Speaking</option>
                        <option value="reading">Reading</option>
                        <option value="writing">Writing</option>
                        <option value="phonics">Phonics</option>
                      </select>
                    </label>

                    <label className="text-sm font-semibold">
                      Support level
                      <select
                        value={draft.preferences.supportLevel}
                        onChange={(event) =>
                          updatePreference(
                            "supportLevel",
                            event.target.value as LessonSupportLevel,
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-black/10 bg-[var(--color-bg-main)] px-3 py-2.5 text-sm font-normal"
                      >
                        <option value="high">High support</option>
                        <option value="standard">Standard</option>
                        <option value="challenge">Challenge</option>
                      </select>
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-sm font-semibold">
                        Games
                        <select
                          value={draft.preferences.gameCount}
                          onChange={(event) =>
                            updatePreference(
                              "gameCount",
                              Number(event.target.value) as 0 | 1 | 2,
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-black/10 bg-[var(--color-bg-main)] px-3 py-2.5 text-sm font-normal"
                        >
                          <option value={0}>None</option>
                          <option value={1}>One</option>
                          <option value={2}>Two</option>
                        </select>
                      </label>

                      <label className="text-sm font-semibold">
                        Worksheets
                        <select
                          value={draft.preferences.worksheetCount}
                          onChange={(event) =>
                            updatePreference(
                              "worksheetCount",
                              Number(event.target.value) as 0 | 1 | 2,
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-black/10 bg-[var(--color-bg-main)] px-3 py-2.5 text-sm font-normal"
                        >
                          <option value={0}>None</option>
                          <option value={1}>One</option>
                          <option value={2}>Two</option>
                        </select>
                      </label>
                    </div>
                  </div>
                  {isGuest ? (
                    <p className="mt-3 rounded-xl bg-[#f2f7ee] px-3 py-2 text-xs leading-5 text-[#63705f]">
                      Your plan can recommend Classendo games and worksheets. <Link href="/signup?next=%2Flessons" className="font-semibold text-[#4f7046] underline">Create a free account</Link> to open those recommended tools; Classroom Mode and basic Printables remain available as a guest.
                    </p>
                  ) : null}
                </div>
              </details>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm lg:col-span-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                    {draft.preferences.durationMinutes}-minute flow
                  </div>
                  <div className="mt-3 space-y-3">
                    {draft.stages.length > 0
                      ? draft.stages.map((stage) => (
                          <div
                            key={stage.id}
                            className="rounded-2xl border border-black/5 bg-[var(--color-bg-main)] p-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                                  {stage.time}
                                </div>
                                <div className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">
                                  {stage.title}
                                </div>
                              </div>
                              {stage.tool ? (
                                <span className="rounded-full border border-[rgba(127,163,106,0.22)] bg-[rgba(127,163,106,0.10)] px-3 py-1 text-xs font-semibold text-[#52634a]">
                                  {stage.tool.label}
                                  {isGuest && (stage.tool.kind === "game" || stage.tool.kind === "worksheet") ? " · Account required" : ""}
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-2 text-xs font-medium leading-5 text-[var(--color-text-muted)]">
                              {stage.purpose}
                            </p>

                            <div className="mt-3 grid gap-2 md:grid-cols-2">
                              <div className="rounded-xl border border-black/5 bg-white p-3">
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                                  Teacher
                                </div>
                                <p className="mt-1 text-sm leading-6 text-[var(--color-text-main)]">
                                  {stage.teacherAction}
                                </p>
                              </div>
                              <div className="rounded-xl border border-black/5 bg-white p-3">
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                                  Students
                                </div>
                                <p className="mt-1 text-sm leading-6 text-[var(--color-text-main)]">
                                  {stage.studentAction}
                                </p>
                              </div>
                            </div>

                            <div className="mt-2 rounded-xl border border-dashed border-[#a9bb9e] bg-white/70 px-3 py-2 text-sm leading-6 text-[var(--color-text-muted)]">
                              <span className="font-semibold text-[var(--color-text-main)]">Check:</span>{" "}
                              {stage.checkForUnderstanding}
                            </div>
                          </div>
                        ))
                      : draft.schedule
                          .split("\n")
                          .filter(Boolean)
                          .map((entry) => {
                            const [time, rest] = entry.split(" · ");
                            const [title, detail] = (rest ?? "").split(" — ");
                            return (
                              <div key={entry} className="rounded-xl border border-black/5 bg-[var(--color-bg-main)] px-3 py-2">
                                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-text-muted)]">{time}</div>
                                <div className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">{title}</div>
                                <div className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">{detail}</div>
                              </div>
                            );
                          })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                      Classendo teaching tools
                    </div>
                    <div className="mt-3 space-y-3">
                      {draft.recommendedTools.length > 0 ? (
                        draft.recommendedTools.map((tool, index) => (
                          <div
                            key={`${tool.kind}-${tool.id}-${index}`}
                            className="rounded-xl border border-black/5 bg-[var(--color-bg-main)] p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-[var(--color-text-main)]">
                                {tool.label}
                              </span>
                              <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                                {tool.kind}{isGuest && (tool.kind === "game" || tool.kind === "worksheet") ? " · sign up to use" : ""}
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
                              {tool.reason}
                            </p>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Suggested games</div>
                          <div className="flex flex-wrap gap-2">
                            {draft.recommendedGames.split(" · ").filter(Boolean).map((game) => (
                              <span
                                key={game}
                                className="rounded-full border border-[rgba(30,64,175,0.16)] bg-[rgba(30,64,175,0.06)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-main)]"
                              >
                                {game}
                              </span>
                            ))}
                          </div>
                          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Suggested worksheets</div>
                          <div className="flex flex-wrap gap-2">
                            {draft.recommendedWorksheets.split(" · ").filter(Boolean).map((worksheet) => (
                              <span
                                key={worksheet}
                                className="rounded-full border border-[rgba(127,163,106,0.18)] bg-[rgba(127,163,106,0.08)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-main)]"
                              >
                                {worksheet}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Why this plan fits</div>
                    <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
                      The generator analyses the lesson size, card types, available images, student level, duration, purpose, class format, age, skill focus, and support level. Classroom remains the main teaching, retrieval, and assessment tool.
                    </p>
                    <div className="mt-4 rounded-xl border border-black/5 bg-[var(--color-bg-main)] p-3 text-sm leading-6 text-[var(--color-text-muted)]">
                      <span className="font-semibold text-[var(--color-text-main)]">Best fit:</span> {draft.focus || "Choose a lesson to generate a plan."}
                    </div>
                  </div>
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
