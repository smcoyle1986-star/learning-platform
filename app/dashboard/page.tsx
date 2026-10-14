"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Grid2X2, List, Search } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import PageHeader from "@/components/navigation/PageHeader";
import { PAGE_CONTENT } from "@/lib/seo/page-content";
import { supabase } from "@/lib/supabase/client";
import DashboardLessonCard from "@/components/dashboard/DashboardLessonCard";
import DashboardWorksheetCard from "@/components/dashboard/DashboardWorksheetCard";
import DashboardWorksheetPreviewModal from "@/components/dashboard/DashboardWorksheetPreviewModal";
import DashboardPreviewModal from "@/components/dashboard/DashboardPreviewModal";
import DeleteLessonModal from "@/components/dashboard/DeleteLessonModal";
import LessonTrayScroller from "@/components/shared/LessonTrayScroller";
import {
  deleteLesson,
  normalizeLesson,
  recordLessonUsage,
  updateLessonLibraryStateFromServer,
} from "@/lib/lessons/repository";
import {
  setEditingLessonSetId as persistEditingLessonSetId,
  writeLastSavedTray,
  writeLessonTray,
} from "@/lib/lessons/tray";
import { LessonRecord } from "@/lib/lessons/types";
import {
  deleteWorksheet,
  normalizeWorksheet,
  recordWorksheetUsage,
  updateWorksheetLibraryStateFromServer,
} from "@/lib/worksheets/repository";
import { DEFAULT_WORKSHEET_DRAFT, SavedWorksheetRecord } from "@/lib/worksheets/types";
import { hydrateCreatorLessonCards } from "@/lib/creator/client";
import { useBillingAccess } from "@/lib/billing/useBillingAccess";
import WelcomeTrialNotice from "@/components/billing/WelcomeTrialNotice";
import { clearPendingEmailConfirmation } from "@/lib/auth/pending-confirmation";
import SignedInFeatureGate from "@/components/auth/SignedInFeatureGate";

const RECENT_LIMIT = 8;
const PAGE_SIZE_OPTIONS = [12, 24, 36] as const;

type LessonFilter = "all" | "favorites" | "public" | "private" | "locked" | "archive";
type LessonSort = "recent" | "newest" | "oldest" | "name" | "popular" | "cards";
type LessonView = "grid" | "list";
type WorksheetFilter = "all" | "favorites" | "public" | "private" | "archive";
type WorksheetSort = "recent" | "newest" | "oldest" | "name" | "popular" | "cards";
type WorksheetView = "grid" | "list";

