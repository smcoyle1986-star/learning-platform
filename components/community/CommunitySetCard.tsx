"use client";

import { AlertTriangle } from "lucide-react";

import { CommunityLessonSet } from "@/lib/community/types";

type CommunitySetCardProps = {
  setItem: CommunityLessonSet;
  selected?: boolean;
  authorName?: string;
  previewImage?: string;
  isOwner: boolean;
  onSelect: (setItem: CommunityLessonSet) => void;
  onPreview: (setItem: CommunityLessonSet) => void;
  onAddToDashboard: (setItem: CommunityLessonSet) => void;
  onReport: (setItem: CommunityLessonSet) => void;
};

export default function CommunitySetCard({
  setItem,
  selected = false,
  authorName,
  previewImage,
  isOwner,
  onSelect,
  onPreview,
  onAddToDashboard,
  onReport,
}: CommunitySetCardProps) {
  const tagLabel = setItem.tags && setItem.tags.length > 0 ? setItem.tags.slice(0, 3) : [];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(setItem)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(setItem);
        }
      }}
      className={`bg-white rounded-2xl p-5 relative border shadow-sm hover:shadow-md transition cursor-pointer ${
        selected ? "border-blue-600 ring-2 ring-blue-100 shadow-md" : ""
      }`}
    >
      <button
        onClick={(event) => {
          event.stopPropagation();
          onPreview(setItem);
        }}
        className="group relative aspect-video w-full rounded-xl bg-gradient-to-br from-[var(--color-bg-soft)] to-white mb-4 border overflow-hidden flex items-center justify-center text-gray-400"
        title={`Preview ${setItem.name}`}
      >
        {previewImage ? (
          <img
            src={previewImage}
            alt={`${setItem.name} preview`}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <span className="text-sm font-medium">Lesson Preview</span>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-semibold tracking-wide">
            Click to preview
          </span>
        </div>
      </button>

      <div>
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-semibold text-lg leading-tight">{setItem.name}</h3>
            {isOwner && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-bg-soft)] text-[var(--color-text-main)] border shrink-0">
                Yours
              </span>
            )}
          </div>

          {!isOwner && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onReport(setItem);
              }}
              title="Report set"
              className="btn px-3 py-2 text-sm border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 shrink-0"
            >
              <AlertTriangle size={14} />
            </button>
          )}
        </div>

        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          {authorName ? `By ${authorName}` : `By ${setItem.user_id?.slice(0, 8)}`}
        </p>

        {tagLabel.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tagLabel.map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2 py-1 rounded-full bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] border"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={(event) => {
            event.stopPropagation();
            onAddToDashboard(setItem);
          }}
          className="btn btn-primary flex-1 px-3 py-2"
        >
          {isOwner ? "Open in Dashboard" : "Add to Dashboard"}
        </button>

        <div className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
          {setItem.download_count ?? 0} copies
        </div>
      </div>
    </div>
  );
}
