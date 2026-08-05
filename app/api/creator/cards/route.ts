import type { NextRequest } from "next/server";

import {
  CreatorApiError,
  creatorErrorResponse,
  getCreatorImageRecord,
  isUuid,
  normalizeCreatorCardType,
  normalizeCreatorFront,
  requireCreatorUser,
  requirePremiumCreator,
  toCreatorFlashcardDto,
} from "@/lib/creator/server";
import type {
  CreatorFlashcardRecord,
  CreatorImageRecord,
} from "@/lib/creator/types";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireCreatorUser(request);
    const supabase = getSupabaseAdmin();
    const { data: cardRows, error: cardsError } = await supabase
      .from("creator_flashcards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (cardsError) throw cardsError;

    const cards = (cardRows ?? []) as CreatorFlashcardRecord[];
    const imageIds = Array.from(new Set(cards.map((card) => card.creator_image_id)));
    let imagesById = new Map<string, CreatorImageRecord>();

    if (imageIds.length > 0) {
      const { data: imageRows, error: imagesError } = await supabase
        .from("creator_images")
        .select("*")
        .in("id", imageIds)
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .eq("status", "ready");
      if (imagesError) throw imagesError;
      imagesById = new Map(
        ((imageRows ?? []) as CreatorImageRecord[]).map((image) => [image.id, image])
      );
    }

    const flashcards = await Promise.all(
      cards.flatMap((card) => {
        const image = imagesById.get(card.creator_image_id);
        return image ? [toCreatorFlashcardDto(card, image)] : [];
      })
    );
    return Response.json({ cards: flashcards });
  } catch (error: unknown) {
    return creatorErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePremiumCreator(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new CreatorApiError("A JSON request body is required.", 400);

    const creatorImageId = body.creatorImageId;
    if (!isUuid(creatorImageId)) {
      throw new CreatorApiError("A valid creator image ID is required.", 400);
    }
    const front = normalizeCreatorFront(body.front);
    const cardType = normalizeCreatorCardType(body.cardType);
    const image = await getCreatorImageRecord(creatorImageId);
    if (!image || image.user_id !== user.id || image.status !== "ready") {
      throw new CreatorApiError("Choose an image from your Creator library.", 404);
    }

    const { data, error } = await getSupabaseAdmin()
      .from("creator_flashcards")
      .insert({
        user_id: user.id,
        creator_image_id: creatorImageId,
        front,
        card_type: cardType,
      })
      .select("*")
      .single();
    if (error || !data) throw error ?? new Error("Failed to create the card.");

    return Response.json(
      {
        card: await toCreatorFlashcardDto(
          data as CreatorFlashcardRecord,
          image
        ),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return creatorErrorResponse(error);
  }
}

