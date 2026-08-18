"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Shuffle,
  Maximize,
  Menu,
  X,
} from "lucide-react";
import ClassroomCanvas from "@/components/classroom/ClassroomCanvas";
import ClassroomToolbar from "@/components/classroom/ClassroomToolbar";
import { useAuth } from "@/components/AuthProvider";
import { resolveLessonImageUrl } from "@/lib/lessons/image";
import { readLessonTray, writeLessonTray } from "@/lib/lessons/tray";


type Card = {
  id: string;   // ✅ must match Flashcards
  word: string;
  image: string;
  type: string;
};


export default function ClassroomMode() {
  const { user, loading: authLoading } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [trayReady, setTrayReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [intervalMs, setIntervalMs] = useState(4000);
  const [fade, setFade] = useState(true);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const headerRef = useRef<HTMLDivElement | null>(null);
  const mobileHeaderRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const cardContainerRef = useRef<HTMLDivElement | null>(null);
  const drawingsRef = useRef<Map<string, string>>(new Map());
  const requestAnimationFrameIds = useRef<number[]>([]);

  // allow "none" to disable drawing so toolbar is always clickable
  const [tool, setTool] = useState<"pen" | "eraser" | "none">("none");
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(8);

  const [cardAvailableHeight, setCardAvailableHeight] = useState<number | null>(null);

  const formatWord = (word: string) => word.replace(/_/g, " ");

  const flashcardTextSize = (word: string, layout: "text-only" | "image-and-text") => {
    const length = formatWord(word).trim().length;

    if (layout === "text-only") {
      if (length > 48) return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl";
      if (length > 28) return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl";
      if (length > 16) return "text-4xl sm:text-5xl md:text-6xl lg:text-7xl";
      return "text-5xl sm:text-6xl md:text-8xl lg:text-[10rem]";
    }

    if (length > 48) return "text-xl sm:text-2xl md:text-3xl lg:text-4xl";
    if (length > 28) return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl";
    if (length > 16) return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl";
    return "text-4xl sm:text-5xl md:text-7xl lg:text-8xl";
  };
  const handleExit = () => {
    writeLessonTray(cards, user ? "account" : "guest");

    // ✅ Check where we came from
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");

    if (from === "dashboard") {
      window.location.href = "/dashboard";
    } else if (from === "lessons") {
      window.location.href = "/lessons";
    } else {
      // Default / existing behavior
      window.location.href = "/flashcards";
    }
  };

  useEffect(() => {
    if (authLoading) return;
    const stored = readLessonTray(user ? "account" : "guest").map((card) => ({
      id: card.id,
      word: card.word,
      image: card.image ?? card.back ?? "",
      type: card.type ?? "",
    }));
    setCards(stored);
    setTrayReady(true);
  }, [authLoading, user]);

  useEffect(() => {
    if (!autoPlay || cards.length === 0) return;
    const timer = setInterval(() => {
      nextCard();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [autoPlay, intervalMs, cards.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        nextCard();
      }
      if (e.key === "ArrowLeft") {
        prevCard();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cards.length]);

  const nextCard = () => {
    setFade(false);
    setTimeout(() => {
      setDirection("next");
      setIndex((prev) => (prev + 1) % cards.length);
      setFade(true);
    }, 200);
  };

  const prevCard = () => {
    setFade(false);
    setTimeout(() => {
      setDirection("prev");
      setIndex((prev) => (prev - 1 + cards.length) % cards.length);
      setFade(true);
    }, 200);
  };

  const shuffleCards = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setIndex(0);
  };

  // fullscreen toggle unchanged (still uses document.documentElement)
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // measure header + bottom controls and compute available height for the card
  function recomputeAvailableCardHeight() {
    const headerH = headerRef.current?.offsetHeight ?? 0;
    const mobileHeaderH = mobileHeaderRef.current?.offsetHeight ?? 0;
    const bottomH = bottomRef.current?.offsetHeight ?? 0;
    const topBottomGap = 48; // a little breathing room
    const available = Math.max(200, window.innerHeight - headerH - mobileHeaderH - bottomH - topBottomGap);
    setCardAvailableHeight(available);
  }

  useLayoutEffect(() => {
    // recompute when entering/exiting fullscreen or on resize
    // Run once immediately, then again on the next frames so the initial
    // non-fullscreen layout can settle before we size the card.
    recomputeAvailableCardHeight();
    const raf1 = window.requestAnimationFrame(() => {
      recomputeAvailableCardHeight();
      const raf2 = window.requestAnimationFrame(() => {
        recomputeAvailableCardHeight();
      });
      requestAnimationFrameIds.current.push(raf2);
    });
    requestAnimationFrameIds.current.push(raf1);

    function onResize() {
      recomputeAvailableCardHeight();
    }
    window.addEventListener("resize", onResize);
    document.addEventListener("fullscreenchange", recomputeAvailableCardHeight);
    return () => {
      requestAnimationFrameIds.current.forEach((id) => window.cancelAnimationFrame(id));
      requestAnimationFrameIds.current = [];
      window.removeEventListener("resize", onResize);
      document.removeEventListener("fullscreenchange", recomputeAvailableCardHeight);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileMenuOpen]);

  // touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchCurrentX === null) return;
    const diff = touchStartX - touchCurrentX;
    const threshold = 60; // swipe sensitivity
    if (diff > threshold) {
      // swipe left → next
      nextCard();
    } else if (diff < -threshold) {
      // swipe right → previous
      prevCard();
    }
    setTouchStartX(null);
    setTouchCurrentX(null);
  };

  // -------------------
  // New: settings for flashcard display modes + reveal toggle
  // -------------------
  type DisplayMode = "image+text" | "image" | "text";
  const [displayMode, setDisplayMode] = useState<DisplayMode>("image+text");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // reveal toggles used for image-only and text-only modes:
  // - when displayMode === "image": revealToggle determines whether text is shown below image
  // - when displayMode === "text": revealToggle determines whether image is shown below the text (text moves down)
  const [revealToggle, setRevealToggle] = useState(false);

  // reset reveal when index or mode changes
  useEffect(() => {
    setRevealToggle(false);
  }, [index, displayMode]);

  // Card click behavior updated:
  // - image+text: advance on click
  // - image: clicking toggles text under image (revealToggle)
  // - text: clicking toggles image shown below text; second click hides image and recenters text
  const handleCardClick = () => {
    if (displayMode === "image+text") {
      nextCard();
    } else {
      setRevealToggle((v) => !v);
    }
  };

  if (!trayReady || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-main)] text-[var(--color-text-muted)]">
        Loading lesson…
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-main)] flex flex-col items-center justify-center gap-6">
        <p className="text-xl text-[var(--color-text-muted)]">
          No lesson loaded
        </p>

        <button
          onClick={handleExit}
          className="btn btn-primary px-6 py-3 text-base font-semibold hover:scale-[1.03]"
        >
          Go Back
        </button>
      </div>
    );
  }

  const card = cards[index];
  const cardKey = String(card?.id ?? index);
  const inFullscreen = !!document.fullscreenElement;
  const isCompactViewport = window.innerWidth < 640;

  // determine inline styles for the card container when fullscreen:
  const cardStyle: React.CSSProperties = {};
  if (inFullscreen && cardAvailableHeight) {
    // Use that available height and make the card take most of it.
    // Keep a small space for card margins/controls inside the card wrapper.
    cardStyle.height = `${cardAvailableHeight}px`;
    const horizontalSpace = isCompactViewport ? 24 : 88;
    const maxWidth = Math.min(cardAvailableHeight * 1.75, window.innerWidth - horizontalSpace);
    cardStyle.width = `${isCompactViewport ? maxWidth : Math.max(520, maxWidth)}px`;
    cardStyle.maxWidth = `calc(100vw - ${horizontalSpace}px)`;
    cardStyle.padding = isCompactViewport ? "12px" : "24px";
  } else if (cardAvailableHeight) {
    const fittedHeight = Math.max(220, Math.floor(cardAvailableHeight * 0.9));
    const horizontalSpace = isCompactViewport ? 24 : 48;
    const maxWidth = Math.min(fittedHeight * 1.62, window.innerWidth - horizontalSpace);
    cardStyle.height = `${fittedHeight}px`;
    cardStyle.width = `${isCompactViewport ? maxWidth : Math.max(320, maxWidth)}px`;
    cardStyle.maxWidth = `calc(100vw - ${horizontalSpace}px)`;
    cardStyle.padding = isCompactViewport ? "12px" : "20px";
  } else {
    cardStyle.height = undefined;
    cardStyle.width = undefined;
    cardStyle.maxWidth = undefined;
    cardStyle.padding = undefined;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] flex flex-col justify-between">
      <div
        ref={mobileHeaderRef}
        className="sticky top-0 z-50 border-b border-black/5 bg-[var(--color-bg-main)]/95 px-4 py-3 backdrop-blur md:hidden"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-lg font-bold text-[var(--color-text-main)]">Classroom</span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm"
            aria-label={mobileMenuOpen ? "Close classroom controls" : "Open classroom controls"}
            aria-expanded={mobileMenuOpen}
            aria-controls="classroom-mobile-controls"
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div id="classroom-mobile-controls" className="mt-3 space-y-3 rounded-2xl border border-black/10 bg-white p-3 shadow-lg">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Display</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["image+text", "Image + text"],
                  ["image", "Image only"],
                  ["text", "Text only"],
                ] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => { setDisplayMode(mode); setMobileMenuOpen(false); }}
                    className={`min-h-11 rounded-xl px-2 text-xs font-semibold ${displayMode === mode ? "bg-[var(--color-accent)] text-white" : "border border-black/10 bg-[var(--color-bg-main)] text-[var(--color-text-main)]"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAutoPlay((playing) => !playing)}
                className={`btn flex-1 px-3 py-2.5 text-sm ${autoPlay ? "btn-primary" : "btn-secondary"}`}
              >
                {autoPlay ? "Pause auto-play" : "Auto-play"}
              </button>
              <select
                value={intervalMs}
                onChange={(event) => setIntervalMs(Number(event.target.value))}
                aria-label="Auto-play speed"
                className="min-h-11 rounded-xl border border-black/10 bg-white px-3 text-sm"
              >
                <option value={2500}>Fast</option>
                <option value={4000}>Normal</option>
                <option value={6000}>Slow</option>
              </select>
              <button
                type="button"
                onClick={shuffleCards}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-black/10 bg-[var(--color-bg-main)]"
                aria-label="Shuffle cards"
              >
                <Shuffle size={18} />
              </button>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Draw on the card</p>
              <ClassroomToolbar
                tool={tool}
                setTool={setTool}
                color={color}
                setColor={setColor}
                size={size}
                setSize={setSize}
                clearCanvas={() => {
                  const canvas = document.querySelector("canvas");
                  if (!canvas) return;
                  const ctx = canvas.getContext("2d")!;
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  drawingsRef.current.delete(cardKey);
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-black/5 pt-3">
              <button onClick={toggleFullscreen} className="btn btn-secondary px-3 py-2.5 text-sm">
                <Maximize size={17} /> Full screen
              </button>
              <button onClick={handleExit} className="btn btn-secondary px-3 py-2.5 text-sm">
                <X size={17} /> Exit
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Header controls */}
      <div
        ref={headerRef}
        className="sticky top-0 z-50 hidden w-full items-center justify-between bg-transparent px-6 py-3 md:flex"
      >
        <div className="flex gap-3 items-center">
          {/* Settings button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSettingsOpen((s) => !s)}
              className="btn btn-secondary px-4 py-2 flex items-center gap-2"
            >
              Settings
            </button>

            {settingsOpen && (
              // updated dropdown: include display mode + autoplay and speed
              <div className="absolute left-0 mt-2 min-w-[220px] rounded-lg bg-white border shadow-lg p-3 z-50">
                <div className="flex flex-col gap-2">
                  <div className="text-xs text-[var(--color-text-muted)]">Display</div>
                  <button
                    className={`btn px-3 py-2 text-left ${
                      displayMode === "image+text" ? "btn-primary" : "btn-secondary"
                    }`}
                    onClick={() => { setDisplayMode("image+text"); setSettingsOpen(false); }}
                  >
                    Image + Text
                  </button>
                  <button
                    className={`btn px-3 py-2 text-left ${
                      displayMode === "image" ? "btn-primary" : "btn-secondary"
                    }`}
                    onClick={() => { setDisplayMode("image"); setSettingsOpen(false); }}
                  >
                    Image only
                  </button>
                  <button
                    className={`btn px-3 py-2 text-left ${
                      displayMode === "text" ? "btn-primary" : "btn-secondary"
                    }`}
                    onClick={() => { setDisplayMode("text"); setSettingsOpen(false); }}
                  >
                    Text only
                  </button>

                  <hr className="my-2 border-t border-black/5" />

                  <div className="text-xs text-[var(--color-text-muted)]">Playback</div>
                  <button
                    onClick={() => { setAutoPlay((p) => !p); }}
                    className={`btn px-3 py-2 text-left ${
                      autoPlay ? "btn-primary" : "btn-secondary"
                    }`}
                  >
                    {autoPlay ? "Pause Auto-Play" : "Enable Auto-Play"}
                  </button>

                  <div className="flex items-center gap-2 px-1">
                    <div className="text-xs text-[var(--color-text-muted)]">Speed</div>
                    <select
                      value={intervalMs}
                      onChange={(e) => setIntervalMs(Number(e.target.value))}
                      className="ml-auto bg-white border rounded px-2 py-1 text-sm"
                    >
                      <option value={2500}>Fast</option>
                      <option value={4000}>Normal</option>
                      <option value={6000}>Slow</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={shuffleCards}
            className="btn btn-secondary px-4 py-2 flex items-center gap-2"
          >
            <Shuffle size={18} />
            Shuffle
          </button>

          {/* Toolbar moved here (replaces the old Auto-Play + Speed buttons) */}
          <div className="ml-2">
            <ClassroomToolbar
              orientation="horizontal"
              tool={tool}
              setTool={setTool}
              color={color}
              setColor={setColor}
              size={size}
              setSize={setSize}
              clearCanvas={() => {
                const canvas = document.querySelector("canvas");
                if (!canvas) return;
                const ctx = canvas.getContext("2d")!;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                drawingsRef.current.delete(cardKey);
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Full Screen moved next to Exit as requested */}
          <button
            onClick={toggleFullscreen}
            className="btn btn-secondary px-4 py-2 flex items-center gap-2"
          >
            <Maximize size={18} />
            Full Screen
          </button>

          <button
            onClick={handleExit}
            className="btn btn-secondary px-4 py-2 flex items-center gap-2"
          >
            <X size={18} />
            Exit
          </button>
        </div>
      </div>

      {/* Flashcard */}
      <div
        // card container: when fullscreen we use measured height; otherwise we use aspect ratio via classes
        ref={cardContainerRef}
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        key={index}
        className={`cursor-pointer mx-auto my-3 rounded-3xl border-[6px] border-gray-300 bg-white shadow-2xl md:my-6 md:border-[10px]
          ${inFullscreen ? "max-w-none" : "max-w-none"} transition-all duration-300 ease-out`}
        style={{ ...cardStyle }}
      >
        {/* Conditional rendering for text-only centered mode */}
        {displayMode === "text" && !revealToggle ? (
          // centered text (no image visible)
          <div className="flex h-full w-full items-center justify-center px-4">
            <h2 className={`max-w-[92%] break-words text-center font-extrabold leading-[1.05] tracking-wide text-balance ${flashcardTextSize(card.word, "text-only")}`}>
              {formatWord(card.word)}
            </h2>
          </div>
        ) : (
          // Normal layout: image area on top, text area below
          <div className="w-full h-full flex flex-col justify-center items-center">
            {/* Image area */}
            <div className={`w-full ${inFullscreen ? "flex-[1.45]" : "flex-[1.35]"} bg-gray-100 rounded-2xl mb-3 md:mb-4 flex items-center justify-center text-gray-400 text-xl overflow-hidden relative`}>
              <div className="w-full h-full flex items-center justify-center relative">
                {(displayMode === "image+text") ||
                 (displayMode === "image") ||
                 (displayMode === "text" && revealToggle) ? (
                  <img
                    src={resolveLessonImageUrl(card.image || "/placeholder.png")}
                    alt={card.word}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="text-2xl text-gray-400"> </div>
                )}

                {/* Classroom canvas overlay for drawings (covers image area) */}
                {/* keep a click-stopper wrapper so clicks inside canvas don't advance the card */}
                <div
                  className="absolute inset-0"
                  onClick={(e) => {
                    // prevent clicks inside the canvas from advancing the card
                    e.stopPropagation();
                  }}
                >
                  <ClassroomCanvas
                    cardKey={cardKey}
                    tool={tool}
                    color={color}
                    size={size}
                    drawingsRef={drawingsRef}
                  />
                </div>
              </div>
            </div>

            {/* Vocabulary word area */}
            <div className={`${displayMode === "text" && revealToggle ? "mt-2" : "mt-1"} flex items-center justify-center w-full flex-none`}>
              {(
                displayMode === "image+text"
                || (displayMode === "image" && revealToggle)
                || (displayMode === "text") // in text mode, when revealToggle true we still show text (moved down); when false handled above
              ) && (
                <h2 className={`max-w-[92%] break-words text-center font-extrabold leading-[1.1] tracking-wide text-balance ${flashcardTextSize(card.word, "image-and-text")} ${displayMode === "text" && revealToggle ? "mb-4" : ""}`}>
                  {formatWord(card.word)}
                </h2>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation - ensure visible in fullscreen by measuring height above */}
      <div ref={bottomRef} className="flex w-full flex-col items-center gap-4 px-4 pb-4 md:gap-6 md:px-6 md:pb-6">
        <div className="flex items-center gap-4 md:gap-6">
          <button
            onClick={prevCard}
            className="btn btn-primary p-3.5 md:p-5"
          >
            <ArrowLeft size={28} />
          </button>

          <button
            onClick={nextCard}
            className="btn btn-primary p-3.5 md:p-5"
          >
            <ArrowRight size={28} />
          </button>
        </div>

        <div className="text-xl font-semibold text-gray-700 md:text-2xl">
          {index + 1} / {cards.length}
        </div>
      </div>
    </div>
  );
}
