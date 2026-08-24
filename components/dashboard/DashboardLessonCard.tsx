"use client";

import { useState } from "react";
import { ChevronDown, Edit, FileSpreadsheet, Folder, Layers, MoreHorizontal, Play, Printer, Star, Trash2 } from "lucide-react";

import { LessonRecord } from "@/lib/lessons/types";

type DashboardLessonCardProps = {
  lesson: LessonRecord;
  enterLabel?: string;
  enterButtonClassName?: string;
  onPreview: (lesson: LessonRecord) => void;
  onOpenFlashcards: (lesson: LessonRecord) => void;
  onEdit: (lesson: LessonRecord) => void;
  onOpenGames: (lesson: LessonRecord) => void;
  onDelete: (lessonId: string) => void;
  onEnterClassroom: (lesson: LessonRecord) => void;
  onOpenWorksheets: (lesson: LessonRecord) => void;
  onPrint: (lesson: LessonRecord) => void;
  onConvertToBasic: (lesson: LessonRecord) => void;
  onUpgrade: () => void;
  isPremium: boolean;
  viewMode?: "grid" | "list";
  showLibraryControls?: boolean;
  libraryStatePending?: boolean;
  onToggleFavorite?: (lesson: LessonRecord) => void;
  onToggleArchived?: (lesson: LessonRecord) => void;
};

