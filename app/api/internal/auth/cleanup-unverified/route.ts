import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Retain the daily cron endpoint for operational compatibility, but do not
  // inspect or delete Auth users. Unverified accounts are valid Classendo accounts.
  return NextResponse.json({ deleted: 0, disabled: true, reason: "Automatic account deletion is disabled." });
}
