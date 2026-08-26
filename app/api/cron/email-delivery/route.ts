import { NextResponse } from "next/server";

import { getEmailDeliveryHealth } from "@/lib/admin/email-delivery";
import { getOptionalEnv } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = getOptionalEnv("CRON_SECRET");
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const health = await getEmailDeliveryHealth();
  return NextResponse.json(health, { status: health.status === "unavailable" ? 503 : 200 });
}
