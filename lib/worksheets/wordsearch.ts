import { LessonCard } from "@/lib/lessons/types";
import { WorksheetDifficulty } from "@/lib/worksheets/types";

export type WordsearchDirection = {
  dr: number;
  dc: number;
};

export type WordsearchPlacement = {
  card: LessonCard;
  word: string;
  answer: string;
  row: number;
  col: number;
  direction: WordsearchDirection;
  length: number;
};

export type WordsearchLayout = {
  gridSize: number;
  grid: (string | null)[][];
  placements: WordsearchPlacement[];
  unusedCards: LessonCard[];
};

function createSeededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function shuffleArray<T>(items: T[], seed: number) {
  const random = createSeededRandom(seed);
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function sanitizeWord(word: string) {
  return String(word ?? "").toUpperCase().replace(/[^A-Z]/g, "");
}

function getDirections(difficulty: WorksheetDifficulty): WordsearchDirection[] {
  if (difficulty === "easy") {
    return [
      { dr: 0, dc: 1 },
      { dr: 1, dc: 0 },
    ];
  }

  if (difficulty === "medium") {
    return [
      { dr: 0, dc: 1 },
      { dr: 1, dc: 0 },
      { dr: 1, dc: 1 },
      { dr: 1, dc: -1 },
    ];
  }

  return [
    { dr: 0, dc: 1 },
    { dr: 0, dc: -1 },
    { dr: 1, dc: 0 },
    { dr: -1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
    { dr: -1, dc: 1 },
    { dr: -1, dc: -1 },
  ];
}

function getGridSize(difficulty: WorksheetDifficulty) {
  if (difficulty === "easy") return 9;
  if (difficulty === "medium") return 12;
  return 13;
}

function canPlaceWord(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  direction: WordsearchDirection
) {
  const size = grid.length;

  for (let index = 0; index < word.length; index += 1) {
    const nextRow = row + direction.dr * index;
    const nextCol = col + direction.dc * index;
    if (nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size) return false;
    const current = grid[nextRow][nextCol];
    if (current !== null && current !== word[index]) return false;
  }

  return true;
}

function placeWord(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  direction: WordsearchDirection
) {
  for (let index = 0; index < word.length; index += 1) {
    const nextRow = row + direction.dr * index;
    const nextCol = col + direction.dc * index;
    grid[nextRow][nextCol] = word[index];
  }
}

function randomLetter(random: () => number) {
  return String.fromCharCode(65 + Math.floor(random() * 26));
}

type WordsearchLayoutOptions = {
  fillRandomLetters?: boolean;
};

export function generateWordsearchLayout(
  cards: LessonCard[],
  difficulty: WorksheetDifficulty,
  seed: number,
  options: WordsearchLayoutOptions = {}
): WordsearchLayout {
  const gridSize = getGridSize(difficulty);
  const fillRandomLetters = Boolean(options.fillRandomLetters);
  const random = createSeededRandom(seed);
  const grid = Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => null as string | null));
  const directions = getDirections(difficulty);
  const shuffledCards = shuffleArray(cards, seed).filter((card) => sanitizeWord(card.word).length > 0);
  const sortedCards = [...shuffledCards].sort((left, right) => sanitizeWord(right.word).length - sanitizeWord(left.word).length);
  const placements: WordsearchPlacement[] = [];
  const unusedCards: LessonCard[] = [];

  sortedCards.forEach((card, cardIndex) => {
    const answer = sanitizeWord(card.word);
    if (!answer || answer.length > gridSize) {
      unusedCards.push(card);
      return;
    }

    const directionOrder = shuffleArray(directions, seed + cardIndex * 131);
    let placed = false;

    for (const direction of directionOrder) {
      const rowMin = direction.dr < 0 ? answer.length - 1 : 0;
      const rowMax = direction.dr > 0 ? gridSize - answer.length : gridSize - 1;
      const colMin = direction.dc < 0 ? answer.length - 1 : 0;
      const colMax = direction.dc > 0 ? gridSize - answer.length : gridSize - 1;

      if (rowMax < rowMin || colMax < colMin) {
        continue;
      }

      for (let attempt = 0; attempt < 80; attempt += 1) {
        const row = rowMin + Math.floor(random() * (rowMax - rowMin + 1));
        const col = colMin + Math.floor(random() * (colMax - colMin + 1));

        if (!canPlaceWord(grid, answer, row, col, direction)) {
          continue;
        }

        placeWord(grid, answer, row, col, direction);
        placements.push({
          card,
          word: String(card.word ?? ""),
          answer,
          row,
          col,
          direction,
          length: answer.length,
        });
        placed = true;
        break;
      }

      if (placed) break;
    }

    if (!placed) {
      unusedCards.push(card);
    }
  });

  if (fillRandomLetters) {
    for (let row = 0; row < gridSize; row += 1) {
      for (let col = 0; col < gridSize; col += 1) {
        if (!grid[row][col]) {
          grid[row][col] = randomLetter(random);
        }
      }
    }
  }

  return {
    gridSize,
    grid: grid.map((row) => row.map((cell) => cell ?? null)),
    placements,
    unusedCards,
  };
}
