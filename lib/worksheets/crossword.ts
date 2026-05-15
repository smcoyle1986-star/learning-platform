import { LessonCard } from "@/lib/lessons/types";
import { WorksheetDifficulty } from "@/lib/worksheets/types";

type Direction = "across" | "down";

export type CrosswordEntry = {
  id: string;
  label: string;
  answer: string;
  clueImage?: string | null;
  row: number;
  col: number;
  direction: Direction;
  number: number;
};

export type CrosswordCell = {
  row: number;
  col: number;
  letter: string;
  number?: number;
  reveal: boolean;
};

export type CrosswordLayout = {
  width: number;
  height: number;
  cells: CrosswordCell[];
  entries: CrosswordEntry[];
  placedWordCount: number;
  hiddenLetterCount: number;
  revealedLetterCount: number;
};

type WorkingEntry = {
  id: string;
  label: string;
  answer: string;
  clueImage?: string | null;
};

type PlacedWord = WorkingEntry & {
  row: number;
  col: number;
  direction: Direction;
};

type GridCell = {
  letter: string;
  across?: boolean;
  down?: boolean;
};

function sanitizeAnswer(word: string) {
  return String(word ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

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
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function buildEntryPool(cards: LessonCard[], seed: number) {
  const unique = new Map<string, WorkingEntry>();

  cards.forEach((card) => {
    const answer = sanitizeAnswer(card.word);
    if (answer.length < 3 || unique.has(answer)) return;
    unique.set(answer, {
      id: card.id,
      label: card.word,
      answer,
      clueImage: card.image ?? null,
    });
  });

  return shuffleArray(Array.from(unique.values()), seed);
}

function gridSizeFor(entries: WorkingEntry[], difficulty: WorksheetDifficulty) {
  const totalLetters = entries.reduce((sum, entry) => sum + entry.answer.length, 0);
  const base = Math.max(10, Math.ceil(Math.sqrt(totalLetters * 1.8)));
  if (difficulty === "easy") return Math.max(14, base + 3);
  if (difficulty === "hard") return Math.max(9, base - 2);
  return Math.max(12, base + 1);
}

function getCellKey(row: number, col: number) {
  return `${row}:${col}`;
}

function canPlaceWord(
  grid: Map<string, GridCell>,
  word: string,
  row: number,
  col: number,
  direction: Direction,
  size: number
) {
  const stepRow = direction === "down" ? 1 : 0;
  const stepCol = direction === "across" ? 1 : 0;
  let intersections = 0;

  const beforeRow = row - stepRow;
  const beforeCol = col - stepCol;
  const afterRow = row + stepRow * word.length;
  const afterCol = col + stepCol * word.length;
  if (grid.has(getCellKey(beforeRow, beforeCol)) || grid.has(getCellKey(afterRow, afterCol))) {
    return null;
  }

  for (let index = 0; index < word.length; index += 1) {
    const currentRow = row + stepRow * index;
    const currentCol = col + stepCol * index;

    if (
      currentRow < 0 ||
      currentCol < 0 ||
      currentRow >= size ||
      currentCol >= size
    ) {
      return null;
    }

    const key = getCellKey(currentRow, currentCol);
    const existing = grid.get(key);
    const letter = word[index];

    if (existing) {
      if (existing.letter !== letter) return null;
      intersections += 1;
      if (direction === "across" && existing.across) return null;
      if (direction === "down" && existing.down) return null;
    } else {
      if (direction === "across") {
        if (grid.has(getCellKey(currentRow - 1, currentCol)) || grid.has(getCellKey(currentRow + 1, currentCol))) {
          return null;
        }
      } else {
        if (grid.has(getCellKey(currentRow, currentCol - 1)) || grid.has(getCellKey(currentRow, currentCol + 1))) {
          return null;
        }
      }
    }
  }

  return { intersections };
}

function placeWord(
  grid: Map<string, GridCell>,
  word: string,
  row: number,
  col: number,
  direction: Direction
) {
  const stepRow = direction === "down" ? 1 : 0;
  const stepCol = direction === "across" ? 1 : 0;

  for (let index = 0; index < word.length; index += 1) {
    const currentRow = row + stepRow * index;
    const currentCol = col + stepCol * index;
    const key = getCellKey(currentRow, currentCol);
    const existing = grid.get(key);
    const nextCell: GridCell = existing
      ? { ...existing }
      : { letter: word[index] };

    if (direction === "across") nextCell.across = true;
    else nextCell.down = true;

    grid.set(key, nextCell);
  }
}

function chooseBestPlacement(
  grid: Map<string, GridCell>,
  placedWords: PlacedWord[],
  entry: WorkingEntry,
  size: number,
  difficulty: WorksheetDifficulty,
  seed: number
) {
  const random = createSeededRandom(seed + entry.answer.length);
  const candidates: Array<{ row: number; col: number; direction: Direction; intersections: number; score: number }> = [];

  placedWords.forEach((placed) => {
    for (let i = 0; i < placed.answer.length; i += 1) {
      for (let j = 0; j < entry.answer.length; j += 1) {
        if (placed.answer[i] !== entry.answer[j]) continue;

        const direction: Direction = placed.direction === "across" ? "down" : "across";
        const row = direction === "across" ? placed.row + i : placed.row - j;
        const col = direction === "across" ? placed.col - j : placed.col + i;
        const placement = canPlaceWord(grid, entry.answer, row, col, direction, size);
        if (!placement) continue;

        const centerBias =
          Math.abs(size / 2 - row) +
          Math.abs(size / 2 - col);
        const difficultyWeight = difficulty === "hard" ? 4 : difficulty === "medium" ? 3 : 2;
        const compactnessBias = difficulty === "hard" ? centerBias * 0.35 : centerBias;
        const score =
          placement.intersections * difficultyWeight -
          compactnessBias +
          (difficulty === "hard" ? placement.intersections * 1.5 : 0) +
          random();
        candidates.push({ row, col, direction, intersections: placement.intersections, score });
      }
    }
  });

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

function assignNumbers(placedWords: PlacedWord[]) {
  const sorted = [...placedWords].sort((a, b) => (a.row - b.row) || (a.col - b.col));
  return sorted.map((entry, index) => ({
    ...entry,
    number: index + 1,
  }));
}

function buildRevealMap(
  entries: CrosswordEntry[],
  difficulty: WorksheetDifficulty
) {
  const revealKeys = new Set<string>();

  entries.forEach((entry) => {
    if (difficulty !== "easy") return;

    const positions = new Set<number>([0]);

    if (entry.answer.length >= 4) {
      positions.add(Math.floor(entry.answer.length / 2));
    }
    if (entry.answer.length >= 6) {
      positions.add(entry.answer.length - 1);
    }

    positions.forEach((position) => {
      const row = entry.row + (entry.direction === "down" ? position : 0);
      const col = entry.col + (entry.direction === "across" ? position : 0);
      revealKeys.add(getCellKey(row, col));
    });
  });

  return revealKeys;
}

function countIntersections(placedWords: PlacedWord[]) {
  const usage = new Map<string, number>();

  placedWords.forEach((entry) => {
    for (let index = 0; index < entry.answer.length; index += 1) {
      const row = entry.row + (entry.direction === "down" ? index : 0);
      const col = entry.col + (entry.direction === "across" ? index : 0);
      const key = getCellKey(row, col);
      usage.set(key, (usage.get(key) ?? 0) + 1);
    }
  });

  let intersections = 0;
  usage.forEach((count) => {
    if (count > 1) intersections += 1;
  });
  return intersections;
}

function scorePlacedWords(placedWords: PlacedWord[], difficulty: WorksheetDifficulty) {
  const placedLetters = placedWords.reduce((sum, entry) => sum + entry.answer.length, 0);
  const intersections = countIntersections(placedWords);
  const densityWeight = difficulty === "hard" ? 14 : difficulty === "medium" ? 10 : 6;
  return placedWords.length * 100 + placedLetters * 8 + intersections * densityWeight;
}

export function generateCrosswordLayout(
  cards: LessonCard[],
  difficulty: WorksheetDifficulty,
  seed: number
): CrosswordLayout | null {
  const entries = buildEntryPool(cards, seed);
  if (entries.length === 0) return null;

  const attempts = difficulty === "hard" ? 8 : difficulty === "medium" ? 5 : 3;
  let bestPlacedWords: PlacedWord[] = [];
  let bestGrid = new Map<string, GridCell>();
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const sortedEntries = shuffleArray(
      [...entries].sort((a, b) => b.answer.length - a.answer.length),
      seed + attempt * 97
    );
    const size = gridSizeFor(sortedEntries, difficulty);
    const grid = new Map<string, GridCell>();
    const placedWords: PlacedWord[] = [];

    const first = sortedEntries[0];
    const firstRow = Math.floor(size / 2);
    const firstCol = Math.max(0, Math.floor((size - first.answer.length) / 2));
    placeWord(grid, first.answer, firstRow, firstCol, "across");
    placedWords.push({ ...first, row: firstRow, col: firstCol, direction: "across" });

    sortedEntries.slice(1).forEach((entry, index) => {
      const placement = chooseBestPlacement(
        grid,
        placedWords,
        entry,
        size,
        difficulty,
        seed + attempt * 131 + index
      );
      if (!placement) return;
      placeWord(grid, entry.answer, placement.row, placement.col, placement.direction);
      placedWords.push({
        ...entry,
        row: placement.row,
        col: placement.col,
        direction: placement.direction,
      });
    });

    const score = scorePlacedWords(placedWords, difficulty);
    if (score > bestScore) {
      bestScore = score;
      bestPlacedWords = placedWords;
      bestGrid = grid;
    }
  }

  if (bestPlacedWords.length === 0) return null;

  const minRow = Math.min(...bestPlacedWords.map((entry) => entry.row));
  const minCol = Math.min(...bestPlacedWords.map((entry) => entry.col));
  const maxRow = Math.max(
    ...bestPlacedWords.map((entry) => entry.row + (entry.direction === "down" ? entry.answer.length - 1 : 0))
  );
  const maxCol = Math.max(
    ...bestPlacedWords.map((entry) => entry.col + (entry.direction === "across" ? entry.answer.length - 1 : 0))
  );

  const numberedEntries = assignNumbers(
    bestPlacedWords.map((entry) => ({
      ...entry,
      row: entry.row - minRow,
      col: entry.col - minCol,
    }))
  );

  const revealMap = buildRevealMap(numberedEntries, difficulty);
  const cells: CrosswordCell[] = [];

  bestGrid.forEach((cell, key) => {
    const [rawRow, rawCol] = key.split(":").map(Number);
    const row = rawRow - minRow;
    const col = rawCol - minCol;
    const entryNumber = numberedEntries.find((entry) => entry.row === row && entry.col === col)?.number;

    cells.push({
      row,
      col,
      letter: cell.letter,
      number: entryNumber,
      reveal: revealMap.has(getCellKey(row, col)),
    });
  });

  const revealedLetterCount = cells.filter((cell) => cell.reveal).length;
  const hiddenLetterCount = cells.length - revealedLetterCount;

  return {
    width: maxCol - minCol + 1,
    height: maxRow - minRow + 1,
    cells,
    entries: numberedEntries,
    placedWordCount: bestPlacedWords.length,
    hiddenLetterCount,
    revealedLetterCount,
  };
}
