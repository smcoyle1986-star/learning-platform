import { NextRequest, NextResponse } from "next/server";
import { getClassendoVerification } from "@/lib/auth/server-verification";
import { getRequestUser } from "@/lib/server/request-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user?.id) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  const verification = await getClassendoVerification(user.id);
  return NextResponse.json(verification);
}
