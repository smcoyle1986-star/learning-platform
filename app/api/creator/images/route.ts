import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import {
  CREATOR_IMAGE_BUCKET,
  CREATOR_MAX_UPLOAD_BYTES,
} from "@/lib/creator/constants";
import { processCreatorImage } from "@/lib/creator/image-processing";
import {
  assertCreatorUploadCapacity,
  creatorErrorResponse,
  requireCreatorUser,
  requirePremiumCreator,
  toCreatorImageDto,
} from "@/lib/creator/server";
import type { CreatorImageRecord } from "@/lib/creator/types";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeOriginalFilename(value: string) {
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (normalized || "upload").slice(0, 255);
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireCreatorUser(request);
    const { data, error } = await getSupabaseAdmin()
      .from("creator_images")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .eq("status", "ready")
      .order("created_at", { ascending: false });

    if (error) throw error;
    const images = await Promise.all(
      ((data ?? []) as CreatorImageRecord[]).map((record) => toCreatorImageDto(record))
    );
    return Response.json({ images });
  } catch (error: unknown) {
    return creatorErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePremiumCreator(request);
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > CREATOR_MAX_UPLOAD_BYTES + 1024 * 1024) {
      return Response.json({ error: "Images must be 10 MB or smaller." }, { status: 413 });
    }
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "Choose an image to upload." }, { status: 400 });
    }

    const processed = await processCreatorImage({
      buffer: Buffer.from(await file.arrayBuffer()),
      declaredMimeType: file.type,
    });
    await assertCreatorUploadCapacity(user.id, processed.buffer.byteLength);

    const imageId = randomUUID();
    const storagePath = `${user.id}/${imageId}/image.webp`;
    const supabase = getSupabaseAdmin();
    const { error: uploadError } = await supabase.storage
      .from(CREATOR_IMAGE_BUCKET)
      .upload(storagePath, processed.buffer, {
        contentType: processed.mimeType,
        cacheControl: "31536000",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data, error: insertError } = await supabase
      .from("creator_images")
      .insert({
        id: imageId,
        user_id: user.id,
        storage_path: storagePath,
        original_filename: safeOriginalFilename(file.name),
        mime_type: processed.mimeType,
        size_bytes: processed.buffer.byteLength,
        width: processed.width,
        height: processed.height,
        status: "ready",
      })
      .select("*")
      .single();

    if (insertError || !data) {
      await supabase.storage.from(CREATOR_IMAGE_BUCKET).remove([storagePath]);
      throw insertError ?? new Error("Failed to save the uploaded image.");
    }

    return Response.json(
      { image: await toCreatorImageDto(data as CreatorImageRecord) },
      { status: 201 }
    );
  } catch (error: unknown) {
    return creatorErrorResponse(error);
  }
}
