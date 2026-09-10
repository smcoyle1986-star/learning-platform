import { NextRequest, NextResponse } from "next/server";
import { sendClassendoVerificationEmail } from "@/lib/auth/email-verification";
import { getClassendoVerification } from "@/lib/auth/server-verification";
import { getRequestUser } from "@/lib/server/request-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user?.id || !user.email) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    if ((await getClassendoVerification(user.id)).verified) return NextResponse.json({ verified: true });
    const body = await request.json().catch(() => null);
    await sendClassendoVerificationEmail({ userId: user.id, email: user.email, request, action: "resend", nextPath: typeof body?.nextPath === "string" ? body.nextPath : undefined });
    return NextResponse.json({ sent: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not send verification email." }, { status: 400 });
  }
}
