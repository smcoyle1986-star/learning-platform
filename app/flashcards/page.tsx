"use client";

import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/navigation/PageHeader";
import { PAGE_CONTENT } from "@/lib/seo/page-content";
import { supabase } from "@/lib/supabase/client";
// removed duplicate createClient import to avoid creating a second client that triggers refresh token errors
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import FlashcardSearchControls from "@/components/flashcards/FlashcardSearchControls";
import FlashcardResultsGrid from "@/components/flashcards/FlashcardResultsGrid";
import LessonTrayBar from "@/components/flashcards/LessonTrayBar";
import SaveLessonDialogs from "@/components/flashcards/SaveLessonDialogs";
import GuestFlashcardPrompt from "@/components/flashcards/GuestFlashcardPrompt";
import {
  GUEST_LESSON_TRAY_LIMIT,
  readLastSavedTray,
  readLessonTray,
  setEditingLessonSetId as persistEditingLessonSetId,
  writeLastSavedTray,
  writeLessonTray,
} from "@/lib/lessons/tray";
import { LessonCard } from "@/lib/lessons/types";
import {
  fetchSearchResults,
  getDisplayWord as getDisplayWordHelper,
  lemmaKey,
  loadImageVariants,
} from "@/lib/flashcards/catalog";
import { Card, TrayItem, WordType } from "@/lib/flashcards/types";
import { useFlashcardCarousel } from "@/lib/flashcards/useFlashcardCarousel";
import { useFlashcardLessonSave } from "@/lib/flashcards/useFlashcardLessonSave";
import { useLessonTrayInteractions } from "@/lib/flashcards/useLessonTrayInteractions";
import { useBillingAccess } from "@/lib/billing/useBillingAccess";
import {
  creatorCardToFlashcard,
  hydrateCreatorLessonCards,
  listCreatorCards,
} from "@/lib/creator/client";

