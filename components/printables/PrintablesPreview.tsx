"use client";

import { PrintableCard, PrintableContentOption } from "@/lib/printables/types";
import LessonTrayScroller from "@/components/shared/LessonTrayScroller";
import { resolveLessonImageUrl } from "@/lib/lessons/image";

type PrintablesPreviewProps = {
  cards: PrintableCard[];
  pages: PrintableCard[][];
  selectedCardsPerPage: number | null;
  contentOption: PrintableContentOption;
  inkSaving: boolean;
};

function gridClassFor(value: number | null) {
  switch (value ?? 1) {
    case 1:
      return "grid-cols-1 gap-6";
    case 2:
      return "grid-cols-2 gap-6";
    case 4:
      return "grid-cols-2 gap-5";
    case 8:
      return "grid-cols-4 gap-4";
    default:
      return "grid-cols-1 gap-6";
  }
}

export default function PrintablesPreview({
  cards,
  pages,
  selectedCardsPerPage,
  contentOption,
  inkSaving,
}: PrintablesPreviewProps) {
  return (
    <>
      <div className="bg-white rounded-2xl p-3 shadow-sm border mb-4">
        <h3 className="font-semibold mb-2">Lesson Tray (thumbnails)</h3>

        <LessonTrayScroller className="pb-1" contentClassName="gap-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className="min-w-[120px] max-w-[120px] bg-[var(--color-bg-soft)] rounded-xl p-2 flex-shrink-0 border"
            >
                <div
                  className="w-full h-[86px] rounded-md overflow-hidden mb-2 flex items-center justify-center bg-gray-100"
                  style={{ filter: inkSaving ? "grayscale(100%)" : undefined }}
                >
                <img src={resolveLessonImageUrl(card.image)} alt={card.word} className="w-full h-full object-cover" />
                </div>
              {contentOption === "picture+word" && (
                <div className="text-sm font-medium text-center truncate">
                  {card.word.replaceAll("_", " ")}
                </div>
              )}
            </div>
          ))}
        </LessonTrayScroller>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border">
        <h3 className="font-semibold mb-3">Preview (scroll to see pages)</h3>

        <div
          id="print-preview"
          className="preview-scroll flex gap-4"
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
                aspectRatio: "11 / 8.5",
                minHeight: 0,
                padding: "14px 12px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                className={`grid ${gridClassFor(selectedCardsPerPage)}`}
                style={{
                  width:
                    selectedCardsPerPage === 1
                      ? "68%"
                      : selectedCardsPerPage === 2
                        ? "88%"
                        : selectedCardsPerPage === 4
                          ? "74%"
                          : "94%",
                  margin: "0 auto",
                  alignItems: "stretch",
                  justifyItems: "stretch",
                }}
              >
                {Array.from({ length: selectedCardsPerPage ?? 1 }).map((_, index) => {
                  const card = pageCards[index];
                  if (!card) {
                    return (
                      <div
                        key={`ph-${pageIndex}-${index}`}
                        className="rounded-lg border p-4 bg-transparent"
                        style={{ aspectRatio: "1 / 1", width: "100%", opacity: 0 }}
                      />
                    );
                  }

                  return (
                  <div
                    key={card.id}
                    className="rounded-lg border p-3 flex flex-col items-stretch justify-between"
                    style={{
                      borderColor: inkSaving ? "rgba(0,0,0,0.12)" : undefined,
                      aspectRatio: "1 / 1",
                      width: "100%",
                    }}
                  >
                    <div
                      className="w-full flex-1 min-h-0 rounded-md overflow-hidden mb-3 flex items-center justify-center bg-gray-100"
                      style={{ filter: inkSaving ? "grayscale(100%)" : undefined }}
                    >
                      <img
                        src={resolveLessonImageUrl(card.image)}
                        alt={card.word}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {contentOption === "picture+word" && (
                      <div className="text-[20px] font-semibold text-center leading-tight">
                        {card.word.replaceAll("_", " ")}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          Scroll horizontally to view each printable page. Use Print Now / Export PDF to generate output.
        </p>
      </div>
    </>
  );
}
