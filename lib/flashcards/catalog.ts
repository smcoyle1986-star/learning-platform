import { SupabaseClient } from "@supabase/supabase-js";

import { Card, WordType } from "@/lib/flashcards/types";

type ThemeArrayRow = {
  id: string;
  lemma: string;
  image_id?: string | null;
  themes?: string[] | null;
};

type NounRow = ThemeArrayRow & {
  countability?: Card["countability"] | null;
};

type PhonicsRow = {
  id: string;
  lemma: string;
  image_id?: string | null;
  theme?: string;
};

type VocabImageRow = {
  noun_id?: string | null;
  lemma?: string | null;
  category?: Card["type"] | null;
  image_path?: string | null;
  is_default?: boolean | null;
};

const IRREGULAR_NOUNS: Record<string, string> = {
  child: "children",
  person: "people",
  man: "men",
  woman: "women",
  mouse: "mice",
  goose: "geese",
  tooth: "teeth",
  foot: "feet",
  ox: "oxen",
};

const THEMES_WITHOUT_AUTO_PLURAL_LABELS = new Set([
  "body",
  "dates",
  "drink",
  "family",
]);

const NO_AUTO_PLURAL_LEMMAS = new Set([
  "boots",
  "chopsticks",
  "christmas",
  "colored pencils",
  "darts",
  "ears",
  "ethics",
  "eyes",
  "fries",
  "glasses",
  "gloves",
  "grapes",
  "jeans",
  "octopus",
  "offices",
  "pants",
  "potato chips",
  "scissors",
  "shoes",
  "shorts",
  "sneakers",
  "social studies",
  "socks",
  "sunglasses",
  "tennis",
  "tongs",
]);

function rankResults<T extends { lemma: string; theme?: string }>(
  data: T[],
  query: string
) {
  return data.sort((a, b) => {
    const q = query.toLowerCase();

    const score = (item: T) => {
      const lemma = item.lemma.toLowerCase();
      const theme = item.theme?.toLowerCase() ?? "";

      if (lemma === q) return 0;
      if (lemma.startsWith(q)) return 1;
      if (lemma.includes(q)) return 2;
      if (theme.includes(q)) return 3;
      return 4;
    };

    return score(a) - score(b);
  });
}

function scoreForCard(card: Card, rawQuery: string) {
  const q = (rawQuery || "").toLowerCase();
  const lemma = (card.word || "").toLowerCase();
  if (!q) return 999;
  if (lemma === q) return 0;
  if (lemma.startsWith(q)) return 1;
  if (lemma.includes(q)) return 2;
  return 3;
}

export function lemmaKey(card: Pick<Card, "type" | "id">) {
  return `${card.type}:${card.id}`;
}

export function sortByPopularity(
  cards: Card[],
  rawQuery: string,
  cardCounts: Record<string, number>
) {
  return [...cards].sort((a, b) => {
    const ca = cardCounts[lemmaKey(a)] ?? 0;
    const cb = cardCounts[lemmaKey(b)] ?? 0;
    if (cb !== ca) return cb - ca;

    const sa = scoreForCard(a, rawQuery);
    const sb = scoreForCard(b, rawQuery);
    if (sa !== sb) return sa - sb;

    return a.word.localeCompare(b.word);
  });
}

function pluralizeLastWord(word: string) {
  if (!word) return word;
  const lower = word.toLowerCase();
  if (IRREGULAR_NOUNS[lower]) return IRREGULAR_NOUNS[lower];
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(f|fe)$/i.test(word)) return word.replace(/(fe|f)$/i, "ves");
  return `${word}s`;
}

function pluralizeLemma(lemma: string) {
  const trimmed = String(lemma ?? "").trim();
  if (!trimmed) return trimmed;
  const parts = trimmed.split(/\s+/);
  const last = parts.pop() ?? "";
  return [...parts, pluralizeLastWord(last)].join(" ");
}

export function getVariantNumberFromImagePath(imagePath?: string) {
  if (!imagePath) return null;
  const cleanPath = imagePath.split("?")[0] ?? imagePath;
  const match = cleanPath.match(/_(\d+)\.png$/i);
  const variantNumber = Number(match?.[1]);
  return Number.isFinite(variantNumber) ? variantNumber : null;
}

