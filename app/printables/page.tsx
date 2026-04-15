"use client";

import { useEffect, useMemo, useState } from "react";
import BrandButton from "@/components/BrandButton";
import { useSearchParams } from "next/navigation";
import PrintablesOptionsPanel from "@/components/printables/PrintablesOptionsPanel";
import PrintablesPreview from "@/components/printables/PrintablesPreview";
import {
  buildPrintableHtml,
  getPrintableHeaderHtml,
  openPrintableWindow,
} from "@/lib/printables/export";
import { PrintableContentOption } from "@/lib/printables/types";
import { usePrintableCards } from "@/lib/printables/usePrintableCards";
import { buildWorksheetPreviewHtml } from "@/lib/worksheets/export";
import { clearWorksheetPrintJob, readWorksheetPrintJob } from "@/lib/worksheets/print-job";

export default function PrintablesPage() {
  const searchParams = useSearchParams();
  const from = searchParams?.get("from") ?? ""; // optional origin marker
  const mode = searchParams?.get("mode") ?? "";
  const [worksheetJob, setWorksheetJob] = useState(() =>
    mode === "worksheet" ? readWorksheetPrintJob() : null
  );

  // UI state
  const { cards } = usePrintableCards();
  const [selectedCardsPerPage, setSelectedCardsPerPage] =
    useState<number | null>(1); // 1,2,4,8; default 1
  const [contentOption, setContentOption] = useState<PrintableContentOption>("picture+word");
  const [inkSaving, setInkSaving] = useState<boolean>(false); // grayscale
  const [printing, setPrinting] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [worksheetHtml, setWorksheetHtml] = useState("<!doctype html><html><body></body></html>");

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
    if (mode === "worksheet") {
      setWorksheetJob(readWorksheetPrintJob());
      return;
    }
    setWorksheetJob(null);
  }, [mode]);

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
    const printableHtml = buildPrintableHtml({
      pages,
      contentOption,
      inkSaving,
      siteHeaderHtml: getPrintableHeaderHtml(from),
    });
    openPrintableWindow(
      printableHtml,
      "Popup blocked. Allow popups for this site to print/export.",
      () => setPrinting(false)
    );
  };

  const handleExportPdf = async () => {
    setExporting(true);
    const printableHtml = buildPrintableHtml({
      pages,
      contentOption,
      inkSaving,
      siteHeaderHtml: getPrintableHeaderHtml(from),
    });
    openPrintableWindow(
      printableHtml,
      "Popup blocked. Allow popups for this site to export PDF.",
      () => setExporting(false)
    );
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

  if (worksheetJob) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
        <header className="sticky top-0 z-50 bg-[var(--color-bg-main)]/80 backdrop-blur-md border-b border-black/5">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <BrandButton className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80" />

            <div className="absolute left-1/2 transform -translate-x-1/2">
              <nav className="flex items-center text-4xl font-bold text-black">Printables</nav>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => (window.location.href = "/worksheets")}
                className="btn btn-secondary"
              >
                Return to Worksheets
              </button>

              <button
                onClick={() => {
                  clearWorksheetPrintJob();
                  window.location.href = "/dashboard";
                }}
                className="btn btn-secondary"
              >
                Dashboard
              </button>
            </div>
          </div>
        </header>

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
        <header className="sticky top-0 z-50 bg-[var(--color-bg-main)]/80 backdrop-blur-md border-b border-black/5">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <BrandButton className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80" />

            <div className="absolute left-1/2 transform -translate-x-1/2">
              <nav className="flex items-center text-4xl font-bold text-black">Printables</nav>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => (window.location.href = "/flashcards")}
                className="btn btn-secondary"
              >
                Return to Flashcards
              </button>

              <button
                onClick={() => (window.location.href = "/dashboard")}
                className="btn btn-secondary"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 pt-10 pb-32">
          <div className="text-center py-32 text-[var(--color-text-muted)]">
            <p className="text-2xl font-semibold mb-4">No cards to print</p>
            <p className="text-sm">
              Add cards to your lesson tray on Flashcards or select a saved lesson on Dashboard.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => (window.location.href = "/flashcards")}
                className="btn btn-primary"
              >
                Go to Flashcards
              </button>
              <button
                onClick={() => (window.location.href = "/dashboard")}
                className="btn btn-primary"
              >
                Go to Dashboard
              </button>
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
      <header className="sticky top-0 z-50 bg-[var(--color-bg-main)]/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <BrandButton className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80" />

          <div className="absolute left-1/2 transform -translate-x-1/2">
            <nav className="flex items-center text-4xl font-bold text-black">Printables</nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => (window.location.href = "/flashcards")}
              className="btn btn-secondary"
            >
              Return to Flashcards
            </button>

            <button
              onClick={() => (window.location.href = "/dashboard")}
              className="btn btn-secondary"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Layout: left options + main content (tray + preview). Main is wider. */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-32 grid grid-cols-12 gap-6">
        {/* LEFT: Print Options */}
        <aside className="col-span-12 lg:col-span-3 self-start">
          <PrintablesOptionsPanel
            selectedCardsPerPage={selectedCardsPerPage}
            contentOption={contentOption}
            inkSaving={inkSaving}
            printing={printing}
            exporting={exporting}
            onToggleCardsPerPage={toggleCardsPerPage}
            onSetContentOption={setContentOption}
            onSetInkSaving={setInkSaving}
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
    </div>
  );
}
