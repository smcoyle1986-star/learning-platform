"use client";

import { Card, CarouselEntry, FlashcardImageVariant } from "@/lib/flashcards/types";

type FlashcardResultsGridProps = {
  results: Card[];
  lastAddedId: string | null;
  canUsePremiumImageVariations: boolean;
  allowImageVariations?: boolean;
  getCarouselKey: (card: Card) => string;
  getCardImages: (card: Card) => FlashcardImageVariant[];
  getActiveImage: (card: Card) => string;
  getActiveVariant: (card: Card) => FlashcardImageVariant;
  getDisplayWord: (card: Card) => string;
  carouselState: Record<string, CarouselEntry>;
  onAddToLessonTray: (card: Card) => void;
  onStartCarouselSlide: (card: Card, direction: "left" | "right") => void;
  onFinishCarouselSlide: (card: Card) => void;
  emptyMessage?: string;
};

export default function FlashcardResultsGrid({
  results,
  lastAddedId,
  canUsePremiumImageVariations,
  allowImageVariations = true,
  getCarouselKey,
  getCardImages,
  getActiveImage,
  getActiveVariant,
  getDisplayWord,
  carouselState,
  onAddToLessonTray,
  onStartCarouselSlide,
  onFinishCarouselSlide,
  emptyMessage = "Select a tab to load flashcards",
}: FlashcardResultsGridProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-24 text-[var(--color-text-muted)]">
        <p className="text-lg mb-2">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <section className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      {results.map((card) => {
        const key = getCarouselKey(card);
        const availableImages = getCardImages(card);
        const images = allowImageVariations
          ? availableImages
          : [
              availableImages.find((variant) => !variant.isPremium)
                ?? { url: card.image, isPremium: false },
            ];
        const carousel = carouselState[key] || {
          index: 0,
          animating: false,
          direction: "right" as const,
          nextIndex: 0,
          phase: "start" as const,
        };
        const currentIndex = allowImageVariations ? carousel.index ?? 0 : 0;
        const currentVariant = images[currentIndex] ?? getActiveVariant(card);
        const currentImage = currentVariant?.url ?? card.image;
        const nextIndex = carousel.nextIndex ?? currentIndex;
        const nextImage = images[nextIndex]?.url ?? currentImage;
        const showLeft = currentIndex > 0;
        const showRight = currentIndex < images.length - 1;
        const isLockedPremium = Boolean(
          currentVariant?.isPremium && !canUsePremiumImageVariations
        );

        return (
          <div
            key={card.id}
            onClick={() => !isLockedPremium && onAddToLessonTray(card)}
            className={`group relative rounded-2xl bg-white p-4 shadow-sm transition ${
              isLockedPremium ? "cursor-default" : "cursor-pointer hover:shadow-md"
            }`}
          >
            {lastAddedId === `${card.type}:${getDisplayWord(card)}:${getActiveImage(card)}` && (
              <div className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-blue-200 bg-white/95 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm animate-fade-up">
                Added!
              </div>
            )}
            <div className="relative aspect-square rounded-xl bg-[var(--color-bg-card)] mb-3 overflow-hidden">
              <img
                src={currentImage}
                alt={card.word}
                className={`absolute inset-0 h-full w-full object-contain transition-transform duration-300 ${
                  carousel.animating
                    ? carousel.direction === "right"
                      ? "-translate-x-full"
                      : "translate-x-full"
                    : "translate-x-0"
                }`}
              />
              {carousel.animating && (
                <img
                  src={nextImage}
                  alt={card.word}
                  onTransitionEnd={() => onFinishCarouselSlide(card)}
                  className="absolute inset-0 h-full w-full object-contain transition-transform duration-300"
                  style={{
                    transform:
                      carousel.phase === "start"
                        ? carousel.direction === "right"
                          ? "translateX(100%)"
                          : "translateX(-100%)"
                        : "translateX(0%)",
                  }}
                />
              )}

              {isLockedPremium ? (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-start bg-black/12 p-3">
                  <div className="rounded-full border border-[#eadfc6] bg-[#fff6ea]/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b6a3f] shadow-sm">
                    Premium
                  </div>
                </div>
              ) : null}

              {showLeft && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onStartCarouselSlide(card, "left");
                  }}
                  className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 border shadow px-2 py-1 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Previous image"
                >
                  ◀
                </button>
              )}
              {showRight && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onStartCarouselSlide(card, "right");
                  }}
                  className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 border shadow px-2 py-1 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Next image"
                >
                  ▶
                </button>
              )}
            </div>
            <h3 className="font-semibold">{getDisplayWord(card).replaceAll("_", " ")}</h3>

            <p className="text-xs text-[var(--color-text-muted)] capitalize">
              {card.type}
              {isLockedPremium ? " · locked image" : ""}
            </p>
          </div>
        );
      })}
    </section>
  );
}
