"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";

/*
  app/printables/page.tsx

  Updated per request:
  - Adds a Dashboard button next to Return to Flashcards in header (Dashboard button returns to /dashboard).
  - Lesson tray is NOT sticky and is a bit shorter.
  - Removed the live right-hand preview.
  - Lesson tray and preview are larger and occupy the main content area (aside left = options; center = tray + preview).
  - Preview area is scrollable and shows one printable page at a time (horizontal snap).
  - Preserves: reading cards from localStorage only; print & export logic; all prior features.
*/

/* Local Card shape (must match tray item shape) */
type Card = {
  id: string;
  word: string;
  image: string;
  type?: string;
};

const STORAGE_TRAY_KEY = "classbloom-lesson-tray";
const STORAGE_SAVED_KEY = "classbloom-saved-lessons";

export default function PrintablesPage() {
  const searchParams = useSearchParams();
  const from = searchParams?.get("from") ?? ""; // optional origin marker

  // UI state
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCardsPerPage, setSelectedCardsPerPage] =
    useState<number | null>(1); // 1,2,4,8; default 1
  const [contentOption, setContentOption] = useState<
    "picture+word" | "picture-only"
  >("picture+word");
  const [inkSaving, setInkSaving] = useState<boolean>(false); // grayscale
  const [printing, setPrinting] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  // Load cards from localStorage on mount (tray prioritized)
  useEffect(() => {
    try {
      const trayRaw = localStorage.getItem(STORAGE_TRAY_KEY);
      if (trayRaw) {
        const parsed = JSON.parse(trayRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCards(
            parsed.map((c: any) => ({
              id: String(c.id ?? c.card_id ?? c.word),
              word: String(c.word ?? c.front ?? ""),
              image: String(c.image ?? c.back ?? "/placeholder.png"),
              type: c.type ?? undefined,
            }))
          );
          return;
        }
      }

      // fallback to saved lessons (first saved)
      const savedRaw = localStorage.getItem(STORAGE_SAVED_KEY);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          if (first?.cards && Array.isArray(first.cards) && first.cards.length) {
            setCards(
              first.cards.map((c: any) => ({
                id: String(c.id ?? c.card_id ?? c.word),
                word: String(c.word ?? c.front ?? ""),
                image: String(c.image ?? c.back ?? "/placeholder.png"),
                type: c.type ?? undefined,
              }))
            );
            return;
          }
        }
      }

      setCards([]);
    } catch (e) {
      console.error("Failed to read printable cards from localStorage:", e);
      setCards([]);
    }
  }, []);

  // chunk into pages using selectedCardsPerPage (default 1)
  const pages = useMemo(() => {
    const per = selectedCardsPerPage ?? 1;
    if (!cards || cards.length === 0) return [] as Card[][];
    const chunks: Card[][] = [];
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

  const gridClassFor = (n: number | null) => {
    const value = n ?? 1;
    switch (value) {
      case 1:
        return "grid-cols-1 gap-6";
      case 2:
        return "grid-cols-2 gap-6";
      case 4:
        // 2x2 layout: use 2 columns but the preview page height will show two rows
        return "grid-cols-2 gap-6";
      case 8:
        // 4 cols x 2 rows
        return "grid-cols-4 gap-6";
      default:
        return "grid-cols-1 gap-6";
    }
  };

  const CardsPerPageOption = ({ n }: { n: number }) => {
    const active = selectedCardsPerPage === n;
    return (
      <button
        onClick={() => toggleCardsPerPage(n)}
        className={`btn rounded-lg px-3 py-2 text-sm font-semibold w-full text-left border transition-shadow
          ${
            active
              ? "bg-[var(--color-accent)] text-white border-transparent shadow-md"
              : "btn-secondary text-[var(--color-text-main)] hover:shadow-lg"
          }`}
        aria-pressed={active}
      >
        {n} card{n > 1 ? "s" : ""}
      </button>
    );
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
      siteHeaderHtml: getHeaderHtml(from),
    });

    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      alert("Popup blocked. Allow popups for this site to print/export.");
      setPrinting(false);
      return;
    }

    w.document.open();
    w.document.write(printableHtml);
    w.document.close();

    // Wait briefly for images to render then call print
    setTimeout(() => {
      try {
        w.focus();
        w.print();
      } catch (err) {
        console.error("Print failed:", err);
      } finally {
        setPrinting(false);
      }
    }, 600);
  };

  const handleExportPdf = async () => {
    setExporting(true);
    const printableHtml = buildPrintableHtml({
      pages,
      contentOption,
      inkSaving,
      siteHeaderHtml: getHeaderHtml(from),
    });

    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      alert("Popup blocked. Allow popups for this site to export PDF.");
      setExporting(false);
      return;
    }

    w.document.open();
    w.document.write(printableHtml);
    w.document.close();

    setTimeout(() => {
      try {
        w.focus();
        w.print();
      } catch (err) {
        console.error("Export PDF failed:", err);
      } finally {
        setExporting(false);
      }
    }, 600);
  };

  // Empty state
  if (!cards || cards.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
        <header className="sticky top-0 z-50 bg-[var(--color-bg-main)]/80 backdrop-blur-md border-b border-black/5">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link
              href="/"
              className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80"
            >
              ClassBloom
            </Link>

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
          <Link href="/" className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80">
            ClassBloom
          </Link>

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
          <div className="bg-white rounded-2xl p-4 shadow-sm border">
            <h3 className="font-semibold mb-3">Cards per page</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 4, 8].map((n) => (
                <CardsPerPageOption key={n} n={n} />
              ))}
            </div>

            <h3 className="font-semibold mb-3">Content</h3>
            <div className="flex flex-col gap-2 mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="content"
                  checked={contentOption === "picture+word"}
                  onChange={() => setContentOption("picture+word")}
                />
                <span className="text-sm">Picture + word</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="content"
                  checked={contentOption === "picture-only"}
                  onChange={() => setContentOption("picture-only")}
                />
                <span className="text-sm">Picture only</span>
              </label>
            </div>

            <h3 className="font-semibold mb-3">Ink-saving</h3>
            <label className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                checked={inkSaving}
                onChange={(e) => setInkSaving(e.target.checked)}
              />
              <span className="text-sm">Grayscale / low-ink mode</span>
            </label>

            <div className="mt-4 flex flex-col gap-3">
              <button
                onClick={handlePrintNow}
                disabled={printing}
                className={`btn btn-primary w-full py-3 ${printing ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {printing ? "Printing…" : "Print Now"}
              </button>

              <button
                onClick={handleExportPdf}
                disabled={exporting}
                className={`btn btn-primary w-full py-3 ${exporting ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {exporting ? "Generating PDF…" : "Export PDF"}
              </button>
            </div>
          </div>
        </aside>

        {/* CENTER: occupies more space; contains lesson tray (not sticky, shorter) and preview (large, scrollable one-page-at-a-time) */}
        <main className="col-span-12 lg:col-span-9">
          {/* Lesson Tray (shorter, not sticky) */}
          <div className="bg-white rounded-2xl p-3 shadow-sm border mb-4">
            <h3 className="font-semibold mb-2">Lesson Tray (thumbnails)</h3>

            <div className="flex gap-3 overflow-x-auto py-2" style={{ maxHeight: 140 }}>
              {cards.map((c) => (
                <div
                  key={c.id}
                  className="min-w-[120px] max-w-[120px] bg-[var(--color-bg-soft)] rounded-xl p-2 flex-shrink-0 border"
                >
                  <div
                    className={`w-full h-[86px] rounded-md overflow-hidden mb-2 flex items-center justify-center bg-gray-100`}
                    style={{
                      filter: inkSaving ? "grayscale(100%)" : undefined,
                    }}
                  >
                    <img src={c.image} alt={c.word} className="w-full h-full object-cover" />
                  </div>
                  {contentOption === "picture+word" && (
                    <div className="text-sm font-medium text-center truncate">{c.word.replaceAll("_", " ")}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Large Preview area:
              - occupies most vertical space
              - horizontally scrollable with snap; shows one page at a time (full width of preview area)
          */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border">
            <h3 className="font-semibold mb-3">Preview (scroll to see pages)</h3>

            <div
              id="print-preview"
              className={`preview-scroll flex gap-4`}
              style={{
                overflowX: "auto",
                scrollSnapType: "x mandatory",
                WebkitOverflowScrolling: "touch",
                paddingBottom: 12,
              }}
            >
              {pages.map((pageCards, pageIndex) => (
                <div
                  key={pageIndex}
                  className="print-page flex-shrink-0"
                  style={{
                    width: "100%",
                    maxWidth: "100%",
                    scrollSnapAlign: "start",
                    boxSizing: "border-box",
                    // visual page size for preview
                    minHeight: 520,
                    padding: 24,
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                  }}
                >
                  <div className={`grid ${gridClassFor(selectedCardsPerPage ?? 1)}`}>
                    {pageCards.map((card) => (
                      <div
                        key={card.id}
                        className="rounded-lg border p-4 flex flex-col items-center justify-center"
                        style={{
                          borderColor: inkSaving ? "rgba(0,0,0,0.12)" : undefined,
                        }}
                      >
                        <div
                          className="w-full aspect-video rounded-md overflow-hidden mb-3 flex items-center justify-center bg-gray-100"
                          style={{
                            filter: inkSaving ? "grayscale(100%)" : undefined,
                          }}
                        >
                          <img src={card.image} alt={card.word} className="w-full h-full object-cover" />
                        </div>

                        {contentOption === "picture+word" && (
                          <div className="text-xl font-semibold text-center">
                            {card.word.replaceAll("_", " ")}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* placeholders to preserve grid structure */}
                    {Array.from({ length: (selectedCardsPerPage ?? 1) - pageCards.length }).map((_, i) => (
                      <div key={"ph-" + i} className="rounded-lg border p-4 bg-transparent" />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs text-[var(--color-text-muted)]">
              Scroll horizontally to view each printable page. Use Print Now / Export PDF to generate output.
            </p>
          </div>
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

/* ---------------------------
   Helpers reused from prior implementation
   --------------------------- */

function getHeaderHtml(from: string) {
  const returnUrl = from === "dashboard" ? "/dashboard" : "/flashcards";
  const returnText = from === "dashboard" ? "Return to Dashboard" : "Return to Flashcards";
  return `
    <div style="font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding:12px 24px; display:flex; align-items:center; justify-content:space-between;">
      <div style="font-weight:800; color:#2563eb; font-size:28px;">ClassBloom</div>
      <div style="font-size:18px; font-weight:700;">Printables</div>
      <div><a href="${returnUrl}" style="color:#166534; text-decoration:none; font-weight:600;">${returnText}</a></div>
    </div>
  `;
}

function buildPrintableHtml(opts: {
  pages: Card[][];
  contentOption: "picture+word" | "picture-only";
  inkSaving: boolean;
  siteHeaderHtml: string;
}) {
  const { pages, contentOption, inkSaving, siteHeaderHtml } = opts;

  const style = `
    <style>
      @page { margin: 0.75in; }
      body { font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; margin:0; padding:0; color:#111827; }
      .print-page { page-break-after: always; break-after: page; margin: 0 auto; width: 100%; box-sizing: border-box; padding: 18px; }
      .page-grid { display: grid; gap: 18px; }
      .card { border: 1px solid ${inkSaving ? "rgba(0,0,0,0.12)" : "#e5e7eb"}; border-radius:12px; padding:12px; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; }
      .card img { width:100%; height:auto; object-fit:cover; border-radius:8px; display:block; }
      .card .word { margin-top:10px; font-weight:700; text-align:center; }
      ${inkSaving ? ".card img { filter: grayscale(100%); }" : ""}
      .g1 { grid-template-columns: repeat(1, 1fr); }
      .g2 { grid-template-columns: repeat(2, 1fr); }
      .g4 { grid-template-columns: repeat(2, 1fr); }
      .g8 { grid-template-columns: repeat(4, 1fr); }
    </style>
  `;

  const bodyHtml = pages
    .map((pageCards) => {
      const per = pageCards.length;
      let cls = "g1";
      if (per === 1) cls = "g1";
      else if (per === 2) cls = "g2";
      else if (per === 4) cls = "g4";
      else if (per === 8) cls = "g8";
      else if (per <= 2) cls = "g2";
      else if (per <= 4) cls = "g4";
      else cls = "g8";

      const cardsHtml = pageCards
        .map((c) => {
          const imageHtml = `<div style="width:100%; height:160px; overflow:hidden; border-radius:8px; background:#f3f4f6;">
              <img src="${escapeHtml(c.image)}" alt="${escapeHtml(c.word)}" style="width:100%; height:100%; object-fit:cover;" />
            </div>`;
          const wordHtml =
            contentOption === "picture+word"
              ? `<div class="word" style="font-size:18px;">${escapeHtml(c.word.replaceAll("_", " "))}</div>`
              : "";

          return `<div class="card">${imageHtml}${wordHtml}</div>`;
        })
        .join("");

      return `<div class="print-page"><div class="page-grid ${cls}">${cardsHtml}</div></div>`;
    })
    .join("");

  const full = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>ClassBloom Print</title>
        ${style}
      </head>
      <body>
        ${siteHeaderHtml}
        <main>
          ${bodyHtml}
        </main>
      </body>
    </html>
  `;
  return full;
}

function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
