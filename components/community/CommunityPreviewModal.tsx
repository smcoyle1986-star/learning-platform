"use client";

import { CommunityCardPreview, CommunityLessonSet } from "@/lib/community/types";
import { resolveLessonImageUrl } from "@/lib/lessons/image";

type CommunityPreviewModalProps = {
  setItem: CommunityLessonSet | null;
  authorName?: string;
  cards: CommunityCardPreview[];
  loading: boolean;
  canAddToDashboard: boolean;
  isOwner?: boolean;
  onClose: () => void;
  onAddToDashboard: (setItem: CommunityLessonSet) => void;
};

export default function CommunityPreviewModal({
  setItem,
  authorName,
  cards,
  loading,
  canAddToDashboard,
  isOwner = false,
  onClose,
  onAddToDashboard,
}: CommunityPreviewModalProps) {
  if (!setItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 w-[92%] max-w-4xl shadow-xl">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div>
            <h3 className="text-xl font-semibold">{setItem.name}</h3>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {authorName ? `By ${authorName}` : setItem.user_id}
              {setItem.tags && setItem.tags.length > 0 ? ` · ${setItem.tags.join(", ")}` : ""}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              disabled={!canAddToDashboard}
              onClick={() => onAddToDashboard(setItem)}
              title={
                canAddToDashboard
                  ? isOwner
                    ? "Open this set in your Dashboard"
                    : "Add this set to your Dashboard"
                  : "Upgrade to Premium to use Community sets in your Dashboard"
              }
              className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {canAddToDashboard
                ? isOwner
                  ? "Open in Dashboard"
                  : "Add to Dashboard"
                : "Premium required"}
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border bg-[var(--color-bg-soft)]"
            >
              Close
            </button>
          </div>
        </div>

        <div className="mb-4 text-sm text-[var(--color-text-muted)]">
          Preview the card language first, then copy the set into your own dashboard to edit or teach from it.
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto">
          {loading ? (
            <div className="text-[var(--color-text-muted)]">Loading cards…</div>
          ) : cards.length === 0 ? (
            <div className="text-[var(--color-text-muted)]">No cards to preview</div>
          ) : (
            cards.map((card) => (
              <div key={card.id} className="border rounded-lg p-3 bg-[var(--color-bg-soft)]">
                {card.back ? (
                  <div className="mb-3 aspect-video rounded-md overflow-hidden bg-white border">
                    <img
                      src={resolveLessonImageUrl(card.back)}
                      alt={card.front}
                      className="h-full w-full bg-white object-contain p-1"
                    />
                  </div>
                ) : null}
                <div className="text-sm font-medium mb-2">{card.front}</div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {card.back ? "Includes image/back content" : "No image/back content"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
