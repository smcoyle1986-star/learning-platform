import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
const privateJson = (body: unknown) => NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
export async function GET(request: NextRequest, { params }: { params: Promise<{ worksheetId: string }> }) {
  try {
    const user = await getRequestUser(request);
    if (!user?.id) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    const { worksheetId } = await params;
    const { data, error } = await getSupabaseAdmin().from("worksheets").select("*").eq("id", worksheetId).eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Worksheet not found." }, { status: 404 });
    return privateJson(data);
  } catch (error) {
    console.error("Dashboard worksheet detail failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load worksheet." }, { status: 500 });
  }
}
