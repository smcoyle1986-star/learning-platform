/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getBillingAccessForUser } from "@/lib/billing/access";
import { normalizeLesson } from "@/lib/lessons/repository";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
const privateJson = (body: unknown) => NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
const fields = "id,name,created_at,last_used,is_public,use_count,basic_active,is_favorite,archived_at";
const allowedSizes = new Set([12, 24, 36]);
const sorts: Record<string, string> = { recent: "last_used", newest: "created_at", oldest: "created_at", name: "name", popular: "use_count", cards: "created_at" };
const filters = ["all", "favorites", "public", "private", "locked", "archive"] as const;
type Filter = typeof filters[number];
type LessonPageMetadata = {
  lesson_id: string;
  card_count: number | null;
  contains_premium_images: boolean;
  basic_conversion_available: boolean;
  basic_version_available: boolean;
  premium_images_need_conversion: boolean;
};
function applyFilter(query: any, filter: Filter) {
  if (filter === "archive") return query.not("archived_at", "is", null);
  if (filter !== "all") query = query.is("archived_at", null);
  if (filter === "favorites") return query.eq("is_favorite", true);
  if (filter === "public") return query.eq("is_public", true);
  if (filter === "private") return query.eq("is_public", false);
  if (filter === "locked") return query;
  return query;
}
function sortRows(rows: any[], sort: string) {
  const field = sorts[sort] ?? "last_used";
  return rows.sort((a, b) => {
    if (sort === "cards") return Number(b.cardCount ?? 0) - Number(a.cardCount ?? 0);
    if (field === "name") return String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" });
    if (sort === "oldest") return Date.parse(a.created_at ?? "") - Date.parse(b.created_at ?? "");
    const left = field === "created_at" ? Date.parse(a.created_at ?? "") : field === "use_count" ? Number(a.use_count ?? 0) : Date.parse(a.last_used ?? "") || 0;
    const right = field === "created_at" ? Date.parse(b.created_at ?? "") : field === "use_count" ? Number(b.use_count ?? 0) : Date.parse(b.last_used ?? "") || 0;
    return right - left;
  });
}

