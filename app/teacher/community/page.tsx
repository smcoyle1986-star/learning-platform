'use client';

import React from "react";
import Link from "next/link";
import BrandButton from "@/components/BrandButton";
import CommunityControls from "@/components/community/CommunityControls";
import CommunityPreviewModal from "@/components/community/CommunityPreviewModal";
import CommunitySetCard from "@/components/community/CommunitySetCard";
import { useCommunitySets } from "@/lib/community/useCommunitySets";

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

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg-main)]/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <BrandButton className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80" />

          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-4xl font-bold text-black">Community</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => (window.location.href = "/flashcards")}
              className="btn btn-secondary"
            >
              Flashcards
            </button>

            <button
              onClick={() => (window.location.href = "/dashboard")}
              className="btn btn-secondary"
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

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
                  authorName={authors[setItem.user_id]}
                  previewImage={previewImages[setItem.id]}
                  isOwner={currentUserId === setItem.user_id}
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