export default function DashboardPage() {
  const { user } = useAuth();
  const { access } = useBillingAccess();

  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [recentLessons, setRecentLessons] = useState<LessonRecord[]>([]);
  const [lessonTotal, setLessonTotal] = useState(0);
  const [filterCounts, setFilterCounts] = useState<Record<LessonFilter, number>>({ all: 0, favorites: 0, public: 0, private: 0, locked: 0, archive: 0 });
  const [worksheets, setWorksheets] = useState<SavedWorksheetRecord[]>([]);
  const [worksheetTotal, setWorksheetTotal] = useState(0);
  const [worksheetFilterCounts, setWorksheetFilterCounts] = useState<Record<WorksheetFilter, number>>({ all: 0, favorites: 0, public: 0, private: 0, archive: 0 });
  const [previewWorksheet, setPreviewWorksheet] = useState<SavedWorksheetRecord | null>(null);
  const [previewLesson, setPreviewLesson] = useState<LessonRecord | null>(null);
  const [conversionMessage, setConversionMessage] = useState("");
  const [onboardingMessage, setOnboardingMessage] = useState("");
  const [libraryMessage, setLibraryMessage] = useState("");
  const [libraryNotice, setLibraryNotice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [lessonFilter, setLessonFilter] = useState<LessonFilter>("all");
  const [lessonSort, setLessonSort] = useState<LessonSort>("recent");
  const [lessonView, setLessonView] = useState<LessonView>("grid");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [libraryStatePendingIds, setLibraryStatePendingIds] = useState<Set<string>>(new Set());
  const openedLessonFromQueryRef = useRef(false);
  const [worksheetSearchQuery, setWorksheetSearchQuery] = useState("");
  const [worksheetFilter, setWorksheetFilter] = useState<WorksheetFilter>("all");
  const [worksheetSort, setWorksheetSort] = useState<WorksheetSort>("recent");
  const [worksheetView, setWorksheetView] = useState<WorksheetView>("grid");
  const [worksheetPageSize, setWorksheetPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(12);
  const [worksheetPage, setWorksheetPage] = useState(1);
  const [worksheetLibraryMessage, setWorksheetLibraryMessage] = useState("");
  const [worksheetLibraryPendingIds, setWorksheetLibraryPendingIds] = useState<Set<string>>(new Set());
  const openedWorksheetFromQueryRef = useRef(false);
  const lessonDetails = useRef(new Map<string, LessonRecord>());
  const worksheetDetails = useRef(new Map<string, SavedWorksheetRecord>());
  const lessonRequestVersion = useRef(0);
  const worksheetRequestVersion = useRef(0);
  

  // Delete modal state (new)
  const [lessonSetPendingDelete, setLessonSetPendingDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("email_confirmed") !== "1") return;

    clearPendingEmailConfirmation();
    setOnboardingMessage("Email confirmed — welcome to Classendo. Your 14-day Premium trial is ready.");
    url.searchParams.delete("email_confirmed");
    url.searchParams.delete("welcome_trial");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const dashboardFetch = useCallback(async (path: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(path, {
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(String(payload?.error ?? "Could not load dashboard data."));
    return payload;
  }, []);

  const refreshLessons = useCallback(async () => {
    if (!user?.id) { setLessons([]); setLessonTotal(0); return; }
    const requestVersion = ++lessonRequestVersion.current;
    const params = new URLSearchParams({ page: String(currentPage), pageSize: String(pageSize), search: searchQuery, filter: lessonFilter, sort: lessonSort });
    const payload = await dashboardFetch(`/api/dashboard/lessons?${params}`);
    if (requestVersion !== lessonRequestVersion.current) return;
    setLessons(payload.items ?? []);
    if (currentPage === 1 && pageSize === 12 && lessonFilter === "all" && !searchQuery && lessonSort === "recent") {
      setRecentLessons(payload.items ?? []);
    }
    setLessonTotal(Number(payload.total ?? 0));
    setFilterCounts(payload.counts ?? { all: 0, favorites: 0, public: 0, private: 0, locked: 0, archive: 0 });
  }, [user?.id, currentPage, pageSize, searchQuery, lessonFilter, lessonSort, dashboardFetch]);

  const refreshWorksheets = useCallback(async () => {
    if (!user?.id) { setWorksheets([]); setWorksheetTotal(0); return; }
    const requestVersion = ++worksheetRequestVersion.current;
    const params = new URLSearchParams({ page: String(worksheetPage), pageSize: String(worksheetPageSize), search: worksheetSearchQuery, filter: worksheetFilter, sort: worksheetSort });
    const payload = await dashboardFetch(`/api/dashboard/worksheets?${params}`);
    if (requestVersion !== worksheetRequestVersion.current) return;
    setWorksheets(payload.items ?? []);
    setWorksheetTotal(Number(payload.total ?? 0));
    setWorksheetFilterCounts(payload.counts ?? { all: 0, favorites: 0, public: 0, private: 0, archive: 0 });
  }, [user?.id, worksheetPage, worksheetPageSize, worksheetSearchQuery, worksheetFilter, worksheetSort, dashboardFetch]);

  const getLessonDetails = useCallback(async (lesson: LessonRecord) => {
    const cached = lessonDetails.current.get(lesson.id);
    if (cached) return cached;
    const detail = normalizeLesson(await dashboardFetch(`/api/dashboard/lessons/${encodeURIComponent(lesson.id)}`));
    let cards = detail.cards;
    try { cards = await hydrateCreatorLessonCards(detail.cards); }
    catch (error) { console.warn("Could not refresh creator images for this lesson:", error); }
    const hydrated = { ...detail, cards };
    lessonDetails.current.set(lesson.id, hydrated);
    setLessons((current) => current.map((item) => item.id === lesson.id ? { ...item, ...hydrated, cardCount: item.cardCount } : item));
    return hydrated;
  }, [dashboardFetch]);

  const getWorksheetDetails = useCallback(async (worksheet: SavedWorksheetRecord) => {
    const cached = worksheetDetails.current.get(worksheet.id);
    if (cached) return cached;
    const detail = normalizeWorksheet(await dashboardFetch(`/api/dashboard/worksheets/${encodeURIComponent(worksheet.id)}`));
    let cards = detail.cards;
    try { cards = await hydrateCreatorLessonCards(detail.cards); }
    catch (error) { console.warn("Could not refresh creator images for this worksheet:", error); }
    const hydrated = { ...detail, cards };
    worksheetDetails.current.set(worksheet.id, hydrated);
    setWorksheets((current) => current.map((item) => item.id === worksheet.id ? { ...item, ...hydrated, cardCount: item.cardCount } : item));
    return hydrated;
  }, [dashboardFetch]);

  useEffect(() => {
    lessonDetails.current.clear();
    worksheetDetails.current.clear();
    lessonRequestVersion.current++;
    worksheetRequestVersion.current++;
    setLessons([]);
    setRecentLessons([]);
    setWorksheets([]);
    setLessonTotal(0);
    setWorksheetTotal(0);
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(() => {
      void Promise.allSettled([refreshLessons(), refreshWorksheets()]).then(([lessonsResult, worksheetsResult]) => {
        if (!mounted) return;
        if (lessonsResult.status === "rejected") {
          console.error("Unexpected error loading dashboard lessons:", lessonsResult.reason);
          setLessons([]);
          setLessonTotal(0);
        }
        if (worksheetsResult.status === "rejected") {
          console.error("Unexpected error loading dashboard worksheets:", worksheetsResult.reason);
          setWorksheets([]);
          setWorksheetTotal(0);
        }
      });
    }, searchQuery || worksheetSearchQuery ? 250 : 0);
    if (!user?.id) { setLessons([]); setWorksheets([]); setRecentLessons([]); setLessonTotal(0); setWorksheetTotal(0); }
    return () => { mounted = false; window.clearTimeout(timer); };
  }, [refreshLessons, refreshWorksheets, user?.id, searchQuery, worksheetSearchQuery]);
  const recentlyUsed = useMemo(() => recentLessons.filter((lesson) => !lesson.archivedAt).slice(0, RECENT_LIMIT), [recentLessons]);
  const totalPages = Math.max(1, Math.ceil(lessonTotal / pageSize));
  const pagedLessons = lessons;
  const worksheetTotalPages = Math.max(1, Math.ceil(worksheetTotal / worksheetPageSize));
  const pagedWorksheets = worksheets;

  useEffect(() => setCurrentPage(1), [lessonFilter, lessonSort, pageSize, searchQuery]);
  useEffect(() => setCurrentPage((page) => Math.min(page, totalPages)), [totalPages]);
  useEffect(() => setWorksheetPage(1), [worksheetFilter, worksheetPageSize, worksheetSearchQuery, worksheetSort]);
  useEffect(() => setWorksheetPage((page) => Math.min(page, worksheetTotalPages)), [worksheetTotalPages]);

  useEffect(() => {
    if (openedLessonFromQueryRef.current || lessons.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const lessonId = params.get("lesson_set_id");
    if (!lessonId) return;

    const lesson = lessons.find((item) => item.id === lessonId);
    openedLessonFromQueryRef.current = true;
    if (!lesson) {
      void getLessonDetails({ id: lessonId, name: "", cards: [] }).then((target) => {
        setLessonFilter(target.archivedAt ? "archive" : "all");
        setSearchQuery(target.name);
        const notice = params.get("notice");
        if (notice === "already_saved") setLibraryNotice(`“${target.name}” is already saved. We opened the existing set instead.`);
        else if (notice === "owned") setLibraryNotice(`“${target.name}” is already yours. We opened it without making a copy.`);
      }).catch(() => { openedLessonFromQueryRef.current = false; });
      return;
    }
    setLessonFilter(lesson.archivedAt ? "archive" : "all");
    setSearchQuery(lesson.name);

    const notice = params.get("notice");
    if (notice === "already_saved") {
      setLibraryNotice(`“${lesson.name}” is already saved. We opened the existing set instead.`);
    } else if (notice === "owned") {
      setLibraryNotice(`“${lesson.name}” is already yours. We opened it without making a copy.`);
    }

    window.requestAnimationFrame(() => {
      document.getElementById("saved-lessons")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [lessons, getLessonDetails]);

  useEffect(() => {
    if (openedWorksheetFromQueryRef.current || worksheets.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const worksheetId = params.get("worksheet_id");
    if (!worksheetId) return;
    const worksheet = worksheets.find((item) => item.id === worksheetId);
    openedWorksheetFromQueryRef.current = true;
    if (!worksheet) {
      void getWorksheetDetails({ id: worksheetId, name: "", userId: user?.id ?? "", worksheetType: "crossword", isPublic: false, cards: [], draft: DEFAULT_WORKSHEET_DRAFT }).then((target) => {
        setWorksheetFilter(target.archivedAt ? "archive" : "all");
        setWorksheetSearchQuery(target.name);
        const notice = params.get("notice");
        if (notice === "already_saved") setWorksheetLibraryMessage(`“${target.name}” is already saved. We opened the existing worksheet instead.`);
        else if (notice === "owned") setWorksheetLibraryMessage(`“${target.name}” is already yours. We opened it without making a copy.`);
      }).catch(() => { openedWorksheetFromQueryRef.current = false; });
      return;
    }
    setWorksheetFilter(worksheet.archivedAt ? "archive" : "all");
    setWorksheetSearchQuery(worksheet.name);
    const notice = params.get("notice");
    if (notice === "already_saved") {
      setWorksheetLibraryMessage(`“${worksheet.name}” is already saved. We opened the existing worksheet instead.`);
    } else if (notice === "owned") {
      setWorksheetLibraryMessage(`“${worksheet.name}” is already yours. We opened it without making a copy.`);
    }
    window.requestAnimationFrame(() => {
      document.getElementById("saved-worksheets")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [worksheets, getWorksheetDetails, user?.id]);

  /* ----------------------------------
     Actions (preserved behavior, hardened)
     Note: These continue to update local cache; Supabase updates are not introduced here
     to avoid changing backend write patterns beyond needed fix.
  -----------------------------------*/
  const enterClassroom = async (lesson: LessonRecord) => {
    if (lesson.isLocked) return;
    const full = await getLessonDetails(lesson);
    const cardsToCopy = Array.isArray(full.cards) ? full.cards.filter(Boolean) : [];
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
      recordLessonUsage(supabase, full).catch((error) => {
        console.warn("Failed to update lesson last_used/use_count:", error);
      });
    }

    writeLessonTray(cardsToCopy);

    window.location.href = "/flashcards/classroom?from=dashboard";
  };

  const editLesson = async (lesson: LessonRecord) => {
    if (lesson.isLocked || (!access?.isPremium && lesson.containsPremiumImages)) return;
    const full = await getLessonDetails(lesson);
    const cards = Array.isArray(full.cards) ? full.cards.filter(Boolean) : [];
    if (!cards.length) {
      console.warn("editLesson: lesson has no cards, aborting edit navigation.");
      return;
    }

    writeLessonTray(cards);
    writeLastSavedTray(cards);
    persistEditingLessonSetId(full.id);
    window.location.href = `/teacher/editor?lesson_set_id=${full.id}`;
  };

  const openGames = async (lesson: LessonRecord) => {
    if (lesson.isLocked) return;
    const full = await getLessonDetails(lesson);
    const cardsToCopy = Array.isArray(full.cards) ? full.cards.filter(Boolean) : [];
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
      recordLessonUsage(supabase, full).catch((error) => {
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
      lessonDetails.current.delete(lessonSetPendingDelete);
      await refreshLessons();

      // Close modal and clear pending id
      setIsDeleteModalOpen(false);
      setLessonSetPendingDelete(null);
    } catch (err) {
      console.error("Unexpected error deleting lesson_set:", err);
    } finally {
      setIsDeleting(false);
    }
  }

  async function updateLessonLibraryState(
    lesson: LessonRecord,
    changes: { isFavorite?: boolean; archived?: boolean },
  ) {
    if (libraryStatePendingIds.has(lesson.id)) return;
    setLibraryMessage("");
    setLibraryStatePendingIds((current) => new Set(current).add(lesson.id));

    try {
      const updated = await updateLessonLibraryStateFromServer(lesson.id, changes);
      setLessons((current) => current.map((item) => {
        if (item.id !== lesson.id) return item;
        return normalizeLesson({
          ...item,
          isFavorite: changes.isFavorite ?? updated.isFavorite ?? item.isFavorite,
          archivedAt: changes.archived === undefined
            ? item.archivedAt
            : changes.archived
              ? updated.archivedAt ?? Date.now()
              : null,
        });
      }));
      await refreshLessons();
    } catch (error) {
      setLibraryMessage(
        error instanceof Error ? error.message : "Could not update this lesson set.",
      );
    } finally {
      setLibraryStatePendingIds((current) => {
        const next = new Set(current);
        next.delete(lesson.id);
        return next;
      });
    }
  }

  const toggleFavorite = (lesson: LessonRecord) => {
    void updateLessonLibraryState(lesson, { isFavorite: !lesson.isFavorite });
  };

  const toggleArchived = (lesson: LessonRecord) => {
    void updateLessonLibraryState(lesson, { archived: !lesson.archivedAt });
  };

  // Print lesson — writes to lesson tray and navigates to printables
  const printLesson = async (lesson: LessonRecord) => {
    if (lesson.isLocked) return;
    const full = await getLessonDetails(lesson);
    const cards = Array.isArray(full.cards) ? full.cards.filter(Boolean) : [];
    if (!cards.length) {
      console.warn("printLesson: lesson has no cards, aborting print.");
      return;
    }

    writeLessonTray(cards);
    window.location.href = "/printables?from=dashboard";
  };

  const openWorksheets = async (lesson: LessonRecord) => {
    if (lesson.isLocked) return;
    const full = await getLessonDetails(lesson);
    const cards = Array.isArray(full.cards) ? full.cards.filter(Boolean) : [];
    if (!cards.length) {
      console.warn("openWorksheets: lesson has no cards, aborting worksheets.");
      return;
    }

    writeLessonTray(cards);
    window.location.href = "/worksheets";
  };

  const openInFlashcards = async (lesson: LessonRecord) => {
    if (lesson.isLocked) return;
    const full = await getLessonDetails(lesson);
    const cards = Array.isArray(full.cards) ? full.cards.filter(Boolean) : [];
    if (!cards.length) {
      console.warn("openInFlashcards: lesson has no cards, aborting navigation.");
      return;
    }

    writeLessonTray(cards);
    window.location.href = "/flashcards";
  };

  const openSavedWorksheet = async (worksheet: SavedWorksheetRecord) => {
    const full = await getWorksheetDetails(worksheet);
    writeLessonTray(full.cards);
    setWorksheets((current) => current.map((item) => item.id === worksheet.id
      ? { ...item, useCount: (item.useCount ?? 0) + 1, lastUsed: new Date().toISOString() }
      : item));
    recordWorksheetUsage(supabase, full).catch((error) => {
      console.warn("Failed to update worksheet usage:", error);
    });
    window.location.href = `/worksheets?worksheet_id=${worksheet.id}`;
  };

  const removeSavedWorksheet = async (worksheetId: string) => {
    try {
      await deleteWorksheet(supabase, worksheetId);
      setWorksheets((current) => current.filter((item) => item.id !== worksheetId));
      worksheetDetails.current.delete(worksheetId);
      await refreshWorksheets();
    } catch (error) {
      console.error("Failed to delete worksheet:", error);
    }
  };

  async function updateWorksheetLibraryState(
    worksheet: SavedWorksheetRecord,
    changes: { isFavorite?: boolean; archived?: boolean },
  ) {
    if (worksheetLibraryPendingIds.has(worksheet.id)) return;
    setWorksheetLibraryMessage("");
    setWorksheetLibraryPendingIds((current) => new Set(current).add(worksheet.id));
    try {
      const updated = await updateWorksheetLibraryStateFromServer(worksheet.id, changes);
      setWorksheets((current) => current.map((item) => item.id === worksheet.id ? { ...item, ...updated } : item));
      await refreshWorksheets();
    } catch (error) {
      setWorksheetLibraryMessage(error instanceof Error ? error.message : "Could not update this worksheet.");
    } finally {
      setWorksheetLibraryPendingIds((current) => {
        const next = new Set(current);
        next.delete(worksheet.id);
        return next;
      });
    }
  }

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
  if (!user) return <SignedInFeatureGate featureName="My Lessons" nextPath="/dashboard" description="Save, organise and reuse your lesson sets from one place.">{null}</SignedInFeatureGate>;

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
        title="My Lessons"
        description={PAGE_CONTENT.dashboard.description}
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
      <main className="mx-auto max-w-7xl space-y-12 px-4 pb-24 pt-8 md:space-y-16 md:px-6 md:pb-32 md:pt-12">
        {onboardingMessage ? (
          <div className="rounded-2xl border border-[#cfe0c7] bg-[#f2f8ee] px-5 py-4 text-sm font-medium text-[#496143]" role="status">
            {onboardingMessage}
          </div>
        ) : null}
        {access?.welcomeTrial.active && user ? (
          <WelcomeTrialNotice
            daysRemaining={access.welcomeTrial.daysRemaining}
            userId={user.id}
            userMetadata={user.user_metadata}
          />
        ) : null}
        {conversionMessage ? (
          <div className="rounded-2xl border border-[#d5e2cf] bg-[#f4f8f1] px-5 py-4 text-sm text-[#496143]">{conversionMessage}</div>
        ) : null}
        {/* RECENTLY USED */}
        <section id="saved-lessons">
          <h2 className="text-xl font-semibold mb-4">Recently Used</h2>

          {recentlyUsed.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No recent lessons yet.
            </p>
          ) : (
            <LessonTrayScroller contentClassName="!gap-4 items-stretch pb-1">
              {recentlyUsed.map((lesson) => (
                <div key={lesson.id} className="min-w-[360px] w-[360px]">
                  <DashboardLessonCard
                    lesson={lesson}
                    enterButtonClassName="btn btn-primary flex-1 px-2.5 py-1.5 text-xs"
                    onPreview={(item) => { void getLessonDetails(item).then(setPreviewLesson); }}
                    onOpenFlashcards={openInFlashcards}
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
            </LessonTrayScroller>
          )}
        </section>

        {/* SAVED LESSONS */}
        <section>
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Saved Lessons</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Search, filter, favourite, and archive your lesson library.
              </p>
            </div>
            {lessonTotal > 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, lessonTotal)} of {lessonTotal}
              </p>
            ) : null}
          </div>

          {libraryMessage ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {libraryMessage}
            </div>
          ) : null}
          {libraryNotice ? (
            <div className="mb-4 rounded-2xl border border-[#cbdcc3] bg-[#f2f8ee] px-4 py-3 text-sm text-[#3f6338]">
              {libraryNotice}
            </div>
          ) : null}

          {filterCounts.all + filterCounts.archive === 0 ? (
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
            <>
              <div className="mb-5 rounded-2xl border border-[#dfe5d9] bg-white/75 p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <label className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <span className="sr-only">Search saved lessons</span>
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search set names or card words"
                      className="w-full rounded-xl border border-[#d7ddd1] bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                    <span>Sort</span>
                    <select value={lessonSort} onChange={(event) => setLessonSort(event.target.value as LessonSort)} className="rounded-xl border border-[#d7ddd1] bg-white px-3 py-2.5 text-sm text-[var(--color-text-main)]">
                      <option value="recent">Recently used</option>
                      <option value="newest">Newest created</option>
                      <option value="oldest">Oldest created</option>
                      <option value="name">Name A–Z</option>
                      <option value="popular">Most used</option>
                      <option value="cards">Most cards</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                    <span>Per page</span>
                    <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])} className="rounded-xl border border-[#d7ddd1] bg-white px-3 py-2.5 text-sm text-[var(--color-text-main)]">
                      {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
                    </select>
                  </label>

                  <div className="flex rounded-xl border border-[#d7ddd1] bg-white p-1" aria-label="Lesson display style">
                    <button type="button" onClick={() => setLessonView("grid")} aria-label="Grid view" aria-pressed={lessonView === "grid"} className={`rounded-lg p-2 transition ${lessonView === "grid" ? "bg-blue-100 text-blue-800" : "text-slate-500 hover:bg-slate-50"}`}><Grid2X2 size={17} /></button>
                    <button type="button" onClick={() => setLessonView("list")} aria-label="List view" aria-pressed={lessonView === "list"} className={`rounded-lg p-2 transition ${lessonView === "list" ? "bg-blue-100 text-blue-800" : "text-slate-500 hover:bg-slate-50"}`}><List size={18} /></button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2" aria-label="Lesson filters">
                  {([
                    ["all", "All"],
                    ["favorites", "Favourites"],
                    ["public", "Public"],
                    ["private", "Private"],
                    ["locked", "Locked"],
                    ["archive", "Archive"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLessonFilter(value)}
                      aria-pressed={lessonFilter === value}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${lessonFilter === value ? "border-blue-700 bg-blue-700 text-white shadow-sm" : "border-[#d7ddd1] bg-white text-[#596459] hover:border-blue-300 hover:text-blue-700"}`}
                    >
                      {label} <span className="ml-1 opacity-75">{filterCounts[value]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {lessonTotal === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d7ddd1] py-14 text-center text-sm text-[var(--color-text-muted)]">
                  No lesson sets match this search and filter.
                </div>
              ) : (
                <div className={lessonView === "grid" ? "grid grid-cols-1 gap-6 p-1 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"}>
                {pagedLessons.map((lesson) => (
                  <DashboardLessonCard
                    key={lesson.id}
                    lesson={lesson}
                    onPreview={(item) => { void getLessonDetails(item).then(setPreviewLesson); }}
                    onOpenFlashcards={openInFlashcards}
                    onEdit={editLesson}
                    onOpenGames={openGames}
                    onDelete={openDeleteModal}
                    onEnterClassroom={enterClassroom}
                    onOpenWorksheets={openWorksheets}
                    onPrint={printLesson}
                    onConvertToBasic={convertLessonToBasic}
                    onUpgrade={() => { window.location.href = "/upgrade"; }}
                    isPremium={Boolean(access?.isPremium)}
                    viewMode={lessonView}
                    showLibraryControls
                    libraryStatePending={libraryStatePendingIds.has(lesson.id)}
                    onToggleFavorite={toggleFavorite}
                    onToggleArchived={toggleArchived}
                  />
                ))}
              </div>

              )}

              {totalPages > 1 ? (
                <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Saved lesson pages">
                  <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="btn btn-secondary px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /> Previous</button>
                  <span className="text-sm text-[var(--color-text-muted)]">Page {currentPage} of {totalPages}</span>
                  <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="btn btn-secondary px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight size={16} /></button>
                </nav>
              ) : null}
            </>
          )}
        </section>

        <section id="saved-worksheets">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Saved Worksheets</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Search and organise worksheets separately from lesson sets.
              </p>
            </div>
            {worksheetTotal > 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">
                Showing {(worksheetPage - 1) * worksheetPageSize + 1}–{Math.min(worksheetPage * worksheetPageSize, worksheetTotal)} of {worksheetTotal}
              </p>
            ) : null}
          </div>

          {worksheetLibraryMessage ? (
            <div className="mb-4 rounded-2xl border border-[#cbdcc3] bg-[#f2f8ee] px-4 py-3 text-sm text-[#3f6338]">
              {worksheetLibraryMessage}
            </div>
          ) : null}

          {worksheetFilterCounts.all + worksheetFilterCounts.archive === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d7ddd1] py-14 text-center text-sm text-[var(--color-text-muted)]">
              No saved worksheets yet. Create one from the Worksheets page.
            </div>
          ) : (
            <>
              <div className="mb-5 rounded-2xl border border-[#dfe5d9] bg-white/75 p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <label className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <span className="sr-only">Search saved worksheets</span>
                    <input type="search" value={worksheetSearchQuery} onChange={(event) => setWorksheetSearchQuery(event.target.value)} placeholder="Search worksheet names, types, or card words" className="w-full rounded-xl border border-[#d7ddd1] bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                    <span>Sort</span>
                    <select value={worksheetSort} onChange={(event) => setWorksheetSort(event.target.value as WorksheetSort)} className="rounded-xl border border-[#d7ddd1] bg-white px-3 py-2.5 text-sm text-[var(--color-text-main)]">
                      <option value="recent">Recently used</option>
                      <option value="newest">Newest created</option>
                      <option value="oldest">Oldest created</option>
                      <option value="name">Name A–Z</option>
                      <option value="popular">Most used</option>
                      <option value="cards">Most cards</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                    <span>Per page</span>
                    <select value={worksheetPageSize} onChange={(event) => setWorksheetPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])} className="rounded-xl border border-[#d7ddd1] bg-white px-3 py-2.5 text-sm text-[var(--color-text-main)]">
                      {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
                    </select>
                  </label>
                  <div className="flex rounded-xl border border-[#d7ddd1] bg-white p-1" aria-label="Worksheet display style">
                    <button type="button" onClick={() => setWorksheetView("grid")} aria-label="Grid view" aria-pressed={worksheetView === "grid"} className={`rounded-lg p-2 transition ${worksheetView === "grid" ? "bg-blue-100 text-blue-800" : "text-slate-500 hover:bg-slate-50"}`}><Grid2X2 size={17} /></button>
                    <button type="button" onClick={() => setWorksheetView("list")} aria-label="List view" aria-pressed={worksheetView === "list"} className={`rounded-lg p-2 transition ${worksheetView === "list" ? "bg-blue-100 text-blue-800" : "text-slate-500 hover:bg-slate-50"}`}><List size={18} /></button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2" aria-label="Worksheet filters">
                  {([
                    ["all", "All"],
                    ["favorites", "Favourites"],
                    ["public", "Public"],
                    ["private", "Private"],
                    ["archive", "Archive"],
                  ] as const).map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setWorksheetFilter(value)} aria-pressed={worksheetFilter === value} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${worksheetFilter === value ? "border-blue-700 bg-blue-700 text-white shadow-sm" : "border-[#d7ddd1] bg-white text-[#596459] hover:border-blue-300 hover:text-blue-700"}`}>
                      {label} <span className="ml-1 opacity-75">{worksheetFilterCounts[value]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {worksheetTotal === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d7ddd1] py-14 text-center text-sm text-[var(--color-text-muted)]">No worksheets match this search and filter.</div>
              ) : (
                <div className={worksheetView === "grid" ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"}>
                  {pagedWorksheets.map((worksheet) => (
                    <DashboardWorksheetCard
                      key={worksheet.id}
                      worksheet={worksheet}
                      onOpen={openSavedWorksheet}
                      onPreview={(item) => { void getWorksheetDetails(item).then(setPreviewWorksheet); }}
                      onDelete={removeSavedWorksheet}
                      viewMode={worksheetView}
                      libraryStatePending={worksheetLibraryPendingIds.has(worksheet.id)}
                      onToggleFavorite={(item) => void updateWorksheetLibraryState(item, { isFavorite: !item.isFavorite })}
                      onToggleArchived={(item) => void updateWorksheetLibraryState(item, { archived: !item.archivedAt })}
                    />
                  ))}
                </div>
              )}

              {worksheetTotalPages > 1 ? (
                <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Saved worksheet pages">
                  <button type="button" onClick={() => setWorksheetPage((page) => Math.max(1, page - 1))} disabled={worksheetPage === 1} className="btn btn-secondary px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /> Previous</button>
                  <span className="text-sm text-[var(--color-text-muted)]">Page {worksheetPage} of {worksheetTotalPages}</span>
                  <button type="button" onClick={() => setWorksheetPage((page) => Math.min(worksheetTotalPages, page + 1))} disabled={worksheetPage === worksheetTotalPages} className="btn btn-secondary px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight size={16} /></button>
                </nav>
              ) : null}
            </>
          )}
        </section>

        <DashboardPreviewModal
          lesson={previewLesson}
          onClose={() => setPreviewLesson(null)}
        />

        <DashboardWorksheetPreviewModal
          worksheet={previewWorksheet}
          onClose={() => setPreviewWorksheet(null)}
          onOpen={(worksheet) => {
            setPreviewWorksheet(null);
            openSavedWorksheet(worksheet);
          }}
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
