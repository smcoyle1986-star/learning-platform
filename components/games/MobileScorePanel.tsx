"use client";

import type { ReactNode } from "react";

type MobileScorePanelProps = {
  open: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Keeps desktop scoreboards in their existing position while making them an
 * on-demand overlay on narrow screens. This avoids trading away game-board
 * space simply to display scores that are only needed occasionally.
 */
export function MobileScorePanel({ open, children, className = "" }: MobileScorePanelProps) {
  return (
    <div
      id="mobile-game-score-panel"
      className={`game-score-panel ${open ? "game-score-panel--open" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
