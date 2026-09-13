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

function previewLessonCards(cards: LessonCard[], count: number, fallbackLabel: string) {
  const suitableCards = cards.filter((card) => cleanWord(card.word) || card.image);
  return ensureCards(suitableCards, count, fallbackLabel).slice(0, count);
}

function LessonPreview({ card, className }: { card?: LessonCard; className: string }) {
  const word = cleanWord(card?.word) || "Vocabulary";
  const imageSource = card?.image ? resolveLessonImageUrl(card.image) : null;
  const [failedSource, setFailedSource] = React.useState<string | null>(null);

  return (
    <div className={`flex items-center justify-center overflow-hidden bg-white ${className}`}>
      {imageSource && failedSource !== imageSource ? (
        <img
          src={imageSource}
          alt={word}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSource(imageSource)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="px-2 text-center text-sm font-black text-[var(--color-text-main)]">{word}</span>
      )}
    </div>
  );
}

function ImageRevealVisual({ cards }: { cards: LessonCard[] }) {
  const card = previewLessonCards(cards, 1, "Picture")[0];
  return (
    <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(127,163,106,0.12))] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <MiniLabel>Choose a square</MiniLabel>
        <MiniLabel>Random Select</MiniLabel>
      </div>
      <div className="mt-4 rounded-[1.6rem] border border-black/8 bg-white p-4 shadow-inner">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] border border-black/5 bg-[var(--color-bg-main)]">
          <LessonPreview card={card} className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 gap-2 p-3">
            {Array.from({ length: 12 }, (_, index) => (
              <div
                key={index}
                className={`rounded-lg border border-white/70 backdrop-blur-[1px] ${
                  [1, 5, 7, 10].includes(index) ? "bg-transparent" : "bg-white/90"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
        Choose a square or use Random Select to uncover part of the picture.
      </p>
    </div>
  );
}

function KaboomVisual({ cards }: { cards: LessonCard[] }) {
  const card = previewLessonCards(cards, 1, "Picture")[0];
  return (
    <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(127,163,106,0.10))] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <MiniLabel>Random Select</MiniLabel>
        <MiniLabel>4x4 / 5x5 / 6x6</MiniLabel>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 rounded-[1.5rem] border border-black/8 bg-white p-3">
        {Array.from({ length: 16 }, (_, index) => {
          const isPicture = index === 5;
          const isPoint = index === 6;
          const isKaboom = index === 9;

          return (
            <div
              key={index}
              className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-black/5 ${
                isPoint
                  ? "bg-emerald-300 text-emerald-950"
                  : isKaboom
                    ? "bg-rose-500 text-white"
                    : "bg-[var(--color-bg-main)]"
              }`}
            >
              {isPicture ? <LessonPreview card={card} className="absolute inset-0 h-full w-full" /> : null}
              {isPoint ? <span className="text-[10px] font-black sm:text-xs">+5 pts</span> : null}
              {isKaboom ? <span className="text-[8px] font-black uppercase sm:text-[10px]">Kaboom!</span> : null}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
        Students make a sentence using the picture. If they&apos;re correct, reveal the square.
      </p>
    </div>
  );
}

function SpinSpeakVisual({ cards }: { cards: LessonCard[] }) {
  const previewCards = previewLessonCards(cards, 4, "Prompt");
  const selectedCard = previewCards[1];
  return (
    <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(30,64,175,0.10))] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <MiniLabel>Spin</MiniLabel>
        <MiniLabel>Ask / act / make / read</MiniLabel>
      </div>
      <div className="mt-4 flex items-center justify-center">
        <div className="relative flex h-52 w-52 items-center justify-center rounded-full bg-[conic-gradient(from_0deg,rgba(127,163,106,0.92)_0deg_90deg,rgba(30,64,175,0.88)_90deg_180deg,rgba(244,155,185,0.9)_180deg_270deg,rgba(250,211,126,0.95)_270deg_360deg)] shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
          <div className="absolute inset-[13%] rounded-full bg-white/10" />
          <div className="absolute inset-[34%] rounded-full border border-black/10 bg-[var(--color-bg-main)]" />
          <div className="absolute left-1/2 top-[10px] h-0 w-0 -translate-x-1/2 border-l-[18px] border-r-[18px] border-t-[30px] border-l-transparent border-r-transparent border-t-red-500" />
          {previewCards.map((item, index) => (
            <div
              key={item.id}
              className={`absolute z-10 max-w-[3.5rem] truncate rounded-full border px-2 py-1 text-[10px] font-black shadow-sm ${
                index === 1 ? "border-white bg-white text-blue-800 ring-2 ring-blue-300" : "border-white/70 bg-white/85 text-[var(--color-text-main)]"
              } ${
                index === 0 ? "left-[5%] top-[43%]" : index === 1 ? "right-[5%] top-[43%]" : index === 2 ? "left-1/2 top-[8%] -translate-x-1/2" : "bottom-[8%] left-1/2 -translate-x-1/2"
              }`}
            >
              {cleanWord(item.word)}
            </div>
          ))}
          <div className="relative z-10 rounded-full border border-black/8 bg-white px-4 py-2 text-center text-sm font-black uppercase tracking-[0.28em] text-[var(--color-text-main)] shadow-sm">
            Spin
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-2xl border border-black/8 bg-white p-3">
        <div className="flex items-center gap-3">
          <LessonPreview card={selectedCard} className="h-12 w-12 shrink-0 rounded-xl border border-black/8" />
          <div>
            <div className="text-sm font-semibold text-[var(--color-text-main)]">Speaking prompt: {cleanWord(selectedCard.word)}</div>
            <div className="mt-1 text-xs text-[var(--color-text-muted)]">Describe it or use it in a sentence.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function YesNoVisual({ cards }: { cards: LessonCard[] }) {
  const card = previewLessonCards(cards, 1, "apple")[0];
  const word = cleanWord(card.word) || "apple";
  return (
    <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(108,144,255,0.08))] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <MiniLabel>Start</MiniLabel>
        <MiniLabel>Yes / No</MiniLabel>
      </div>
      <div className="mt-4 rounded-[1.5rem] border border-black/8 bg-white p-4 shadow-sm">
        <div className="rounded-[1.25rem] border border-black/10 bg-[var(--color-bg-main)] p-4 text-center">
          <LessonPreview card={card} className="mx-auto h-32 w-full max-w-[18rem] rounded-xl" />
          <div className="mt-3 text-xl font-black tracking-tight text-[var(--color-text-main)]">The word is “{word}”.</div>
          <div className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">Correct sentence</div>
        </div>
        <div className="mt-4 flex justify-center gap-3">
          <div className="flex h-16 min-w-24 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 text-lg font-black text-white ring-4 ring-emerald-200">YES <span aria-hidden="true">✓</span></div>
          <div className="flex h-16 min-w-24 items-center justify-center rounded-2xl bg-rose-100 px-5 text-lg font-black text-rose-700">NO</div>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
        Reveal the answer, then move on to the next one.
      </p>
    </div>
  );
}

