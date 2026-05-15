"use client";

import { useEffect, useRef, useState } from "react";
import BrandButton from "@/components/BrandButton";
import { supabase } from "@/lib/supabase/client";
// removed duplicate createClient import to avoid creating a second client that triggers refresh token errors
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import FlashcardSearchControls from "@/components/flashcards/FlashcardSearchControls";
import FlashcardResultsGrid from "@/components/flashcards/FlashcardResultsGrid";
import LessonTrayBar from "@/components/flashcards/LessonTrayBar";
import SaveLessonDialogs from "@/components/flashcards/SaveLessonDialogs";
import {
  readLastSavedTray,
  readLessonTray,
  writeLessonTray,
} from "@/lib/lessons/tray";
import { LessonCard } from "@/lib/lessons/types";
import {
  fetchSearchResults,
  getDisplayWord as getDisplayWordHelper,
  lemmaKey,
  loadImageVariants,
} from "@/lib/flashcards/catalog";
import {
  Card,
  CarouselEntry,
  TrayItem,
  WordType,
} from "@/lib/flashcards/types";
import { useFlashcardCarousel } from "@/lib/flashcards/useFlashcardCarousel";
import { useFlashcardLessonSave } from "@/lib/flashcards/useFlashcardLessonSave";
import { useLessonTrayInteractions } from "@/lib/flashcards/useLessonTrayInteractions";

