"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/navigation/PageHeader";
import LessonTrayScroller from "@/components/shared/LessonTrayScroller";
import WorksheetOptionsPanel from "@/components/worksheets/WorksheetOptionsPanel";
import WorksheetPreview from "@/components/worksheets/WorksheetPreview";
import { useAuth } from "@/components/AuthProvider";
import PremiumPreviewOverlay from "@/components/billing/PremiumPreviewOverlay";
import { resolveLessonImageUrl } from "@/lib/lessons/image";
import { supabase } from "@/lib/supabase/client";
import { LessonCard } from "@/lib/lessons/types";
import { clearLessonTray, readLessonTray, subscribeToLessonTray, writeLessonTray } from "@/lib/lessons/tray";
import { buildWorksheetPrintHtml, openWorksheetPrintWindow } from "@/lib/worksheets/export";
import { generateCrosswordLayout } from "@/lib/worksheets/crossword";
import { generateWordsearchLayout } from "@/lib/worksheets/wordsearch";
import { loadWorksheetById, saveWorksheetFromClient } from "@/lib/worksheets/repository";
import { scrambleSentenceLine } from "@/lib/worksheets/scramble";
import {
  buildWorksheetDraft,
  DEFAULT_WORKSHEET_DRAFT,
  formatWorksheetWord,
  WORKSHEET_TYPES,
  WorksheetDraft,
  WorksheetType,
} from "@/lib/worksheets/types";
import { useBillingAccess } from "@/lib/billing/useBillingAccess";

function buildReadingLinesFromCards(nextCards: LessonCard[]) {
  if (nextCards.length === 0) {
    return Array.from({ length: 8 }, () => "");
  }

  return nextCards.map((card) => formatWorksheetWord(card.word));
}

function buildWritingLinesFromCards(nextCards: LessonCard[]) {
  if (nextCards.length === 0) {
    return Array.from({ length: 8 }, () => "");
  }

  return nextCards.map((card) => formatWorksheetWord(card.word));
}