export default function DashboardLessonCard({
  lesson,
  enterLabel = "Enter Classroom",
  enterButtonClassName = "btn btn-primary flex-1 px-3 py-2 text-sm",
  onPreview,
  onOpenFlashcards,
  onEdit,
  onOpenGames,
  onDelete,
  onEnterClassroom,
  onOpenWorksheets,
  onPrint,
  onConvertToBasic,
  onUpgrade,
  isPremium,
  viewMode = "grid",
  showLibraryControls = false,
  libraryStatePending = false,
  onToggleFavorite,
  onToggleArchived,
}: DashboardLessonCardProps) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const setLimitLocked = lesson.lockReasons?.includes("set_limit") ?? false;
  const premiumImagesLocked = lesson.lockReasons?.includes("premium_images") ?? false;
  const locked = Boolean(lesson.isLocked);
  const editLocked = !isPremium && Boolean(lesson.containsPremiumImages);
  const archived = Boolean(lesson.archivedAt);

  const libraryControls = showLibraryControls ? (
    <div className="flex items-center gap-1" aria-label="Lesson library controls">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite?.(lesson);
        }}
        disabled={libraryStatePending}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 disabled:cursor-wait disabled:opacity-50 ${
          lesson.isFavorite
            ? "scale-110 text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.65)]"
            : "text-slate-400 hover:scale-105 hover:bg-yellow-50 hover:text-yellow-500"
        }`}
        title={lesson.isFavorite ? "Remove from favourites" : "Add to favourites"}
        aria-label={lesson.isFavorite ? "Remove from favourites" : "Add to favourites"}
        aria-pressed={Boolean(lesson.isFavorite)}
      >
        <Star size={18} fill={lesson.isFavorite ? "currentColor" : "none"} />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleArchived?.(lesson);
        }}
        disabled={libraryStatePending}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 disabled:cursor-wait disabled:opacity-50 ${
          archived
            ? "scale-110 text-blue-900 drop-shadow-[0_0_4px_rgba(30,58,138,0.32)]"
            : "text-slate-400 hover:scale-105 hover:bg-blue-50 hover:text-blue-800"
        }`}
        title={archived ? "Unarchive lesson" : "Archive lesson"}
        aria-label={archived ? "Unarchive lesson" : "Archive lesson"}
        aria-pressed={archived}
      >
        <Folder size={18} fill={archived ? "currentColor" : "none"} />
      </button>
    </div>
  ) : null;

  if (viewMode === "list") {
    return (
      <div className={`relative flex flex-col gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm transition md:flex-row md:items-center ${locked ? "border-amber-300 bg-amber-50/30" : "hover:shadow-md"}`}>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            {libraryControls}
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); onPreview(lesson); }}
              className="min-w-0 truncate text-left font-semibold text-[var(--color-text-main)] hover:text-blue-700 hover:underline"
              title={lesson.name}
            >
              {lesson.name}
            </button>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-text-muted)]">
            <span>{lesson.cards?.length ?? 0} cards</span>
            <span>{lesson.useCount ?? 0} uses</span>
            <span>{lesson.isPublic ? "Public" : "Private"}</span>
            {setLimitLocked ? <span className="font-semibold text-amber-800">Locked · Basic set limit</span> : null}
            {premiumImagesLocked ? <span className="font-semibold text-purple-800">Locked · Premium images</span> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => onEnterClassroom(lesson)} disabled={locked} className="btn btn-primary px-3 py-1.5 text-xs disabled:opacity-40"><Play size={14} />Classroom</button>
          <button type="button" onClick={() => onOpenFlashcards(lesson)} disabled={locked} className="btn btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"><Layers size={14} />Edit in Flashcards</button>
          <button type="button" onClick={() => onPrint(lesson)} disabled={locked} className="btn btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"><Printer size={14} />Print</button>
          <button type="button" onClick={() => setToolsOpen((open) => !open)} className="btn btn-secondary px-3 py-1.5 text-xs" aria-expanded={toolsOpen}><MoreHorizontal size={14} />More tools <ChevronDown size={13} className={toolsOpen ? "rotate-180" : ""} /></button>
        </div>
        {toolsOpen ? <div className="flex flex-wrap items-center gap-2 border-t border-[#e4e9e1] pt-3 md:ml-auto md:border-t-0 md:pt-0">
          <button type="button" onClick={() => onOpenWorksheets(lesson)} disabled={locked} className="btn btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"><FileSpreadsheet size={14} />Worksheets</button>
          <button type="button" onClick={() => onOpenGames(lesson)} disabled={locked} className="btn btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"><Play size={14} />Games</button>
          <button type="button" onClick={() => onEdit(lesson)} disabled={locked || editLocked} className="btn btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"><Edit size={14} />Edit</button>
          {!isPremium && lesson.containsPremiumImages ? (
            <button type="button" onClick={onUpgrade} className="btn btn-primary px-3 py-1.5 text-xs">Upgrade</button>
          ) : null}
          {!isPremium && premiumImagesLocked && lesson.basicConversionAvailable ? (
            <button type="button" onClick={() => onConvertToBasic(lesson)} className="btn btn-secondary px-3 py-1.5 text-xs">Convert to Basic</button>
          ) : null}
          <button type="button" onClick={() => onDelete(lesson.id)} className="btn btn-secondary border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100"><Trash2 size={14} />Delete</button>
        </div> : null}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl p-5 transition relative border shadow-sm ${locked ? "border-amber-300 bg-amber-50/30" : "hover:shadow-md"}`}>
      {showLibraryControls ? <div className="absolute right-3 top-3 z-20">{libraryControls}</div> : null}
      <div className={`mb-3 flex flex-wrap gap-2 ${showLibraryControls ? "pr-20" : ""}`}>
        {setLimitLocked ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">Locked · over 6-set Basic limit</span> : null}
        {premiumImagesLocked ? <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-purple-800">Locked · contains Premium images</span> : null}
        {lesson.containsPremiumImages && !premiumImagesLocked ? <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-purple-700">Contains Premium images · Basic version active</span> : null}
      </div>
      <div className={`mb-2 flex items-center gap-2 ${showLibraryControls ? "pr-20" : ""}`}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPreview(lesson);
          }}
          className="group inline-flex items-center gap-2 font-semibold text-[var(--color-text-main)] truncate text-left cursor-pointer hover:text-blue-700"
          title={lesson.name}
          aria-label={lesson.name}
        >
          <span className="truncate group-hover:underline underline-offset-4">{lesson.name}</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-blue-600 opacity-0 transition group-hover:opacity-100">
            Preview
          </span>
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-text-muted)]">
        <span>{lesson.cards?.length ?? 0} cards</span>
        <span>{lesson.useCount ?? 0} uses</span>
        <span>{lesson.isPublic ? "Public" : "Private"}</span>
      </div>

      <div className="mt-5">
        <button
          onClick={() => onEnterClassroom(lesson)}
          disabled={locked}
          className={`${enterButtonClassName} w-full disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <Play size={14} />
          {enterLabel}
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onOpenFlashcards(lesson)} disabled={locked} className="btn btn-secondary px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">
          <Layers size={15} /> Edit in Flashcards
        </button>
        <button
          onClick={() => onPrint(lesson)}
          disabled={locked}
          className="btn btn-secondary px-3 py-2 flex items-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Printer size={14} />
          Print
        </button>
      </div>
      <div className="mt-2 border-t border-[#e4e9e1] pt-2">
        <button type="button" onClick={() => setToolsOpen((open) => !open)} className="btn btn-ghost w-full justify-between px-2 py-2 text-xs text-[var(--color-text-muted)]" aria-expanded={toolsOpen}>
          <span className="inline-flex items-center gap-2"><MoreHorizontal size={15} /> More tools</span>
          <ChevronDown size={15} className={toolsOpen ? "rotate-180" : ""} />
        </button>
        {toolsOpen ? <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onOpenWorksheets(lesson)} disabled={locked} className="btn btn-secondary px-3 py-2 text-xs disabled:opacity-40"><FileSpreadsheet size={14} /> Worksheets</button>
          <button type="button" onClick={() => onOpenGames(lesson)} disabled={locked} className="btn btn-secondary px-3 py-2 text-xs disabled:opacity-40"><Play size={14} /> Games</button>
          <button type="button" onClick={() => onEdit(lesson)} disabled={locked || editLocked} className="btn btn-secondary px-3 py-2 text-xs disabled:opacity-40"><Edit size={14} /> Edit card text</button>
          <button type="button" onClick={() => onDelete(lesson.id)} className="btn btn-secondary border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 hover:bg-red-100"><Trash2 size={14} /> Delete</button>
        </div> : null}
      </div>
      {!isPremium && lesson.containsPremiumImages ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-purple-100 pt-3">
          <button type="button" onClick={(event) => { event.stopPropagation(); onUpgrade(); }} className="btn btn-primary px-3 py-2 text-xs">
            Upgrade to Premium
          </button>
          {premiumImagesLocked && lesson.basicConversionAvailable ? (
            <button type="button" onClick={(event) => { event.stopPropagation(); onConvertToBasic(lesson); }} className="btn btn-secondary px-3 py-2 text-xs">
              Convert to Basic
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
