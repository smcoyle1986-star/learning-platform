"use client";

import { Search, X } from "lucide-react";

import { FLASHCARD_THEMES, WordType } from "@/lib/flashcards/types";

type FlashcardSearchControlsProps = {
  openDropdown: string | null;
  activeWordType: WordType;
  activeTheme: string | null;
  query: string;
  onSetOpenDropdown: (value: string | null) => void;
  onSetActiveWordType: (value: WordType) => void;
  onSetActiveTheme: (value: string | null) => void;
  onSetQuery: (value: string) => void;
  onSearch: () => Promise<void> | void;
  onClearGrid: () => void;
  onGoDashboard: () => void;
  onGoEditor: () => void;
  onGoGames: () => void;
  onGoCommunity: () => void;
};

function wordTypeButton(active: boolean) {
  return `btn px-4 py-2 rounded-full text-sm font-semibold transition-all ${
    active ? "btn-primary" : "btn-secondary"
  }`;
}

export default function FlashcardSearchControls({
  openDropdown,
  activeWordType,
  activeTheme,
  query,
  onSetOpenDropdown,
  onSetActiveWordType,
  onSetActiveTheme,
  onSetQuery,
  onSearch,
  onClearGrid,
  onGoDashboard,
  onGoEditor,
  onGoGames,
  onGoCommunity,
}: FlashcardSearchControlsProps) {
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
                placeholder="Select a tab before searching"
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
            const isSelectedType = activeWordType === type;

            return (
              <div key={type} className="relative" data-dropdown-type={type}>
                <button
                  className={wordTypeButton(isSelectedType)}
                  onClick={() => {
                    onSetOpenDropdown(openDropdown === type ? null : type);
                    onSetActiveWordType(type);
                    onSetActiveTheme(null);
                  }}
                  data-dropdown-btn={type}
                >
                  {activeWordType === type && activeTheme ? activeTheme : type}
                </button>

                {openDropdown === type && (
                  <div
                    className="absolute z-50 mt-2 w-48 rounded-2xl bg-white shadow-lg border p-2 max-h-64 overflow-y-auto overscroll-contain"
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
                        className={`btn w-full px-3 py-2 text-left ${
                          activeTheme === theme ? "btn-primary" : "btn-secondary"
                        }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </section>
    </>
  );
}
