"use client";

import { Images, Lock, Search, X } from "lucide-react";
import type { CSSProperties } from "react";

import {
  ADJECTIVE_THEME_GROUPS,
  FLASHCARD_THEMES,
  WordType,
} from "@/lib/flashcards/types";

type FlashcardSearchControlsProps = {
  openDropdown: string | null;
  activeWordType: WordType;
  activeTheme: string | null;
  query: string;
  isMyCards: boolean;
  canUseCreator: boolean;
  onSetOpenDropdown: (value: string | null) => void;
  onSetActiveWordType: (value: WordType) => void;
  onSetActiveTheme: (value: string | null) => void;
  onSetQuery: (value: string) => void;
  onSearch: () => Promise<void> | void;
  onShowCatalog: () => void;
  onShowMyCards: () => Promise<void> | void;
  onClearGrid: () => void;
  onGoDashboard: () => void;
  onGoGames: () => void;
  onGoCommunity: () => void;
};

function wordTypeButton(active: boolean) {
  return `btn px-4 py-2 rounded-full text-sm font-semibold transition-all ${
    active ? "btn-primary" : "btn-secondary"
  }`;
}

function adjectiveThemeButton(
  themeValue: string,
  themeTone: "grammar" | "meaning",
  active: boolean
) {
  const grammarStyles: Record<
    string,
    { base: CSSProperties; active: CSSProperties }
  > = {
    comparative: {
      base: {
        backgroundColor: "#e0f2fe",
        borderColor: "#bae6fd",
        color: "#0369a1",
      },
      active: {
        backgroundColor: "#bae6fd",
        borderColor: "#7dd3fc",
        color: "#0c4a6e",
        boxShadow: "0 6px 14px rgba(15, 23, 42, 0.08)",
      },
    },
    superlative: {
      base: {
        backgroundColor: "#dbeafe",
        borderColor: "#bfdbfe",
        color: "#1d4ed8",
      },
      active: {
        backgroundColor: "#bfdbfe",
        borderColor: "#93c5fd",
        color: "#1e3a8a",
        boxShadow: "0 6px 14px rgba(15, 23, 42, 0.08)",
      },
    },
    adverb: {
      base: {
        backgroundColor: "#e0e7ff",
        borderColor: "#c7d2fe",
        color: "#4338ca",
      },
      active: {
        backgroundColor: "#c7d2fe",
        borderColor: "#a5b4fc",
        color: "#312e81",
        boxShadow: "0 6px 14px rgba(15, 23, 42, 0.08)",
      },
    },
  };

  const isGrammar = themeTone === "grammar";
  const grammarStyle = isGrammar
    ? active
      ? grammarStyles[themeValue]?.active
      : grammarStyles[themeValue]?.base
    : undefined;

  const className = `btn w-full px-3 py-2 text-left transition-all ${
    isGrammar ? "border" : active ? "btn-primary" : "btn-secondary"
  }`;

  return { className, style: grammarStyle };
}

export default function FlashcardSearchControls({
  openDropdown,
  activeWordType,
  activeTheme,
  query,
  isMyCards,
  canUseCreator,
  onSetOpenDropdown,
  onSetActiveWordType,
  onSetActiveTheme,
  onSetQuery,
  onSearch,
  onShowCatalog,
  onShowMyCards,
  onClearGrid,
  onGoDashboard,
  onGoGames,
  onGoCommunity,
}: FlashcardSearchControlsProps) {
  const adjectiveThemeLabel =
    activeWordType === "adjective" && activeTheme
      ? ADJECTIVE_THEME_GROUPS.flatMap((group) => group.items).find(
          (item) => item.value === activeTheme
        )?.label ?? activeTheme
      : null;

  return (
    <>
      <section className="bg-[var(--color-bg-main)] border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                value={query}
                onChange={(event) => onSetQuery(event.target.value)}
                onKeyDown={async (event) => {
                  if (event.key === "Enter") {
                    await onSearch();
                  }
                }}
                placeholder={isMyCards ? "Search My Cards" : "Select a tab before searching"}
                className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white"
              />
            </div>

            <button onClick={onSearch} className="btn btn-primary px-5 py-2.5 whitespace-nowrap">
              Search
            </button>

            <button
              type="button"
              onClick={onClearGrid}
              className="btn btn-secondary px-4 py-2 flex items-center gap-2 whitespace-nowrap"
            >
              <X size={16} />
              Clear Grid
            </button>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 relative justify-center">
            {(["noun", "verb", "adjective", "phonics", "preposition"] as const).map((type) => {
              const isSelectedType = !isMyCards && activeWordType === type;

              return (
                <div key={type} className="relative" data-dropdown-type={type}>
                  <button
                    className={wordTypeButton(isSelectedType)}
                    onClick={() => {
                      onShowCatalog();
                      onSetOpenDropdown(openDropdown === type ? null : type);
                      onSetActiveWordType(type);
                      onSetActiveTheme(null);
                    }}
                    data-dropdown-btn={type}
                  >
                    {activeWordType === type && adjectiveThemeLabel
                      ? adjectiveThemeLabel
                      : activeWordType === type && activeTheme
                        ? activeTheme
                        : type}
                  </button>

                  {openDropdown === type &&
                    (type === "adjective" ? (
                      <div
                        className="absolute z-50 mt-2 w-48 rounded-2xl bg-white shadow-lg border p-2 max-h-64 overflow-y-auto overscroll-contain space-y-2"
                        data-dropdown-type={type}
                      >
                        {ADJECTIVE_THEME_GROUPS.flatMap((group) => group.items.map((theme) => ({
                          theme,
                          tone: group.tone ?? "meaning",
                        }))).map(({ theme, tone }, index, list) => {
                          const previousTone = list[index - 1]?.tone;
                          const showDivider = previousTone === "grammar" && tone === "meaning";

                          return (
                            <div key={theme.value}>
                              {showDivider && <div className="h-px bg-black/5 my-1" aria-hidden="true" />}
                              <button
                                onClick={() => {
                                onSetActiveTheme(theme.value);
                                  onSetActiveWordType(type);
                                  onSetOpenDropdown(null);
                                  setTimeout(() => {
                                    void onSearch();
                                  }, 0);
                                }}
                                {...adjectiveThemeButton(
                                  theme.value,
                                  tone,
                                  activeTheme === theme.value
                                )}
                              >
                                {theme.label}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div
                        className="absolute z-50 mt-2 w-48 rounded-2xl bg-white shadow-lg border p-2 max-h-64 overflow-y-auto overscroll-contain space-y-2"
                        data-dropdown-type={type}
                      >
                        {FLASHCARD_THEMES[type].map((theme) => (
                          <button
                            key={theme}
                            onClick={() => {
                              onSetActiveTheme(theme);
                              onSetActiveWordType(type);
                              onSetOpenDropdown(null);
                              setTimeout(() => {
                                void onSearch();
                              }, 0);
                            }}
                            className={`btn w-full px-3 py-2 text-left transition-all ${
                              activeTheme === theme ? "btn-primary" : "btn-secondary"
                            }`}
                          >
                            {theme}
                          </button>
                        ))}
                      </div>
                    ))}
                </div>
              );
            })}

            <button
              type="button"
              disabled={!canUseCreator}
              onClick={() => void onShowMyCards()}
              className={`${wordTypeButton(isMyCards)} flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-55`}
              title={canUseCreator ? "Show your creator cards" : "My Cards is a premium feature"}
            >
              {canUseCreator ? <Images size={16} /> : <Lock size={15} />}
              My Cards
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
