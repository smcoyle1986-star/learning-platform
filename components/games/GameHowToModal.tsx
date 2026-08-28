"use client";

import React from "react";
import { HelpCircle, X } from "lucide-react";
import { GameSettingsModal } from "@/components/games/GameSettingsSurface";
import { resolveLessonImageUrl } from "@/lib/lessons/image";

type LessonCard = {
  id: string;
  word: string;
  image?: string;
};

type GameId = string;

type GameInfo = {
  id: GameId;
  title: string;
  subtitle?: string;
  image?: string;
};

type GameHowToModalProps = {
  open: boolean;
  game: GameInfo | null;
  lessonCards: LessonCard[];
  onClose: () => void;
};

function cleanWord(word?: string) {
  return (word ?? "").replaceAll("_", " ").trim();
}

function ensureCards(cards: LessonCard[], minCount: number, fallbackLabel: string) {
  const filled = [...cards];
  while (filled.length < minCount) {
    filled.push({
      id: `${fallbackLabel}-${filled.length}`,
      word: `${fallbackLabel} ${filled.length + 1}`,
    });
  }
  return filled;
}

function GuideCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/8 bg-[var(--color-bg-main)] p-4">
      <div className="text-sm font-semibold text-[var(--color-text-main)]">{title}</div>
      <div className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{children}</div>
    </div>
  );
}

function MiniLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-full border border-black/10 bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--color-text-main)] shadow-sm">
      {children}
    </div>
  );
}

