import { NextRequest, NextResponse } from "next/server";

import {
  linkAnalyticsSessionToAccount,
  linkAnalyticsAnonymousIdToAccount,
  observeAnalyticsSession,
  observedCountry,
  recordAnalyticsLifecycleEvent,
  validAnalyticsSessionKey,
} from "@/lib/analytics/server";
import { getRequestUser } from "@/lib/server/request-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
    const user = await getRequestUser(request);
    const body = await request.json() as { sessionKey?: unknown; anonymousId?: unknown; reason?: unknown };
    const sessionKey = validAnalyticsSessionKey(body.sessionKey);
    const reason = body.reason === "signup" ? "signup" : body.reason === "sign_in" ? "sign_in" : null;
    if (!user?.id || !sessionKey || !reason) {
      return NextResponse.json({ error: "Invalid analytics session." }, { status: 400 });
    }

    await linkAnalyticsAnonymousIdToAccount({ userId: user.id, anonymousId: body.anonymousId, reason });
    await linkAnalyticsSessionToAccount({ userId: user.id, sessionKey, anonymousId: body.anonymousId, reason });
    await observeAnalyticsSession({ sessionKey, userId: user.id, country: observedCountry(request) });
    await recordAnalyticsLifecycleEvent({
      userId: user.id,
      eventType: "authenticated_session_started",
      eventKey: `authenticated-session:${user.id}:${sessionKey}`,
      sessionKey,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Authenticated analytics session failed:", error);
    return NextResponse.json({ error: "Analytics session could not be recorded." }, { status: 500 });
  }
}
