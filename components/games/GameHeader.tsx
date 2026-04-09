"use client";

import Link from "next/link";
import { Maximize2, Minimize2, Settings2, LogOut } from "lucide-react";

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
}: GameHeaderProps) {
  if (hidden) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-bg-main)]/95 backdrop-blur-md border-b border-black/5">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-3xl font-extrabold text-blue-700">
          Classendo
        </Link>

        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
          <h1 className="text-2xl font-bold text-[var(--color-text-main)]">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {extraActions}

          {onToggleSettings ? (
            <Button
              variant={settingsOpen ? "primary" : "secondary"}
              onClick={onToggleSettings}
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
              onClick={onToggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              Fullscreen
            </Button>
          ) : null}

          <Button
            variant="secondary"
            onClick={onExit}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm"
          >
            <LogOut size={16} />
            Exit
          </Button>
        </div>
      </div>
    </header>
  );
}
