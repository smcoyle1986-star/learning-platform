"use client";

import { useEffect, useState } from "react";

import { readLessonTray, subscribeToLessonTray } from "@/lib/lessons/tray";
import { PrintableCard } from "@/lib/printables/types";

const STORAGE_SAVED_KEY = "classendo-saved-lessons";

function normalizePrintableCard(raw: any): PrintableCard {
  return {
    id: String(raw.id ?? raw.card_id ?? raw.word),
    word: String(raw.word ?? raw.front ?? ""),
    image: String(raw.image ?? raw.back ?? "/placeholder.png"),
    type: raw.type ?? undefined,
  };
}

function readPrintableCards(): PrintableCard[] {
  try {
    const trayCards = readLessonTray();
    if (trayCards.length > 0) {
      return trayCards.map(normalizePrintableCard);
    }

    const savedRaw = localStorage.getItem(STORAGE_SAVED_KEY);
    if (savedRaw) {
      const parsed = JSON.parse(savedRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0];
        if (first?.cards && Array.isArray(first.cards) && first.cards.length > 0) {
          return first.cards.map(normalizePrintableCard);
        }
      }
    }
  } catch (error) {
    console.error("Failed to read printable cards from localStorage:", error);
  }

  return [];
}

export function usePrintableCards() {
  const [cards, setCards] = useState<PrintableCard[]>([]);

  useEffect(() => {
    setCards(readPrintableCards());

    return subscribeToLessonTray((nextCards) => {
      if (nextCards.length > 0) {
        setCards(nextCards.map(normalizePrintableCard));
        return;
      }

      setCards(readPrintableCards());
    });
  }, []);

  return { cards };
}