function ChooseYourSideVisual({ cards }: { cards: LessonCard[] }) {
  const card = previewLessonCards(cards, 1, "apple")[0];
  const word = cleanWord(card.word) || "apple";
  return (
    <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(127,163,106,0.12))] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <MiniLabel>Move left</MiniLabel>
        <MiniLabel>Move right</MiniLabel>
      </div>
      <div className="mt-4 rounded-[1.5rem] border border-black/8 bg-white p-4 shadow-sm">
        <div className="rounded-[1.25rem] border border-black/10 bg-[var(--color-bg-main)] p-3 text-center">
          <LessonPreview card={card} className="mx-auto h-28 w-full rounded-xl" />
          <div className="mt-2 text-lg font-black text-[var(--color-text-main)]">The word is “{word}”.</div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-center text-white">
          <div className="rounded-2xl bg-emerald-500 px-3 py-5 text-lg font-black">← YES</div>
          <div className="rounded-2xl bg-rose-500 px-3 py-5 text-lg font-black">NO →</div>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
        They can point, vote, answer aloud, or physically move to that side of the classroom.
      </p>
    </div>
  );
}

function FourCornersVisual({ cards }: { cards: LessonCard[] }) {
  const previewCards = previewLessonCards(cards, 4, "Corner");
  return (
    <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,155,185,0.08))] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <MiniLabel>Move to a corner</MiniLabel>
        <MiniLabel>4 choices</MiniLabel>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {previewCards.map((card, index) => (
          <div key={card.id} className="relative overflow-hidden rounded-[1.35rem] border border-black/8 bg-white p-2 shadow-sm">
            <div className="relative">
              <LessonPreview card={card} className="h-24 w-full rounded-[1rem] sm:h-28" />
              <div className="absolute left-2 top-2 z-10 rounded-full bg-white/95 px-2 py-1 text-[11px] font-black">Corner {index + 1}</div>
              {index === 1 ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-[1rem] bg-slate-950/85 text-center text-xs font-black uppercase tracking-wider text-white">Safe</div>
              ) : null}
              {index === 2 ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-[1rem] bg-rose-600/80 text-center text-lg font-black uppercase tracking-wider text-white">Bomb!</div>
              ) : null}
              {index === 3 ? (
                <div className="absolute bottom-2 right-2 rounded-full bg-emerald-500 px-2 py-1 text-xs font-black text-white">✓ Action</div>
              ) : null}
            </div>
            <div className="mt-2 truncate text-center text-sm font-black text-[var(--color-text-main)]">{cleanWord(card.word)}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
        Students choose a corner. Each corner has its own action when selected.
      </p>
    </div>
  );
}