function ImageRevealVisual({ game, cards }: { game: GameInfo; cards: LessonCard[] }) {
  const card = cards[0];
  return (
    <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(127,163,106,0.12))] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <MiniLabel>Remove tile</MiniLabel>
        <MiniLabel>Get points / Lose points</MiniLabel>
      </div>
      <div className="mt-4 rounded-[1.6rem] border border-black/8 bg-white p-4 shadow-inner">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] border border-black/5 bg-[var(--color-bg-main)]">
          <img src={resolveLessonImageUrl(card?.image ?? game.image ?? "/placeholder.png")} alt={cleanWord(card?.word) || game.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 gap-2 p-3">
            {Array.from({ length: 12 }, (_, index) => (
              <div key={index} className="rounded-lg border border-white/70 bg-white/78 backdrop-blur-[1px]" />
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
        One tile opens at a time, then the score spinner awards or removes points.
      </p>
    </div>
  );
}

function KaboomVisual({ cards }: { cards: LessonCard[] }) {
  const card = cards[0];
  return (
    <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(127,163,106,0.10))] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <MiniLabel>Random Select</MiniLabel>
        <MiniLabel>4x4 / 5x5 / 6x6</MiniLabel>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 rounded-[1.5rem] border border-black/8 bg-white p-3">
        {Array.from({ length: 16 }, (_, index) => (
          <div
            key={index}
            className={`aspect-square rounded-2xl border border-black/5 ${
              index === 5 || index === 7 || index === 9 ? "bg-[rgba(127,163,106,0.24)]" : "bg-[var(--color-bg-main)]"
            }`}
          >
            {index === 6 ? (
                <img src={resolveLessonImageUrl(card?.image ?? "/placeholder.png")} alt={cleanWord(card?.word) || "Lesson card"} className="h-full w-full rounded-2xl object-cover" />
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
        The selected square becomes the challenge. Answer correctly to score, or avoid the bomb.
      </p>
    </div>
  );
}

function SpinSpeakVisual({ cards }: { cards: LessonCard[] }) {
  const card = cards[0];
  return (
    <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(30,64,175,0.10))] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <MiniLabel>Spin</MiniLabel>
        <MiniLabel>Ask / act / make / read</MiniLabel>
      </div>
      <div className="mt-4 flex items-center justify-center">
        <div className="relative flex h-52 w-52 items-center justify-center rounded-full bg-[conic-gradient(from_0deg,rgba(127,163,106,0.88),rgba(30,64,175,0.88),rgba(244,155,185,0.88),rgba(250,211,126,0.88),rgba(127,163,106,0.88))] shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
          <div className="absolute inset-[13%] rounded-full bg-white/95" />
          <div className="absolute inset-[34%] rounded-full border border-black/10 bg-[var(--color-bg-main)]" />
          <div className="absolute left-1/2 top-[10px] h-0 w-0 -translate-x-1/2 border-l-[18px] border-r-[18px] border-t-[30px] border-l-transparent border-r-transparent border-t-red-500" />
          <div className="relative z-10 rounded-full border border-black/8 bg-white px-4 py-2 text-center text-sm font-black uppercase tracking-[0.28em] text-[var(--color-text-main)] shadow-sm">
            Spin
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-2xl border border-black/8 bg-white p-3">
        <div className="text-sm font-semibold text-[var(--color-text-main)]">{cleanWord(card?.word) || "Lesson card"}</div>
        <div className="mt-1 text-xs text-[var(--color-text-muted)]">The wheel lands on a segment, then the prompt tells the class what to do.</div>
      </div>
    </div>
  );
}

function YesNoVisual({ cards }: { cards: LessonCard[] }) {
  const card = cards[0];
  return (
    <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(108,144,255,0.08))] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <MiniLabel>Start</MiniLabel>
        <MiniLabel>Yes / No</MiniLabel>
      </div>
      <div className="mt-4 rounded-[1.5rem] border border-black/8 bg-white p-4 shadow-sm">
        <div className="rounded-[1.25rem] border border-black/10 bg-[var(--color-bg-main)] p-4 text-center">
          <img src={card?.image ?? "/placeholder.png"} alt={cleanWord(card?.word) || "Lesson card"} className="mx-auto h-40 w-full max-w-[18rem] object-contain" />
          <div className="mt-3 text-xl font-black tracking-tight text-[var(--color-text-main)]">{cleanWord(card?.word) || "Lesson sentence"}</div>
        </div>
        <div className="mt-4 flex justify-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400 text-lg font-black text-white">YES</div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-400 text-lg font-black text-white">NO</div>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
        Start the round, then the class answers before the timer runs out.
      </p>
    </div>
  );
}

function ChooseYourSideVisual({ cards }: { cards: LessonCard[] }) {
  const card = cards[0];
  return (
    <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(127,163,106,0.12))] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <MiniLabel>Move left</MiniLabel>
        <MiniLabel>Move right</MiniLabel>
      </div>
      <div className="mt-4 rounded-[1.5rem] border border-black/8 bg-white p-4 shadow-sm">
        <div className="rounded-[1.25rem] border border-black/10 bg-[var(--color-bg-main)] p-3 text-center">
          <img src={resolveLessonImageUrl(card?.image ?? "/placeholder.png")} alt={cleanWord(card?.word) || "Lesson card"} className="mx-auto h-28 w-full object-contain" />
          <div className="mt-2 text-lg font-black text-[var(--color-text-main)]">{cleanWord(card?.word) || "Read the prompt"}</div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-center text-white">
          <div className="rounded-2xl bg-emerald-500 px-3 py-5 text-lg font-black">← YES</div>
          <div className="rounded-2xl bg-rose-500 px-3 py-5 text-lg font-black">NO →</div>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
        Students choose a side, then the board reveals the correct answer when the timer ends.
      </p>
    </div>
  );
}

