import "server-only";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const ADMIN_FEEDBACK_PAGE_SIZE = 25;

export type FeedbackStatus = "pending" | "read" | "resolved" | "deleted";
export type FeedbackCategory =
  | "bug"
  | "feature"
  | "content"
  | "billing"
  | "account"
  | "other";

export type AdminFeedbackListItem = {
  id: string;
  userId: string | null;
  email: string | null;
  username: string | null;
  displayName: string | null;
  category: FeedbackCategory;
  message: string;
  status: FeedbackStatus;
  hasAdminNote: boolean;
  readAt: string | null;
  resolvedAt: string | null;
  deletedAt: string | null;
  handledBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminFeedbackDetail = AdminFeedbackListItem & {
  adminNote: string | null;
  handlerEmail: string | null;
};

export type AdminFeedbackList = {
  feedback: AdminFeedbackListItem[];
  total: number;
  limit: number;
  offset: number;
  summary: {
    pending: number;
    read: number;
    resolved: number;
    deleted: number;
  };
};

type JsonRecord = Record<string, unknown>;

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

function status(value: unknown): FeedbackStatus {
  return value === "read" || value === "resolved" || value === "deleted"
    ? value
    : "pending";
}

function category(value: unknown): FeedbackCategory {
  return value === "bug"
    || value === "content"
    || value === "billing"
    || value === "account"
    || value === "other"
    ? value
    : "feature";
}

function normalizeListItem(value: unknown): AdminFeedbackListItem {
  const item = record(value);
  return {
    id: text(item.id),
    userId: nullableText(item.user_id),
    email: nullableText(item.email),
    username: nullableText(item.username),
    displayName: nullableText(item.display_name),
    category: category(item.category),
    message: text(item.message),
    status: status(item.status),
    hasAdminNote: item.has_admin_note === true,
    readAt: nullableText(item.read_at),
    resolvedAt: nullableText(item.resolved_at),
    deletedAt: nullableText(item.deleted_at),
    handledBy: nullableText(item.handled_by),
    createdAt: text(item.created_at),
    updatedAt: text(item.updated_at),
  };
}

export async function getAdminFeedback(params: {
  query?: string;
  status?: string;
  category?: string;
  page?: number;
}): Promise<AdminFeedbackList> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const offset = (page - 1) * ADMIN_FEEDBACK_PAGE_SIZE;
  const { data, error } = await getSupabaseAdmin().rpc(
    "get_admin_feedback",
    {
      search_query: params.query?.trim() ?? "",
      status_filter: params.status ?? "all",
      category_filter: params.category ?? "all",
      page_size: ADMIN_FEEDBACK_PAGE_SIZE,
      page_offset: offset,
    },
  );

  if (error) {
    throw new Error(`Could not load feedback: ${error.message}`);
  }

  const root = record(data);
  const summary = record(root.summary);

  return {
    feedback: array(root.feedback).map(normalizeListItem),
    total: count(root.total),
    limit: count(root.limit) || ADMIN_FEEDBACK_PAGE_SIZE,
    offset: count(root.offset),
    summary: {
      pending: count(summary.pending),
      read: count(summary.read),
      resolved: count(summary.resolved),
      deleted: count(summary.deleted),
    },
  };
}

export async function getAdminFeedbackDetail(
  feedbackId: string,
): Promise<AdminFeedbackDetail | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_feedback")
    .select(
      "id,user_id,category,message,status,admin_note,read_at,resolved_at,deleted_at,handled_by,created_at,updated_at",
    )
    .eq("id", feedbackId)
    .maybeSingle();

  if (error) throw new Error(`Could not load feedback: ${error.message}`);
  if (!data) return null;

  const [userResult, handlerResult, profileResult] = await Promise.all([
    data.user_id
      ? supabase.auth.admin.getUserById(data.user_id)
      : Promise.resolve({ data: { user: null }, error: null }),
    data.handled_by
      ? supabase.auth.admin.getUserById(data.handled_by)
      : Promise.resolve({ data: { user: null }, error: null }),
    data.user_id
      ? supabase
          .from("profiles")
          .select("username,display_name")
          .eq("id", data.user_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (profileResult.error) throw profileResult.error;

  return {
    id: String(data.id),
    userId: data.user_id ? String(data.user_id) : null,
    email: userResult.data.user?.email ?? null,
    username: profileResult.data?.username
      ? String(profileResult.data.username)
      : null,
    displayName: profileResult.data?.display_name
      ? String(profileResult.data.display_name)
      : null,
    category: category(data.category),
    message: String(data.message ?? ""),
    status: status(data.status),
    adminNote:
      typeof data.admin_note === "string" ? data.admin_note : null,
    hasAdminNote: Boolean(
      typeof data.admin_note === "string" && data.admin_note.trim(),
    ),
    readAt: data.read_at ? String(data.read_at) : null,
    resolvedAt: data.resolved_at ? String(data.resolved_at) : null,
    deletedAt: data.deleted_at ? String(data.deleted_at) : null,
    handledBy: data.handled_by ? String(data.handled_by) : null,
    handlerEmail: handlerResult.data.user?.email ?? null,
    createdAt: String(data.created_at),
    updatedAt: String(data.updated_at),
  };
}