function MemoryFlipVisual({ cards }: { cards: LessonCard[] }) {
  const [matchingCard] = previewLessonCards(cards, 1, "Match");
  return (
    <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(127,163,106,0.10))] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <MiniLabel>Flip</MiniLabel>
        <MiniLabel>Match pairs</MiniLabel>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }, (_, index) => {
          const isFlipped = index === 0 || index === 1;

          return (
            <div key={index} className="rounded-[1rem] border border-black/8 bg-[var(--color-bg-main)] p-1.5 shadow-sm">
              <div className="relative flex h-24 items-center justify-center overflow-hidden rounded-[0.8rem] border border-black/8 bg-white sm:h-28">
                {isFlipped ? (
                  index === 0 && matchingCard.image ? (
                    <LessonPreview card={matchingCard} className="absolute inset-0 h-full w-full" />
                  ) : (
                    <span className="px-2 text-center text-sm font-black text-[var(--color-text-main)]">{cleanWord(matchingCard.word)}</span>
                  )
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,rgba(127,163,106,0.9),rgba(30,64,175,0.86))] text-2xl font-black text-white">?</div>
                )}
              </div>
              {isFlipped ? <div className="pt-1 text-center text-[9px] font-black uppercase text-emerald-700">Match</div> : null}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
        If they match, the student or team keeps the pair.
      </p>
    </div>
  );
}

function ConnectFourVisual({ cards }: { cards: LessonCard[] }) {
  const card = previewLessonCards(cards, 1, "Vocabulary")[0];
  const tokens: Record<number, "red" | "blue"> = {
    25: "blue",
    26: "red",
    32: "blue",
    34: "red",
    37: "red",
    38: "red",
    39: "red",
    40: "red",
  };
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
              <div key={index} className="flex aspect-square items-center justify-center rounded-full border border-black/5 bg-white">
                {tokens[index] ? <div className={`h-4/5 w-4/5 rounded-full shadow-inner ${tokens[index] === "red" ? "bg-rose-500" : "bg-blue-500"}`} /> : null}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-[1rem] border border-black/8 bg-white p-2">
          <LessonPreview card={card} className="h-16 w-20 shrink-0 rounded-[0.75rem]" />
          <div className="text-sm font-black text-rose-700">Red connects four!</div>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
        Teams take turns choosing a number at the top of the board to drop their token.
      </p>
    </div>
  );
}

function ConquerVisual({ cards }: { cards: LessonCard[] }) {
  const card = previewLessonCards(cards, 1, "Vocabulary")[0];
  const redTerritory = new Set([0, 1, 4, 5, 6, 10]);
  const blueTerritory = new Set([2, 3, 7, 9, 11, 14]);
  return (
    <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,211,126,0.10))] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <MiniLabel>Territory</MiniLabel>
        <MiniLabel>Bombs + attacks</MiniLabel>
      </div>
      <div className="mt-4 rounded-[1.4rem] border border-black/8 bg-[var(--color-bg-main)] p-3 shadow-sm">
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 16 }, (_, index) => {
            const isBattle = index === 6;
            const territoryColor = redTerritory.has(index)
              ? "bg-rose-400"
              : blueTerritory.has(index)
                ? "bg-blue-400"
                : "bg-white";

            return (
              <div
                key={index}
                className={`relative flex aspect-square items-center justify-center rounded-xl border border-black/5 ${territoryColor} ${
                  isBattle ? "ring-2 ring-amber-400 ring-offset-1" : ""
                }`}
              >
                {isBattle ? <span className="rounded-md bg-white px-1 py-0.5 text-[8px] font-black uppercase text-amber-800 shadow-sm">⚔ Battle</span> : null}
              </div>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-3">
          <LessonPreview card={card} className="h-16 w-20 rounded-[0.75rem] border border-black/8" />
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wide text-[var(--color-text-main)]">
              <span className="rounded-full bg-rose-200 px-2 py-1">Team 1</span>
              <span className="rounded-full bg-blue-200 px-2 py-1">Team 2</span>
            </div>
            <div className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">Territories meet at the battle square.</div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
        Keep playing as teams build and defend their territory.
      </p>
    </div>
  );
}

