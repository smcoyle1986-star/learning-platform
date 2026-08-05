"use client";

import { AlertTriangle } from "lucide-react";

import { CommunityLessonSet } from "@/lib/community/types";

type CommunitySetCardProps = {
  setItem: CommunityLessonSet;
  selected?: boolean;
  authorName?: string;
  previewImage?: string;
  isOwner: boolean;
  canAddToDashboard: boolean;
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
  canAddToDashboard,
  onSelect,
  onPreview,
  onAddToDashboard,
  onReport,
}: CommunitySetCardProps) {
  const tagLabel = setItem.tags && setItem.tags.length > 0 ? setItem.tags.slice(0, 2) : [];

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
      className={`relative flex h-full flex-col rounded-xl border bg-white p-3 shadow-sm transition hover:shadow-md cursor-pointer ${
        selected ? "border-blue-600 ring-2 ring-blue-100 shadow-md" : ""
      }`}
    >
      <button
        onClick={(event) => {
          event.stopPropagation();
          onPreview(setItem);
        }}
        className="group relative mb-2 flex h-20 w-full items-center justify-center overflow-hidden rounded-lg border bg-gradient-to-br from-[var(--color-bg-soft)] to-white text-gray-400"
        title={`Preview ${setItem.name}`}
      >
        {previewImage ? (
          <img
            src={previewImage}
            alt={`${setItem.name} preview`}
            className="h-full w-full bg-white object-contain p-1 transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <span className="text-xs font-medium">Lesson Preview</span>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center">
          <span className="text-xs font-semibold tracking-wide text-white opacity-0 transition-opacity group-hover:opacity-100">
            Click to preview
          </span>
        </div>
      </button>

      <div>
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
          <h3 className="line-clamp-1 text-sm font-semibold leading-tight">{setItem.name}</h3>
            {isOwner && (
              <span className="shrink-0 rounded-full border bg-[var(--color-bg-soft)] px-1.5 py-0.5 text-[9px] text-[var(--color-text-main)]">
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
              className="btn shrink-0 border border-red-200 bg-red-50 p-1 text-red-700 hover:bg-red-100"
            >
              <AlertTriangle size={14} />
            </button>
          )}
        </div>

        <p className="mb-1.5 truncate text-[10px] text-[var(--color-text-muted)]">
          {authorName ? `By ${authorName}` : `By ${setItem.user_id?.slice(0, 8)}`}
        </p>

        {tagLabel.length > 0 && (
          <div className="mb-1 flex flex-wrap gap-1">
            {tagLabel.map((tag) => (
              <span
                key={tag}
                className="rounded-full border bg-[var(--color-bg-soft)] px-1.5 py-0.5 text-[9px] text-[var(--color-text-muted)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2 pt-1.5">
        <button
          disabled={!canAddToDashboard}
          onClick={(event) => {
            event.stopPropagation();
            onAddToDashboard(setItem);
          }}
          title={
            canAddToDashboard
              ? isOwner
                ? "Open this set in your Dashboard"
                : "Add this set to your Dashboard"
              : "Upgrade to Premium to use Community sets in your Dashboard"
          }
          className="btn btn-primary flex-1 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-55"
        >
          {canAddToDashboard
            ? isOwner
              ? "Open in Dashboard"
              : "Add to Dashboard"
            : "Premium required"}
        </button>

        <div className="whitespace-nowrap text-[10px] text-[var(--color-text-muted)]">
          {setItem.download_count ?? 0} copies
        </div>
      </div>
    </div>
  );
}
