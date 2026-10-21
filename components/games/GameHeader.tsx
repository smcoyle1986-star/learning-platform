"use client";

import { useEffect, useRef, useState } from "react";
import BrandButton from "@/components/BrandButton";
import { Maximize2, Minimize2, Settings2, LogOut, Home, Menu, X, RotateCw } from "lucide-react";

import { usePathname, useRouter } from "next/navigation";
import { useGameFlow } from "./GameFlowContext";
import { topicsUrl } from "@/lib/games/topics";
import { shouldInviteGuestOnExit } from "@/lib/games/guest-exit";
import Button from "@/components/ui/Button";
import { gameAudio, type GameAudioKey, type GameAudioMode } from "@/lib/games/audio/game-audio";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { trackFreeGameEvent } from "@/lib/games/free-analytics";
import { GameFlowDialog } from "./GameFlowDialog";

type GameHeaderProps = {
  title: string;
  onExit: () => void;
  onGuestExit?: (destination: "/signup?from=guest-exit" | "/games") => void;
  hidden?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  settingsOpen?: boolean;
  onToggleSettings?: () => void;
  extraActions?: React.ReactNode;
  trackGameKey?: GameAudioKey;
  audioMode?: GameAudioMode;
  exitLabel?: string;
  hideBrand?: boolean;
  mobileScoreOpen?: boolean;
  onToggleMobileScore?: () => void;
};

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
};

const GUEST_EXIT_INVITATIONS = [
  {
    heading: "Make it your own!",
    message: "Create a free account to play games with vocabulary from your own lessons.",
  },
  {
    heading: "Bring your lessons to the game!",
    message: "Sign up for free and use your own vocabulary in classroom games.",
  },
  {
    heading: "Ready to play with your words?",
    message: "Create a free account and turn your lessons into classroom games.",
  },
  {
    heading: "Your vocabulary, your games!",
    message: "Sign up for free to make classroom games with words your students are learning.",
  },
  {
    heading: "Keep the fun going!",
    message: "Create a free account to use your own lesson vocabulary in classroom games.",
  },
  {
    heading: "Your words want to play too!",
    message: "Sign up for free and bring your lesson vocabulary into the game.",
  },
  {
    heading: "The game was fun. Your vocabulary could be the star!",
    message: "Create a free account and play with words from your own lessons.",
  },
] as const;