function FourCornersVisual({ cards }: { cards: LessonCard[] }) {
  const previewCards = ensureCards(cards, 4, "Corner");
  return (
    <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,155,185,0.08))] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <MiniLabel>Move to a corner</MiniLabel>
        <MiniLabel>4 choices</MiniLabel>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {previewCards.slice(0, 4).map((card, index) => (
          <div key={card.id} className="relative overflow-hidden rounded-[1.35rem] border border-black/8 bg-white p-2 shadow-sm">
            <div className="absolute left-2 top-2 rounded-full bg-white/92 px-2 py-1 text-[11px] font-black">{index + 1}</div>
            <img src={resolveLessonImageUrl(card.image ?? "/placeholder.png")} alt={cleanWord(card.word)} className="h-32 w-full rounded-[1rem] object-cover" />
            <div className="mt-2 text-center text-sm font-black text-[var(--color-text-main)]">{cleanWord(card.word)}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
        The active corner is the one the class moves to. Blacked out squares are safe, and bombs can crater a square.
      </p>
    </div>
  );
}

function MemoryFlipVisual({ cards }: { cards: LessonCard[] }) {
  const previewCards = ensureCards(cards, 2, "Card");
  return (
    <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(127,163,106,0.10))] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <MiniLabel>Flip</MiniLabel>
        <MiniLabel>Match pairs</MiniLabel>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {previewCards.slice(0, 2).map((card, index) => (
          <div key={card.id} className="rounded-[1.35rem] border border-black/8 bg-[var(--color-bg-main)] p-2 shadow-sm">
            <div className="relative overflow-hidden rounded-[1rem] border border-black/8 bg-white">
              {index === 0 ? (
                <img src={resolveLessonImageUrl(card.image ?? "/placeholder.png")} alt={cleanWord(card.word)} className="h-36 w-full object-cover" />
              ) : (
                <div className="flex h-36 w-full items-center justify-center px-4 text-center text-xl font-black tracking-tight text-[var(--color-text-main)]">
                  {cleanWord(card.word)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
        Image, word, or image pairs can be matched. Correct matches lead into the score spinner.
      </p>
    </div>
  );
}

function ConnectFourVisual({ cards }: { cards: LessonCard[] }) {
  const card = cards[0];
  return (
    <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(108,144,255,0.08))] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <MiniLabel>Drop token</MiniLabel>
        <MiniLabel>Columns</MiniLabel>
      </div>
      <div className="mt-4 rounded-[1.5rem] border border-black/8 bg-white p-3 shadow-sm">
        <div className="rounded-[1.2rem] border border-black/8 bg-[var(--color-bg-main)] p-3">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 42 }, (_, index) => (
              <div key={index} className="aspect-square rounded-full border border-black/5 bg-white" />
            ))}
          </div>
        </div>
        <div className="mt-3 rounded-[1rem] border border-black/8 bg-white p-2">
          <img src={resolveLessonImageUrl(card?.image ?? "/placeholder.png")} alt={cleanWord(card?.word) || "Lesson card"} className="h-24 w-full rounded-[0.75rem] object-cover" />
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
        Choose a column, drop the token, and try to connect four before the other player does.
      </p>
    </div>
  );
}

function ConquerVisual({ cards }: { cards: LessonCard[] }) {
  const card = cards[0];
  return (
    <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,211,126,0.10))] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <MiniLabel>Territory</MiniLabel>
        <MiniLabel>Bombs + attacks</MiniLabel>
      </div>
      <div className="mt-4 rounded-[1.4rem] border border-black/8 bg-[var(--color-bg-main)] p-3 shadow-sm">
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 16 }, (_, index) => (
            <div
              key={index}
              className={`aspect-square rounded-xl border border-black/5 ${
                index === 5 ? "bg-[rgba(127,163,106,0.34)]" : index === 10 ? "bg-[rgba(108,144,255,0.26)]" : "bg-white"
              }`}
            />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="rounded-[1rem] border border-black/8 bg-white p-2">
            <img src={resolveLessonImageUrl(card?.image ?? "/placeholder.png")} alt={cleanWord(card?.word) || "Lesson card"} className="h-20 w-full rounded-[0.75rem] object-cover" />
          </div>
          <div className="rounded-full border border-black/8 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.24em] text-[var(--color-text-main)] shadow-sm">
            Attack!
          </div>
          <div className="rounded-[1rem] border border-black/8 bg-white p-2 text-center text-[11px] font-semibold text-[var(--color-text-muted)]">
            Bombs create craters and the board keeps going.
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
        Build territory, contest borders, and use the active team color to track who’s in control.
      </p>
    </div>
  );
}