export default function FlashcardsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Card[]>([]);
  const [lessonTray, setLessonTray] = useState<TrayItem[]>([]);

  // NOTE: changed to preserve original case — only replace underscores with spaces.
  const formatWord = (word: string) => String(word ?? "").replace(/_/g, " ");

  const [activeWordType, setActiveWordType] = useState<WordType>("noun");

  const [activeTheme, setActiveTheme] = useState<string | null>(null);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [imageVariants, setImageVariants] = useState<Record<string, string[]>>({});
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const addToastTimeoutRef = useRef<number | null>(null);

  // useAuth from context (authentication requirement)
  const { user } = useAuth();

  const {
    showSaveModal,
    setShowSaveModal,
    lessonName,
    setLessonName,
    nameError,
    showReplaceConfirm,
    setShowReplaceConfirm,
    showSavedIndicator,
    editingLessonSetId,
    setEditingLessonSetId,
    isPublic,
    setIsPublic,
    lastSavedTray,
    setLastSavedTray,
    hasUnsavedChanges,
    handleSaveLesson,
    replaceLesson,
  } = useFlashcardLessonSave({
    supabase,
    user,
    lessonTray: lessonTray as LessonCard[],
  });

  // On mount: try to detect editing lesson_set id passed from Dashboard
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const idFromQuery =
        params.get("lesson_set_id") ||
        params.get("lessonSetId") ||
        params.get("id") ||
        null;
      if (idFromQuery) {
        setEditingLessonSetId(idFromQuery);
        return;
      }
    } catch (e) {
      /* ignore */
    }
  }, []);

  // --- popularity counts state (persisted in localStorage) ---
  const POP_KEY = "classendo-card-select-counts";
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

  const {
    draggedIndex,
    dragOverIndex,
    trayItemRefs,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    onTrayItemKeyDown,
  } = useLessonTrayInteractions({
    lessonTray,
    setLessonTray,
    removeFromLessonTray,
  });

  useEffect(() => {
    if (activeWordType && activeTheme) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWordType, activeTheme]);

  useEffect(() => {
    setLessonTray(readLessonTray() as TrayItem[]);
    setLastSavedTray(readLastSavedTray() as Card[]);
  }, []);

  useEffect(() => {
    writeLessonTray(lessonTray as LessonCard[]);
  }, [lessonTray]);

  const {
    carouselState,
    getCarouselKey,
    getCardImages,
    getActiveImage,
    startCarouselSlide,
    finishCarouselSlide,
  } = useFlashcardCarousel({
    results,
    imageVariants,
  });

  async function handleSearch() {
    try {
      const cards = await fetchSearchResults({
        supabase,
        activeWordType,
        activeTheme,
        query,
        cardCounts,
      });
      setResults(cards);
      const variants = await loadImageVariants({
        supabase,
        cards,
        category: activeWordType,
      });
      setImageVariants((prev) => ({ ...prev, ...variants }));
    } catch (err) {
      console.error("Search failed:", err);
    }
  }

  function incrementCardCount(card: Card) {
    setCardCounts((prevCounts) => {
      const next = { ...(prevCounts || {}) };
      const key = lemmaKey(card);
      next[key] = (next[key] ?? 0) + 1;
      return next;
    });
  }

  function getDisplayWord(card: Card) {
    const imagePath = getActiveImage(card);
    return getDisplayWordHelper(card, imagePath);
  }

  function addToLessonTray(card: Card) {
    const imagePath = getActiveImage(card);
    if (!imagePath) return;
    const displayWord = getDisplayWord(card);
    const trayId = `${card.type}:${displayWord}:${imagePath}`;
    setLessonTray((prev) => {
      const exists = prev.some((item) => item.image === imagePath);
      if (exists) return prev;
      incrementCardCount(card);
      const next = [...prev, { id: trayId, word: displayWord, image: imagePath, type: card.type }];
      writeLessonTray(next as LessonCard[]);
      return next;
    });
    setLastAddedId(trayId);
    if (addToastTimeoutRef.current) {
      window.clearTimeout(addToastTimeoutRef.current);
    }
    addToastTimeoutRef.current = window.setTimeout(() => {
      setLastAddedId(null);
    }, 900);
  }

  function removeFromLessonTray(id: string) {
    setLessonTray((prev) => {
      const next = prev.filter((c) => c.id !== id);
      writeLessonTray(next as LessonCard[]);
      return next;
    });
  }

  function clearLessonTray() {
    setLessonTray([]);
    writeLessonTray([]);
  }

  function persistLessonTray() {
    writeLessonTray(lessonTray as LessonCard[]);
  }

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

  return (
    <div
      className="min-h-screen"
      style={
        {
          ['--color-primary' as any]: '#1e40af',
          ['--color-primary-soft' as any]: '#eef2ff',
          ['--color-bg-main' as any]: '#f7f6f2',
          ['--color-bg-card' as any]: '#eef0e7',
          ['--color-bg-soft' as any]: '#f1f5f9',
          ['--color-text-main' as any]: '#2f3a2f',
          ['--color-text-muted' as any]: '#6b756b'
        } as React.CSSProperties
      }
    >
      <header className="bg-[var(--color-bg-main)] border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <BrandButton className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80" />

          <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--color-text-main)]">
            Flashcards
          </div>
        </div>
      </header>

      <LessonTrayBar
        openDropdown={openDropdown}
        editingLessonSetId={editingLessonSetId}
        lessonName={lessonName}
        lessonTray={lessonTray}
        showSavedIndicator={showSavedIndicator}
        formatWord={formatWord}
        trayItemRefs={trayItemRefs}
        draggedIndex={draggedIndex}
        dragOverIndex={dragOverIndex}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        onTrayItemKeyDown={onTrayItemKeyDown}
        onSetOpenDropdown={setOpenDropdown}
        onRemoveFromTray={removeFromLessonTray}
        onOpenSaveModal={() => setShowSaveModal(true)}
        onGoDashboard={() => {
          setOpenDropdown(null);
          router.push("/dashboard");
        }}
        onGoGames={() => {
          setOpenDropdown(null);
          router.push("/games");
        }}
        onGoWorksheets={() => {
          setOpenDropdown(null);
          router.push("/worksheets");
        }}
        onGoCommunity={() => {
          setOpenDropdown(null);
          router.push("/teacher/community");
        }}
        onGoClassroom={() => {
          persistLessonTray();
          router.push("/flashcards/classroom");
        }}
        onPrint={() => {
          persistLessonTray();
          router.push("/printables?from=flashcards");
        }}
        onClearTray={clearLessonTray}
      />

      <FlashcardSearchControls
        openDropdown={openDropdown}
        activeWordType={activeWordType}
        activeTheme={activeTheme}
        query={query}
        onSetOpenDropdown={setOpenDropdown}
        onSetActiveWordType={setActiveWordType}
        onSetActiveTheme={setActiveTheme}
        onSetQuery={setQuery}
        onSearch={handleSearch}
        onClearGrid={() => {
          setResults([]);
          setQuery("");
        }}
        onGoDashboard={() => {
          setOpenDropdown(null);
          router.push("/dashboard");
        }}
        onGoGames={() => {
          setOpenDropdown(null);
          router.push("/games");
        }}
        onGoCommunity={() => {
          setOpenDropdown(null);
          router.push("/teacher/community");
        }}
      />

      <main className="bg-[var(--color-bg-main)] border-b border-black/5">

        <FlashcardResultsGrid
          results={results}
          lastAddedId={lastAddedId}
          getCarouselKey={getCarouselKey}
          getCardImages={getCardImages}
          getActiveImage={getActiveImage}
          getDisplayWord={getDisplayWord}
          carouselState={carouselState}
          onAddToLessonTray={addToLessonTray}
          onStartCarouselSlide={startCarouselSlide}
          onFinishCarouselSlide={finishCarouselSlide}
        />

        <SaveLessonDialogs
          showSaveModal={showSaveModal}
          lessonName={lessonName}
          isPublic={isPublic}
          onLessonNameChange={setLessonName}
          onTogglePublic={() => setIsPublic((value) => !value)}
          onCancelSave={() => {
            setLessonName("");
            setShowSaveModal(false);
          }}
          onSaveLesson={handleSaveLesson}
          showReplaceConfirm={showReplaceConfirm}
          onCancelReplace={() => setShowReplaceConfirm(false)}
          onReplaceLesson={replaceLesson}
        />
      </main>
    </div>
  );
}
