import type { NextRequest } from "next/server";

import {
  CreatorApiError,
  creatorErrorResponse,
  getCreatorImageRecord,
  isUuid,
  normalizeCreatorCardType,
  normalizeCreatorFront,
  requirePremiumCreator,
  toCreatorFlashcardDto,
} from "@/lib/creator/server";
import type { CreatorFlashcardRecord } from "@/lib/creator/types";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ cardId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requirePremiumCreator(request);
    const { cardId } = await context.params;
    if (!isUuid(cardId)) throw new CreatorApiError("Invalid creator card ID.", 400);

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new CreatorApiError("A JSON request body is required.", 400);

    const updates: Record<string, string> = {};
    if ("front" in body) updates.front = normalizeCreatorFront(body.front);
    if ("cardType" in body) updates.card_type = normalizeCreatorCardType(body.cardType);

    let requestedImageId: string | null = null;
    if ("creatorImageId" in body) {
      if (!isUuid(body.creatorImageId)) {
        throw new CreatorApiError("A valid creator image ID is required.", 400);
      }
      requestedImageId = body.creatorImageId;
      const requestedImage = await getCreatorImageRecord(requestedImageId);
      if (!requestedImage || requestedImage.user_id !== user.id || requestedImage.status !== "ready") {
        throw new CreatorApiError("Choose an image from your Creator library.", 404);
      }
      updates.creator_image_id = requestedImageId;
    }

    if (Object.keys(updates).length === 0) {
      throw new CreatorApiError("Provide card text, type, or an image to update.", 400);
    }

    const { data, error } = await getSupabaseAdmin()
      .from("creator_flashcards")
      .update(updates)
      .eq("id", cardId)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new CreatorApiError("Creator card not found.", 404);

    const card = data as CreatorFlashcardRecord;
    const image = await getCreatorImageRecord(card.creator_image_id);
    if (!image) throw new Error("The card image could not be loaded.");

    return Response.json({ card: await toCreatorFlashcardDto(card, image) });
  } catch (error: unknown) {
    return creatorErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requirePremiumCreator(request);
    const { cardId } = await context.params;
    if (!isUuid(cardId)) throw new CreatorApiError("Invalid creator card ID.", 400);

    const { data, error } = await getSupabaseAdmin()
      .from("creator_flashcards")
      .delete()
      .eq("id", cardId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new CreatorApiError("Creator card not found.", 404);

    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return creatorErrorResponse(error);
  }
}