function gameGuide(game: GameInfo, lessonCards: LessonCard[]) {
  switch (game.id) {
    case "image-reveal":
      return {
        intro: "Reveal the picture one tile at a time, then use the score spinner to award points.",
        cards: [
          {
            title: "Board",
            body: "A grid of tiles covers one large lesson image. Each tile hides a small piece of the picture until the class reveals it.",
          },
          {
            title: "Buttons",
            body: "Remove tile opens one square, and the score generator can award or remove points after the answer.",
          },
          {
            title: "Round flow",
            body: "Teachers reveal a little, ask the question, then keep the image hidden until the right moment.",
          },
          {
            title: "Tip",
            body: "Use the image as the clue and keep the reveal pace steady so the class can guess together.",
          },
        ],
        visual: <ImageRevealVisual game={game} cards={lessonCards} />,
      };
    case "kaboom":
      return {
        intro: "Randomly select a square, answer the challenge, then score points while avoiding the bomb.",
        cards: [
          {
            title: "Board",
            body: "The board is a grid of squares. The teacher can set the size so the game stays classroom-friendly.",
          },
          {
            title: "Button",
            body: "Random Select chooses the next square and disappears while the game is thinking.",
          },
          {
            title: "Round flow",
            body: "Students answer the prompt, then the score generator awards points or shows the bomb outcome.",
          },
          {
            title: "Tip",
            body: "Use a smaller grid for younger learners and a bigger one when you want more variety.",
          },
        ],
        visual: <KaboomVisual cards={lessonCards} />,
      };
    case "spin-and-speak":
      return {
        intro: "Spin the wheel, land on a task, then use the class prompt that appears in the center.",
        cards: [
          {
            title: "Wheel",
            body: "The wheel is split into classroom activity segments. The arrow shows the landed task.",
          },
          {
            title: "Button",
            body: "Spin launches the wheel. The button pulses when the wheel is ready, so it’s easy to spot from the front of the room.",
          },
          {
            title: "Round flow",
            body: "The landed segment opens the prompt, and the score generator appears after a correct answer.",
          },
          {
            title: "Tip",
            body: "The wheel is best used as a quick whole-class warm up because it keeps the pace moving.",
          },
        ],
        visual: <SpinSpeakVisual cards={lessonCards} />,
      };
    case "yes-or-no":
      return {
        intro: "Show a prompt, start the timer, and let the class vote yes or no before the round ends.",
        cards: [
          {
            title: "Board",
            body: "A single prompt card sits in the center of the game with the answer buttons below it and the timer floating above.",
          },
          {
            title: "Modes",
            body: "Sentence uses teacher-written prompts, Vocabulary checks image and word matches, and Mix combines both.",
          },
          {
            title: "Buttons",
            body: "Start begins the round, then the Yes and No buttons become the class response. Saved sets can be loaded from the modal.",
          },
          {
            title: "Tip",
            body: "Use a bold prompt and large image so the whole class can read it together from the screen.",
          },
        ],
        visual: <YesNoVisual cards={lessonCards} />,
      };
    case "choose-your-side":
      return {
        intro: "Show a prompt, start the timer, and have students move to the Yes or No side of the classroom.",
        cards: [
          {
            title: "Board",
            body: "The image and prompt stay centred, with a green YES side on the left and a red NO side on the right.",
          },
          {
            title: "Move",
            body: "Students decide, then move to the matching side while the timer counts down.",
          },
          {
            title: "Reveal",
            body: "The answer reveals automatically when time ends. Saved sets keep the cards, prompts, and correct answers together.",
          },
          {
            title: "Tip",
            body: "Leave a safe route to both sides of the classroom and use a short timer to keep the movement energetic.",
          },
        ],
        visual: <ChooseYourSideVisual cards={lessonCards} />,
      };
    case "four-corners":
      return {
        intro: "Show four choices, let the class move to a corner, and keep the active corner clear and readable.",
        cards: [
          {
            title: "Board",
            body: "The four corners are the answer choices. The active corner pulses while the timer is running.",
          },
          {
            title: "Squares",
            body: "Blackout squares are safe. Bomb settings can turn a square into a crater and clear nearby spaces.",
          },
          {
            title: "Buttons",
            body: "The start and settings controls live outside the board so the play space stays open and easy to see.",
          },
          {
            title: "Tip",
            body: "Use the lesson cards as the four choices so the class can compare the images before moving.",
          },
        ],
        visual: <FourCornersVisual cards={lessonCards} />,
      };
    case "memory-flip":
      return {
        intro: "Flip cards, find matches, and use the classroom settings to choose the style of the pairs.",
        cards: [
          {
            title: "Board",
            body: "The board is a grid of card frames. Cards can be image-image, image-word, or text-only depending on the mode.",
          },
          {
            title: "Buttons",
            body: "Flip cards to reveal them, then the score spinner awards points after a correct match.",
          },
          {
            title: "Modes",
            body: "Image + image, Image + text, and Text only all use the same board, but each pair behaves differently.",
          },
          {
            title: "Tip",
            body: "The round advances after each turn, whether the match succeeds or not, so the class keeps moving.",
          },
        ],
        visual: <MemoryFlipVisual cards={lessonCards} />,
      };
    case "connect-four":
      return {
        intro: "Drop tokens into a column and try to connect four before the other player or AI does.",
        cards: [
          {
            title: "Board",
            body: "The grid is wide and readable, with each column acting as a move choice.",
          },
          {
            title: "Buttons",
            body: "Settings controls the opponent, board size, and music. The board itself stays focused on the play grid.",
          },
          {
            title: "Round flow",
            body: "Choose a column, let the disc fall, and watch for a winning line of four tokens.",
          },
          {
            title: "Tip",
            body: "The game is strongest when the class can see the full board and the winning line lights up clearly.",
          },
        ],
        visual: <ConnectFourVisual cards={lessonCards} />,
      };
    case "conquer":
      return {
        intro: "Build territory, defend borders, and fight for the board with bombs and attacks.",
        cards: [
          {
            title: "Board",
            body: "The big grid is your map. Teams color squares and try to control the most territory by the end.",
          },
          {
            title: "Attacks",
            body: "When three sides of a square are pressured, the attack contest opens automatically.",
          },
          {
            title: "Bombs",
            body: "Danger squares explode into craters, clear nearby spaces, and then stay out of play.",
          },
          {
            title: "Tip",
            body: "Use the active team color, the score panel, and the attack popup to keep the class following the action.",
          },
        ],
        visual: <ConquerVisual cards={lessonCards} />,
      };
  }

  return {
    intro: "Reveal the picture one tile at a time, then use the score spinner to award points.",
    cards: [
      {
        title: "Board",
        body: "A grid of tiles covers one large lesson image. Each tile hides a small piece of the picture until the class reveals it.",
      },
      {
        title: "Buttons",
        body: "Remove tile opens one square, and the score generator can award or remove points after the answer.",
      },
      {
        title: "Round flow",
        body: "Teachers reveal a little, ask the question, then keep the image hidden until the right moment.",
      },
      {
        title: "Tip",
        body: "Use the image as the clue and keep the reveal pace steady so the class can guess together.",
      },
    ],
    visual: <ImageRevealVisual game={game} cards={lessonCards} />,
  };
}

