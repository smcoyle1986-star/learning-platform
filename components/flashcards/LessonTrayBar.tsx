"use client";

import { BookOpen, FileSpreadsheet, Presentation, Printer, X } from "lucide-react";

import { TrayItem } from "@/lib/flashcards/types";
import LessonTrayScroller from "@/components/shared/LessonTrayScroller";
import { resolveLessonImageUrl } from "@/lib/lessons/image";

type LessonTrayBarProps = {
  editingLessonSetId: string | null;
  lessonName: string;
  lessonTray: TrayItem[];
  showSavedIndicator: boolean;
  isGuest?: boolean;
  guestLimit?: number;
  formatWord: (word: string) => string;
  trayItemRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  draggedIndex: number | null;
  dragOverIndex: number | null;
  onDragStart: (event: React.DragEvent, index: number) => void;
  onDragOver: (event: React.DragEvent, index: number) => void;
  onDrop: (event: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onTrayItemKeyDown: (event: React.KeyboardEvent, index: number) => void;
  onRemoveFromTray: (id: string) => void;
  onOpenSaveModal: () => void;
  onGuestSave?: () => void;
  onGoClassroom: () => void;
  onGoLessonPlans?: () => void;
  onGoWorksheets: () => void;
  onPrint: () => void;
  onClearTray: () => void;
};

export default function LessonTrayBar({
  editingLessonSetId,
  lessonName,
  lessonTray,
  showSavedIndicator,
  isGuest = false,
  guestLimit = 6,
  formatWord,
  trayItemRefs,
  draggedIndex,
  dragOverIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onTrayItemKeyDown,
  onRemoveFromTray,
  onOpenSaveModal,
  onGuestSave,
  onGoClassroom,
  onGoLessonPlans,
  onGoWorksheets,
  onPrint,
  onClearTray,
}: LessonTrayBarProps) {
  return (
    <section className="sticky top-0 z-40 bg-[var(--color-bg-main)] border-b border-black/5">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 md:px-6">
        {editingLessonSetId && (
          <div className="text-[11px] leading-tight text-[var(--color-text-muted)]">
            <span className="font-medium mr-2">Editing:</span>
            <span className="font-semibold">{lessonName || "Untitled Lesson"}</span>
          </div>
        )}
        {isGuest ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] leading-tight text-[var(--color-text-muted)]">
            <span><strong className="text-[#4f6548]">Guest lesson:</strong> {lessonTray.length}/{guestLimit} cards</span>
            <span>Temporary for this browser session</span>
          </div>
        ) : null}

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

        <div className="flex flex-wrap items-center gap-2">
          {lessonTray.length > 0 && (
            <>
              <button
                onClick={onGoClassroom}
                className="btn btn-primary w-full px-4 py-2.5 text-sm shadow-[0_8px_18px_rgba(126,167,106,0.2)] sm:w-auto"
                title="Present these cards full-screen in Interactive Classroom"
              >
                <Presentation size={17} />
                Present {lessonTray.length} card{lessonTray.length === 1 ? "" : "s"} in Classroom
              </button>
              <button onClick={isGuest ? onGuestSave : onOpenSaveModal} className="btn btn-primary px-3 py-2 text-sm sm:py-1 sm:text-xs">
                {isGuest ? "Sign up to save" : "Save To Dashboard"}
              </button>

              {!isGuest ? (
                <button
                  onClick={onGoWorksheets}
                  className="btn btn-secondary px-3 py-2 text-sm sm:py-1 sm:text-xs flex items-center gap-1.5"
                  title="Create worksheets"
                >
                  <FileSpreadsheet size={14} />
                  Worksheets
                </button>
              ) : null}

              {isGuest && onGoLessonPlans ? (
                <button
                  onClick={onGoLessonPlans}
                  className="btn btn-secondary px-3 py-2 text-sm sm:py-1 sm:text-xs flex items-center gap-1.5"
                  title="Make a lesson plan from this temporary lesson"
                >
                  <BookOpen size={14} />
                  Lesson Plan
                </button>
              ) : null}

              <button
                onClick={onPrint}
                className="btn btn-secondary px-3 py-2 text-sm sm:py-1 sm:text-xs flex items-center gap-1.5"
                title="Print lesson"
              >
                <Printer size={14} />
                Print
              </button>

              <button onClick={onClearTray} className="btn btn-secondary px-3 py-2 text-sm sm:py-1 sm:text-xs">
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