export function getDisplayWord(card: Card, imagePath?: string) {
  const variantNumber = getVariantNumberFromImagePath(imagePath);
  const canPluralize =
    card.type === "noun" &&
    (card.countability === "count" || card.countability === "both" || !card.countability);

  const lowerLemma = String(card.word ?? "").trim().toLowerCase();
  const hasBlockedTheme = (card.themes ?? []).some((theme) =>
    THEMES_WITHOUT_AUTO_PLURAL_LABELS.has(String(theme).toLowerCase())
  );

  if (
    canPluralize &&
    variantNumber === 2 &&
    !hasBlockedTheme &&
    !NO_AUTO_PLURAL_LEMMAS.has(lowerLemma)
  ) {
    return pluralizeLemma(card.word);
  }

  return card.word;
}

function getThemePathHints(card: Card) {
  const themes = (card.themes ?? []).map((theme) => String(theme).toLowerCase());
  const hints = new Set<string>();

  themes.forEach((theme) => {
    const normalized = theme.replace(/\s+/g, "_");
    if (normalized) hints.add(normalized);
    if (theme === "food") hints.add("_food/");
    if (theme === "animals land") hints.add("_animal/");
    if (theme === "animals baby") hints.add("_baby/");
  });

  return Array.from(hints);
}

export async function fetchSearchResults(params: {
  supabase: SupabaseClient;
  activeWordType: WordType;
  activeTheme: string | null;
  query: string;
  cardCounts: Record<string, number>;
}) {
  const { supabase, activeWordType, activeTheme, query, cardCounts } = params;
  const raw = query.trim().toLowerCase();
  if (!raw && !activeTheme) return [];

  if (activeWordType === "noun") {
    let data;
    let error;

    const queryBuilder = supabase
      .from("nouns")
      .select("id, lemma, image_id, countability, themes");

    if (activeTheme) {
      queryBuilder.contains("themes", [activeTheme]);
    } else if (raw) {
      queryBuilder.or(`lemma.ilike.%${raw}%,themes.cs.{${raw}}`);
    }

    ({ data, error } = await queryBuilder);
    if (error) throw error;

    return sortByPopularity(
      (data ?? []).map((noun: NounRow) => ({
        id: noun.id,
        word: noun.lemma,
        image: noun.image_id ?? "/placeholder.png",
        type: "noun" as const,
        countability: noun.countability ?? undefined,
        themes: Array.isArray(noun.themes) ? noun.themes : [],
      })),
      raw,
      cardCounts
    );
  }

  if (activeWordType === "verb") {
    const { data, error } = await supabase
      .from("verbs")
      .select("id, lemma, image_id, themes")
      .or(
        activeTheme
          ? `themes.cs.{${activeTheme}}`
          : `lemma.ilike.%${raw}%,themes.cs.{${raw}}`
      );

    if (error) throw error;

    return sortByPopularity(
      (data ?? []).map((verb: ThemeArrayRow) => ({
        id: verb.id,
        word: verb.lemma,
        image: verb.image_id ?? "/placeholder.png",
        type: "verb" as const,
      })),
      raw,
      cardCounts
    );
  }

  if (activeWordType === "adjective") {
    const { data, error } = await supabase
      .from("adjectives")
      .select("id, lemma, image_id, themes")
      .or(
        activeTheme
          ? `themes.cs.{${activeTheme}}`
          : `lemma.ilike.%${raw}%,themes.cs.{${raw}}`
      );

    if (error) throw error;

    return sortByPopularity(
      (data ?? []).map((adj: ThemeArrayRow) => ({
        id: adj.id,
        word: adj.lemma,
        image: adj.image_id ?? "/placeholder.png",
        type: "adjective" as const,
      })),
      raw,
      cardCounts
    );
  }

  if (activeWordType === "phonics") {
    const { data, error } = await supabase
      .from("phonics")
      .select("id, lemma, image_id, theme")
      .or(
        activeTheme
          ? `theme.ilike.%${activeTheme}%`
          : `lemma.ilike.%${raw}%,theme.ilike.%${raw}%`
      );

    if (error) throw error;

    return sortByPopularity(
      rankResults<PhonicsRow>(data ?? [], raw).map((ph) => ({
        id: ph.id,
        word: ph.lemma,
        image: ph.image_id ?? "/placeholder.png",
        type: "phonics" as const,
      })),
      raw,
      cardCounts
    );
  }

  const { data, error } = await supabase
    .from("prepositions")
    .select("id, lemma, image_id, themes")
    .or(
      activeTheme
        ? `themes.cs.{${activeTheme}}`
        : `lemma.ilike.%${raw}%,themes.cs.{${raw}}`
    );

  if (error) throw error;

  return sortByPopularity(
    (data ?? []).map((prep: ThemeArrayRow) => ({
      id: prep.id,
      word: prep.lemma,
      image: prep.image_id ?? "/placeholder.png",
      type: "preposition" as const,
    })),
    raw,
    cardCounts
  );
}

