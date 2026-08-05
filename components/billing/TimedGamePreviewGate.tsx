"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const PREVIEW_DURATION_MS = 2 * 60 * 1000;

type GatePhase = "checking" | "intro" | "trial" | "expired";

type StoredPreview = {
  endsAt: number;
  expired: boolean;
};

type TimedGamePreviewGateProps = {
  children: React.ReactNode;
  gameId: string;
  userId?: string | null;
  featuredGameId: string;
};

function readStoredPreview(key: string): StoredPreview | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key) ?? "null") as Partial<StoredPreview> | null;
    if (!parsed || !Number.isFinite(parsed.endsAt)) return null;
    return {
      endsAt: Number(parsed.endsAt),
      expired: Boolean(parsed.expired),
    };
  } catch {
    return null;
  }
}

function writeStoredPreview(key: string, value: StoredPreview) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The in-memory deadline still keeps the preview running when storage is unavailable.
  }
}

function formatRemaining(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function TimedGamePreviewGate({
  children,
  gameId,
  userId,
  featuredGameId,
}: TimedGamePreviewGateProps) {
  const storageKey = useMemo(
    () => `classendo-game-preview:${userId || "anonymous"}:${gameId}`,
    [gameId, userId],
  );
  const [phase, setPhase] = useState<GatePhase>("checking");
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(PREVIEW_DURATION_MS / 1000);

  const expirePreview = useCallback(
    (deadline: number) => {
      writeStoredPreview(storageKey, { endsAt: deadline, expired: true });
      setRemainingSeconds(0);
      setPhase("expired");
    },
    [storageKey],
  );

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (cancelled) return;
      const stored = readStoredPreview(storageKey);
      if (!stored) {
        setEndsAt(null);
        setRemainingSeconds(PREVIEW_DURATION_MS / 1000);
        setPhase("intro");
        return;
      }

      if (stored.expired || stored.endsAt <= Date.now()) {
        setEndsAt(stored.endsAt);
        expirePreview(stored.endsAt);
        return;
      }

      setEndsAt(stored.endsAt);
      setRemainingSeconds(Math.ceil((stored.endsAt - Date.now()) / 1000));
      setPhase("trial");
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [expirePreview, storageKey]);

  useEffect(() => {
    if (phase !== "trial" || !endsAt) return;

    const updateRemaining = () => {
      const nextRemaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemainingSeconds(nextRemaining);
      if (nextRemaining === 0) expirePreview(endsAt);
    };

    updateRemaining();
    const interval = window.setInterval(updateRemaining, 250);
    document.addEventListener("visibilitychange", updateRemaining);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", updateRemaining);
    };
  }, [endsAt, expirePreview, phase]);

  function startPreview() {
    if (phase !== "intro") return;
    const deadline = Date.now() + PREVIEW_DURATION_MS;
    writeStoredPreview(storageKey, { endsAt: deadline, expired: false });
    setEndsAt(deadline);
    setRemainingSeconds(PREVIEW_DURATION_MS / 1000);
    setPhase("trial");
  }

  const featuredGameLabel = featuredGameId.replaceAll("-", " ");
  const introDescription =
    `Free teachers can fully play ${featuredGameLabel} this week. ` +
    "Upgrade to Premium to unlock every classroom game anytime. " +
    "Click outside this message to start a two-minute preview.";
  const expiredDescription =
    "Your two-minute preview has ended. Upgrade to Premium to continue, " +
    `or return to Games and play ${featuredGameLabel}, this week’s free game.`;

  return (
    <>
      {children}

      {phase === "checking" ? (
        <div className="fixed inset-0 z-[140] cursor-wait bg-[rgba(17,24,39,0.14)]" />
      ) : null}

      {phase === "trial" ? (
        <div
          className="pointer-events-none fixed left-1/2 top-3 z-[150] -translate-x-1/2 rounded-full border border-[#d8dfcf] bg-[#fffdf8]/95 px-5 py-2 text-sm font-bold tabular-nums text-[#2f3a2f] shadow-[0_10px_30px_rgba(15,23,42,0.2)] backdrop-blur"
          role="timer"
          aria-live="off"
          aria-label={`${remainingSeconds} seconds left in free game preview`}
        >
          Free preview · {formatRemaining(remainingSeconds)}
        </div>
      ) : null}

      {phase === "intro" || phase === "expired" ? (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-[rgba(17,24,39,0.38)] px-4 backdrop-blur-[1.5px]"
          onClick={(event) => {
            if (event.target === event.currentTarget && phase === "intro") {
              startPreview();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-preview-title"
            aria-describedby="game-preview-description"
            className="w-full max-w-xl rounded-[2rem] border border-white/80 bg-[rgba(255,253,248,0.94)] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.28)] backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b8d6f]">
              {phase === "expired" ? "Preview Ended" : "Premium Preview"}
            </div>
            <h2
              id="game-preview-title"
              className="mt-3 text-3xl font-bold tracking-tight text-[#2f3a2f]"
            >
              This game is locked on the Free plan
            </h2>
            <p
              id="game-preview-description"
              className="mt-3 text-sm leading-7 text-[#5c665c]"
            >
              {phase === "expired" ? expiredDescription : introDescription}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/upgrade" className="btn btn-primary px-6 py-3">
                Upgrade to Premium
              </Link>
              <Link href="/games" className="btn btn-secondary px-6 py-3">
                Return to Games
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
