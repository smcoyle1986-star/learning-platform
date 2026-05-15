import { NextRequest, NextResponse } from "next/server";

import { createPrintablePdfBuffer } from "@/lib/printables/pdf";
import { PrintableBuildOptions } from "@/lib/printables/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PrintableBuildOptions;
    if (!Array.isArray(body.pages) || body.pages.length === 0) {
      return NextResponse.json({ error: "No printable cards found." }, { status: 400 });
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
  } catch (error: any) {
    console.error("Failed to export printables PDF:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to export printables PDF." },
      { status: 500 }
    );
  }
}

