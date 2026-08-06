import { SupabaseClient } from "@supabase/supabase-js";

const GAME_KEY = "yes-or-no";
export type YesNoPromptSetScope = "own" | "others";

export type YesNoPromptRow = {
  cardId: string;
  text: string;
  isYes: boolean;
  word: string;
  image?: string | null;
};

export type YesNoPromptSetRecord = {
  id: string;
  userId: string;
  gameKey: string;
  name: string;
  isPublic: boolean;
  rows: YesNoPromptRow[];
  createdAt: string;
  updatedAt: string;
};

type SaveYesNoPromptSetInput = {
  promptSetId?: string | null;
  userId: string;
  name: string;
  isPublic: boolean;
  rows: YesNoPromptRow[];
};

function normalizePromptRow(raw: unknown): YesNoPromptRow {
  const source = (raw ?? {}) as Record<string, unknown>;
  return {
    cardId: String(source.cardId ?? source.card_id ?? source.id ?? ""),
    text: String(source.text ?? ""),
    isYes: Boolean(source.isYes ?? source.is_yes ?? true),
    word: String(source.word ?? ""),
    image: typeof source.image === "string" ? source.image : null,
  };
}

function normalizePromptSet(raw: unknown): YesNoPromptSetRecord {
  const source = (raw ?? {}) as Record<string, unknown>;
  const payload = (source.payload ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(payload.rows) ? payload.rows.map(normalizePromptRow) : [];

  return {
    id: String(source.id ?? ""),
    userId: String(source.user_id ?? ""),
    gameKey: String(source.game_key ?? GAME_KEY),
    name: String(source.name ?? "Untitled Yes/No Set"),
    isPublic: source.is_public !== false,
    rows,
    createdAt: String(source.created_at ?? new Date().toISOString()),
    updatedAt: String(source.updated_at ?? new Date().toISOString()),
  };
}

export async function loadYesNoPromptSets(
  supabase: SupabaseClient,
  userId: string,
  scope: YesNoPromptSetScope = "own"
) {
  let query = supabase
    .from("game_prompt_sets")
    .select("*")
    .eq("game_key", GAME_KEY);

  if (scope === "own") {
    query = query.eq("user_id", userId);
  } else {
    query = query.neq("user_id", userId).eq("is_public", true);
  }

  const { data, error } = await query.order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizePromptSet);
}

export async function saveYesNoPromptSet(
  supabase: SupabaseClient,
  input: SaveYesNoPromptSetInput
) {
  const trimmedName = input.name.trim();
  if (!trimmedName) throw new Error("Set name is required");

  const payload = {
    user_id: input.userId,
    game_key: GAME_KEY,
    name: trimmedName,
    is_public: input.isPublic,
    payload: {
      rows: input.rows.map(normalizePromptRow),
    },
    updated_at: new Date().toISOString(),
  };

  if (input.promptSetId) {
    const { data, error } = await supabase
      .from("game_prompt_sets")
      .update(payload)
      .eq("id", input.promptSetId)
      .eq("user_id", input.userId)
      .eq("game_key", GAME_KEY)
      .select("*")
      .single();

    if (error || !data) throw error ?? new Error("Failed to update yes/no prompt set");
    return normalizePromptSet(data);
  }

  const { data, error } = await supabase
    .from("game_prompt_sets")
    .insert({
      ...payload,
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create yes/no prompt set");
  return normalizePromptSet(data);
}

export async function deleteYesNoPromptSet(
  supabase: SupabaseClient,
  promptSetId: string,
  userId: string
) {
  const { error } = await supabase
    .from("game_prompt_sets")
    .delete()
    .eq("id", promptSetId)
    .eq("user_id", userId)
    .eq("game_key", GAME_KEY);

  if (error) throw error;
}
