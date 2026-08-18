"use client";

import { useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, Layers3 } from "lucide-react";

import CommunityControls from "@/components/community/CommunityControls";
import CommunityPreviewModal from "@/components/community/CommunityPreviewModal";
import CommunitySetCard from "@/components/community/CommunitySetCard";
import CommunityWorksheetCard from "@/components/community/CommunityWorksheetCard";
import CommunityWorksheetControls from "@/components/community/CommunityWorksheetControls";
import CommunityWorksheetPreviewModal from "@/components/community/CommunityWorksheetPreviewModal";
import PageHeader from "@/components/navigation/PageHeader";
import { hydrateCreatorLessonCards } from "@/lib/creator/client";
import type { CommunityLibraryKind } from "@/lib/community/types";
import { useCommunitySets } from "@/lib/community/useCommunitySets";
import { useCommunityWorksheets } from "@/lib/community/useCommunityWorksheets";
import type { LessonCard } from "@/lib/lessons/types";
import { writeLessonTray } from "@/lib/lessons/tray";
import { PAGE_CONTENT } from "@/lib/seo/page-content";
import { supabase } from "@/lib/supabase/client";

export default function CommunityPage() {
  const [libraryKind, setLibraryKind] = useState<CommunityLibraryKind>("lesson_sets");
  const lessons = useCommunitySets();
  const worksheets = useCommunityWorksheets(libraryKind === "worksheets");
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);

  async function selectSetForTray(setItem: typeof lessons.sets[number]) {
    try {
      const { data, error } = await supabase
        .from("cards")
        .select("id, front, back, creator_image_id, position")
        .eq("lesson_set_id", setItem.id)
        .order("position", { ascending: true });
      if (error) throw error;
      const cards = await hydrateCreatorLessonCards((data ?? []).map((card) => ({
        id: card.id,
        word: card.front,
        back: card.back,
        image: card.back,
        creator_image_id: card.creator_image_id,
        position: card.position,
      })) as LessonCard[]);
      if (!cards.length) {
        lessons.setToast({ message: "This lesson set does not have any cards yet." });
        return;
      }
      writeLessonTray(cards);
      setSelectedSetId(setItem.id);
      lessons.setToast({ message: `“${setItem.name}” is ready to use from the lesson tray.` });
    } catch (error) {
      console.error("Failed to prepare Community lesson set:", error);
      lessons.setToast({ message: "Could not prepare that set for the lesson tray." });
    }
  }

  const activeToast = libraryKind === "lesson_sets" ? lessons.toast : worksheets.toast;
  const clearActiveToast = () => libraryKind === "lesson_sets" ? lessons.setToast(null) : worksheets.setToast(null);
  const openCommunityWorksheet = (worksheetId: string) => {
    window.location.assign(`/worksheets?community_worksheet_id=${encodeURIComponent(worksheetId)}`);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
      <PageHeader
        title="Community"
        description={PAGE_CONTENT.community.description}
        primaryItems={[{ label: "Classroom", href: "/flashcards/classroom", tone: "classroom" }]}
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

      <main className="mx-auto max-w-[1500px] px-4 pb-12 pt-4 md:px-6 md:pb-16 md:pt-6">
        <div className="mb-5 flex justify-center">
          <div className="inline-flex rounded-2xl border border-[#d7ddd1] bg-white p-1.5 shadow-sm" aria-label="Choose Community resource type">
            <button type="button" onClick={() => setLibraryKind("lesson_sets")} aria-pressed={libraryKind === "lesson_sets"} className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${libraryKind === "lesson_sets" ? "bg-[var(--color-primary)] text-white shadow-sm" : "text-[var(--color-text-muted)] hover:bg-slate-50"}`}>
              <Layers3 size={17} /> Card Sets
            </button>
            <button type="button" onClick={() => setLibraryKind("worksheets")} aria-pressed={libraryKind === "worksheets"} className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${libraryKind === "worksheets" ? "bg-[var(--color-primary)] text-white shadow-sm" : "text-[var(--color-text-muted)] hover:bg-slate-50"}`}>
              <FileSpreadsheet size={17} /> Worksheets
            </button>
          </div>
        </div>

        {libraryKind === "lesson_sets" ? (
          <>
            <CommunityControls
              query={lessons.query}
              sort={lessons.sort}
              totalCount={lessons.totalCount}
              pageSize={lessons.pageSize}
              contentType={lessons.contentType}
              onQueryChange={lessons.setQuery}
              onSortChange={(value) => { lessons.setSort(value); lessons.setPage(1); }}
              onPageSizeChange={(value) => { lessons.setPageSize(value); lessons.setPage(1); }}
              onContentTypeChange={(value) => { lessons.setContentType(value); lessons.setPage(1); }}
            />
            <section>
              {lessons.loading ? (
                <div className="py-24 text-center text-[var(--color-text-muted)]">Loading community sets…</div>
              ) : lessons.sets.length === 0 ? (
                <EmptyState kind="lesson" />
              ) : (
                <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {lessons.sets.map((setItem) => (
                    <CommunitySetCard key={setItem.id} setItem={setItem} selected={selectedSetId === setItem.id} authorName={lessons.authors[setItem.user_id]} previewImage={lessons.previewImages[setItem.id]} isOwner={lessons.currentUserId === setItem.user_id} canAddToDashboard={lessons.canCopyToDashboard} onSelect={selectSetForTray} onPreview={lessons.openPreview} onAddToDashboard={lessons.addToDashboard} onReport={lessons.reportSet} />
                  ))}
                </div>
              )}
            </section>
            <Pagination page={lessons.page} totalPages={lessons.totalPages} onPageChange={lessons.setPage} />
          </>
        ) : (
          <>
            <CommunityWorksheetControls
              query={worksheets.query}
              sort={worksheets.sort}
              totalCount={worksheets.totalCount}
              pageSize={worksheets.pageSize}
              worksheetType={worksheets.worksheetType}
              contentType={worksheets.contentType}
              onQueryChange={worksheets.setQuery}
              onSortChange={(value) => { worksheets.setSort(value); worksheets.setPage(1); }}
              onPageSizeChange={(value) => { worksheets.setPageSize(value); worksheets.setPage(1); }}
              onWorksheetTypeChange={(value) => { worksheets.setWorksheetType(value); worksheets.setPage(1); }}
              onContentTypeChange={(value) => { worksheets.setContentType(value); worksheets.setPage(1); }}
            />
            <section>
              {worksheets.loading ? (
                <div className="py-24 text-center text-[var(--color-text-muted)]">Loading community worksheets…</div>
              ) : worksheets.worksheets.length === 0 ? (
                <EmptyState kind="worksheet" />
              ) : (
                <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {worksheets.worksheets.map((worksheet) => (
                    <CommunityWorksheetCard key={worksheet.id} worksheet={worksheet} authorName={worksheets.authors[worksheet.userId]} isOwner={worksheets.currentUserId === worksheet.userId} canAddToDashboard={worksheets.canCopyToDashboard} onPreview={worksheets.setPreviewWorksheet} onOpenWorksheet={(worksheet) => openCommunityWorksheet(worksheet.id)} onAddToDashboard={worksheets.addToDashboard} />
                  ))}
                </div>
              )}
            </section>
            <Pagination page={worksheets.page} totalPages={worksheets.totalPages} onPageChange={worksheets.setPage} />
          </>
        )}
      </main>

      {libraryKind === "lesson_sets" ? (
        <CommunityPreviewModal setItem={lessons.previewSet} authorName={lessons.previewSet ? lessons.authors[lessons.previewSet.user_id] : undefined} cards={lessons.previewCards} loading={lessons.previewLoading} canAddToDashboard={lessons.canCopyToDashboard} isOwner={Boolean(lessons.previewSet && lessons.currentUserId === lessons.previewSet.user_id)} onClose={() => lessons.setPreviewSet(null)} onAddToDashboard={async (setItem) => { await lessons.addToDashboard(setItem); lessons.setPreviewSet(null); }} />
      ) : (
        <CommunityWorksheetPreviewModal worksheet={worksheets.previewWorksheet} authorName={worksheets.previewWorksheet ? worksheets.authors[worksheets.previewWorksheet.userId] : undefined} canAddToDashboard={worksheets.canCopyToDashboard} isOwner={Boolean(worksheets.previewWorksheet && worksheets.currentUserId === worksheets.previewWorksheet.userId)} onClose={() => worksheets.setPreviewWorksheet(null)} onOpenWorksheet={(worksheet) => openCommunityWorksheet(worksheet.id)} onAddToDashboard={async (worksheet) => { await worksheets.addToDashboard(worksheet); worksheets.setPreviewWorksheet(null); }} />
      )}

      {activeToast ? (
        <div className="fixed bottom-6 right-4 z-60">
          <div className="max-w-sm rounded-lg border bg-white px-4 py-3 shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div><div className="text-sm font-medium">{activeToast.message}</div>{activeToast.action ? <div className="mt-2">{activeToast.action}</div> : null}</div>
              <button type="button" onClick={clearActiveToast} className="ml-4 text-gray-400">✕</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({ kind }: { kind: "lesson" | "worksheet" }) {
  return (
    <div className="py-24 text-center text-[var(--color-text-muted)]">
      <p className="mb-3 text-lg">No community {kind === "lesson" ? "sets" : "worksheets"} found.</p>
      <p>Try different search terms or <Link href={kind === "lesson" ? "/flashcards" : "/worksheets"} className="text-[var(--color-text-main)] underline underline-offset-4">create your own {kind}</Link>.</p>
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number | null; onPageChange: React.Dispatch<React.SetStateAction<number>> }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange((current) => Math.max(1, current - 1))} className="btn btn-secondary px-3 py-1 disabled:opacity-60">Prev</button>
      <div className="rounded px-3 py-1 text-sm">Page {page} of {totalPages}</div>
      <button type="button" disabled={page >= totalPages} onClick={() => onPageChange((current) => Math.min(totalPages, current + 1))} className="btn btn-secondary px-3 py-1 disabled:opacity-60">Next</button>
    </div>
  );
}