export async function loadImageVariants(params: {
  supabase: SupabaseClient;
  cards: Card[];
  category: Card["type"];
}) {
  const { supabase, cards, category } = params;
  const lemmas = Array.from(new Set(cards.map((card) => card.word).filter(Boolean)));
  const nounIds = Array.from(
    new Set(cards.map((card) => String(card.id ?? "").trim()).filter(Boolean))
  );

  if (lemmas.length === 0 && nounIds.length === 0) return {};

  const rows: VocabImageRow[] = [];

  if (nounIds.length > 0) {
    const { data, error } = await supabase
      .from("vocab_images")
      .select("noun_id, lemma, category, image_path, is_default")
      .in("noun_id", nounIds)
      .eq("category", category)
      .order("is_default", { ascending: false })
      .order("image_path", { ascending: true });

    if (error) throw error;
    rows.push(...(data ?? []));
  }

  const legacyLemmaKeys = Array.from(
    new Set(
      lemmas.flatMap((lemma) => {
        const trimmed = String(lemma ?? "").trim();
        if (!trimmed) return [];
        const lower = trimmed.toLowerCase();
        return lower === trimmed ? [trimmed] : [trimmed, lower];
      })
    )
  );

  if (legacyLemmaKeys.length > 0) {
    const { data, error } = await supabase
      .from("vocab_images")
      .select("noun_id, lemma, category, image_path, is_default")
      .in("lemma", legacyLemmaKeys)
      .eq("category", category)
      .is("noun_id", null)
      .order("is_default", { ascending: false })
      .order("image_path", { ascending: true });

    if (error) throw error;
    rows.push(...(data ?? []));
  }

  const rowsByNounId: Record<string, VocabImageRow[]> = {};
  const rowsByLemma: Record<string, VocabImageRow[]> = {};

  rows.forEach((row) => {
    const nounId = String(row.noun_id ?? "");
    if (nounId) {
      if (!rowsByNounId[nounId]) rowsByNounId[nounId] = [];
      rowsByNounId[nounId].push(row);
    }

    const lemma = String(row.lemma ?? "");
    if (!rowsByLemma[lemma]) rowsByLemma[lemma] = [];
    rowsByLemma[lemma].push(row);
  });

  const nextMap: Record<string, string[]> = {};

  cards.forEach((card) => {
    const key = lemmaKey(card);
    const nounIdRows = rowsByNounId[card.id] ?? [];
    const legacyLemmaRows = [
      ...(rowsByLemma[card.word] ?? []),
      ...(rowsByLemma[String(card.word ?? "").toLowerCase()] ?? []),
    ].filter((row) => !row.noun_id);

    const candidateRows =
      category === "noun"
        ? nounIdRows.length > 0
          ? nounIdRows
          : legacyLemmaRows
        : nounIdRows.length > 0
          ? nounIdRows
          : rowsByLemma[card.word] ?? [];

    const hints = getThemePathHints(card);
    const matchedRows =
      hints.length > 0
        ? candidateRows.filter((row) => {
            const rawPath = String(row.image_path ?? "").toLowerCase();
            return hints.some((hint) => rawPath.includes(hint));
          })
        : [];

    const rowsForCard = matchedRows.length > 0 ? matchedRows : candidateRows;

    rowsForCard.forEach((row) => {
      if (!nextMap[key]) nextMap[key] = [];
      if (!row.image_path) return;

      const raw = String(row.image_path);
      const publicUrl = raw.startsWith("http")
        ? raw
        : supabase.storage.from("vocab-images").getPublicUrl(raw).data.publicUrl;
      nextMap[key].push(publicUrl);
    });
  });

  Object.keys(nextMap).forEach((key) => {
    nextMap[key] = Array.from(new Set(nextMap[key])).sort();
  });

  return nextMap;
}
