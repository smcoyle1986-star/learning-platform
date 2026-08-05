import "server-only";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const ADMIN_COMMUNITY_PAGE_SIZE = 20;

type JsonRecord = Record<string, unknown>;

export type AdminCommunitySummary = {
  publicSets: number;
  featuredSets: number;
  hiddenSets: number;
  deletedSets: number;
  pendingReports: number;
  creatorImages: number;
};

export type AdminCommunitySet = {
  id: string;
  name: string;
  userId: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  tags: string[];
  isPublic: boolean;
  isFeatured: boolean;
  featuredAt: string | null;
  hiddenAt: string | null;
  deletedAt: string | null;
  moderationNote: string | null;
  cardCount: number;
  reportCount: number;
  pendingReportCount: number;
  downloadCount: number;
  createdAt: string;
};

export type AdminCommunityReport = {
  id: string;
  lessonSetId: string;
  lessonSetName: string;
  lessonSetOwnerId: string;
  ownerEmail: string | null;
  reporterUserId: string | null;
  reporterEmail: string | null;
  reason: string;
  status: "pending" | "resolved" | "dismissed";
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export type AdminCreatorImage = {
  id: string;
  userId: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  status: "uploading" | "ready" | "rejected";
  moderationNote: string | null;
  moderatedAt: string | null;
  deletedAt: string | null;
  creatorCardCount: number;
  lessonCardCount: number;
  createdAt: string;
  imageUrl: string | null;
};

export type AdminCommunitySetDetail = AdminCommunitySet & {
  cards: Array<{
    id: string;
    front: string;
    back: string | null;
    position: number | null;
  }>;
  reports: AdminCommunityReport[];
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function array(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableText(value: unknown) {
  return typeof value === "string" ? value : null;
}

function count(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function nullableNumber(value: unknown) {
  const parsed = Number(value);
  return value === null || value === undefined || !Number.isFinite(parsed)
    ? null
    : parsed;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeSet(value: unknown): AdminCommunitySet {
  const item = record(value);
  return {
    id: text(item.id),
    name: text(item.name, "Untitled set"),
    userId: text(item.user_id),
    email: nullableText(item.email),
    username: nullableText(item.username),
    displayName: nullableText(item.display_name),
    tags: stringArray(item.tags),
    isPublic: item.is_public === true,
    isFeatured: item.is_featured === true,
    featuredAt: nullableText(item.featured_at),
    hiddenAt: nullableText(item.hidden_at),
    deletedAt: nullableText(item.deleted_at),
    moderationNote: nullableText(item.moderation_note),
    cardCount: count(item.card_count),
    reportCount: count(item.report_count),
    pendingReportCount: count(item.pending_report_count),
    downloadCount: count(item.download_count),
    createdAt: text(item.created_at),
  };
}

function reportStatus(value: unknown): AdminCommunityReport["status"] {
  return value === "resolved" || value === "dismissed" ? value : "pending";
}

function normalizeReport(value: unknown): AdminCommunityReport {
  const item = record(value);
  return {
    id: text(item.id),
    lessonSetId: text(item.lesson_set_id),
    lessonSetName: text(item.lesson_set_name, "Deleted set"),
    lessonSetOwnerId: text(item.lesson_set_owner_id),
    ownerEmail: nullableText(item.owner_email),
    reporterUserId: nullableText(item.reporter_user_id),
    reporterEmail: nullableText(item.reporter_email),
    reason: text(item.reason),
    status: reportStatus(item.status),
    resolutionNote: nullableText(item.resolution_note),
    resolvedAt: nullableText(item.resolved_at),
    createdAt: text(item.created_at),
  };
}

function imageStatus(value: unknown): AdminCreatorImage["status"] {
  return value === "uploading" || value === "rejected" ? value : "ready";
}

function normalizeImage(value: unknown): Omit<AdminCreatorImage, "imageUrl"> {
  const item = record(value);
  return {
    id: text(item.id),
    userId: text(item.user_id),
    email: nullableText(item.email),
    username: nullableText(item.username),
    displayName: nullableText(item.display_name),
    storagePath: text(item.storage_path),
    originalFilename: text(item.original_filename, "creator-image.webp"),
    mimeType: text(item.mime_type),
    sizeBytes: count(item.size_bytes),
    width: nullableNumber(item.width),
    height: nullableNumber(item.height),
    status: imageStatus(item.status),
    moderationNote: nullableText(item.moderation_note),
    moderatedAt: nullableText(item.moderated_at),
    deletedAt: nullableText(item.deleted_at),
    creatorCardCount: count(item.creator_card_count),
    lessonCardCount: count(item.lesson_card_count),
    createdAt: text(item.created_at),
  };
}

export async function getAdminCommunitySummary(): Promise<AdminCommunitySummary> {
  const { data, error } = await getSupabaseAdmin().rpc(
    "get_admin_community_summary",
  );
  if (error) throw new Error(`Could not load moderation summary: ${error.message}`);
  const item = record(data);
  return {
    publicSets: count(item.public_sets),
    featuredSets: count(item.featured_sets),
    hiddenSets: count(item.hidden_sets),
    deletedSets: count(item.deleted_sets),
    pendingReports: count(item.pending_reports),
    creatorImages: count(item.creator_images),
  };
}

export async function getAdminCommunitySets(params: {
  query?: string;
  status?: string;
  page?: number;
}) {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const offset = (page - 1) * ADMIN_COMMUNITY_PAGE_SIZE;
  const { data, error } = await getSupabaseAdmin().rpc(
    "get_admin_community_sets",
    {
      search_query: params.query?.trim() ?? "",
      status_filter: params.status ?? "all",
      page_size: ADMIN_COMMUNITY_PAGE_SIZE,
      page_offset: offset,
    },
  );
  if (error) throw new Error(`Could not load community sets: ${error.message}`);
  const root = record(data);
  return {
    sets: array(root.sets).map(normalizeSet),
    total: count(root.total),
    page,
  };
}

export async function getAdminCommunityReports(params: {
  status?: string;
  page?: number;
}) {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const offset = (page - 1) * ADMIN_COMMUNITY_PAGE_SIZE;
  const { data, error } = await getSupabaseAdmin().rpc(
    "get_admin_community_reports",
    {
      status_filter: params.status ?? "pending",
      page_size: ADMIN_COMMUNITY_PAGE_SIZE,
      page_offset: offset,
    },
  );
  if (error) throw new Error(`Could not load community reports: ${error.message}`);
  const root = record(data);
  return {
    reports: array(root.reports).map(normalizeReport),
    total: count(root.total),
    page,
  };
}

export async function getAdminCreatorImages(params: {
  status?: string;
  page?: number;
}) {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const offset = (page - 1) * ADMIN_COMMUNITY_PAGE_SIZE;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc(
    "get_admin_creator_images",
    {
      status_filter: params.status ?? "all",
      page_size: ADMIN_COMMUNITY_PAGE_SIZE,
      page_offset: offset,
    },
  );
  if (error) throw new Error(`Could not load Creator images: ${error.message}`);
  const root = record(data);
  const images = array(root.images).map(normalizeImage);
  const enriched = await Promise.all(
    images.map(async (image) => {
      if (!image.storagePath || image.deletedAt) {
        return { ...image, imageUrl: null };
      }
      const { data: signed, error: signedError } = await supabase.storage
        .from("creator-images")
        .createSignedUrl(image.storagePath, 10 * 60);
      return {
        ...image,
        imageUrl: signedError ? null : signed?.signedUrl ?? null,
      };
    }),
  );
  return {
    images: enriched,
    total: count(root.total),
    page,
  };
}

export async function getAdminCommunitySetDetail(
  setId: string,
): Promise<AdminCommunitySetDetail | null> {
  const supabase = getSupabaseAdmin();
  const { data: setRow, error: setError } = await supabase
    .from("lesson_sets")
    .select(
      "id,name,user_id,tags,is_public,is_featured,featured_at,hidden_at,deleted_at,moderation_note,download_count,created_at",
    )
    .eq("id", setId)
    .maybeSingle();
  if (setError) throw setError;
  if (!setRow) return null;

  const [{ data: cards, error: cardsError }, { data: reports, error: reportsError }, userResult, profileResult] =
    await Promise.all([
      supabase
        .from("cards")
        .select("id,front,back,position")
        .eq("lesson_set_id", setId)
        .order("position", { ascending: true }),
      supabase
        .from("community_reports")
        .select("id,lesson_set_id,reporter_user_id,reason,status,resolution_note,resolved_at,created_at")
        .eq("lesson_set_id", setId)
        .order("created_at", { ascending: false }),
      supabase.auth.admin.getUserById(String(setRow.user_id)),
      supabase
        .from("profiles")
        .select("username,display_name")
        .eq("id", setRow.user_id)
        .maybeSingle(),
    ]);
  if (cardsError) throw cardsError;
  if (reportsError) throw reportsError;
  if (profileResult.error) throw profileResult.error;

  const normalized = normalizeSet({
    ...setRow,
    email: userResult.data.user?.email ?? null,
    username: profileResult.data?.username ?? null,
    display_name: profileResult.data?.display_name ?? null,
    card_count: cards?.length ?? 0,
    report_count: reports?.length ?? 0,
    pending_report_count: reports?.filter((item) => item.status === "pending").length ?? 0,
  });

  return {
    ...normalized,
    cards: (cards ?? []).map((item) => ({
      id: String(item.id),
      front: String(item.front ?? ""),
      back: item.back ? String(item.back) : null,
      position: nullableNumber(item.position),
    })),
    reports: (reports ?? []).map((item) => normalizeReport({
      ...item,
      lesson_set_name: setRow.name,
      lesson_set_owner_id: setRow.user_id,
      owner_email: userResult.data.user?.email ?? null,
    })),
  };
}
