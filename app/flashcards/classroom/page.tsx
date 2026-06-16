"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Shuffle,
  Maximize,
  X,
} from "lucide-react";
import ClassroomCanvas from "@/components/classroom/ClassroomCanvas";
import ClassroomToolbar from "@/components/classroom/ClassroomToolbar";
import { resolveLessonImageUrl } from "@/lib/lessons/image";


type Card = {
  id: string;   // ✅ must match Flashcards
  word: string;
  image: string;
  type: string;
};


export default function ClassroomMode() {
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [intervalMs, setIntervalMs] = useState(4000);
  const [fade, setFade] = useState(true);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);

  const headerRef = useRef<HTMLDivElement | null>(null);
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
  const handleExit = () => {
    // ✅ ALWAYS save lesson tray first (no behavior change)
    localStorage.setItem(
      "classendo-lesson-tray",
      JSON.stringify(cards)
    );

    // ✅ Check where we came from
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");

    if (from === "dashboard") {
      window.location.href = "/dashboard";
    } else {
      // Default / existing behavior
      window.location.href = "/flashcards";
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("classendo-lesson-tray");
    if (!stored || stored === "undefined") return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setCards(parsed);
      }
    } catch (e) {
      console.error("Invalid lesson tray data", e);
    }
  }, []);

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
    const bottomH = bottomRef.current?.offsetHeight ?? 0;
    const topBottomGap = 48; // a little breathing room
    const available = Math.max(200, window.innerHeight - headerH - bottomH - topBottomGap);
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
  }, []);

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

  // determine inline styles for the card container when fullscreen:
  const cardStyle: React.CSSProperties = {};
  if (inFullscreen && cardAvailableHeight) {
    // Use that available height and make the card take most of it.
    // Keep a small space for card margins/controls inside the card wrapper.
    cardStyle.height = `${cardAvailableHeight}px`;
    const maxWidth = Math.min(cardAvailableHeight * 1.75, window.innerWidth - 88);
    cardStyle.width = `${Math.max(520, maxWidth)}px`;
    cardStyle.maxWidth = "calc(100vw - 88px)";
    cardStyle.padding = "24px";
  } else if (cardAvailableHeight) {
    const fittedHeight = Math.max(220, Math.floor(cardAvailableHeight * 0.9));
    const maxWidth = Math.min(fittedHeight * 1.62, window.innerWidth - 48);
    cardStyle.height = `${fittedHeight}px`;
    cardStyle.width = `${Math.max(320, maxWidth)}px`;
    cardStyle.maxWidth = "calc(100vw - 48px)";
    cardStyle.padding = "20px";
  } else {
    cardStyle.height = undefined;
    cardStyle.width = undefined;
    cardStyle.maxWidth = undefined;
    cardStyle.padding = undefined;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] flex flex-col justify-between">
      {/* Header controls */}
      <div
        ref={headerRef}
        className="sticky top-0 z-50 w-full flex justify-between items-center px-6 py-3 bg-transparent"
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
        className={`cursor-pointer mx-auto my-6 bg-white rounded-3xl shadow-2xl border-[10px] border-gray-300
          ${inFullscreen ? "max-w-none" : "max-w-none"} transition-all duration-300 ease-out`}
        style={{ ...cardStyle }}
      >
        {/* Conditional rendering for text-only centered mode */}
        {displayMode === "text" && !revealToggle ? (
          // centered text (no image visible)
          <div className="w-full h-full flex items-center justify-center">
            <h2 className="text-7xl md:text-8xl font-extrabold tracking-wide">{formatWord(card.word)}</h2>
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
                    className={`object-contain w-full h-full ${inFullscreen ? "scale-[1.08] md:scale-[1.12]" : "scale-[1.01] md:scale-[1.03]"}`}
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
                <h2 className={`text-7xl md:text-8xl font-extrabold tracking-wide ${displayMode === "text" && revealToggle ? "mb-4" : ""}`}>
                  {formatWord(card.word)}
                </h2>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation - ensure visible in fullscreen by measuring height above */}
      <div ref={bottomRef} className="w-full flex flex-col items-center gap-6 px-6 pb-6">
        <div className="flex items-center gap-6">
          <button
            onClick={prevCard}
            className="btn btn-primary p-4 md:p-5"
          >
            <ArrowLeft size={28} />
          </button>

          <button
            onClick={nextCard}
            className="btn btn-primary p-4 md:p-5"
          >
            <ArrowRight size={28} />
          </button>
        </div>

        <div className="text-2xl font-semibold text-gray-700">
          {index + 1} / {cards.length}
        </div>
      </div>
    </div>
  );
}
