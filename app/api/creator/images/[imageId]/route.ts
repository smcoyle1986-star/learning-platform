import type { NextRequest } from "next/server";

import { CREATOR_IMAGE_BUCKET } from "@/lib/creator/constants";
import {
  canUserAccessCreatorImage,
  CreatorApiError,
  creatorErrorResponse,
  getCreatorImageRecord,
  getOptionalCreatorUser,
  isUuid,
  requirePremiumCreator,
  toCreatorImageDto,
} from "@/lib/creator/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ imageId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { imageId } = await context.params;
    if (!isUuid(imageId)) throw new CreatorApiError("Invalid creator image ID.", 400);

    const user = await getOptionalCreatorUser(request);
    const image = await getCreatorImageRecord(imageId);
    if (!image || !(await canUserAccessCreatorImage(imageId, user?.id))) {
      throw new CreatorApiError("Creator image not found.", 404);
    }

    return Response.json({
      image: await toCreatorImageDto(image, {
        includeOriginalFilename: image.user_id === user?.id,
      }),
    });
  } catch (error: unknown) {
    return creatorErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requirePremiumCreator(request);
    const { imageId } = await context.params;
    if (!isUuid(imageId)) throw new CreatorApiError("Invalid creator image ID.", 400);

    const image = await getCreatorImageRecord(imageId);
    if (!image || image.user_id !== user.id) {
      throw new CreatorApiError("Creator image not found.", 404);
    }

    const supabase = getSupabaseAdmin();
    const [{ count: libraryCardCount, error: libraryError }, { count: lessonCardCount, error: lessonError }] =
      await Promise.all([
        supabase
          .from("creator_flashcards")
          .select("id", { count: "exact", head: true })
          .eq("creator_image_id", imageId),
        supabase
          .from("cards")
          .select("id", { count: "exact", head: true })
          .eq("creator_image_id", imageId),
      ]);
    if (libraryError) throw libraryError;
    if (lessonError) throw lessonError;

    if ((libraryCardCount ?? 0) > 0 || (lessonCardCount ?? 0) > 0) {
      throw new CreatorApiError(
        "Delete cards and lesson references that use this image before deleting it.",
        409
      );
    }

    const deletedAt = new Date().toISOString();
    const { error: markError } = await supabase
      .from("creator_images")
      .update({ deleted_at: deletedAt })
      .eq("id", imageId)
      .eq("user_id", user.id);
    if (markError) throw markError;

    const { error: storageError } = await supabase.storage
      .from(CREATOR_IMAGE_BUCKET)
      .remove([image.storage_path]);
    if (storageError) {
      await supabase
        .from("creator_images")
        .update({ deleted_at: null })
        .eq("id", imageId)
        .eq("user_id", user.id);
      throw storageError;
    }

    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return creatorErrorResponse(error);
  }
}

