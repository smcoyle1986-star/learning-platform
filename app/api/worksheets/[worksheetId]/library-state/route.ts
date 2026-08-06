import { NextRequest, NextResponse } from "next/server";

import { normalizeWorksheet } from "@/lib/worksheets/repository";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ worksheetId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getRequestUser(request);
    if (!user?.id) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

    const { worksheetId } = await params;
    const body = (await request.json().catch(() => null)) as {
      isFavorite?: unknown;
      archived?: unknown;
    } | null;
    const updates: Record<string, boolean | string | null> = {};
    if (typeof body?.isFavorite === "boolean") updates.is_favorite = body.isFavorite;
    if (typeof body?.archived === "boolean") {
      updates.archived_at = body.archived ? new Date().toISOString() : null;
    }
    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: "No valid library change was provided." }, { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from("worksheets")
      .update(updates)
      .eq("id", worksheetId)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Worksheet not found." }, { status: 404 });
    return NextResponse.json(normalizeWorksheet(data));
  } catch (error: unknown) {
    console.error("Failed to update worksheet library state:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update this worksheet." },
      { status: 500 },
    );
  }
}
