import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.REPLICATE_API_TOKEN?.trim();
  return NextResponse.json({
    ok: true,
    has_replicate_token: !!token,
    replicate_token_prefix: token ? `${token.slice(0,8)}...` : null,
    has_supabase_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
