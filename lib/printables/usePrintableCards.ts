"use client";

import { useEffect, useState } from "react";

import { resolveLessonImageUrl } from "@/lib/lessons/image";
import {
  readLessonTray,
  subscribeToLessonTray,
  type LessonTrayScope,
} from "@/lib/lessons/tray";
import { PrintableCard } from "@/lib/printables/types";

const STORAGE_SAVED_KEY = "classendo-saved-lessons";

function normalizePrintableCard(raw: unknown): PrintableCard {
  const source = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(source.id ?? source.card_id ?? source.word),
    word: String(source.word ?? source.front ?? ""),
    image: resolveLessonImageUrl(String(source.image ?? source.back ?? "/placeholder.png")),
    type: typeof source.type === "string" ? source.type : undefined,
  };
}

function readPrintableCards(scope: LessonTrayScope): PrintableCard[] {
  try {
    const trayCards = readLessonTray(scope);
    if (trayCards.length > 0) {
      return trayCards.map(normalizePrintableCard);
    }

    if (scope === "guest") return [];
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

export function usePrintableCards({
  isAuthenticated,
  ready,
}: {
  isAuthenticated: boolean;
  ready: boolean;
}) {
  const scope: LessonTrayScope = isAuthenticated ? "account" : "guest";
  const [trayState, setTrayState] = useState<{
    scope: LessonTrayScope;
    cards: PrintableCard[];
  }>({ scope, cards: [] });

  useEffect(() => {
    if (!ready) return;

    return subscribeToLessonTray((nextCards) => {
      if (nextCards.length > 0) {
        setTrayState({ scope, cards: nextCards.map(normalizePrintableCard) });
        return;
      }

      setTrayState({ scope, cards: readPrintableCards(scope) });
    }, scope);
  }, [ready, scope]);

  return {
    cards: ready && trayState.scope === scope ? trayState.cards : [],
  };
}