export default function FlashcardsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Card[]>([]);
  const [lessonTray, setLessonTray] = useState<TrayItem[]>([]);
  const [lessonTrayReady, setLessonTrayReady] = useState(false);
  const [isMyCards, setIsMyCards] = useState(false);
  const [creatorCards, setCreatorCards] = useState<Card[]>([]);
  const [guestPrompt, setGuestPrompt] = useState<"limit" | "save" | null>(null);

  // NOTE: changed to preserve original case — only replace underscores with spaces.
  const formatWord = (word: string) => String(word ?? "").replace(/_/g, " ");

  const [activeWordType, setActiveWordType] = useState<WordType>("noun");

  const [activeTheme, setActiveTheme] = useState<string | null>(null);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [imageVariants, setImageVariants] = useState<Record<string, import("@/lib/flashcards/types").FlashcardImageVariant[]>>({});
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const addToastTimeoutRef = useRef<number | null>(null);

  // useAuth from context (authentication requirement)
  const { user, loading: authLoading } = useAuth();
  const { access, canUsePremiumImageVariations } = useBillingAccess();
  const canUseCreator = Boolean(access?.isPremium);
  const isGuest = !authLoading && !user;

  const {
    showSaveModal,
    setShowSaveModal,
    lessonName,
    setLessonName,
    nameError,
    showReplaceConfirm,
    setShowReplaceConfirm,
    showSaveLimitModal,
    setShowSaveLimitModal,
    showSaveSuccessModal,
    setShowSaveSuccessModal,
    showSavedIndicator,
    isSaving,
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
    if (authLoading || !user) {
      if (!authLoading) setEditingLessonSetId(null);
      return;
    }
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
  }, [authLoading, setEditingLessonSetId, user]);

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
    if (!isMyCards && activeWordType && activeTheme) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWordType, activeTheme, isMyCards]);

  useEffect(() => {
    if (authLoading) return;
    let mounted = true;
    const scope = user ? "account" : "guest";
    const storedTray = readLessonTray(scope) as TrayItem[];
    setLessonTray(storedTray);
    setLessonTrayReady(true);
    void hydrateCreatorLessonCards(storedTray as LessonCard[]).then((hydrated) => {
      if (!mounted) return;
      const hydratedById = new Map(
        (hydrated as TrayItem[]).map((card) => [card.id, card])
      );
      setLessonTray((current) =>
        current.map((card) => hydratedById.get(card.id) ?? card)
      );
    });
    setLastSavedTray(user ? readLastSavedTray() as Card[] : []);
    return () => {
      mounted = false;
    };
  }, [authLoading, setLastSavedTray, user]);

  useEffect(() => {
    if (!lessonTrayReady || authLoading) return;
    writeLessonTray(lessonTray as LessonCard[], user ? "account" : "guest");
  }, [authLoading, lessonTray, lessonTrayReady, user]);

  const {
    carouselState,
    getCarouselKey,
    getCardImages,
    getActiveImage,
    getActiveVariant,
    startCarouselSlide,
    finishCarouselSlide,
  } = useFlashcardCarousel({
    results,
    imageVariants,
  });

  async function handleSearch() {
    try {
      if (isMyCards) {
        const normalizedQuery = query.trim().toLocaleLowerCase();
        setResults(
          creatorCards.filter((card) =>
            normalizedQuery
              ? card.word.toLocaleLowerCase().includes(normalizedQuery)
              : true
          )
        );
        return;
      }
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

  async function showMyCards() {
    if (!canUseCreator) return;
    setOpenDropdown(null);
    setActiveTheme(null);
    setIsMyCards(true);
    try {
      const cards = (await listCreatorCards()).map(creatorCardToFlashcard);
      setCreatorCards(cards);
      const normalizedQuery = query.trim().toLocaleLowerCase();
      setResults(
        cards.filter((card) =>
          normalizedQuery ? card.word.toLocaleLowerCase().includes(normalizedQuery) : true
        )
      );
      setImageVariants({});
    } catch (error) {
      console.error("Could not load creator cards:", error);
      setResults([]);
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

  function getSelectedImage(card: Card) {
    if (!isGuest) return getActiveImage(card);
    return getCardImages(card).find((variant) => !variant.isPremium)?.url ?? card.image;
  }

  function getDisplayWord(card: Card) {
    const imagePath = getSelectedImage(card);
    return getDisplayWordHelper(card, imagePath);
  }

  function addToLessonTray(card: Card) {
    const activeVariant = isGuest
      ? getCardImages(card).find((variant) => !variant.isPremium)
        ?? { url: card.image, isPremium: false }
      : getActiveVariant(card);
    if (activeVariant?.isPremium && !canUsePremiumImageVariations) return;
    const imagePath = activeVariant.url || getSelectedImage(card);
    if (!imagePath) return;
    const displayWord = getDisplayWord(card);
    const trayId = card.creatorCardId
      ? `creator:${card.creatorCardId}`
      : `${card.type}:${displayWord}:${imagePath}`;
    const exists = card.creatorCardId
      ? lessonTray.some((item) => item.id === trayId)
      : lessonTray.some((item) => item.image === imagePath);
    if (exists) return;
    if (isGuest && lessonTray.length >= GUEST_LESSON_TRAY_LIMIT) {
      setGuestPrompt("limit");
      return;
    }
    incrementCardCount(card);
    const next = [...lessonTray, {
        id: trayId,
        word: displayWord,
        image: imagePath,
        type: card.type,
        creator_image_id: card.creatorImageId ?? null,
      }];
    setLessonTray(next);
    writeLessonTray(next as LessonCard[], isGuest ? "guest" : "account");
    setLastAddedId(`${card.type}:${displayWord}:${imagePath}`);
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
      writeLessonTray(next as LessonCard[], isGuest ? "guest" : "account");
      return next;
    });
  }

  function clearLessonTray() {
    setLessonTray([]);
    writeLessonTray([], isGuest ? "guest" : "account");
  }

  function persistLessonTray() {
    writeLessonTray(lessonTray as LessonCard[], isGuest ? "guest" : "account");
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
          '--color-primary': '#1e40af',
          '--color-primary-soft': '#eef2ff',
          '--color-bg-main': '#f7f6f2',
          '--color-bg-card': '#eef0e7',
          '--color-bg-soft': '#f1f5f9',
          '--color-text-main': '#2f3a2f',
          '--color-text-muted': '#6b756b'
        } as React.CSSProperties & Record<`--${string}`, string>
      }
    >
      <PageHeader
        title="Flashcards"
        description={PAGE_CONTENT.flashcards.description}
        sticky={false}
        primaryItems={[
          { label: "Classroom", onClick: () => {
            persistLessonTray();
            router.push("/flashcards/classroom");
          }, tone: "classroom" },
        ]}
        secondaryItems={user ? [
          { label: "Creator", onClick: () => {
            persistLessonTray();
            router.push("/creator");
          } },
          { label: "Dashboard", onClick: () => {
            persistLessonTray();
            router.push("/dashboard");
          } },
          { label: "Community", onClick: () => {
            persistLessonTray();
            router.push("/teacher/community");
          } },
          { label: "Editor", onClick: () => {
            persistLessonTray();
            writeLastSavedTray(lessonTray as LessonCard[]);
            persistEditingLessonSetId(null);
            router.push("/teacher/editor");
          } },
          { label: "Printables", onClick: () => {
            persistLessonTray();
            router.push("/printables?from=flashcards");
          } },
          { label: "Worksheets", onClick: () => {
            persistLessonTray();
            router.push("/worksheets");
          } },
          { label: "Lesson Plans", onClick: () => {
            persistLessonTray();
            router.push("/lessons");
          } },
          { label: "Games", onClick: () => {
            persistLessonTray();
            router.push("/games");
          } },
        ] : [
          { label: "Lesson Plans", onClick: () => {
            persistLessonTray();
            router.push("/lessons");
          } },
          { label: "Printables", onClick: () => {
            persistLessonTray();
            router.push("/printables?from=flashcards");
          } },
        ]}
      />

      {isGuest ? (
        <section className="border-b border-[#dce6d5] bg-[#f2f7ee]">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#40533b]">Use Classendo without signing up</p>
              <p className="mt-1 text-xs leading-5 text-[#63705f]">
                Choose up to 6 free Image 1 flashcards, then use them in Classroom Mode, Printables, or Lesson Plans. Your temporary lesson lasts for this browser session.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button type="button" onClick={() => { persistLessonTray(); router.push("/flashcards/classroom"); }} className="btn btn-secondary px-3 py-1.5 text-xs">Classroom</button>
              <button type="button" onClick={() => { persistLessonTray(); router.push("/printables?from=flashcards"); }} className="btn btn-secondary px-3 py-1.5 text-xs">Printables</button>
              <button type="button" onClick={() => { persistLessonTray(); router.push("/lessons"); }} className="btn btn-primary px-3 py-1.5 text-xs">Lesson Plans</button>
            </div>
          </div>
        </section>
      ) : null}

      <LessonTrayBar
        editingLessonSetId={editingLessonSetId}
        lessonName={lessonName}
        lessonTray={lessonTray}
        showSavedIndicator={showSavedIndicator}
        isGuest={isGuest}
        guestLimit={GUEST_LESSON_TRAY_LIMIT}
        formatWord={formatWord}
        trayItemRefs={trayItemRefs}
        draggedIndex={draggedIndex}
        dragOverIndex={dragOverIndex}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        onTrayItemKeyDown={onTrayItemKeyDown}
        onRemoveFromTray={removeFromLessonTray}
        onOpenSaveModal={() => setShowSaveModal(true)}
        onGuestSave={() => setGuestPrompt("save")}
        onGoLessonPlans={() => {
          persistLessonTray();
          router.push("/lessons");
        }}
        onGoWorksheets={() => {
          setOpenDropdown(null);
          router.push("/worksheets");
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
        isMyCards={isMyCards}
        canUseCreator={canUseCreator}
        onSetOpenDropdown={setOpenDropdown}
        onSetActiveWordType={setActiveWordType}
        onSetActiveTheme={setActiveTheme}
        onSetQuery={setQuery}
        onSearch={handleSearch}
        onShowCatalog={() => setIsMyCards(false)}
        onShowMyCards={showMyCards}
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
          canUsePremiumImageVariations={canUsePremiumImageVariations}
          allowImageVariations={!isGuest}
          getCarouselKey={getCarouselKey}
          getCardImages={getCardImages}
          getActiveImage={getSelectedImage}
          getActiveVariant={getActiveVariant}
          getDisplayWord={getDisplayWord}
          carouselState={carouselState}
          onAddToLessonTray={addToLessonTray}
          onStartCarouselSlide={startCarouselSlide}
          onFinishCarouselSlide={finishCarouselSlide}
          emptyMessage={
            isMyCards
              ? "No creator cards found. Make one on the Creator page."
              : "Select a tab to load flashcards"
          }
        />

        <SaveLessonDialogs
          showSaveModal={showSaveModal}
          lessonName={lessonName}
          lessonCardCount={lessonTray.length}
          isPublic={isPublic}
          isSaving={isSaving}
          nameError={nameError}
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
          showSaveLimitModal={showSaveLimitModal}
          onCloseSaveLimitModal={() => setShowSaveLimitModal(false)}
          onGoDashboardToDelete={() => {
            setShowSaveLimitModal(false);
            router.push("/dashboard");
          }}
          onUpgradeFromLimit={() => {
            setShowSaveLimitModal(false);
            router.push("/upgrade");
          }}
          onReturnToFlashcards={() => {
            setShowSaveLimitModal(false);
          }}
          showSaveSuccessModal={showSaveSuccessModal}
          onCloseSaveSuccessModal={() => setShowSaveSuccessModal(false)}
          onGoDashboardAfterSave={() => {
            setShowSaveSuccessModal(false);
            router.push("/dashboard");
          }}
          onGoClassroomAfterSave={() => {
            setShowSaveSuccessModal(false);
            persistLessonTray();
            router.push("/flashcards/classroom?from=flashcards");
          }}
          onReturnToFlashcardsAfterSave={() => {
            setShowSaveSuccessModal(false);
          }}
        />
        <GuestFlashcardPrompt
          open={guestPrompt !== null}
          onClose={() => setGuestPrompt(null)}
          title={guestPrompt === "save" ? "Create a free account to save this lesson" : undefined}
          description={guestPrompt === "save"
            ? "Guest lessons are temporary and cannot be saved. Create a free account to save this set, build larger lessons, and reuse it across Classendo."
            : undefined}
        />
      </main>
    </div>
  );
}
