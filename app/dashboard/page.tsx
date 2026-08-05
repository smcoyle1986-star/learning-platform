"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import PageHeader from "@/components/navigation/PageHeader";
import { supabase } from "@/lib/supabase/client";
import DashboardLessonCard from "@/components/dashboard/DashboardLessonCard";
import DashboardWorksheetCard from "@/components/dashboard/DashboardWorksheetCard";
import DashboardPreviewModal from "@/components/dashboard/DashboardPreviewModal";
import DeleteLessonModal from "@/components/dashboard/DeleteLessonModal";
import {
  deleteLesson,
  loadLessonsWithAccessFromServer,
  normalizeLesson,
  recordLessonUsage,
} from "@/lib/lessons/repository";
import { writeLessonTray } from "@/lib/lessons/tray";
import { LessonRecord } from "@/lib/lessons/types";
import { deleteWorksheet, loadWorksheetsForUser } from "@/lib/worksheets/repository";
import { SavedWorksheetRecord } from "@/lib/worksheets/types";
import { hydrateCreatorLessonCards } from "@/lib/creator/client";
import { useBillingAccess } from "@/lib/billing/useBillingAccess";

const RECENT_LIMIT = 8;

export default function DashboardPage() {
  const { user } = useAuth();
  const { access } = useBillingAccess();

  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [worksheets, setWorksheets] = useState<SavedWorksheetRecord[]>([]);
  const [previewLesson, setPreviewLesson] = useState<LessonRecord | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [conversionMessage, setConversionMessage] = useState("");
  

  // Delete modal state (new)
  const [lessonSetPendingDelete, setLessonSetPendingDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const refreshLessons = useCallback(async () => {
    if (!user?.id) {
      setLessons([]);
      return;
    }
    const data = await loadLessonsWithAccessFromServer();
    const hydrated = await Promise.all(
      data.map(async (lesson) => ({
        ...lesson,
        cards: await hydrateCreatorLessonCards(lesson.cards),
      }))
    );
    setLessons(hydrated);
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;

    if (user?.id) {
      refreshLessons()
        .catch((error) => {
          console.error("Unexpected error loading lessons from Supabase:", error);
          if (mounted) setLessons([]);
        });

      loadWorksheetsForUser(supabase, user.id)
        .then((data) => {
          if (mounted) setWorksheets(data);
        })
        .catch((error) => {
          console.error("Unexpected error loading worksheets from Supabase:", error);
          if (mounted) setWorksheets([]);
        });
    } else {
      setLessons([]);
      setWorksheets([]);
    }

    return () => {
      mounted = false;
    };
  }, [refreshLessons, user?.id]);

  /* ----------------------------------
     Derived views
  -----------------------------------*/
  const recentlyUsed = useMemo(() => {
    return [...lessons]
      .sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0))
      .slice(0, RECENT_LIMIT);
  }, [lessons]);

  const popularLessons = useMemo(() => {
    return [...lessons].sort((a, b) => (b.useCount ?? 0) - (a.useCount ?? 0));
  }, [lessons]);

  /* ----------------------------------
     Actions (preserved behavior, hardened)
     Note: These continue to update local cache; Supabase updates are not introduced here
     to avoid changing backend write patterns beyond needed fix.
  -----------------------------------*/
  const enterClassroom = (lesson: LessonRecord) => {
    if (lesson.isLocked) return;
    const cardsToCopy = Array.isArray(lesson.cards) ? lesson.cards.filter(Boolean) : [];
    if (!Array.isArray(cardsToCopy) || cardsToCopy.length === 0) {
      console.warn("enterClassroom: lesson has no cards, skipping tray update and navigation.");
      return;
    }

    setLessons((current) =>
      current.map((item) =>
        item.id === lesson.id
          ? normalizeLesson({
              ...item,
              useCount: (item.useCount ?? 0) + 1,
              lastUsed: Date.now(),
            })
          : item
      )
    );

    if (user?.id) {
      recordLessonUsage(supabase, lesson).catch((error) => {
        console.warn("Failed to update lesson last_used/use_count:", error);
      });
    }

    writeLessonTray(cardsToCopy);

    window.location.href = "/flashcards/classroom?from=dashboard";
  };

  const editLesson = (lesson: LessonRecord) => {
    if (lesson.isLocked || (!access?.isPremium && lesson.containsPremiumImages)) return;
    const cards = Array.isArray(lesson.cards) ? lesson.cards.filter(Boolean) : [];
    if (!cards.length) {
      console.warn("editLesson: lesson has no cards, aborting edit navigation.");
      return;
    }

    writeLessonTray(cards);
    window.location.href = `/teacher/editor?lesson_set_id=${lesson.id}`;
  };

  const openGames = (lesson: LessonRecord) => {
    if (lesson.isLocked) return;
    const cardsToCopy = Array.isArray(lesson.cards) ? lesson.cards.filter(Boolean) : [];
    if (!cardsToCopy.length) {
      console.warn("Games: lesson has no cards, aborting navigation.");
      return;
    }

    writeLessonTray(cardsToCopy);
    setLessons((current) =>
      current.map((item) =>
        item.id === lesson.id
          ? normalizeLesson({
              ...item,
              useCount: (item.useCount ?? 0) + 1,
              lastUsed: Date.now(),
            })
          : item
      )
    );

    if (user?.id) {
      recordLessonUsage(supabase, lesson).catch((error) => {
        console.warn("Failed to update lesson last_used/use_count (games):", error);
      });
    }

    window.location.href = "/games";
  };

  // Open confirm modal (does not delete)
  function openDeleteModal(lessonId: string | number) {
    setLessonSetPendingDelete(String(lessonId));
    setIsDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    setIsDeleteModalOpen(false);
    setLessonSetPendingDelete(null);
  }

  // Confirm deletion: call Supabase, then update UI only on success
  async function confirmDelete() {
    if (!lessonSetPendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteLesson(supabase, lessonSetPendingDelete);
      setLessons((current) =>
        current.filter((lesson) => String(lesson.id) !== String(lessonSetPendingDelete))
      );

      // Close modal and clear pending id
      setIsDeleteModalOpen(false);
      setLessonSetPendingDelete(null);
    } catch (err) {
      console.error("Unexpected error deleting lesson_set:", err);
    } finally {
      setIsDeleting(false);
    }
  }

  // Print lesson — writes to lesson tray and navigates to printables
  const printLesson = (lesson: LessonRecord) => {
    if (lesson.isLocked) return;
    const cards = Array.isArray(lesson.cards) ? lesson.cards.filter(Boolean) : [];
    if (!cards.length) {
      console.warn("printLesson: lesson has no cards, aborting print.");
      return;
    }

    writeLessonTray(cards);
    window.location.href = "/printables?from=dashboard";
  };

  const openWorksheets = (lesson: LessonRecord) => {
    if (lesson.isLocked) return;
    const cards = Array.isArray(lesson.cards) ? lesson.cards.filter(Boolean) : [];
    if (!cards.length) {
      console.warn("openWorksheets: lesson has no cards, aborting worksheets.");
      return;
    }

    writeLessonTray(cards);
    window.location.href = "/worksheets";
  };

  const openSavedWorksheet = (worksheet: SavedWorksheetRecord) => {
    writeLessonTray(worksheet.cards);
    window.location.href = `/worksheets?worksheet_id=${worksheet.id}`;
  };

  const selectLessonForTray = (lesson: LessonRecord) => {
    if (lesson.isLocked) return;
    const cards = Array.isArray(lesson.cards) ? lesson.cards.filter(Boolean) : [];
    if (!cards.length) return;

    writeLessonTray(cards);
    setSelectedLessonId(lesson.id);
  };

  const removeSavedWorksheet = async (worksheetId: string) => {
    try {
      await deleteWorksheet(supabase, worksheetId);
      setWorksheets((current) => current.filter((item) => item.id !== worksheetId));
    } catch (error) {
      console.error("Failed to delete worksheet:", error);
    }
  };

  const convertLessonToBasic = async (lesson: LessonRecord) => {
    const confirmed = window.confirm(
      `Convert "${lesson.name}" to a Basic-compatible version? Classendo will use free Image 1 alternatives while keeping the original Premium image configuration for a future upgrade.`
    );
    if (!confirmed) return;
    setConversionMessage("");
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}/convert-basic`, {
        method: "POST",
        headers: data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {},
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(payload?.error ?? "Conversion failed."));
      setConversionMessage(`"${lesson.name}" now has a Basic-compatible Image 1 version. The original Premium choices are preserved.`);
      await refreshLessons();
    } catch (error) {
      setConversionMessage(error instanceof Error ? error.message : "Could not convert this set.");
    }
  };

  /* ---------------------------
     Title overflow / marquee detection logic
     - Adds CSS vars / classes on overflowing title elements so marquee runs only when needed.
     - Allows manual scroll on hover (overflow-x:auto) and pauses animation on hover.
     ---------------------------*/
  useEffect(() => {
    function updateTitleElements() {
      const outers = Array.from(document.querySelectorAll<HTMLElement>(".cb-title-outer"));
      outers.forEach((outer) => {
        const inner = outer.querySelector<HTMLElement>(".cb-title-inner");
        if (!inner) return;
        // reset
        inner.style.removeProperty("--scroll-diff");
        inner.style.removeProperty("--scroll-duration");
        outer.classList.remove("cb-has-scroll");
        inner.classList.remove("cb-marquee");

        const diff = inner.scrollWidth - outer.clientWidth;
        if (diff > 6) {
          // set CSS vars
          inner.style.setProperty("--scroll-diff", String(diff));
          // duration proportional to diff (20px => 1s baseline)
          const duration = Math.max(6, Math.min(30, Math.round(diff / 20)));
          inner.style.setProperty("--scroll-duration", `${duration}s`);
          // mark to enable marquee
          outer.classList.add("cb-has-scroll");
          inner.classList.add("cb-marquee");
        }
      });
    }

    // run after render / lessons update
    updateTitleElements();
    // update on resize
    window.addEventListener("resize", updateTitleElements);
    return () => window.removeEventListener("resize", updateTitleElements);
  }, [lessons]);

  /* ----------------------------------
     Render
  -----------------------------------*/
  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
      {/* inject lightweight CSS for marquee/hover-scroll */}
      <style>{`
        /* Reserve space so title cannot extend under top-right action buttons.
           Increased padding-right and flex shrink to ensure title never overlaps buttons. */
        .cb-title-wrap { display: flex; align-items: center; gap: 8px; min-width: 0; padding-right: 120px; }
        /* outer is the visible clip area: allow it to shrink (flex:1) so it won't overflow */
        .cb-title-outer { flex: 1 1 auto; min-width: 0; overflow: hidden; position: relative; z-index: 1; }
        /* inner holds the long text */
        .cb-title-inner { display: inline-block; white-space: nowrap; }
        /* ensure action cluster sits above the title visually and for pointer events */
        .cb-action-cluster { position: absolute; top: 0.75rem; right: 0.75rem; z-index: 30; }
        /* when marquee is enabled, animate using computed scroll diff and duration vars */
        .cb-title-inner.cb-marquee {
          animation-name: cb-scroll;
          animation-duration: var(--scroll-duration, 8s);
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          animation-delay: 1s;
        }
        @keyframes cb-scroll {
          0% { transform: translateX(0); }
          45% { transform: translateX(calc(var(--scroll-diff) * -1)); }
          55% { transform: translateX(calc(var(--scroll-diff) * -1)); }
          100% { transform: translateX(0); }
        }
        /* On hover, allow manual scrolling and pause animation */
        .cb-title-outer:hover { overflow-x: auto; }
        .cb-title-outer:hover .cb-title-inner { animation-play-state: paused; }
        /* hide default scrollbar but show on hover (basic) */
        .cb-title-outer { scrollbar-width: none; -ms-overflow-style: none; }
        .cb-title-outer::-webkit-scrollbar { height: 6px; display: none; }
        .cb-title-outer:hover::-webkit-scrollbar { display: block; height: 6px; }
        .cb-badge-icon { width: 28px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; }
      `}</style>

      <PageHeader
        title="Dashboard"
        primaryItems={[
          { label: "Classroom", href: "/flashcards/classroom", tone: "classroom" },
        ]}
        secondaryItems={[
          { label: "Flashcards", href: "/flashcards" },
          { label: "Community", href: "/teacher/community" },
          { label: "Creator", href: "/creator" },
          { label: "Editor", href: "/teacher/editor" },
          { label: "Printables", href: "/printables" },
          { label: "Worksheets", href: "/worksheets" },
          { label: "Lesson Plans", href: "/lessons" },
          { label: "Games", href: "/games" },
        ]}
      />

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-6 pt-12 pb-32 space-y-16">
        {access?.welcomeTrial.active ? (
          <section className="rounded-[2rem] border border-[#e3cf91] bg-[linear-gradient(135deg,#fff9df,#fff3c2)] p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#98701f]">Premium welcome trial · {access.welcomeTrial.daysRemaining} days remaining</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#5f491a]">Enjoy Premium on us for 14 days</h2>
            <p className="mt-2 text-sm leading-6 text-[#765f2b]">You have full Premium access with no payment details required. You’ll automatically move to Basic when the welcome period ends unless you choose Premium.</p>
          </section>
        ) : null}
        {conversionMessage ? (
          <div className="rounded-2xl border border-[#d5e2cf] bg-[#f4f8f1] px-5 py-4 text-sm text-[#496143]">{conversionMessage}</div>
        ) : null}
        {/* RECENTLY USED */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Recently Used</h2>

          {recentlyUsed.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No recent lessons yet.
            </p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {recentlyUsed.map((lesson) => (
                <div key={lesson.id} className="min-w-[360px] w-[360px]">
                  <DashboardLessonCard
                    lesson={lesson}
                    selected={selectedLessonId === lesson.id}
                    enterButtonClassName="btn btn-primary flex-1 px-2.5 py-1.5 text-xs"
                    onSelect={selectLessonForTray}
                    onPreview={setPreviewLesson}
                    onEdit={editLesson}
                    onOpenGames={openGames}
                  onDelete={openDeleteModal}
                  onEnterClassroom={enterClassroom}
                  onOpenWorksheets={openWorksheets}
                  onPrint={printLesson}
                  onConvertToBasic={convertLessonToBasic}
                  onUpgrade={() => { window.location.href = "/upgrade"; }}
                  isPremium={Boolean(access?.isPremium)}
                />
              </div>
              ))}
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
                className="text-[var(--color-text-main)] font-medium underline underline-offset-4"
              >
                Create your first lesson
              </Link>
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: "calc(12 * 8rem)" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-1">
                {popularLessons.map((lesson) => (
                  <DashboardLessonCard
                    key={lesson.id}
                    lesson={lesson}
                    selected={selectedLessonId === lesson.id}
                    onSelect={selectLessonForTray}
                    onPreview={setPreviewLesson}
                    onEdit={editLesson}
                    onOpenGames={openGames}
                    onDelete={openDeleteModal}
                    onEnterClassroom={enterClassroom}
                    onOpenWorksheets={openWorksheets}
                    onPrint={printLesson}
                    onConvertToBasic={convertLessonToBasic}
                    onUpgrade={() => { window.location.href = "/upgrade"; }}
                    isPremium={Boolean(access?.isPremium)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-6">Saved Worksheets</h2>

          {worksheets.length === 0 ? (
            <div className="text-sm text-[var(--color-text-muted)]">
              No saved worksheets yet. Create one from the Worksheets page.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {worksheets.map((worksheet) => (
                <DashboardWorksheetCard
                  key={worksheet.id}
                  worksheet={worksheet}
                  onOpen={openSavedWorksheet}
                  onDelete={removeSavedWorksheet}
                />
              ))}
            </div>
          )}
        </section>

        <DashboardPreviewModal
          lesson={previewLesson}
          onClose={() => setPreviewLesson(null)}
        />

        <DeleteLessonModal
          isOpen={isDeleteModalOpen}
          isDeleting={isDeleting}
          onCancel={closeDeleteModal}
          onConfirm={confirmDelete}
        />
      </main>
    </div>
  );
}
