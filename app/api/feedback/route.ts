import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const categories = new Set([
  "bug",
  "feature",
  "content",
  "billing",
  "account",
  "other",
]);

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === request.nextUrl.origin);
}

export async function POST(request: NextRequest) {
  try {
    if (!sameOrigin(request)) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Sign in before sending feedback." },
        { status: 401 },
      );
    }

    const body = await request.json() as {
      category?: unknown;
      message?: unknown;
    };
    const category =
      typeof body.category === "string"
        ? body.category.trim().toLowerCase()
        : "";
    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    if (!categories.has(category)) {
      return NextResponse.json(
        { error: "Select a valid feedback category." },
        { status: 400 },
      );
    }

    if (message.length < 10 || message.length > 4000) {
      return NextResponse.json(
        { error: "Feedback must be between 10 and 4000 characters." },
        { status: 400 },
      );
    }

    const { data: feedbackId, error } = await supabase.rpc(
      "submit_user_feedback",
      {
        feedback_category: category,
        feedback_message: message,
      },
    );

    if (error) {
      const rateLimited = error.message
        .toLowerCase()
        .includes("submission limit");
      return NextResponse.json(
        {
          error: rateLimited
            ? "You have sent several items recently. Please try again in an hour."
            : "Your feedback could not be sent.",
        },
        { status: rateLimited ? 429 : 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        id: feedbackId,
        message: "Thank you. Your feedback has been sent to Classendo.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Feedback submission failed:", error);
    return NextResponse.json(
      { error: "Your feedback could not be sent." },
      { status: 500 },
    );
  }
}