export function GameHowToModal({ open, game, lessonCards, onClose }: GameHowToModalProps) {
  if (!open || !game) return null;
  const guide = gameGuide(game, lessonCards);

  return (
    <GameSettingsModal className="max-h-[88vh] max-w-6xl overflow-y-auto">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-[var(--color-bg-main)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            <HelpCircle size={13} className="text-[var(--color-accent)]" />
            How to play
          </div>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--color-text-main)]">{game.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">{guide.intro}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full border border-black/10 bg-white p-2 text-[var(--color-text-muted)] transition hover:-translate-y-0.5 hover:text-[var(--color-text-main)]"
          aria-label="Close help"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div>{guide.visual}</div>

        <div className="grid gap-4">
          {guide.cards.map((card) => (
            <GuideCard key={card.title} title={card.title}>
              {card.body}
            </GuideCard>
          ))}

          <div className="rounded-2xl border border-black/8 bg-[linear-gradient(135deg,rgba(127,163,106,0.12),rgba(255,255,255,0.92))] p-4">
            <div className="text-sm font-semibold text-[var(--color-text-main)]">Lesson tray images</div>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
              These examples use the same lesson cards you have loaded in the tray, so the help view stays matched to the game you are about to launch.
            </p>
          </div>
        </div>
      </div>
    </GameSettingsModal>
  );
}
