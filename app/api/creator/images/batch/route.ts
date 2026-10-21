import { NextRequest } from "next/server";
import {
  canUserAccessCreatorImage,
  creatorErrorResponse,
  CreatorApiError,
  getOptionalCreatorUser,
  isUuid,
  toCreatorImageDto,
} from "@/lib/creator/server";
import type { CreatorImageRecord } from "@/lib/creator/types";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getOptionalCreatorUser(request);
    if (!user?.id) throw new CreatorApiError("You must be signed in to load creator images.", 401);
    const body = await request.json().catch(() => null);
    const ids: string[] = Array.isArray(body?.ids)
      ? Array.from(new Set((body.ids as unknown[]).filter((id): id is string => typeof id === "string" && isUuid(id)))).slice(0, 300)
      : [];
    if (!ids.length) return Response.json({ images: {} });

    const { data, error } = await getSupabaseAdmin()
      .from("creator_images")
      .select("*")
      .in("id", ids)
      .is("deleted_at", null)
      .eq("status", "ready");
    if (error) throw error;
    const records = (data ?? []) as CreatorImageRecord[];
    const images = await Promise.all(records.map(async (image) => {
      const owned = image.user_id === user.id;
      if (!owned && !(await canUserAccessCreatorImage(image.id, user.id))) return null;
      return [image.id, await toCreatorImageDto(image, { includeOriginalFilename: owned })] as const;
    }));
    return Response.json({ images: Object.fromEntries(images.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))) });
  } catch (error) {
    return creatorErrorResponse(error);
  }
}
