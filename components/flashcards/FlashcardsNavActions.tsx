"use client";

import { Menu } from "lucide-react";

type FlashcardsNavActionsProps = {
  openDropdown: string | null;
  onSetOpenDropdown: (value: string | null) => void;
  onGoDashboard: () => void;
  onGoEditor: () => void;
  onGoGames: () => void;
  onGoCommunity: () => void;
  onGoClassroom: () => void;
};

export default function FlashcardsNavActions({
  openDropdown,
  onSetOpenDropdown,
  onGoDashboard,
  onGoEditor,
  onGoGames,
  onGoCommunity,
  onGoClassroom,
}: FlashcardsNavActionsProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative" data-dropdown-btn="nav">
        <button
          onClick={(event) => {
            event.stopPropagation();
            onSetOpenDropdown(openDropdown === "nav" ? null : "nav");
          }}
          className="btn btn-secondary px-3 py-2 flex items-center gap-2"
          aria-haspopup="true"
          aria-expanded={openDropdown === "nav"}
          data-dropdown-btn="nav"
        >
          <Menu size={16} />
        </button>

        {openDropdown === "nav" && (
          <div
            data-dropdown-type="nav"
            className="absolute right-0 mt-2 w-44 rounded-2xl bg-white border shadow-lg p-2 z-50 animate-fade-up"
          >
            <button onClick={onGoDashboard} className="btn btn-secondary w-full px-3 py-2 text-left">
              Dashboard
            </button>
            <button onClick={onGoEditor} className="btn btn-secondary w-full px-3 py-2 text-left">
              Editor
            </button>
            <button onClick={onGoGames} className="btn btn-secondary w-full px-3 py-2 text-left">
              Games
            </button>
            <button onClick={onGoCommunity} className="btn btn-secondary w-full px-3 py-2 text-left">
              Community
            </button>
          </div>
        )}
      </div>

      <button onClick={onGoClassroom} className="btn btn-secondary">
        Classroom
      </button>
    </div>
  );
}