export default function GameHeader({
  title,
  onExit,
  onGuestExit,
  hidden = false,
  isFullscreen = false,
  onToggleFullscreen,
  settingsOpen,
  onToggleSettings,
  extraActions,
  trackGameKey,
  audioMode = "playing",
  exitLabel = "Exit",
  hideBrand = false,
  mobileScoreOpen = false,
  onToggleMobileScore,
}: GameHeaderProps) {
  const flow = useGameFlow();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [exitInvitationId, setExitInvitationId] = useState<string | null>(null);
  const [exitInvitationMessageIndex, setExitInvitationMessageIndex] = useState<number | null>(null);
  const exitInvitationOpen = useRef(false);
  const exitInvitationNavigating = useRef(false);
  const previousExitInvitationMessageIndex = useRef<number | null>(null);
  const gameId = pathname.split("/")[2] ?? "";

  useEffect(() => {
    if (!trackGameKey) return;
    gameAudio.setGame(trackGameKey);
    gameAudio.setMode("playing");
    const unlockAudio = () => gameAudio.unlock();
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      gameAudio.dispose();
    };
  }, [trackGameKey]);

  useEffect(() => {
    if (trackGameKey) gameAudio.setMode(audioMode);
  }, [audioMode, trackGameKey]);


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

  const exitGame = async () => {
    setMobileMenuOpen(false);
    if (shouldInviteGuestOnExit(pathname, user?.id ?? null)) {
      let isGuest = !user;
      if (isGuest && loading) {
        try {
          const { data } = await supabase.auth.getSession();
          isGuest = !data.session?.user;
        } catch {
          // Keep the game open until authentication finishes; never guess that
          // a still-loading signed-in user is a guest.
          return;
        }
      }
      if (isGuest) {
        if (exitInvitationOpen.current) return;
        exitInvitationOpen.current = true;
        exitInvitationNavigating.current = false;
        const previousIndex = previousExitInvitationMessageIndex.current;
        const randomIndex = Math.floor(Math.random() * (GUEST_EXIT_INVITATIONS.length - (previousIndex === null ? 0 : 1)));
        const messageIndex = previousIndex === null || randomIndex < previousIndex ? randomIndex : randomIndex + 1;
        previousExitInvitationMessageIndex.current = messageIndex;
        setExitInvitationMessageIndex(messageIndex);
        const invitationId = crypto.randomUUID();
        setExitInvitationId(invitationId);
        void trackFreeGameEvent({ eventType: "guest_exit_signup_modal_viewed", gameKey: gameId, source: flow?.topic ? "public_topic" : "free_games", eventInstanceId: invitationId });
        return;
      }
    }
    if (flow && !window.confirm("Leave this game? Your current scores and progress will reset.")) return;
    if (flow && document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    if (flow?.topic) router.push(`/games?source=topics&topic=${flow.topic.id}`);
    else onExit();
  };
  const closeExitInvitation = () => {
    exitInvitationOpen.current = false;
    exitInvitationNavigating.current = false;
    setExitInvitationId(null);
  };
  const chooseExitDestination = async (destination: "/signup" | "/games") => {
    if (!exitInvitationId || exitInvitationNavigating.current) return;
    exitInvitationNavigating.current = true;
    const tracked = trackFreeGameEvent({
      eventType: destination === "/signup" ? "guest_exit_signup_clicked" : "guest_exit_free_games_clicked",
      gameKey: gameId,
      source: flow?.topic ? "public_topic" : "free_games",
      eventInstanceId: exitInvitationId,
    });
    if (destination === "/signup") await Promise.race([
      tracked,
      new Promise((resolve) => window.setTimeout(resolve, 2500)),
    ]);
    setExitInvitationId(null);
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    const path = destination === "/signup" ? "/signup?from=guest-exit" : destination;
    if (onGuestExit) onGuestExit(path);
    else if (destination === "/games") onExit();
    else router.push(path);
  };
  const ExitIcon = exitLabel === "Back to home" ? Home : LogOut;

  if (hidden) return null;

  return <>
    <header data-game-header data-game-fullscreen={isFullscreen ? "true" : undefined} className="fixed top-0 left-0 right-0 z-50 border-b border-black/5 bg-[var(--color-bg-main)]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {hideBrand ? <div className="hidden w-36 sm:block" aria-hidden="true" /> : <BrandButton className="hidden text-3xl font-extrabold text-blue-700 sm:block" />}

        <div className="sm:absolute sm:left-1/2 sm:-translate-x-1/2 pointer-events-none">
          <h1 className="text-lg font-bold text-[var(--color-text-main)] sm:text-2xl">{title}</h1>
          {flow?.topic && <button className="pointer-events-auto block text-xs font-semibold text-[#617857] sm:mx-auto" onClick={() => { if (window.confirm("Change topic? Your current scores and progress will reset.")) router.push(topicsUrl(flow.gameId, flow.topic?.id)); }}>{flow.topic.title} · {flow.topic.cards.length} cards · Change topic</button>}
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
    {exitInvitationId && exitInvitationMessageIndex !== null && <GameFlowDialog title={GUEST_EXIT_INVITATIONS[exitInvitationMessageIndex].heading} onClose={closeExitInvitation}>
      <p className="text-base leading-7 text-[#5c665c]">{GUEST_EXIT_INVITATIONS[exitInvitationMessageIndex].message}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => void chooseExitDestination("/signup")} className="btn btn-primary min-h-12 w-full justify-center px-5 py-3 text-center sm:flex-1">Create Free Account</button>
        <button type="button" onClick={() => void chooseExitDestination("/games")} className="btn btn-secondary min-h-12 w-full justify-center px-5 py-3 text-center sm:flex-1">Back to Free Games</button>
      </div>
    </GameFlowDialog>}
  </>;
}