export default function WorksheetsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { access, canAccessWorksheetType } = useBillingAccess();

  const [cards, setCards] = useState<LessonCard[]>([]);
  const [draft, setDraft] = useState<WorksheetDraft>(DEFAULT_WORKSHEET_DRAFT);
  const [worksheetId, setWorksheetId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [worksheetName, setWorksheetName] = useState("");
  const [worksheetIsPublic, setWorksheetIsPublic] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    setCards(readLessonTray());
    return subscribeToLessonTray((nextCards) => {
      setCards(nextCards);
    });
  }, []);

  useEffect(() => {
    const existingWorksheetId = searchParams.get("worksheet_id");
    if (!existingWorksheetId) return;

    let mounted = true;
    loadWorksheetById(supabase, existingWorksheetId)
      .then((worksheet) => {
        if (!mounted) return;
        const readingLines =
          worksheet.draft.type === "reading"
            ? worksheet.draft.readingLines?.length
              ? worksheet.draft.readingLines
              : buildReadingLinesFromCards(worksheet.cards)
            : worksheet.draft.readingLines ?? [];
        const writingLines =
          worksheet.draft.type === "writing"
            ? worksheet.draft.writingLines?.length
              ? worksheet.draft.writingLines
              : buildWritingLinesFromCards(worksheet.cards)
            : worksheet.draft.writingLines ?? [];
        setWorksheetId(worksheet.id);
        setWorksheetName(worksheet.name);
        setWorksheetIsPublic(worksheet.isPublic);
        setDraft({
          ...DEFAULT_WORKSHEET_DRAFT,
          ...worksheet.draft,
          questionBuilderPrompts: worksheet.draft.questionBuilderPrompts ?? [],
          readingLines,
          writingLines,
          sentenceScrambleLines: worksheet.draft.sentenceScrambleLines ?? [],
        });
        setCards(worksheet.cards);
        writeLessonTray(worksheet.cards);
      })
      .catch((error) => {
        console.error("Failed to load worksheet:", error);
      });

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  const selectedType = useMemo(
    () => WORKSHEET_TYPES.find((item) => item.id === draft.type) ?? null,
    [draft.type]
  );
  const activeWorksheetLocked =
    Boolean(selectedType && access && !canAccessWorksheetType(selectedType.id));
  const isQuestionBuilder = draft.type === "questions";
  const isSentenceScramble = draft.type === "sentence-scramble";
  const worksheetCards = cards;
  const trayDescription = isQuestionBuilder
    ? "Question Builder lets you type directly into the worksheet preview."
    : draft.type === "writing"
      ? "Writing uses the lesson cards as word cues and lets teachers build handwriting practice lines."
    : isSentenceScramble
      ? "Sentence Scramble uses the lesson cards and lets you scramble each sentence row from the preview."
    : "Every card in this tray is used for worksheet generation.";
  const questionBuilderCanRemove = isQuestionBuilder && (draft.questionBuilderPrompts?.length ?? 0) > cards.length;
  const questionBuilderRemoveReason = isQuestionBuilder
    ? "You can only remove a question after the worksheet has more image rows than the lesson tray."
    : "";

  const crosswordFitSummary = useMemo(() => {
    if (draft.type !== "crossword") return null;
    const layout = generateCrosswordLayout(cards, draft.difficulty, draft.shuffleSeed);
    if (!layout) return null;
    if (layout.placedWordCount >= cards.length) return null;

    return {
      placed: layout.placedWordCount,
      total: cards.length,
      missing: cards.length - layout.placedWordCount,
    };
  }, [cards, draft.difficulty, draft.shuffleSeed, draft.type]);

  const wordsearchFitSummary = useMemo(() => {
    if (draft.type !== "wordsearch") return null;
    const layout = generateWordsearchLayout(cards, draft.difficulty, draft.shuffleSeed, {
      fillRandomLetters: draft.wordsearchAddRandomLetters,
    });
    if (layout.unusedCards.length === 0) return null;

    return {
      placed: layout.placements.length,
      total: cards.length,
      missing: layout.unusedCards.length,
    };
  }, [cards, draft.difficulty, draft.shuffleSeed, draft.type, draft.wordsearchAddRandomLetters]);

  function selectWorksheetType(type: WorksheetType) {
    const nextDraft = buildWorksheetDraft(type);
    if (type === "reading") {
      nextDraft.readingLines = buildReadingLinesFromCards(cards);
    }
    if (type === "writing") {
      nextDraft.writingLines = buildWritingLinesFromCards(cards);
    }
    setDraft(nextDraft);
    setWorksheetName(nextDraft.title);
  }

  function updateDraft<K extends keyof WorksheetDraft>(key: K, value: WorksheetDraft[K]) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === "bullseyeVersion" && current.type === "bullseye") {
        next.instructions =
          value === "around-the-world"
            ? "Land on every segment and be the first team to reach the bullseye."
            : "Score points by landing on the wedges. The bullseye is worth 8 points.";
      }
      return next;
    });
  }

  function updateQuestionPrompts(nextPrompts: string[]) {
    setDraft((current) => ({
      ...current,
      questionBuilderPrompts: nextPrompts,
    }));
  }

  function updateReadingLines(nextLines: string[]) {
    setDraft((current) => ({
      ...current,
      readingLines: nextLines,
    }));
  }

  function updateWritingLines(nextLines: string[]) {
    setDraft((current) => ({
      ...current,
      writingLines: nextLines,
    }));
  }

  function updateSentenceScrambleLines(nextLines: string[]) {
    setDraft((current) => ({
      ...current,
      sentenceScrambleLines: nextLines,
    }));
  }

  function scrambleSentenceWorksheet() {
    setDraft((current) => ({
      ...current,
      sentenceScrambleLines: (current.sentenceScrambleLines.length ? current.sentenceScrambleLines : buildReadingLinesFromCards(cards)).map((line, index) =>
        scrambleSentenceLine(line, current.sentenceScrambleLevel, Date.now() + index * 97)
      ),
      shuffleSeed: Date.now(),
    }));
  }

  function addQuestionPrompt() {
    setDraft((current) => ({
      ...current,
      questionBuilderPrompts: [
        ...(current.questionBuilderPrompts?.length ? current.questionBuilderPrompts : []),
        "",
      ],
    }));
  }

  function removeQuestionPrompt() {
    setDraft((current) => {
      const nextPrompts = [...(current.questionBuilderPrompts ?? [])];
      if (nextPrompts.length === 0) return current;
      nextPrompts.pop();
      return {
        ...current,
        questionBuilderPrompts: nextPrompts,
      };
    });
  }

  function removeCard(id: string) {
    const nextCards = cards.filter((card) => card.id !== id);
    setCards(nextCards);
    if (nextCards.length > 0) writeLessonTray(nextCards);
    else clearLessonTray();
  }

  async function handleSaveWorksheet() {
    if (!user?.id) {
      setSaveError("You must be signed in to save worksheets.");
      return;
    }
    if (!draft.type) {
      setSaveError("Choose a worksheet type first.");
      return;
    }
    if (!worksheetName.trim()) {
      setSaveError("Worksheet name is required.");
      return;
    }

    setIsSaving(true);
    setSaveError("");
    try {
      const saved = await saveWorksheetFromClient(supabase, {
        worksheetId,
        userId: user.id,
        name: worksheetName.trim(),
        worksheetType: draft.type,
        isPublic: worksheetIsPublic,
        cards: worksheetCards,
        draft: {
          ...draft,
          title: worksheetName.trim(),
        },
      });
      setWorksheetId(saved.id);
      setWorksheetName(saved.name);
      setWorksheetIsPublic(saved.isPublic);
      setDraft(saved.draft);
      setShowSaveModal(false);
    } catch (error: any) {
      console.error("Failed to save worksheet:", error);
      setSaveError(error?.message || "Failed to save worksheet.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleExportPdf() {
    setIsExporting(true);
    const activeDraft = {
      ...draft,
      title: worksheetName.trim() || draft.title || "Worksheet",
    };
    try {
      const response = await fetch("/api/worksheets/export-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cards: worksheetCards,
          draft: activeDraft,
          includeTeacherCopy: false,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${(worksheetName.trim() || activeDraft.title || "worksheet")
        .trim()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "") || "worksheet"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      console.error("Failed to export worksheet PDF:", error);
    } finally {
      setIsExporting(false);
    }
  }

  async function handlePrintNow() {
    setIsPrinting(true);
    const html = await buildWorksheetPrintHtml(worksheetCards, {
      ...draft,
      title: worksheetName.trim() || draft.title || "Worksheet",
    }, {
      includeTeacherCopy: false,
      previewMode: false,
    });
    openWorksheetPrintWindow(
      html,
      "Popup blocked. Allow popups for this site to print the worksheet.",
      () => setIsPrinting(false)
    );
  }

  return (
    <div className={`${activeWorksheetLocked ? "min-h-screen overflow-x-hidden" : "h-screen overflow-hidden"} bg-[var(--color-bg-main)] text-[var(--color-text-main)]`}>
      <PageHeader
        title="Worksheets"
        sticky={false}
        primaryItems={[
          { label: "Classroom", href: "/flashcards/classroom", tone: "classroom" },
        ]}
        secondaryItems={[
          { label: "Flashcards", href: "/flashcards" },
          { label: "Dashboard", href: "/dashboard" },
          { label: "Community", href: "/teacher/community" },
        ]}
      />

      <main className={`max-w-7xl mx-auto px-6 py-4 ${activeWorksheetLocked ? "min-h-[calc(100vh-89px)]" : "h-[calc(100vh-89px)] overflow-hidden"} flex flex-col gap-3`}>
        <section className="bg-white rounded-2xl border shadow-sm px-4 py-2.5 shrink-0">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <h2 className="text-sm font-semibold">Lesson Tray</h2>
              <p className="text-xs text-[var(--color-text-muted)]">{trayDescription}</p>
            </div>
            <button
              onClick={() => (window.location.href = "/flashcards")}
              className="btn btn-secondary px-3 py-2 text-sm shrink-0"
            >
              Add Cards
            </button>
          </div>

          <LessonTrayScroller className="pb-1" contentClassName="gap-2">
            {cards.length === 0 ? (
              <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-[var(--color-text-muted)] text-center min-w-full">
                No cards in the lesson tray yet.
              </div>
            ) : (
              cards.map((card) => (
                <div
                  key={card.id}
                  className="relative shrink-0 w-[116px] rounded-xl border bg-[var(--color-bg-soft)] p-1.5 pr-6"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg overflow-hidden border bg-white shrink-0">
                      {resolveLessonImageUrl(card.image) ? (
                        <img
                          src={resolveLessonImageUrl(card.image)}
                          alt={formatWorksheetWord(card.word)}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="text-[11px] font-medium leading-tight line-clamp-2">
                      {formatWorksheetWord(card.word)}
                    </div>
                  </div>

                  <button
                    onClick={() => removeCard(card.id)}
                    className="absolute top-1 right-1 h-4.5 w-4.5 rounded-full bg-white border border-red-200 text-red-600 flex items-center justify-center text-[10px] hover:bg-red-50"
                    aria-label={`Remove ${formatWorksheetWord(card.word)}`}
                  >
                    x
                  </button>
                </div>
              ))
            )}
          </LessonTrayScroller>
        </section>

        <section className="shrink-0">
          <LessonTrayScroller className="pb-1" contentClassName="gap-2">
            {WORKSHEET_TYPES.map((item) => {
              const isSelected = selectedType?.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => item.available && selectWorksheetType(item.id)}
                  disabled={!item.available}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    access && !access.isPremium && access.featuredWorksheetType === item.id
                      ? isSelected
                        ? "border-[#cfb25a] bg-[linear-gradient(135deg,#ffe7a8,#ffd46b)] text-[#744f0f] shadow-[0_16px_34px_rgba(190,160,74,0.26)] ring-2 ring-[#f2df99]/80"
                        : "border-[#d8c27e] bg-[linear-gradient(135deg,#fff8e2,#fff0b8)] text-[#8a6117] shadow-[0_12px_28px_rgba(190,160,74,0.18)] hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(190,160,74,0.24)]"
                      : isSelected
                      ? "bg-[var(--color-primary,#1d4ed8)] text-white border-[var(--color-primary,#1d4ed8)] shadow-sm"
                      : item.available
                        ? "bg-white text-[var(--color-text-main)] border-black/10 hover:bg-[var(--color-bg-soft)]"
                        : "bg-white/70 text-[var(--color-text-muted)] border-black/10 opacity-70 cursor-not-allowed"
                  }`}
                  title={item.description}
                >
                  <span>{item.label}</span>
                  {access && !access.isPremium && access.featuredWorksheetType === item.id ? (
                    <span className="ml-2 rounded-full border border-[#e1c97b] bg-white/70 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#9a6b14]">
                      Free this week
                    </span>
                  ) : null}
                  {access && !access.isPremium && access.featuredWorksheetType !== item.id ? (
                    <span className="ml-2 text-[10px] font-medium opacity-80">Premium</span>
                  ) : null}
                  {!item.available ? <span className="ml-2 text-[10px] font-medium opacity-80">Soon</span> : null}
                </button>
              );
            })}
          </LessonTrayScroller>
        </section>

        <div className={`relative grid grid-cols-12 gap-4 ${activeWorksheetLocked ? "" : "min-h-0 flex-1 overflow-hidden"}`}>
          <aside className={`${activeWorksheetLocked ? "hidden" : "col-span-12 lg:col-span-4 xl:col-span-3 min-h-0 overflow-hidden"}`}>
            <div className="h-full flex flex-col gap-4">
              <div className="min-h-0 overflow-y-auto pr-1">
                {selectedType && !activeWorksheetLocked && access && !access.isPremium ? (
                  <div className="bg-white rounded-2xl border shadow-sm p-4 text-sm text-[var(--color-text-muted)]">
                    Advanced worksheet controls are part of Premium. Free accounts can still use the featured weekly worksheet with its default layout.
                  </div>
                ) : selectedType ? (
                <WorksheetOptionsPanel
                  worksheetType={selectedType}
                  draft={draft}
                  onUpdate={updateDraft}
                  onQuestionPromptsAdd={addQuestionPrompt}
                  onQuestionPromptsRemove={removeQuestionPrompt}
                onSentenceScramble={scrambleSentenceWorksheet}
                questionBuilderCanRemove={questionBuilderCanRemove}
                questionBuilderRemoveReason={questionBuilderRemoveReason}
                crosswordFitSummary={crosswordFitSummary}
                wordsearchFitSummary={wordsearchFitSummary}
              />
                ) : (
                  <div className="bg-white rounded-2xl border shadow-sm p-4 text-sm text-[var(--color-text-muted)]">
                    Select a worksheet type to see its editing options here.
                  </div>
                )}
              </div>
            </div>
          </aside>

          <section className={`${activeWorksheetLocked ? "col-span-12" : "col-span-12 lg:col-span-8 xl:col-span-9 min-h-0 overflow-hidden"}`}>
            <div className={`relative ${activeWorksheetLocked ? "min-h-[1200px]" : "h-full group"}`}>
              <WorksheetPreview
              cards={cards}
              draft={{ ...draft, title: worksheetName || draft.title }}
              onQuestionPromptsChange={updateQuestionPrompts}
              onReadingLinesChange={updateReadingLines}
              onWritingLinesChange={updateWritingLines}
              onSentenceScrambleLinesChange={updateSentenceScrambleLines}
              className={activeWorksheetLocked ? "h-auto min-h-[1200px]" : "h-full"}
            />

              <div className={`absolute inset-x-0 bottom-0 z-20 flex items-end justify-center px-6 pb-6 pointer-events-none ${activeWorksheetLocked ? "hidden" : ""}`}>
                <div className="w-full max-w-3xl px-6 pt-6 pb-1 opacity-0 transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                  <div className="pointer-events-auto mx-auto flex items-center justify-center gap-3 px-4 py-3">
                    <button
                      onClick={() => setShowSaveModal(true)}
                    disabled={activeWorksheetLocked || !draft.type || (!isQuestionBuilder && cards.length === 0)}
                      className="btn btn-primary px-4 py-2 text-sm shadow-[0_12px_30px_rgba(15,23,42,0.18)] disabled:opacity-50"
                    >
                      Save Worksheet
                    </button>
                    <button
                      onClick={handleExportPdf}
                      disabled={activeWorksheetLocked || !draft.type || (!isQuestionBuilder && cards.length === 0) || isExporting}
                      className="btn btn-secondary px-4 py-2 text-sm bg-white/98 shadow-[0_12px_30px_rgba(15,23,42,0.18)] disabled:opacity-50"
                    >
                      {isExporting ? "Exporting…" : "Export PDF"}
                    </button>
                    <button
                      onClick={handlePrintNow}
                      disabled={activeWorksheetLocked || !draft.type || (!isQuestionBuilder && cards.length === 0) || isPrinting}
                      className="btn btn-secondary px-4 py-2 text-sm bg-white/98 shadow-[0_12px_30px_rgba(15,23,42,0.18)] disabled:opacity-50"
                    >
                      {isPrinting ? "Printing…" : "Print Now"}
                    </button>
                  </div>
                </div>
              </div>

              <div className={`absolute inset-x-0 bottom-0 h-28 z-10 group ${activeWorksheetLocked ? "hidden" : ""}`} />
            </div>
          </section>

          {activeWorksheetLocked && selectedType ? (
            <PremiumPreviewOverlay
              title="This worksheet is locked on the Free plan"
              description={`You can preview ${selectedType.label} here. Upgrade to Premium to unlock this worksheet type, every worksheet style, and the full builder controls.`}
              secondaryHref="/flashcards"
              secondaryLabel="Return to Flashcards"
            />
          ) : null}
        </div>
      </main>

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-[90%] max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Save Worksheet</h2>

            <input
              type="text"
              value={worksheetName}
              onChange={(event) => setWorksheetName(event.target.value)}
              placeholder="Enter worksheet name"
              className="w-full mb-3 px-3 py-2 rounded-lg border border-black/10 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />

            <div className="flex items-center justify-between mb-5">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={worksheetIsPublic}
                  onChange={() => setWorksheetIsPublic((value) => !value)}
                  className="w-4 h-4"
                />
                <span className="select-none">
                  {worksheetIsPublic ? "Public — visible in worksheet community later" : "Private — only visible to you"}
                </span>
              </label>
            </div>

            {saveError && <div className="text-sm text-red-600 mb-3">{saveError}</div>}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSaveError("");
                  setShowSaveModal(false);
                }}
                className="px-4 py-2 rounded-lg border border-black/10 bg-[var(--color-bg-soft)] text-sm hover:bg-white transition"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveWorksheet}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90 transition disabled:opacity-60"
              >
                {isSaving ? "Saving…" : "Save Worksheet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
