export type SentenceScrambleLevel = "easy" | "medium" | "hard";

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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function tokenizeSentence(line: string) {
  return String(line ?? "")
    .trim()
    .replace(/\s*\/\s*/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scrambleMedium(tokens: string[], seed: number) {
  if (tokens.length <= 2) return shuffleArray(tokens, seed);

  const next = [...tokens];
  const random = createSeededRandom(seed);
  const swapCount = Math.max(1, Math.floor(tokens.length / 2));

  for (let attempt = 0; attempt < swapCount; attempt += 1) {
    const index = Math.floor(random() * (next.length - 1));
    const offset = random() > 0.55 ? 1 : 2;
    const swapIndex = clamp(index + offset, 0, next.length - 1);
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

export function scrambleSentenceLine(line: string, level: SentenceScrambleLevel, seed: number) {
  const tokens = tokenizeSentence(line);
  if (tokens.length <= 1) return tokens.join(" ");

  const joinWithSlashes = (items: string[]) => {
    if (items.length <= 1) return items.join(" ");
    return items.map((token, index) => (index < items.length - 1 ? `${token} /` : token)).join(" ");
  };

  if (level === "easy") {
    const easyBlocks: string[] = [];
    const random = createSeededRandom(seed);
    let index = 0;
    while (index < tokens.length) {
      const remaining = tokens.length - index;
      const blockSize = remaining <= 2 ? remaining : random() > 0.55 ? 3 : 2;
      easyBlocks.push(tokens.slice(index, index + blockSize).join(" "));
      index += blockSize;
    }
    return joinWithSlashes(shuffleArray(easyBlocks, seed + 37));
  }

  if (level === "medium") {
    return joinWithSlashes(scrambleMedium(tokens, seed));
  }

  return joinWithSlashes(shuffleArray(tokens, seed));
}