function WhackWordVisual({ cards }: { cards: LessonCard[] }) {
  const previewCards = previewLessonCards(cards, 6, "Word");
  const target = previewCards[0];

  return (
    <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,155,185,0.12))] p-4 shadow-sm">
      <div className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white p-3">
        <LessonPreview card={target} className="h-14 w-14 shrink-0 rounded-xl" />
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Target</div>
          <div className="text-base font-black text-[var(--color-text-main)]">{cleanWord(target.word)}</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {previewCards.map((card, index) => {
          const isTarget = index === 4;

          return (
            <div key={card.id} className="relative flex flex-col items-center pt-2">
              {isTarget ? <div className="absolute -top-1 z-10 rounded-full bg-emerald-500 px-2 py-1 text-[9px] font-black uppercase text-white">✓ Match</div> : null}
              <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 p-1 shadow-inner sm:h-20 sm:w-20 ${isTarget ? "ring-4 ring-emerald-300" : ""}`}>
                <LessonPreview card={isTarget ? target : card} className="h-full w-full rounded-full border-2 border-white/80" />
              </div>
              <div className="mt-1 max-w-full truncate text-center text-[10px] font-bold text-[var(--color-text-main)]">
                {cleanWord(isTarget ? target.word : card.word)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function gameGuide(game: GameInfo, lessonCards: LessonCard[]) {
  switch (game.id) {
    case "image-reveal":
      return {
        intro: <>Choose a square or use <strong>Random Select</strong> to uncover part of the picture.</>,
        cards: [
          {
            title: "Board",
            body: <>Students try to guess the word before the whole picture is revealed.</>,
          },
          {
            title: "Buttons",
            body: <>Keep uncovering squares until someone gets it right.</>,
          },
          {
            title: "Round flow",
            body: <>Move on to the next picture and play again. Use <strong>Settings</strong> to change the difficulty.</>,
          },
          {
            title: "Tip",
            body: <>Encourage students to answer in a full sentence when appropriate.</>,
          },
        ],
        visual: <ImageRevealVisual cards={lessonCards} />,
      };
    case "kaboom":
      return {
        intro: "Split the class into two teams.",
        cards: [
          {
            title: "Board",
            body: <>Choose a square or use <strong>Random Select</strong>.</>,
          },
          {
            title: "Button",
            body: <>Students make a sentence using the picture. If they&apos;re correct, reveal the square.</>,
          },
          {
            title: "Round flow",
            body: <>Squares can give points or reveal <strong>Kaboom!</strong>, which takes away 5 points. Keep playing until the board is finished. The team with the most points wins. Use <strong>Settings</strong> to change the game and adjust how often Kaboom appears.</>,
          },
          {
            title: "Tip",
            body: <>Let students discuss their answer with their team before answering.</>,
          },
        ],
        visual: <KaboomVisual cards={lessonCards} />,
      };
    case "spin-and-speak":
      return {
        intro: "Spin the wheel.",
        cards: [
          {
            title: "Wheel",
            body: <>Use the word or picture it lands on as the speaking prompt.</>,
          },
          {
            title: "Button",
            body: <>Follow the action shown on the wheel to score points.</>,
          },
          {
            title: "Round flow",
            body: <>Spin again for the next student or team.</>,
          },
          {
            title: "Tip",
            body: <>Adapt the speaking task to suit the level of your class.</>,
          },
        ],
        visual: <SpinSpeakVisual cards={lessonCards} />,
      };
    case "yes-or-no":
      return {
        intro: "Before starting, prepare correct and incorrect sentences for the vocabulary.",
        cards: [
          {
            title: "Board",
            body: <>Show the picture and sentence to the class.</>,
          },
          {
            title: "Modes",
            body: <>Students decide whether the sentence is correct: <strong>Yes or No?</strong></>,
          },
          {
            title: "Buttons",
            body: <>Reveal the answer, then move on to the next one.</>,
          },
          {
            title: "Tip",
            body: <>Ask students to explain why an incorrect sentence is wrong or correct it themselves.</>,
          },
        ],
        visual: <YesNoVisual cards={lessonCards} />,
      };
    case "choose-your-side":
      return {
        intro: "Before starting, prepare correct and incorrect sentences for the vocabulary.",
        cards: [
          {
            title: "Board",
            body: <>Show the sentence to the class.</>,
          },
          {
            title: "Move",
            body: <>Students choose which side they think is correct. They can point, vote, answer aloud, or physically move to that side of the classroom.</>,
          },
          {
            title: "Reveal",
            body: <>Reveal the answer and start the next round.</>,
          },
          {
            title: "Tip",
            body: <>Get students moving by assigning each answer to a side of the classroom.</>,
          },
        ],
        visual: <ChooseYourSideVisual cards={lessonCards} />,
      };
    case "four-corners":
      return {
        intro: <>Before starting, assign <strong>Corners 1–4</strong> to four areas of your classroom.</>,
        cards: [
          {
            title: "Board",
            body: <>Students choose a corner. Each corner has its own action when selected.</>,
          },
          {
            title: "Squares",
            body: <>Blacked-out corners are safe. If a bomb appears, students in that corner lose a life or are out.</>,
          },
          {
            title: "Buttons",
            body: <>Students who successfully complete their corner&apos;s action keep their life. Use <strong>Settings</strong> to change how often bombs appear.</>,
          },
          {
            title: "Tip",
            body: <>Students don&apos;t have to move — they can call out their corner or write the number on a mini whiteboard.</>,
          },
        ],
        visual: <FourCornersVisual cards={lessonCards} />,
      };
    case "memory-flip":
      return {
        intro: "Students take turns choosing two cards.",
        cards: [
          {
            title: "Board",
            body: <>Flip the cards to see what&apos;s underneath.</>,
          },
          {
            title: "Buttons",
            body: <>If they match, the student or team keeps the pair.</>,
          },
          {
            title: "Modes",
            body: <>If they don&apos;t match, turn them back over. Continue until all the pairs have been found.</>,
          },
          {
            title: "Tip",
            body: <>Ask students to say the word each time they turn over a card.</>,
          },
        ],
        visual: <MemoryFlipVisual cards={lessonCards} />,
      };
    case "connect-four":
      return {
        intro: "Split the class into two teams.",
        cards: [
          {
            title: "Board",
            body: <>Teams take turns choosing a number at the top of the board to drop their token.</>,
          },
          {
            title: "Buttons",
            body: <>Give the team a question or vocabulary challenge for their turn.</>,
          },
          {
            title: "Round flow",
            body: <>The first team to connect four tokens in a row wins. Use <strong>Settings</strong> to play against another team or the AI.</>,
          },
          {
            title: "Tip",
            body: <>Four tokens can connect horizontally, vertically, or diagonally.</>,
          },
        ],
        visual: <ConnectFourVisual cards={lessonCards} />,
      };
    case "conquer":
      return {
        intro: <>Create <strong>2–4 teams</strong>.</>,
        cards: [
          {
            title: "Board",
            body: <>Teams take turns choosing a square. If they make a correct sentence, they claim that square.</>,
          },
          {
            title: "Attacks",
            body: <>When a team gets three squares touching an opponent&apos;s square, a battle starts automatically.</>,
          },
          {
            title: "Bombs",
            body: <>If the attacking team wins, they conquer the square. If the defending team wins, their square becomes safe. Keep playing as teams build and defend their territory.</>,
          },
          {
            title: "Tip",
            body: <>Conquer works well as a full lesson review and can take up to 30 minutes to complete.</>,
          },
        ],
        visual: <ConquerVisual cards={lessonCards} />,
      };
    case "whack-a-word":
      return {
        intro: "Look at the target word or picture.",
        cards: [
          {
            title: "Board",
            body: <>Different vocabulary items will pop up on the board.</>,
          },
          {
            title: "Play",
            body: <>Hit the item that matches the target.</>,
          },
          {
            title: "Scoring",
            body: <>Correct hits score points. Wrong hits don&apos;t. Use <strong>Settings</strong> to change the difficulty and number of teams.</>,
          },
          {
            title: "Tip",
            body: <>Start slowly with younger students, then increase the difficulty when they&apos;re ready.</>,
          },
        ],
        visual: <WhackWordVisual cards={lessonCards} />,
      };
  }

  return {
    intro: "Choose a square or use Random Select to uncover part of the picture.",
    cards: [
      {
        title: "Board",
        body: "Students try to guess the word before the whole picture is revealed.",
      },
      {
        title: "Buttons",
        body: "Keep uncovering squares until someone gets it right.",
      },
      {
        title: "Round flow",
        body: "Move on to the next picture and play again. Use Settings to change the difficulty.",
      },
      {
        title: "Tip",
        body: "Encourage students to answer in a full sentence when appropriate.",
      },
    ],
    visual: <ImageRevealVisual cards={lessonCards} />,
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
