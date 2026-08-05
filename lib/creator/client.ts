"use client";

import type {
  CreatorFlashcardDto,
  CreatorImageDto,
} from "@/lib/creator/types";
import type { Card } from "@/lib/flashcards/types";
import type { LessonCard } from "@/lib/lessons/types";
import { supabase } from "@/lib/supabase/client";

async function creatorFetch(path: string, init?: RequestInit, requireAuth = true) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (requireAuth && !token) throw new Error("You must be signed in to use Creator.");

  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : null;

  if (!response.ok) {
    throw new Error(String(payload?.error ?? `Creator request failed (${response.status}).`));
  }
  return payload;
}

export async function listCreatorImages() {
  const payload = await creatorFetch("/api/creator/images");
  return (payload?.images ?? []) as CreatorImageDto[];
}

export async function uploadCreatorImage(file: File) {
  const formData = new FormData();
  formData.set("file", file);
  const payload = await creatorFetch("/api/creator/images", {
    method: "POST",
    body: formData,
  });
  return payload?.image as CreatorImageDto;
}

export async function deleteCreatorImage(imageId: string) {
  await creatorFetch(`/api/creator/images/${encodeURIComponent(imageId)}`, {
    method: "DELETE",
  });
}

export async function getCreatorImage(imageId: string) {
  const payload = await creatorFetch(
    `/api/creator/images/${encodeURIComponent(imageId)}`,
    undefined,
    false
  );
  return payload?.image as CreatorImageDto;
}

export async function listCreatorCards() {
  const payload = await creatorFetch("/api/creator/cards");
  return (payload?.cards ?? []) as CreatorFlashcardDto[];
}

export async function createCreatorCard(input: {
  creatorImageId: string;
  front: string;
  cardType?: string;
}) {
  const payload = await creatorFetch("/api/creator/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return payload?.card as CreatorFlashcardDto;
}

export async function updateCreatorCard(
  cardId: string,
  input: { front?: string; cardType?: string; creatorImageId?: string }
) {
  const payload = await creatorFetch(`/api/creator/cards/${encodeURIComponent(cardId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return payload?.card as CreatorFlashcardDto;
}

export async function deleteCreatorCard(cardId: string) {
  await creatorFetch(`/api/creator/cards/${encodeURIComponent(cardId)}`, {
    method: "DELETE",
  });
}

export function creatorCardToFlashcard(card: CreatorFlashcardDto): Card {
  return {
    id: card.id,
    creatorCardId: card.id,
    creatorImageId: card.creatorImageId,
    word: card.front,
    image: card.image.imageUrl,
    type: "custom",
  };
}

export function creatorCardToLessonCard(card: CreatorFlashcardDto): LessonCard {
  return {
    id: `creator:${card.id}`,
    word: card.front,
    image: card.image.imageUrl,
    back: null,
    creator_image_id: card.creatorImageId,
    type: "custom",
  };
}

export async function hydrateCreatorLessonCards<T extends LessonCard>(cards: T[]) {
  const imageIds = Array.from(
    new Set(
      cards
        .map((card) => card.creator_image_id)
        .filter((imageId): imageId is string => Boolean(imageId))
    )
  );
  if (imageIds.length === 0) return cards;

  const resolved = new Map<string, CreatorImageDto>();
  await Promise.all(
    imageIds.map(async (imageId) => {
      try {
        resolved.set(imageId, await getCreatorImage(imageId));
      } catch (error) {
        console.warn(`Could not refresh creator image ${imageId}:`, error);
      }
    })
  );

  return cards.map((card) => {
    const imageId = card.creator_image_id;
    const image = imageId ? resolved.get(imageId) : null;
    return image ? { ...card, image: image.imageUrl, back: null } : card;
  });
}
