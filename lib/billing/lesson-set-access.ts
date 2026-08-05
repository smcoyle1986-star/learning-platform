import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeLesson } from "@/lib/lessons/repository";
import type { BillingAccessSnapshot } from "@/lib/billing/types";
import type { LessonCard, LessonRecord } from "@/lib/lessons/types";

type VocabImageRow = {
  noun_id?: string | null;
  lemma?: string | null;
  category?: string | null;
  image_path?: string | null;
  is_default?: boolean | null;
  is_premium?: boolean | null;
};

type RawCard = {
  id: string;
  lesson_set_id: string;
  front: string | null;
  back: string | null;
  creator_image_id: string | null;
  position: number | null;
  basic_back_override: string | null;
};

function matchesImagePath(stored: string | null, path: string | null | undefined) {
  if (!stored || !path) return false;
  const cleanStored = decodeURIComponent(stored.split("?")[0]).replace(/^\/+/, "");
  const cleanPath = decodeURIComponent(path).replace(/^\/+/, "");
  return cleanStored === cleanPath || cleanStored.endsWith(`/${cleanPath}`);
}

function findPremiumVariant(card: RawCard, images: VocabImageRow[]) {
  return images.find((image) => image.is_premium && matchesImagePath(card.back, image.image_path)) ?? null;
}

function findFreeVariant(premium: VocabImageRow, images: VocabImageRow[]) {
  const candidates = images.filter((image) => {
    if (image.is_premium || !image.image_path) return false;
    if (premium.noun_id) return image.noun_id === premium.noun_id;
    return image.category === premium.category && image.lemma === premium.lemma;
  });
  return candidates.sort((left, right) => Number(Boolean(right.is_default)) - Number(Boolean(left.is_default)))[0] ?? null;
}

function publicImageUrl(supabase: SupabaseClient, imagePath: string) {
  return imagePath.startsWith("http")
    ? imagePath
    : supabase.storage.from("vocab-images").getPublicUrl(imagePath).data.publicUrl;
}

async function loadOwnedSetsAndImages(supabase: SupabaseClient, userId: string) {
  const [{ data: sets, error: setsError }, { data: images, error: imagesError }] = await Promise.all([
    supabase
      .from("lesson_sets")
      .select("id,name,created_at,last_used,is_public,use_count,basic_active,basic_locked_at")
      .eq("user_id", userId)
      .order("last_used", { ascending: false }),
    supabase
      .from("vocab_images")
      .select("noun_id,lemma,category,image_path,is_default,is_premium"),
  ]);
  if (setsError) throw setsError;
  if (imagesError) throw imagesError;

  const lessonIds = (sets ?? []).map((row) => String(row.id));
  if (!lessonIds.length) return { sets: [], cards: [] as RawCard[], images: (images ?? []) as VocabImageRow[] };

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("id,lesson_set_id,front,back,creator_image_id,position,basic_back_override")
    .in("lesson_set_id", lessonIds)
    .order("position", { ascending: true });
  if (cardsError) throw cardsError;

  return {
    sets: sets ?? [],
    cards: (cards ?? []) as RawCard[],
    images: (images ?? []) as VocabImageRow[],
  };
}

export async function loadLessonSetsWithAccess(
  supabase: SupabaseClient,
  userId: string,
  access: BillingAccessSnapshot,
): Promise<LessonRecord[]> {
  const loaded = await loadOwnedSetsAndImages(supabase, userId);
  const cardsBySet = new Map<string, RawCard[]>();
  for (const card of loaded.cards) {
    const key = String(card.lesson_set_id);
    cardsBySet.set(key, [...(cardsBySet.get(key) ?? []), card]);
  }

  return loaded.sets.map((set) => {
    const rawCards = cardsBySet.get(String(set.id)) ?? [];
    let containsPremiumImages = false;
    let basicConversionAvailable = true;
    let premiumImagesNeedConversion = false;

    const cards: LessonCard[] = rawCards.map((card) => {
      const premiumVariant = findPremiumVariant(card, loaded.images);
      const containsPremium = Boolean(card.creator_image_id || premiumVariant);
      const freeVariant = premiumVariant ? findFreeVariant(premiumVariant, loaded.images) : null;
      containsPremiumImages ||= containsPremium;
      if (card.creator_image_id || (premiumVariant && !freeVariant)) basicConversionAvailable = false;
      if (containsPremium && !card.basic_back_override) premiumImagesNeedConversion = true;

      const effectiveBack = !access.isPremium && containsPremium
        ? card.basic_back_override ?? null
        : card.back;

      return {
        id: String(card.id),
        word: String(card.front ?? ""),
        image: effectiveBack,
        back: effectiveBack,
        creator_image_id: access.isPremium ? card.creator_image_id : null,
        position: card.position ?? 0,
      };
    });

    const lockReasons: LessonRecord["lockReasons"] = [];
    if (!access.isPremium && !Boolean(set.basic_active)) lockReasons.push("set_limit");
    if (!access.isPremium && containsPremiumImages && premiumImagesNeedConversion) lockReasons.push("premium_images");

    return normalizeLesson({
      ...set,
      cards,
      basicActive: Boolean(set.basic_active),
      containsPremiumImages,
      basicVersionAvailable: containsPremiumImages && !premiumImagesNeedConversion,
      basicConversionAvailable: containsPremiumImages && basicConversionAvailable,
      lockReasons,
      isLocked: lockReasons.length > 0,
    });
  });
}

export async function convertLessonSetToBasic(
  supabase: SupabaseClient,
  userId: string,
  lessonSetId: string,
) {
  const loaded = await loadOwnedSetsAndImages(supabase, userId);
  const ownedSet = loaded.sets.find((set) => String(set.id) === lessonSetId);
  if (!ownedSet) throw new Error("Lesson set not found.");

  const cards = loaded.cards.filter((card) => String(card.lesson_set_id) === lessonSetId);
  const updates: Array<{ id: string; basic_back_override: string; basic_converted_at: string }> = [];
  for (const card of cards) {
    if (card.creator_image_id) {
      throw new Error("Creator images cannot be converted automatically. Upgrade to Premium to use this set.");
    }
    const premiumVariant = findPremiumVariant(card, loaded.images);
    if (!premiumVariant) continue;
    const freeVariant = findFreeVariant(premiumVariant, loaded.images);
    if (!freeVariant?.image_path) {
      throw new Error(`No free Image 1 version is available for ${card.front || "one of these cards"}.`);
    }
    updates.push({
      id: String(card.id),
      basic_back_override: publicImageUrl(supabase, freeVariant.image_path),
      basic_converted_at: new Date().toISOString(),
    });
  }

  for (const update of updates) {
    const { error } = await supabase
      .from("cards")
      .update({
        basic_back_override: update.basic_back_override,
        basic_converted_at: update.basic_converted_at,
      })
      .eq("id", update.id)
      .eq("lesson_set_id", lessonSetId);
    if (error) throw error;
  }
  return { convertedCards: updates.length };
}
