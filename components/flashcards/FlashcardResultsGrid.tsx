"use client";

import { Card, CarouselEntry, FlashcardImageVariant } from "@/lib/flashcards/types";
import { ResponsiveStorageImage } from "@/components/images/ResponsiveStorageImage";

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
    <section className="mt-6 grid grid-cols-2 gap-3 px-4 sm:mt-10 sm:grid-cols-3 sm:gap-6 sm:px-6 md:grid-cols-4 lg:grid-cols-5 xl:px-0">
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
        const isPremiumImage = Boolean(currentVariant?.isPremium);
        const isLockedPremium = Boolean(
          isPremiumImage && !canUsePremiumImageVariations
        );

        return (
          <div
            key={card.id}
            onClick={() => !isLockedPremium && onAddToLessonTray(card)}
            className={`group relative rounded-2xl bg-white p-3 shadow-sm transition sm:p-4 ${
              isLockedPremium ? "cursor-default" : "cursor-pointer hover:shadow-md"
            }`}
          >
            {lastAddedId === `${card.type}:${getDisplayWord(card)}:${getActiveImage(card)}` && (
              <div className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-blue-200 bg-white/95 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm animate-fade-up">
                Added!
              </div>
            )}
            <div className="relative aspect-square rounded-xl bg-[var(--color-bg-card)] mb-3 overflow-hidden">
              <ResponsiveStorageImage
                src={currentImage}
                alt={card.word}
                className={`absolute inset-0 h-full w-full object-contain transition-transform duration-300 ${
                  carousel.animating
                    ? carousel.direction === "right"
                      ? "-translate-x-full"
                      : "translate-x-full"
                    : "translate-x-0"
                }`}
                sizes="(max-width: 639px) 50vw, (max-width: 767px) 33vw, (max-width: 1023px) 25vw, 20vw"
                widths={[160, 240, 320, 480]}
              />
              {carousel.animating && (
                <ResponsiveStorageImage
                  src={nextImage}
                  alt={card.word}
                  onTransitionEnd={() => onFinishCarouselSlide(card)}
                  className="absolute inset-0 h-full w-full object-contain transition-transform duration-300"
                  sizes="(max-width: 639px) 50vw, (max-width: 767px) 33vw, (max-width: 1023px) 25vw, 20vw"
                  widths={[160, 240, 320, 480]}
                  loading="eager"
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

              {isPremiumImage ? (
                <div
                  className={`pointer-events-none absolute z-10 flex items-start justify-start p-3 ${
                    isLockedPremium ? "inset-0 bg-black/12" : "left-0 top-0"
                  }`}
                >
                  <div className="rounded-full border border-[#eadfc6] bg-[#fff6ea]/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b6a3f] shadow-sm backdrop-blur-sm">
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
                  className="absolute left-2 top-1/2 z-20 inline-flex min-h-10 min-w-10 -translate-y-1/2 items-center justify-center rounded-full border bg-white/90 text-sm opacity-100 shadow transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
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
                  className="absolute right-2 top-1/2 z-20 inline-flex min-h-10 min-w-10 -translate-y-1/2 items-center justify-center rounded-full border bg-white/90 text-sm opacity-100 shadow transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label="Next image"
                >
                  ▶
                </button>
              )}
            </div>
            <h3 className="text-sm font-semibold sm:text-base">{getDisplayWord(card).replaceAll("_", " ")}</h3>

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
