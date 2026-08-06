import { NextRequest, NextResponse } from "next/server";

import { canUsePrintableOptions, getBillingAccessForUser } from "@/lib/billing/access";
import { createPrintablePdfBuffer } from "@/lib/printables/pdf";
import { PrintableBuildOptions } from "@/lib/printables/types";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 2 * 1024 * 1024;
const MAX_CARDS = 100;

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }

    const body = (await request.json()) as PrintableBuildOptions;
    if (!Array.isArray(body.pages) || body.pages.length === 0) {
      return NextResponse.json({ error: "No printable cards found." }, { status: 400 });
    }
    const cardCount = body.pages.reduce(
      (total, page) => total + (Array.isArray(page) ? page.length : 0),
      0,
    );
    if (cardCount === 0 || cardCount > MAX_CARDS || body.pages.some((page) => !Array.isArray(page))) {
      return NextResponse.json({ error: "Printables must contain between 1 and 100 cards." }, { status: 400 });
    }

    const user = await getRequestUser(request);
    const access = user?.id
      ? await getBillingAccessForUser(getSupabaseAdmin(), user.id)
      : null;
    if (!access || !canUsePrintableOptions(access)) {
      const usesAdvancedOptions =
        body.contentOption !== "picture+word"
        || body.inkSaving !== false
        || body.pages.some((page) => page.length !== 1);
      if (usesAdvancedOptions) {
        return NextResponse.json(
          { error: "Advanced printable layouts require Premium." },
          { status: 403 },
        );
      }
    }

    const pdf = await createPrintablePdfBuffer(body);
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="classendo-printables.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("Failed to export printables PDF:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export printables PDF." },
      { status: 500 }
    );
  }
}
