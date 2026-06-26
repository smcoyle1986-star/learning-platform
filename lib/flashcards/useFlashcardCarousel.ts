"use client";

import { useEffect, useState } from "react";

import { lemmaKey } from "@/lib/flashcards/catalog";
import { Card, CarouselEntry, FlashcardImageVariant } from "@/lib/flashcards/types";

const DEFAULT_CAROUSEL_ENTRY: CarouselEntry = {
  index: 0,
  animating: false,
  direction: "right",
  nextIndex: 0,
  phase: "start",
};

export function useFlashcardCarousel(params: {
  results: Card[];
  imageVariants: Record<string, FlashcardImageVariant[]>;
}) {
  const { imageVariants } = params;
  const [carouselState, setCarouselState] = useState<Record<string, CarouselEntry>>({});

  function getCarouselKey(card: Card) {
    return lemmaKey(card);
  }

  function getCardImages(card: Card) {
    const key = getCarouselKey(card);
    const variants = imageVariants[key];
    if (variants && variants.length > 0) return variants;
    return card.image ? [{ url: card.image, isPremium: false }] : [];
  }

  function getActiveImage(card: Card) {
    const key = getCarouselKey(card);
    const images = getCardImages(card);
    const index = carouselState[key]?.index ?? 0;
    return images[index]?.url ?? images[0]?.url ?? card.image;
  }

  function getActiveVariant(card: Card) {
    const key = getCarouselKey(card);
    const images = getCardImages(card);
    const index = carouselState[key]?.index ?? 0;
    return images[index] ?? images[0] ?? { url: card.image, isPremium: false };
  }

  useEffect(() => {
    const pendingKeys = Object.keys(carouselState).filter(
      (key) => carouselState[key]?.animating && carouselState[key]?.phase === "start"
    );
    if (pendingKeys.length === 0) return;

    const timer = setTimeout(() => {
      setCarouselState((prev) => {
        const next = { ...prev };
        pendingKeys.forEach((key) => {
          const entry = next[key];
          if (entry && entry.animating && entry.phase === "start") {
            next[key] = { ...entry, phase: "move" };
          }
        });
        return next;
      });
    }, 16);

    return () => clearTimeout(timer);
  }, [carouselState]);

  function startCarouselSlide(card: Card, direction: "left" | "right") {
    const key = getCarouselKey(card);
    const images = getCardImages(card);
    if (images.length <= 1) return;

    const current = carouselState[key] || DEFAULT_CAROUSEL_ENTRY;
    if (current.animating) return;
    if (direction === "left" && current.index <= 0) return;
    if (direction === "right" && current.index >= images.length - 1) return;

    const nextIndex = direction === "right" ? current.index + 1 : current.index - 1;
    setCarouselState((prev) => ({
      ...prev,
      [key]: { ...current, animating: true, direction, nextIndex, phase: "start" },
    }));
  }

  function finishCarouselSlide(card: Card) {
    const key = getCarouselKey(card);
    const current = carouselState[key];
    if (!current || !current.animating) return;

    setCarouselState((prev) => ({
      ...prev,
      [key]: { ...current, animating: false, index: current.nextIndex },
    }));
  }

  return {
    carouselState,
    getCarouselKey,
    getCardImages,
    getActiveImage,
    getActiveVariant,
    startCarouselSlide,
    finishCarouselSlide,
  };
}
