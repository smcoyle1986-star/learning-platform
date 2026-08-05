import { NextRequest, NextResponse } from "next/server";

import { AdminAuthorizationError, requireAdmin } from "@/lib/admin/auth";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

class CreateSetError extends Error {
  constructor(public readonly status: 400 | 403, message: string) {
    super(message);
  }
}

function verifySameOrigin(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    throw new CreateSetError(403, "Invalid request origin.");
  }
}

function cleanTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  const tags = [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
  if (tags.length > 10 || tags.some((tag) => tag.length > 30)) {
    throw new CreateSetError(400, "Use up to 10 tags, with 30 characters per tag.");
  }
  return tags;
}

function cleanCards(value: unknown) {
  if (!Array.isArray(value) || value.length < 2 || value.length > 50) {
    throw new CreateSetError(400, "Quick sets need between 2 and 50 cards.");
  }

  return value.map((raw, position) => {
    const item = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const front = typeof item.front === "string" ? item.front.trim() : "";
    const back = typeof item.back === "string" ? item.back.trim() : "";
    if (!front || front.length > 200 || back.length > 2000) {
      throw new CreateSetError(
        400,
        `Card ${position + 1} needs a prompt under 200 characters and an image reference under 2,000 characters.`,
      );
    }
    return { front, back: back || null, position };
  });
}

export async function POST(request: NextRequest) {
  let lessonSetId: string | null = null;
  try {
    verifySameOrigin(request);
    const administrator = await requireAdmin();
    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 3 || name.length > 120) {
      throw new CreateSetError(400, "Set titles must contain 3 to 120 characters.");
    }

    const tags = cleanTags(body.tags);
    const cards = cleanCards(body.cards);
    const featured = body.featured === true;
    const now = new Date().toISOString();
    const supabase = getSupabaseAdmin();
    const { data: set, error: setError } = await supabase
      .from("lesson_sets")
      .insert({
        name,
        user_id: administrator.userId,
        tags,
        is_public: true,
        is_featured: featured,
        featured_at: featured ? now : null,
        featured_by: featured ? administrator.userId : null,
        last_used: now,
      })
      .select("id")
      .single();
    if (setError || !set) throw setError ?? new Error("Set creation failed.");
    lessonSetId = String(set.id);

    const { error: cardsError } = await supabase.from("cards").insert(
      cards.map((card) => ({ ...card, lesson_set_id: lessonSetId })),
    );
    if (cardsError) throw cardsError;

    await writeAdminAuditLog({
      actorUserId: administrator.userId,
      action: "admin.community_set_created",
      targetType: "lesson_set",
      targetId: lessonSetId,
      afterState: {
        name,
        is_public: true,
        is_featured: featured,
        card_count: cards.length,
        tag_count: tags.length,
      },
    });

    return NextResponse.json({
      ok: true,
      id: lessonSetId,
      message: "Quick-use Community set published.",
    });
  } catch (error) {
    if (lessonSetId) {
      await getSupabaseAdmin().from("lesson_sets").delete().eq("id", lessonSetId);
    }
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json({ error: "You are not authorized to create Community sets.", code: error.code }, { status: error.status });
    }
    if (error instanceof CreateSetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Administrator Community set creation failed:", error);
    return NextResponse.json({ error: "The Community set could not be created." }, { status: 500 });
  }
}
