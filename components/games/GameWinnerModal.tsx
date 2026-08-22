"use client";

import type { ReactNode } from "react";
import { Trophy, X } from "lucide-react";

type GameWinnerModalProps = {
  title: string;
  message: string;
  onClose: () => void;
  onPlayAgain: () => void;
  onReturnToGames: () => void;
  children?: ReactNode;
};

/** A shared completion modal. Closing it deliberately leaves the completed board unchanged. */
export function GameWinnerModal({
  title,
  message,
  onClose,
  onPlayAgain,
  onReturnToGames,
  children,
}: GameWinnerModalProps) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-winner-title"
        className="relative w-full max-w-lg rounded-[2rem] border border-white/70 bg-white p-7 text-center shadow-[0_30px_90px_rgba(15,23,42,0.28)] sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close winner message"
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-[#dce5d8] bg-white text-[#536152] transition hover:bg-[#f1f6ed]"
        >
          <X size={20} />
        </button>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#edf6e8] text-[#5f8951]">
          <Trophy size={28} aria-hidden="true" />
        </div>
        <h2 id="game-winner-title" className="mt-4 text-3xl font-extrabold tracking-tight text-[#2f3a2f]">
          {title}
        </h2>
        <p className="mt-3 text-base leading-6 text-[#65705f]">{message}</p>
        {children ? <div className="mt-5">{children}</div> : null}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onPlayAgain} className="btn btn-primary px-5 py-3 text-sm">
            Play Again
          </button>
          <button type="button" onClick={onReturnToGames} className="btn btn-secondary px-5 py-3 text-sm">
            Return to Games
          </button>
        </div>
      </section>
    </div>
  );
}
