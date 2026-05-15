"use client";

import { FileSpreadsheet, Printer, X } from "lucide-react";

import { TrayItem } from "@/lib/flashcards/types";
import FlashcardsNavActions from "@/components/flashcards/FlashcardsNavActions";
import LessonTrayScroller from "@/components/shared/LessonTrayScroller";
import { resolveLessonImageUrl } from "@/lib/lessons/image";

type LessonTrayBarProps = {
  openDropdown: string | null;
  editingLessonSetId: string | null;
  lessonName: string;
  lessonTray: TrayItem[];
  showSavedIndicator: boolean;
  formatWord: (word: string) => string;
  trayItemRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  draggedIndex: number | null;
  dragOverIndex: number | null;
  onDragStart: (event: React.DragEvent, index: number) => void;
  onDragOver: (event: React.DragEvent, index: number) => void;
  onDrop: (event: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onTrayItemKeyDown: (event: React.KeyboardEvent, index: number) => void;
  onSetOpenDropdown: (value: string | null) => void;
  onRemoveFromTray: (id: string) => void;
  onOpenSaveModal: () => void;
  onGoDashboard: () => void;
  onGoGames: () => void;
  onGoCommunity: () => void;
  onGoClassroom: () => void;
  onGoWorksheets: () => void;
  onPrint: () => void;
  onClearTray: () => void;
};

export default function LessonTrayBar({
  openDropdown,
  editingLessonSetId,
  lessonName,
  lessonTray,
  showSavedIndicator,
  formatWord,
  trayItemRefs,
  draggedIndex,
  dragOverIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onTrayItemKeyDown,
  onSetOpenDropdown,
  onRemoveFromTray,
  onOpenSaveModal,
  onGoDashboard,
  onGoGames,
  onGoWorksheets,
  onGoCommunity,
  onGoClassroom,
  onPrint,
  onClearTray,
}: LessonTrayBarProps) {
  return (
    <section className="sticky top-0 z-40 bg-[var(--color-bg-main)] border-b border-black/5">
      <div className="max-w-7xl mx-auto px-6 py-2 flex flex-col gap-1">
        <div className="flex items-center justify-end">
          <FlashcardsNavActions
            openDropdown={openDropdown}
            onSetOpenDropdown={onSetOpenDropdown}
            onGoDashboard={onGoDashboard}
            onGoGames={onGoGames}
            onGoWorksheets={onGoWorksheets}
            onGoCommunity={onGoCommunity}
            onGoClassroom={onGoClassroom}
          />
        </div>

        {editingLessonSetId && (
          <div className="text-[11px] leading-tight text-[var(--color-text-muted)]">
            <span className="font-medium mr-2">Editing:</span>
            <span className="font-semibold">{lessonName || "Untitled Lesson"}</span>
          </div>
        )}

        <LessonTrayScroller className="lesson-tray-scroll" contentClassName="gap-2">
          {lessonTray.length === 0 && (
            <div className="px-3 py-1 rounded-lg border border-dashed border-black/20 text-xs text-[var(--color-text-muted)] whitespace-nowrap">
              Click flashcards to add
            </div>
          )}

          {lessonTray.map((card, index) => (
            <div
              key={card.id}
              ref={(element) => {
                trayItemRefs.current[card.id] = element;
              }}
              draggable
              onDragStart={(event) => onDragStart(event, index)}
              onDragOver={(event) => onDragOver(event, index)}
              onDrop={(event) => onDrop(event, index)}
              onDragEnd={onDragEnd}
              tabIndex={0}
              onKeyDown={(event) => onTrayItemKeyDown(event, index)}
              aria-label={`Tray card ${formatWord(card.word)} — position ${index + 1}`}
              role="button"
              className={`relative flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-xl border bg-[var(--color-bg-soft)] text-sm whitespace-nowrap select-none transition transform
                ${draggedIndex === index ? "opacity-60 scale-95 cursor-grabbing" : "cursor-grab"}
                ${dragOverIndex === index && draggedIndex !== null ? "ring-2 ring-dashed ring-[var(--color-accent)]" : ""}`}
              title={`${formatWord(card.word)} — use Left/Right to move, Delete to remove`}
            >
              {card.image ? (
                <img
                  src={resolveLessonImageUrl(card.image)}
                  alt={formatWord(card.word)}
                  className="w-8 h-8 rounded-md object-cover border border-black/10 bg-white shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-md border border-dashed border-black/10 bg-white/70 shrink-0" />
              )}
              <span className="text-[11px] pr-1">{formatWord(card.word)}</span>
              <button
                onClick={() => onRemoveFromTray(card.id)}
                className="absolute -top-0 -right-2 bg-white rounded-full border shadow p-0.5 hover:bg-red-50"
                aria-label={`Remove ${formatWord(card.word)} from tray`}
              >
                <X size={12} className="text-red-500" />
              </button>
            </div>
          ))}
        </LessonTrayScroller>

        <div className="flex items-center gap-2 flex-wrap">
          {lessonTray.length > 0 && (
            <>
              <button onClick={onOpenSaveModal} className="btn btn-primary px-3 py-1 text-xs">
                Save To Dashboard
              </button>

              <button
                onClick={onGoWorksheets}
                className="btn btn-secondary px-3 py-1 text-xs flex items-center gap-1.5"
                title="Create worksheets"
              >
                <FileSpreadsheet size={14} />
                Worksheets
              </button>

              <button
                onClick={onPrint}
                className="btn btn-secondary px-3 py-1 text-xs flex items-center gap-1.5"
                title="Print lesson"
              >
                <Printer size={14} />
                Print
              </button>

              <button onClick={onClearTray} className="btn btn-secondary px-3 py-1 text-xs">
                Remove all
              </button>
            </>
          )}

          {showSavedIndicator && (
            <span className="text-xs text-[var(--color-accent)] font-medium animate-pulse">
              Saved!
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
