"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/navigation/PageHeader";
import { PAGE_CONTENT } from "@/lib/seo/page-content";
import { useSearchParams } from "next/navigation";
import UpgradeModal from "@/components/billing/UpgradeModal";
import { useAuth } from "@/components/AuthProvider";
import GuestFlashcardPrompt from "@/components/flashcards/GuestFlashcardPrompt";
import PrintablesOptionsPanel from "@/components/printables/PrintablesOptionsPanel";
import PrintablesPreview from "@/components/printables/PrintablesPreview";
import {
  buildPrintableHtml,
  getPrintableHeaderHtml,
  printPrintableHtml,
} from "@/lib/printables/export";
import { PrintableContentOption } from "@/lib/printables/types";
import { usePrintableCards } from "@/lib/printables/usePrintableCards";
import { buildWorksheetPreviewHtml } from "@/lib/worksheets/export";
import { clearWorksheetPrintJob, readWorksheetPrintJob } from "@/lib/worksheets/print-job";
import { useBillingAccess } from "@/lib/billing/useBillingAccess";

function PrintablesPageContent() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const isGuest = !authLoading && !user;
  const from = searchParams?.get("from") ?? ""; // optional origin marker
  const mode = searchParams?.get("mode") ?? "";
  const [worksheetJob, setWorksheetJob] = useState<ReturnType<typeof readWorksheetPrintJob>>(null);

  // UI state
  const { cards } = usePrintableCards({
    isAuthenticated: Boolean(user),
    ready: !authLoading,
  });
  const [selectedCardsPerPage, setSelectedCardsPerPage] =
    useState<number | null>(1); // 1,2,4,8; default 1
  const [contentOption, setContentOption] = useState<PrintableContentOption>("picture+word");
  const [inkSaving, setInkSaving] = useState<boolean>(false); // grayscale
  const [printing, setPrinting] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [worksheetHtml, setWorksheetHtml] = useState("<!doctype html><html><body></body></html>");
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [guestPromptOpen, setGuestPromptOpen] = useState(false);
  const { canUsePrintableOptions } = useBillingAccess();

  useEffect(() => {
    let mounted = true;
    if (!worksheetJob) return undefined;

    buildWorksheetPreviewHtml(worksheetJob.cards, worksheetJob.draft, {
      includeTeacherCopy: true,
      previewMode: true,
    }).then((html) => {
      if (mounted) setWorksheetHtml(html);
    });

    return () => {
      mounted = false;
    };
  }, [worksheetJob]);

  useEffect(() => {
    if (authLoading) return;
    if (mode === "worksheet") {
      setWorksheetJob(user ? readWorksheetPrintJob() : null);
      return;
    }
    setWorksheetJob(null);
  }, [authLoading, mode, user]);

  // chunk into pages using selectedCardsPerPage (default 1)
  const pages = useMemo(() => {
    const per = selectedCardsPerPage ?? 1;
    if (cards.length === 0) return [];
    const chunks = [];
    for (let i = 0; i < cards.length; i += per) {
      chunks.push(cards.slice(i, i + per));
    }
    return chunks;
  }, [cards, selectedCardsPerPage]);

  // helpers
  const toggleCardsPerPage = (n: number) => {
    if (!canUsePrintableOptions) {
      if (isGuest) setGuestPromptOpen(true);
      else setUpgradeModalOpen(true);
      return;
    }
    if (selectedCardsPerPage === n) {
      setSelectedCardsPerPage(null);
    } else {
      setSelectedCardsPerPage(n);
    }
  };

  /* ---------------------------
     Print / Export logic (uses a new window and window.print)
     --------------------------- */

  const handlePrintNow = async () => {
    setPrinting(true);
    try {
      const printableHtml = buildPrintableHtml({
        pages,
        contentOption,
        inkSaving,
        siteHeaderHtml: getPrintableHeaderHtml(from),
      });
      printPrintableHtml(printableHtml, () => setPrinting(false));
    } catch (error) {
      console.error("Failed to print printable cards:", error);
      setPrinting(false);
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/printables/export-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pages,
          contentOption,
          inkSaving,
          siteHeaderHtml: getPrintableHeaderHtml(from),
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "classendo-printables.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      console.error("Failed to export printable PDF:", error);
    } finally {
      setExporting(false);
    }
  };

  const handleWorksheetExportPdf = async () => {
    if (!worksheetJob) return;
    setExporting(true);
    try {
      const response = await fetch("/api/worksheets/export-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cards: worksheetJob.cards,
          draft: worksheetJob.draft,
          includeTeacherCopy: true,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${(worksheetJob.title || worksheetJob.draft.title || "worksheet")
        .trim()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "") || "worksheet"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      console.error("Failed to export worksheet PDF:", error);
    } finally {
      setExporting(false);
    }
  };

  if (authLoading) {
    return <p className="p-10 text-[var(--color-text-muted)]">Loading printables…</p>;
  }

  if (worksheetJob) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
        <PageHeader
          title="Printables"
          description={PAGE_CONTENT.printables.description}
          primaryItems={[
            { label: "Classroom", href: "/flashcards/classroom", tone: "classroom" },
          ]}
          secondaryItems={user ? [
            { label: "Flashcards", href: "/flashcards" },
            { label: "Dashboard", onClick: () => {
              clearWorksheetPrintJob();
              window.location.href = "/dashboard";
            } },
            { label: "Community", href: "/teacher/community" },
          ] : [{ label: "Flashcards", href: "/flashcards" }]}
        />

        <div className="max-w-7xl mx-auto px-6 pt-6 pb-32 grid grid-cols-12 gap-6">
          <aside className="col-span-12 lg:col-span-3 self-start">
            <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Worksheet Print Set</h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  This print set includes both the student worksheet and the completed teacher copy.
                </p>
              </div>

              <div className="rounded-xl border bg-[var(--color-bg-soft)] px-3 py-3 text-sm">
                <div className="font-semibold">{worksheetJob.title}</div>
                <div className="text-[var(--color-text-muted)] mt-1 capitalize">
                  {worksheetJob.draft.type?.replaceAll("-", " ")} · {worksheetJob.cards.length} cards · 2 versions
                </div>
              </div>

              <button
                onClick={handleWorksheetExportPdf}
                disabled={exporting}
                className="btn btn-primary w-full disabled:opacity-50"
              >
                {exporting ? "Exporting…" : "Export PDF"}
              </button>
            </div>
          </aside>

          <main className="col-span-12 lg:col-span-9">
            <div className="bg-white rounded-[30px] border border-slate-200 shadow-[0_24px_80px_rgba(15,23,42,0.08)] p-4 md:p-6">
              <div className="mb-4">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Print Preview</div>
                <div className="text-sm text-slate-600 mt-1">
                  Student copy first, completed teacher copy second.
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 overflow-hidden bg-[#eef2f7]">
                <iframe
                  title="Worksheet print preview"
                  srcDoc={worksheetHtml}
                  className="w-full min-h-[1600px] bg-[#eef2f7]"
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Empty state
  if (!cards || cards.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
        <PageHeader
          title="Printables"
          description={PAGE_CONTENT.printables.description}
          primaryItems={[
            { label: "Classroom", href: "/flashcards/classroom", tone: "classroom" },
          ]}
          secondaryItems={user ? [
            { label: "Flashcards", href: "/flashcards" },
            { label: "Dashboard", href: "/dashboard" },
            { label: "Community", href: "/teacher/community" },
          ] : [{ label: "Flashcards", href: "/flashcards" }]}
        />

        <main className="max-w-7xl mx-auto px-6 pt-10 pb-32">
          <div className="text-center py-32 text-[var(--color-text-muted)]">
            <p className="text-2xl font-semibold mb-4">No cards to print</p>
            <p className="text-sm">
              {isGuest
                ? "Add up to 6 free flashcards to your temporary lesson tray first."
                : "Add cards to your lesson tray on Flashcards or select a saved lesson on Dashboard."}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => (window.location.href = "/flashcards")}
                className="btn btn-primary"
              >
                Go to Flashcards
              </button>
              {!isGuest ? (
                <button
                  onClick={() => (window.location.href = "/dashboard")}
                  className="btn btn-primary"
                >
                  Go to Dashboard
                </button>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ---------------------------
     Main render: options (left) + center: tray (shorter, NOT sticky) + preview (large, scrollable single-page-at-a-time) 
     --------------------------- */

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
      {/* Header */}
      <PageHeader
        title="Printables"
        description={PAGE_CONTENT.printables.description}
        primaryItems={[
          { label: "Classroom", href: "/flashcards/classroom", tone: "classroom" },
        ]}
        secondaryItems={user ? [
          { label: "Flashcards", href: "/flashcards" },
          { label: "Dashboard", href: "/dashboard" },
          { label: "Community", href: "/teacher/community" },
        ] : [{ label: "Flashcards", href: "/flashcards" }]}
      />

      {/* Layout: left options + main content (tray + preview). Main is wider. */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-32 grid grid-cols-12 gap-6">
        {/* LEFT: Print Options */}
        <aside className="col-span-12 lg:col-span-3 self-start">
          {!canUsePrintableOptions ? (
            <div className="mb-4 rounded-2xl border border-[#eadfc6] bg-[#fff9f2] px-4 py-3 text-sm text-[#7a6543]">
              {isGuest
                ? "Guests can print the default layout from their temporary 6-card lesson. Create a free account to keep and expand your set."
                : "Advanced printables options are part of Premium. Free accounts can still print the default classroom set."}
            </div>
          ) : null}
          <PrintablesOptionsPanel
            selectedCardsPerPage={selectedCardsPerPage}
            contentOption={contentOption}
            inkSaving={inkSaving}
            printing={printing}
            exporting={exporting}
            onToggleCardsPerPage={toggleCardsPerPage}
            onSetContentOption={(value) => {
              if (!canUsePrintableOptions) {
                if (isGuest) setGuestPromptOpen(true);
                else setUpgradeModalOpen(true);
                return;
              }
              setContentOption(value);
            }}
            onSetInkSaving={(value) => {
              if (!canUsePrintableOptions) {
                if (isGuest) setGuestPromptOpen(true);
                else setUpgradeModalOpen(true);
                return;
              }
              setInkSaving(value);
            }}
            onPrintNow={handlePrintNow}
            onExportPdf={handleExportPdf}
          />
        </aside>

        <main className="col-span-12 lg:col-span-9">
          <PrintablesPreview
            cards={cards}
            pages={pages}
            selectedCardsPerPage={selectedCardsPerPage}
            contentOption={contentOption}
            inkSaving={inkSaving}
          />
        </main>
      </div>

      {/* PRINT CSS: ensure only preview content prints and page breaks occur */}
      <style jsx global>{`
        @media print {
          /* hide all UI except printable content */
          body * {
            visibility: hidden;
          }

          #print-preview,
          #print-preview * {
            visibility: visible;
          }

          #print-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }

          /* Each print page becomes its own physical page */
          .print-page {
            page-break-after: always;
            break-after: page;
            width: 100%;
            box-shadow: none !important;
            border: none !important;
            margin: 0;
            padding: 0.75in;
          }

          .print-page img {
            max-width: 100%;
            height: auto;
            object-fit: cover;
          }

          header,
          aside,
          .bg-white.rounded-2xl.p-3,
          .bg-white.rounded-2xl.p-4.shadow-sm.border {
            display: none !important;
          }
        }

        /* grayscale helper for print window too */
        .print-grayscale img {
          filter: grayscale(100%) !important;
        }

        /* Preview scroll styling (desktop nicety) */
        .preview-scroll::-webkit-scrollbar {
          height: 10px;
        }
        .preview-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.12);
          border-radius: 8px;
        }
      `}</style>
      <UpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        title="Unlock advanced printables"
        description="Premium unlocks alternate print layouts, content modes, and low-ink print settings."
      />
      <GuestFlashcardPrompt
        open={guestPromptOpen}
        onClose={() => setGuestPromptOpen(false)}
        title="Create a free account for more print options"
        description="Guests can print the default layout from a temporary 6-card lesson. Create a free account to keep the lesson tray and build larger, reusable sets."
        nextPath="/printables"
      />
    </div>
  );
}

export default function PrintablesPage() {
  return (
    <Suspense fallback={<p className="p-10">Loading...</p>}>
      <PrintablesPageContent />
    </Suspense>
  );
}
