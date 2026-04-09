export type PhaserVocabCard = {
  id: string;
  word: string;
  image?: string | null;
};

export function makeTextureKey(prefix: string, value: string) {
  const safe = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${prefix}-${safe}`;
}
