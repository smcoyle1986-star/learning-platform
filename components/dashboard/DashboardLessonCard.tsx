import { Edit, FileSpreadsheet, Play, Printer, Trash2 } from "lucide-react";

import { LessonRecord } from "@/lib/lessons/types";

type DashboardLessonCardProps = {
  lesson: LessonRecord;
  selected?: boolean;
  enterLabel?: string;
  enterButtonClassName?: string;
  onSelect: (lesson: LessonRecord) => void;
  onPreview: (lesson: LessonRecord) => void;
  onEdit: (lesson: LessonRecord) => void;
  onOpenGames: (lesson: LessonRecord) => void;
  onDelete: (lessonId: string) => void;
  onEnterClassroom: (lesson: LessonRecord) => void;
  onOpenWorksheets: (lesson: LessonRecord) => void;
  onPrint: (lesson: LessonRecord) => void;
  onConvertToBasic: (lesson: LessonRecord) => void;
  onUpgrade: () => void;
  isPremium: boolean;
};

export default function DashboardLessonCard({
  lesson,
  selected = false,
  enterLabel = "Enter Classroom",
  enterButtonClassName = "btn btn-primary flex-1 px-3 py-2 text-sm",
  onSelect,
  onPreview,
  onEdit,
  onOpenGames,
  onDelete,
  onEnterClassroom,
  onOpenWorksheets,
  onPrint,
  onConvertToBasic,
  onUpgrade,
  isPremium,
}: DashboardLessonCardProps) {
  const setLimitLocked = lesson.lockReasons?.includes("set_limit") ?? false;
  const premiumImagesLocked = lesson.lockReasons?.includes("premium_images") ?? false;
  const locked = Boolean(lesson.isLocked);
  const editLocked = !isPremium && Boolean(lesson.containsPremiumImages);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(lesson)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(lesson);
        }
      }}
      className={`bg-white rounded-2xl p-5 transition relative border shadow-sm ${locked ? "border-amber-300 bg-amber-50/30" : "hover:shadow-md cursor-pointer"} ${
        selected ? "border-blue-600 ring-2 ring-blue-100 shadow-md" : ""
      }`}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {setLimitLocked ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">Locked · over 6-set Basic limit</span> : null}
        {premiumImagesLocked ? <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-purple-800">Locked · contains Premium images</span> : null}
        {lesson.containsPremiumImages && !premiumImagesLocked ? <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-purple-700">Contains Premium images · Basic version active</span> : null}
      </div>
      <div className="flex items-center gap-2 mb-2">
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

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 mt-7">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onOpenWorksheets(lesson);
            }}
            disabled={locked}
            className="btn btn-secondary px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            title="Worksheets"
          >
            <FileSpreadsheet size={14} />
          </button>

          <button
            onClick={(event) => {
              event.stopPropagation();
              onOpenGames(lesson);
            }}
            disabled={locked}
            className="btn btn-secondary px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            title="Games"
            aria-label="Open Games"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M6 12c0-1.333-.667-2-2-2S2 10.667 2 12s.667 2 2 2 2-.667 2-2z" />
              <path d="M22 12c0-1.333-.667-2-2-2s-2 .667-2 2 .667 2 2 2 2-.667 2-2z" />
              <path d="M4.5 12h15a3.5 3.5 0 0 1 3.5 3.5V17a3.5 3.5 0 0 1-3.5 3.5H4.5A3.5 3.5 0 0 1 1 17v-1.5A3.5 3.5 0 0 1 4.5 12z" />
              <path d="M9 15v.01" />
              <path d="M12 13v4" />
              <path d="M15 15v.01" />
            </svg>
          </button>

          <button
            onClick={(event) => {
              event.stopPropagation();
              onEdit(lesson);
            }}
            disabled={locked || editLocked}
            className="btn btn-secondary px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            title="Edit"
          >
            <Edit size={14} />
          </button>

          <button
            onClick={(event) => {
              event.stopPropagation();
              onDelete(lesson.id);
            }}
            className="btn btn-secondary px-2 py-1.5 text-xs bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div className="text-right text-xs text-[var(--color-text-muted)] flex flex-col gap-2 mt-7">
          <div>{lesson.cards?.length ?? 0} cards</div>
          <div>{lesson.useCount ?? 0} uses</div>
          <div
            className="self-end cb-badge-icon text-[var(--color-text-muted)]"
            title={lesson.isPublic ? "Public" : "Private"}
            aria-label={lesson.isPublic ? "Public" : "Private"}
          >
            {lesson.isPublic ? "🌍" : "🔒"}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={(event) => {
            event.stopPropagation();
            onEnterClassroom(lesson);
          }}
          disabled={locked}
          className={`${enterButtonClassName} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <Play size={14} />
          {enterLabel}
        </button>

        <button
          onClick={(event) => {
            event.stopPropagation();
            onPrint(lesson);
          }}
          disabled={locked}
          className="btn btn-secondary px-3 py-2 flex items-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Printer size={14} />
          Print
        </button>
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
