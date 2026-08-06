import { NextRequest, NextResponse } from "next/server";

import { AdminAuthorizationError, requireAdmin } from "@/lib/admin/auth";
import { generateNounImageSet } from "@/lib/noun-images/pipeline";
import { NounGenerationInput } from "@/lib/noun-images/types";

export const runtime = "nodejs";

type RequestBody = {
  lemma?: string;
  countability?: NounGenerationInput["countability"];
  category?: string;
  overwriteExisting?: boolean;
  items?: NounGenerationInput[];
};

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
    await requireAdmin();

    const body = (await request.json()) as RequestBody;
    const items =
      body.items && body.items.length > 0
        ? body.items
        : body.lemma && body.countability
          ? [
              {
                lemma: body.lemma,
                countability: body.countability,
                category: body.category,
                overwriteExisting: body.overwriteExisting,
              },
            ]
          : [];

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Provide either { lemma, countability } or { items: [...] }." },
        { status: 400 }
      );
    }

    if (items.length > 5) {
      return NextResponse.json(
        {
          error:
            "This route is intended for small manual runs. Use the batch script or a worker for large jobs.",
        },
        { status: 400 }
      );
    }

    const results = [];
    for (const item of items) {
      results.push({
        lemma: item.lemma,
        images: await generateNounImageSet(item),
      });
    }

    return NextResponse.json({
      ok: true,
      results,
    });
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json({ error: "Administrator access is required." }, { status: error.status });
    }
    console.error("noun image generation failed", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown noun image generation error",
      },
      { status: 500 }
    );
  }
}
