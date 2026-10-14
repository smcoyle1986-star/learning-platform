import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { normalizeWorksheet } from "@/lib/worksheets/repository";

export const runtime = "nodejs";
const privateJson = (body: unknown) => NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
const pageSizes = new Set([12, 24, 36]);
const filters = new Set(["all", "favorites", "public", "private", "archive"]);
const sorts = new Set(["recent", "newest", "oldest", "name", "popular", "cards"]);

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user?.id) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    const params = request.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
    const requestedSize = Number(params.get("pageSize"));
    const pageSize = pageSizes.has(requestedSize) ? requestedSize : 12;
    const search = (params.get("search") ?? "").trim();
    const requestedFilter = params.get("filter") ?? "all";
    const filter = filters.has(requestedFilter) ? requestedFilter : "all";
    const requestedSort = params.get("sort") ?? "recent";
    const sort = sorts.has(requestedSort) ? requestedSort : "recent";

    const { data, error } = await getSupabaseAdmin().rpc("dashboard_worksheets_page", {
      p_user_id: user.id,
      p_page: page,
      p_page_size: pageSize,
      p_search: search,
      p_filter: filter,
      p_sort: sort,
    });
    if (error) throw error;
    const result = data as { items?: unknown[]; total?: number; counts?: Record<string, number>; page?: number; pageSize?: number };
    const items = (result.items ?? []).map((item) => {
      const source = item as Record<string, unknown>;
      return { ...normalizeWorksheet({ ...source, cards: [], draft: {} }), cards: [], cardCount: Number(source.cardCount ?? 0) };
    });
    return privateJson({ ...result, items, page, pageSize });
  } catch (error) {
    console.error("Dashboard worksheets query failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load worksheets." }, { status: 500 });
  }
}