async function getOwnedSets(db: any, userId: string) {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from("lesson_sets").select(fields).eq("user_id", userId).range(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) return rows;
  }
}
async function getLockedLessonIds(db: any, userId: string) {
  const ids = new Set<string>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.rpc("dashboard_locked_lesson_ids", { p_user_id: userId }).range(offset, offset + 999);
    if (error) throw error;
    for (const row of data ?? []) ids.add(String(row.lesson_id ?? row));
    if ((data ?? []).length < 1000) return ids;
  }
}
async function getCardRows(db: any, ids: string[], columns: string) {
  const rows: any[] = [];
  for (let start = 0; start < ids.length; start += 300) {
    const batch = ids.slice(start, start + 300);
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db.from("cards").select(columns).in("lesson_set_id", batch).range(offset, offset + 999);
      if (error) throw error;
      rows.push(...(data ?? []));
      if ((data ?? []).length < 1000) break;
    }
  }
  return rows;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user?.id) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    const params = request.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
    const pageSize = allowedSizes.has(Number(params.get("pageSize"))) ? Number(params.get("pageSize")) : 12;
    const search = (params.get("search") ?? "").trim().toLocaleLowerCase();
    const filter = filters.includes(params.get("filter") as Filter) ? params.get("filter") as Filter : "all";
    const sort = params.get("sort") ?? "recent";
    const db = getSupabaseAdmin();
    const access = await getBillingAccessForUser(db, user.id);
    const lockedIds = !access.isPremium && filter === "locked" ? await getLockedLessonIds(db, user.id) : new Set<string>();
    const { data: countsData, error: countsError } = await db.rpc("dashboard_lesson_library_counts", {
      p_user_id: user.id,
      p_include_locked: !access.isPremium && filter !== "locked",
    });
    if (countsError) throw countsError;
    const counts = (countsData ?? {}) as Partial<Record<Filter, number>>;
    const lockedCount = filter === "locked" && !access.isPremium
      ? lockedIds.size
      : Number(counts.locked ?? 0);
    let rows: any[] = [];
    let total = 0;
    const indexedCardCounts = new Map<string, number>();
    let countByFilter: Record<Filter, number> = { all: 0, favorites: 0, public: 0, private: 0, locked: 0, archive: 0 };

    if (search) {
      // Search the account-owned lightweight index and card words on demand. Card content stays server-side.
      const owned = await getOwnedSets(db, user.id);
      const ids = owned.map((row: any) => String(row.id));
      const wordMatches = new Set<string>();
      const cards = await getCardRows(db, ids, "lesson_set_id,front");
      for (const card of cards) {
        const id = String(card.lesson_set_id);
        indexedCardCounts.set(id, (indexedCardCounts.get(id) ?? 0) + 1);
        if (String(card.front ?? "").toLocaleLowerCase().includes(search)) wordMatches.add(id);
      }
      const filtered = owned.filter((row: any) => {
        const archived = Boolean(row.archived_at);
        if (filter === "archive" ? !archived : archived) return false;
        if (filter === "favorites" && !row.is_favorite) return false;
        if (filter === "public" && !row.is_public) return false;
        if (filter === "private" && row.is_public) return false;
        if (filter === "locked" && !lockedIds.has(String(row.id))) return false;
        return String(row.name ?? "").toLocaleLowerCase().includes(search) || wordMatches.has(String(row.id));
      });
      for (const row of owned) {
        const active = !row.archived_at;
        if (active) {
          countByFilter.all++;
          if (row.is_favorite) countByFilter.favorites++;
          if (row.is_public) countByFilter.public++; else countByFilter.private++;

        } else countByFilter.archive++;
      }
      countByFilter.locked = lockedCount;
      rows = sortRows(filtered.map((row: any) => ({ ...row, cardCount: indexedCardCounts.get(String(row.id)) ?? 0 })), sort);
      total = rows.length;
      rows = rows.slice((page - 1) * pageSize, page * pageSize);
    } else {
      countByFilter = {
        all: Number(counts.all ?? 0),
        favorites: Number(counts.favorites ?? 0),
        public: Number(counts.public ?? 0),
        private: Number(counts.private ?? 0),
        locked: lockedCount,
        archive: Number(counts.archive ?? 0),
      };
      let query: any = db.from("lesson_sets").select(fields, { count: "exact" }).eq("user_id", user.id);
      query = applyFilter(query, filter);
      if (filter === "locked") query = query.in("id", Array.from(lockedIds.size ? lockedIds : ["00000000-0000-0000-0000-000000000000"]));
      if (sort === "cards") {
        const candidates = await getOwnedSets(db, user.id);
        const eligible = candidates.filter((row: any) => {
          if (filter === "archive" ? !row.archived_at : Boolean(row.archived_at)) return false;
          if (filter === "favorites" && !row.is_favorite) return false;
          if (filter === "public" && !row.is_public) return false;
          if (filter === "private" && row.is_public) return false;
          if (filter === "locked" && !lockedIds.has(String(row.id))) return false;
          return true;
        });
        const ids = eligible.map((row: any) => String(row.id));
        for (const card of await getCardRows(db, ids, "lesson_set_id")) {
          const id = String(card.lesson_set_id);
          indexedCardCounts.set(id, (indexedCardCounts.get(id) ?? 0) + 1);
        }
        rows = eligible.map((row: any) => ({ ...row, cardCount: indexedCardCounts.get(String(row.id)) ?? 0 }));
        rows.sort((a, b) => b.cardCount - a.cardCount);
        total = rows.length;
        rows = rows.slice((page - 1) * pageSize, page * pageSize);
      } else {
        const field = sorts[sort] ?? "last_used";
        query = query.order(field, { ascending: sort === "oldest", nullsFirst: false });
        const result = await query.range((page - 1) * pageSize, page * pageSize - 1);
        if (result.error) throw result.error;
        rows = result.data ?? [];
        total = result.count ?? 0;
      }
    }

    const ids = rows.map((row) => String(row.id));
    const metadataResult = ids.length
      ? await db.rpc("dashboard_lesson_page_metadata", {
          p_user_id: user.id,
          p_lesson_ids: ids,
          p_include_card_count: !search && sort !== "cards",
        })
      : { data: [] as LessonPageMetadata[], error: null };
    if (metadataResult.error) throw metadataResult.error;
    const metadataById = new Map<string, LessonPageMetadata>(
      ((metadataResult.data ?? []) as LessonPageMetadata[]).map((metadata) => [String(metadata.lesson_id), metadata]),
    );
    const items = rows.map((row) => {
      const metadata = metadataById.get(String(row.id));
      const containsPremiumImages = Boolean(metadata?.contains_premium_images);
      const premiumImagesNeedConversion = Boolean(metadata?.premium_images_need_conversion);
      const lockReasons: Array<"set_limit" | "premium_images"> = [];
      if (!access.isPremium && !Boolean(row.basic_active)) lockReasons.push("set_limit");
      if (!access.isPremium && premiumImagesNeedConversion) lockReasons.push("premium_images");
      const cardCount = search || sort === "cards"
        ? indexedCardCounts.get(String(row.id)) ?? 0
        : Number(metadata?.card_count ?? 0);
      return {
        ...normalizeLesson({
          ...row,
          cards: [],
          contains_premium_images: containsPremiumImages,
          basic_conversion_available: Boolean(metadata?.basic_conversion_available),
          basic_version_available: Boolean(metadata?.basic_version_available),
          is_locked: lockReasons.length > 0,
          lockReasons,
        }),
        cardCount,
      };
    });
    return privateJson({ items, total, counts: countByFilter, page, pageSize });
  } catch (error) {
    console.error("Dashboard lessons query failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load lessons." }, { status: 500 });
  }
}
