"use client";

import { useEffect, useState } from "react";
import BrandButton from "@/components/BrandButton";
import { Maximize2, Minimize2, Settings2, LogOut, Home, Menu, X, RotateCw } from "lucide-react";

import Button from "@/components/ui/Button";

type GameHeaderProps = {
  title: string;
  onExit: () => void;
  hidden?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  settingsOpen?: boolean;
  onToggleSettings?: () => void;
  extraActions?: React.ReactNode;
  trackGameKey?: string;
  exitLabel?: string;
  hideBrand?: boolean;
  mobileScoreOpen?: boolean;
  onToggleMobileScore?: () => void;
};

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
};

export default function GameHeader({
  title,
  onExit,
  hidden = false,
  isFullscreen = false,
  onToggleFullscreen,
  settingsOpen,
  onToggleSettings,
  extraActions,
  trackGameKey: _trackGameKey,
  exitLabel = "Exit",
  hideBrand = false,
  mobileScoreOpen = false,
  onToggleMobileScore,
}: GameHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add("classendo-game-page");
    return () => document.body.classList.remove("classendo-game-page");
  }, []);

  useEffect(() => {
    document.body.classList.toggle("classendo-game-fullscreen", isFullscreen);
    return () => document.body.classList.remove("classendo-game-fullscreen");
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) {
      document.documentElement.style.removeProperty("--game-viewport-height");
      return;
    }

    const root = document.documentElement;
    const viewport = window.visualViewport;
    let firstFrame = 0;
    let settledFrame = 0;

    const setViewportHeight = () => {
      const height = viewport?.height ?? window.innerHeight;
      root.style.setProperty("--game-viewport-height", `${height}px`);
    };

    // Fullscreen changes can update Android Chrome's usable viewport one or two
    // frames after fullscreenchange. Read the live viewport on every lifecycle
    // event instead of preserving the pre-fullscreen height.
    const syncViewport = () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(settledFrame);
      firstFrame = requestAnimationFrame(() => {
        setViewportHeight();
        settledFrame = requestAnimationFrame(setViewportHeight);
      });
    };

    syncViewport();
    document.addEventListener("fullscreenchange", syncViewport);
    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", syncViewport);
    viewport?.addEventListener("resize", syncViewport);

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(settledFrame);
      document.removeEventListener("fullscreenchange", syncViewport);
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
      viewport?.removeEventListener("resize", syncViewport);
      root.style.removeProperty("--game-viewport-height");
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const orientation = screen.orientation as LockableScreenOrientation;
    if (!orientation?.lock) return;
    void orientation.lock("landscape").catch(() => {
      // Safari and some managed devices do not allow orientation locking.
    });
    return () => {
      orientation.unlock?.();
    };
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    setMobileMenuOpen(false);
    onToggleFullscreen?.();
  };

  const openSettings = () => {
    setMobileMenuOpen(false);
    onToggleSettings?.();
  };

  const exitGame = () => {
    setMobileMenuOpen(false);
    onExit();
  };
  const ExitIcon = exitLabel === "Back to home" ? Home : LogOut;

  if (hidden) return null;

  return (
    <header data-game-header data-game-fullscreen={isFullscreen ? "true" : undefined} className="fixed top-0 left-0 right-0 z-50 border-b border-black/5 bg-[var(--color-bg-main)]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {hideBrand ? <div className="hidden w-36 sm:block" aria-hidden="true" /> : <BrandButton className="hidden text-3xl font-extrabold text-blue-700 sm:block" />}

        <div className="sm:absolute sm:left-1/2 sm:-translate-x-1/2 pointer-events-none">
          <h1 className="text-lg font-bold text-[var(--color-text-main)] sm:text-2xl">{title}</h1>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          {extraActions}

          {onToggleSettings ? (
            <Button
              variant={settingsOpen ? "primary" : "secondary"}
              onClick={openSettings}
              aria-label="Open settings"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm"
            >
              <Settings2 size={16} />
              Settings
            </Button>
          ) : null}

          {onToggleFullscreen ? (
            <Button
              variant="secondary"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              Fullscreen
            </Button>
          ) : null}

          <Button
            variant="secondary"
            onClick={exitGame}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm"
          >
            <ExitIcon size={16} />
            {exitLabel}
          </Button>
        </div>

        {isFullscreen ? (
          <div className="flex items-center gap-1 sm:hidden">
            {onToggleMobileScore ? (
              <button
                type="button"
                onClick={onToggleMobileScore}
                className="rounded-full border border-black/10 bg-white/65 px-2.5 py-2 text-xs font-bold text-[var(--color-text-main)] shadow-sm"
                aria-label={mobileScoreOpen ? "Hide score" : "Show score"}
                aria-expanded={mobileScoreOpen}
                aria-controls="mobile-game-score-panel"
              >
                Score
              </button>
            ) : null}
            {onToggleSettings ? (
              <button
                type="button"
                onClick={openSettings}
                className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white/65 text-[var(--color-text-main)] shadow-sm"
                aria-label={settingsOpen ? "Close settings" : "Open settings"}
              >
                <Settings2 size={17} />
              </button>
            ) : null}
            {onToggleFullscreen ? (
              <button
                type="button"
                onClick={toggleFullscreen}
                className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white/65 text-[var(--color-text-main)] shadow-sm"
                aria-label="Exit fullscreen"
              >
                <Minimize2 size={17} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={exitGame}
              className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white/65 text-[var(--color-text-main)] shadow-sm"
              aria-label={exitLabel}
            >
              <ExitIcon size={17} />
            </button>
          </div>
        ) : (
        <div className="relative flex items-center gap-2 sm:hidden">
          {onToggleMobileScore ? (
            <button
              type="button"
              onClick={onToggleMobileScore}
              className="rounded-full border border-black/10 bg-white/70 px-3 py-2 text-xs font-bold text-[var(--color-text-main)] shadow-sm backdrop-blur transition hover:bg-white"
              aria-label={mobileScoreOpen ? "Hide score" : "Show score"}
              aria-expanded={mobileScoreOpen}
              aria-controls="mobile-game-score-panel"
            >
              Score
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-white/55 text-[var(--color-text-main)] shadow-sm backdrop-blur transition hover:bg-white/85"
            aria-label={mobileMenuOpen ? "Close game controls" : "Open game controls"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-game-controls"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={20} />}
          </button>
          {mobileMenuOpen ? (
            <div id="mobile-game-controls" className="absolute right-0 top-12 z-[80] w-56 rounded-2xl border border-black/10 bg-white/95 p-2 shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur">
              {onToggleSettings ? <button type="button" onClick={openSettings} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold hover:bg-[#f2f6ee]"><Settings2 size={17} />Settings</button> : null}
              {onToggleFullscreen ? <button type="button" onClick={toggleFullscreen} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold hover:bg-[#f2f6ee]">{isFullscreen ? <Minimize2 size={17} /> : <RotateCw size={17} />}{isFullscreen ? "Exit fullscreen" : "Play landscape"}</button> : null}
              <button type="button" onClick={exitGame} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold hover:bg-[#fdf1ee]"><ExitIcon size={17} />{exitLabel}</button>
            </div>
          ) : null}
        </div>
        )}
      </div>
    </header>
  );
}
