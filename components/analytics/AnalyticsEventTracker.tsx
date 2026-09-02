"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { captureSignupAttribution } from "@/lib/analytics/attribution";
import { trackConversion } from "@/lib/analytics/vercel";
import { clearLessonTray } from "@/lib/lessons/tray";

const WORKSHEET_KEYS: Record<string, string> = {
  Crossword: "crossword",
  Bullseye: "bullseye",
  Matching: "matching",
  Battleship: "battleship",
  "Question Builder": "questions",
  Reading: "reading",
  "Sentence Scramble": "sentence-scramble",
  "Tic-Tac-Toe": "tic-tac-toe",
  Wordsearch: "wordsearch",
  Writing: "writing",
};

function flashcardCategory() {
  const selected = Array.from(
    document.querySelectorAll<HTMLElement>("[data-dropdown-btn]"),
  ).find((element) => element.classList.contains("btn-primary"));
  return selected?.dataset.dropdownBtn ?? "";
}

function trackVocabularySearch() {
  const input = document.querySelector<HTMLInputElement>(
    'input[placeholder="Select a tab before searching"], input[placeholder="Search My Uploads"]',
  );
  const label = input?.value.trim() ?? "";
  if (!label) return;
  void trackAnalyticsEvent({
    eventType: "vocabulary_search",
    itemKey: label.toLocaleLowerCase(),
    itemLabel: label,
    category: flashcardCategory(),
  });
}

export function AnalyticsEventTracker() {
  const pathname = usePathname();

  useEffect(() => {
    captureSignupAttribution();

    if (pathname === "/flashcards") {
      trackConversion("lesson_opened", { format: "flashcards" });
      void trackAnalyticsEvent({
        eventType: "flashcards_opened",
        itemKey: "flashcards",
        itemLabel: "Flashcards",
        category: "tool",
      });
      return;
    }

    if (pathname === "/flashcards/classroom") {
      trackConversion("lesson_opened", { format: "classroom" });
      void trackAnalyticsEvent({
        eventType: "classroom_opened",
        itemKey: "classroom",
        itemLabel: "Classroom Mode",
        category: "tool",
      });
      return;
    }

    const packSlug = pathname.match(/^\/free-resources\/([^/]+)$/)?.[1];
    if (packSlug) {
      trackConversion("lesson_opened", { format: "free_resource" });
      void trackAnalyticsEvent({
        eventType: "lesson_pack_viewed",
        itemKey: packSlug,
        itemLabel: packSlug.replaceAll("-", " "),
        category: "lesson pack",
      });
    }
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const path = window.location.pathname;

      if (target.closest('a[href="/flashcards?from=free-resource"]')) {
        // Free-pack links intentionally start a fresh temporary lesson. Clear
        // both stores before navigating because authentication may still be
        // resolving when the visitor arrives on Flashcards.
        clearLessonTray("guest");
        clearLessonTray("account");
        return;
      }

      if (path === "/flashcards") {
        const button = target.closest("button");
        if (button?.textContent?.trim() === "Search") {
          trackVocabularySearch();
          return;
        }
        if (button) return;

        const card = target.closest<HTMLElement>("div.group");
        const label = card?.querySelector("h3")?.textContent?.trim() ?? "";
        const detail = card?.querySelector("p")?.textContent?.trim() ?? "";
        if (!label || detail.includes("locked image")) return;
        const category = detail.split("·")[0]?.trim() ?? "";
        void trackAnalyticsEvent({
          eventType: "flashcard_view",
          itemKey: `${category}:${label.toLocaleLowerCase()}`,
          itemLabel: label,
          category,
        });
        return;
      }

      if (path === "/worksheets") {
        const button = target.closest("button");
        const label = button?.textContent?.trim() ?? "";
        const key = WORKSHEET_KEYS[label];
        if (!key) return;
        void trackAnalyticsEvent({
          eventType: "worksheet_generated",
          itemKey: key,
          itemLabel: label,
          category: "worksheet",
        });
        return;
      }

      const packDownload = target.closest<HTMLAnchorElement>(
        'a[href^="/free-resources/"][href$=".pdf"]',
      );
      if (packDownload) {
        const slug = packDownload
          .getAttribute("href")
          ?.replace(/^\/free-resources\//, "")
          .replace(/\.pdf$/, "");
        if (!slug) return;
        void trackAnalyticsEvent({
          eventType: "lesson_pack_downloaded",
          itemKey: slug,
          itemLabel: slug.replaceAll("-", " "),
          category: "lesson pack",
        });
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (window.location.pathname !== "/flashcards" || event.key !== "Enter") return;
      const target = event.target instanceof HTMLInputElement ? event.target : null;
      if (!target?.placeholder.toLocaleLowerCase().includes("search")) return;
      trackVocabularySearch();
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  return null;
}
