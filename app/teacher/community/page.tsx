'use client';

import React from "react";
import Link from "next/link";
import CommunityControls from "@/components/community/CommunityControls";
import CommunityPreviewModal from "@/components/community/CommunityPreviewModal";
import CommunitySetCard from "@/components/community/CommunitySetCard";
import PageHeader from "@/components/navigation/PageHeader";
import { LessonCard } from "@/lib/lessons/types";
import { useCommunitySets } from "@/lib/community/useCommunitySets";
import { writeLessonTray } from "@/lib/lessons/tray";
import { supabase } from "@/lib/supabase/client";
import { hydrateCreatorLessonCards } from "@/lib/creator/client";

export default function CommunityPage() {
  const {
    query,
    sets,
    loading,
    page,
    pageSize,
    totalCount,
    totalPages,
    sort,
    previewSet,
    previewCards,
    previewLoading,
    authors,
    previewImages,
    toast,
    currentUserId,
    canCopyToDashboard,
    setQuery,
    setPage,
    setPageSize,
    setSort,
    setPreviewSet,
    setToast,
    openPreview,
    addToDashboard,
    reportSet,
  } = useCommunitySets();
  const [selectedSetId, setSelectedSetId] = React.useState<string | null>(null);

  async function selectSetForTray(setItem: typeof sets[number]) {
    try {
      const { data, error } = await supabase
        .from("cards")
        .select("id, front, back, creator_image_id, position")
        .eq("lesson_set_id", setItem.id)
        .order("position", { ascending: true });

      if (error) {
        console.error("Failed to load community set cards for tray:", error);
        setToast({ message: "Could not load this lesson set into the tray." });
        return;
      }

      const cards = await hydrateCreatorLessonCards((data ?? []).map((card) => ({
        id: card.id,
        word: card.front,
        back: card.back,
        image: card.back,
        creator_image_id: card.creator_image_id,
        position: card.position,
      })) as LessonCard[]);

      if (!cards.length) {
        setToast({ message: "This lesson set does not have any cards yet." });
        return;
      }

      writeLessonTray(cards);
      setSelectedSetId(setItem.id);
      setToast({ message: `"${setItem.name}" is ready to use from the lesson tray.` });
    } catch (error) {
      console.error("Unexpected community tray selection error:", error);
      setToast({ message: "Could not prepare that set for the lesson tray." });
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
      <PageHeader
        title="Community"
        primaryItems={[
          { label: "Classroom", href: "/flashcards/classroom", tone: "classroom" },
        ]}
        secondaryItems={[
          { label: "Flashcards", href: "/flashcards" },
          { label: "Dashboard", href: "/dashboard" },
          { label: "Creator", href: "/creator" },
          { label: "Editor", href: "/teacher/editor" },
          { label: "Printables", href: "/printables" },
          { label: "Worksheets", href: "/worksheets" },
          { label: "Lesson Plans", href: "/lessons" },
          { label: "Games", href: "/games" },
        ]}
      />

      {/* Controls */}
      <main className="max-w-7xl mx-auto px-6 pt-10 pb-32">
        <CommunityControls
          query={query}
          sort={sort}
          totalCount={totalCount}
          pageSize={pageSize}
          onQueryChange={setQuery}
          onSortChange={(value) => {
            setSort(value);
            setPage(1);
          }}
          onPageSizeChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
        />

        {/* Grid */}
        <section>
          {loading ? (
            <div className="text-center py-24 text-[var(--color-text-muted)]">Loading community sets…</div>
          ) : sets.length === 0 ? (
            <div className="text-center py-24 text-[var(--color-text-muted)]">
              <p className="text-lg mb-3">No community sets found.</p>
              <p>
                Try different search terms or{" "}
                <Link
                  href="/flashcards"
                  className="text-[var(--color-text-main)] underline underline-offset-4"
                >
                  create your own lesson
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sets.map((setItem) => (
                <CommunitySetCard
                  key={setItem.id}
                  setItem={setItem}
                  selected={selectedSetId === setItem.id}
                  authorName={authors[setItem.user_id]}
                  previewImage={previewImages[setItem.id]}
                  isOwner={currentUserId === setItem.user_id}
                  canAddToDashboard={canCopyToDashboard}
                  onSelect={selectSetForTray}
                  onPreview={openPreview}
                  onAddToDashboard={addToDashboard}
                  onReport={reportSet}
                />
              ))}
            </div>
          )}
        </section>

        {/* Pagination */}
        {totalPages && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn btn-secondary px-3 py-1 disabled:opacity-60"
            >
              Prev
            </button>

            <div className="px-3 py-1 rounded text-sm">
              Page {page} of {totalPages}
            </div>

            <button
              disabled={page >= (totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
              className="btn btn-secondary px-3 py-1 disabled:opacity-60"
            >
              Next
            </button>
          </div>
        )}
      </main>

      {/* Preview Modal */}
      <CommunityPreviewModal
        setItem={previewSet}
        authorName={previewSet ? authors[previewSet.user_id] : undefined}
        cards={previewCards}
        loading={previewLoading}
        canAddToDashboard={canCopyToDashboard}
        onClose={() => setPreviewSet(null)}
        onAddToDashboard={async (setItem) => {
          await addToDashboard(setItem);
          setPreviewSet(null);
        }}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed right-4 bottom-6 z-60">
          <div className="bg-white border rounded-lg px-4 py-3 shadow-md max-w-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium">{toast.message}</div>
                {toast.action && <div className="mt-2">{toast.action}</div>}
              </div>
              <button onClick={() => setToast(null)} className="text-gray-400 ml-4">✕</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
