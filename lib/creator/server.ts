import type { NextRequest } from "next/server";

import { getBillingAccessForUser } from "@/lib/billing/access";
import {
  CREATOR_IMAGE_BUCKET,
  CREATOR_IMAGE_URL_TTL_SECONDS,
  CREATOR_MAX_IMAGES_PER_ACCOUNT,
  CREATOR_MAX_STORAGE_BYTES_PER_ACCOUNT,
} from "@/lib/creator/constants";
import type {
  CreatorFlashcardDto,
  CreatorFlashcardRecord,
  CreatorImageDto,
  CreatorImageRecord,
} from "@/lib/creator/types";
import { CREATOR_CARD_TYPES, type CreatorCardType } from "@/lib/creator/types";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { requireVerifiedClassendoEmail } from "@/lib/auth/server-verification";

export class CreatorApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "CreatorApiError";
  }
}

export async function getOptionalCreatorUser(request: NextRequest | Request) {
  try {
    return await getRequestUser(request);
  } catch {
    throw new CreatorApiError("Your session is invalid or has expired.", 401);
  }
}

export async function requireCreatorUser(request: NextRequest | Request) {
  const user = await getOptionalCreatorUser(request);
  if (!user?.id) {
    throw new CreatorApiError("You must be signed in to use Creator.", 401);
  }
  return user;
}

export async function requirePremiumCreator(request: NextRequest | Request) {
  const user = await requireCreatorUser(request);
  try {
    await requireVerifiedClassendoEmail(user.id);
  } catch {
    throw new CreatorApiError("Verify your email before uploading Creator content.", 403);
  }
  const access = await getBillingAccessForUser(getSupabaseAdmin(), user.id);
  if (!access.isPremium) {
    throw new CreatorApiError("Creator is available to Premium accounts.", 403);
  }
  return user;
}

export function creatorErrorResponse(error: unknown) {
  if (error instanceof CreatorApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  if (
    error instanceof Error &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 500
  ) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error("Creator API error:", error);
  return Response.json({ error: "Creator request failed." }, { status: 500 });
}

export async function createCreatorImageSignedUrl(storagePath: string) {
  const { data, error } = await getSupabaseAdmin()
    .storage
    .from(CREATOR_IMAGE_BUCKET)
    .createSignedUrl(storagePath, CREATOR_IMAGE_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw error ?? new Error("Failed to create a creator image URL.");
  }
  return data.signedUrl;
}

export async function toCreatorImageDto(
  record: CreatorImageRecord,
  options?: { includeOriginalFilename?: boolean }
): Promise<CreatorImageDto> {
  return {
    id: record.id,
    originalFilename: options?.includeOriginalFilename === false
      ? "creator-image.webp"
      : record.original_filename,
    mimeType: record.mime_type,
    sizeBytes: Number(record.size_bytes),
    width: record.width,
    height: record.height,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    imageUrl: await createCreatorImageSignedUrl(record.storage_path),
  };
}

export async function assertCreatorUploadCapacity(userId: string, nextSizeBytes: number) {
  const { data, error, count } = await getSupabaseAdmin()
    .from("creator_images")
    .select("size_bytes", { count: "exact" })
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error) throw error;
  if ((count ?? 0) >= CREATOR_MAX_IMAGES_PER_ACCOUNT) {
    throw new CreatorApiError(
      `Creator supports up to ${CREATOR_MAX_IMAGES_PER_ACCOUNT} saved images per account.`,
      409
    );
  }

  const usedBytes = (data ?? []).reduce(
    (total, row) => total + Number(row.size_bytes ?? 0),
    0
  );
  if (usedBytes + nextSizeBytes > CREATOR_MAX_STORAGE_BYTES_PER_ACCOUNT) {
    throw new CreatorApiError("This upload would exceed the Creator storage allowance.", 409);
  }
}

export async function toCreatorFlashcardDto(
  card: CreatorFlashcardRecord,
  image: CreatorImageRecord
): Promise<CreatorFlashcardDto> {
  return {
    id: card.id,
    creatorImageId: card.creator_image_id,
    front: card.front,
    cardType: card.card_type,
    createdAt: card.created_at,
    updatedAt: card.updated_at,
    image: await toCreatorImageDto(image),
  };
}

export async function getCreatorImageRecord(imageId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("creator_images")
    .select("*")
    .eq("id", imageId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return (data as CreatorImageRecord | null) ?? null;
}

export async function canUserAccessCreatorImage(imageId: string, userId?: string | null) {
  const image = await getCreatorImageRecord(imageId);
  if (!image || image.status !== "ready") return false;
  if (userId && image.user_id === userId) return true;

  const { data: cardReferences, error: cardsError } = await getSupabaseAdmin()
    .from("cards")
    .select("lesson_set_id")
    .eq("creator_image_id", imageId);
  if (cardsError) throw cardsError;

  const lessonIds = Array.from(
    new Set((cardReferences ?? []).map((row) => String(row.lesson_set_id)).filter(Boolean))
  );
  if (lessonIds.length === 0) return false;

  const { data: lessons, error: lessonsError } = await getSupabaseAdmin()
    .from("lesson_sets")
    .select("id,user_id,is_public")
    .in("id", lessonIds);
  if (lessonsError) throw lessonsError;

  return (lessons ?? []).some(
    (lesson) => Boolean(lesson.is_public) || Boolean(userId && lesson.user_id === userId)
  );
}

export async function assertUserCanAccessCreatorImages(
  imageIds: string[],
  userId: string
) {
  const uniqueIds = Array.from(new Set(imageIds.filter(Boolean)));
  const results = await Promise.all(
    uniqueIds.map(async (imageId) => ({
      imageId,
      allowed: await canUserAccessCreatorImage(imageId, userId),
    }))
  );
  const denied = results.find((result) => !result.allowed);
  if (denied) {
    throw new CreatorApiError("One or more creator images are unavailable to this account.", 403);
  }
}

export function normalizeCreatorFront(value: unknown) {
  const front = String(value ?? "").trim();
  if (!front) throw new CreatorApiError("Card text is required.", 400);
  if (front.length > 200) throw new CreatorApiError("Card text must be 200 characters or fewer.", 400);
  return front;
}

export function normalizeCreatorCardType(value: unknown) {
  const cardType = String(value ?? "").trim();
  if (!CREATOR_CARD_TYPES.includes(cardType as CreatorCardType)) {
    throw new CreatorApiError("Choose noun, verb, adjective, preposition, or phonics.", 400);
  }
  return cardType as CreatorCardType;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
