import "server-only";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const ADMIN_CONTENT_PAGE_SIZE = 25;

type JsonRecord = Record<string, unknown>;

export type AdminContentCategory =
  | "noun"
  | "verb"
  | "adjective"
  | "preposition"
  | "phonics";

export type AdminContentCategorySummary = {
  total: number;
  missingImages: number;
  missingAudio: number;
  worksheetSupported: number;
};

export type AdminContentSummary = {
  totalEntries: number;
  missingImages: number;
  missingAudio: number;
  worksheetSupported: number;
  worksheetUnsupported: number;
  duplicateGroups: number;
  duplicateEntries: number;
  categories: Partial<Record<AdminContentCategory, AdminContentCategorySummary>>;
  themes: string[];
};

export type AdminContentEntry = {
  id: string;
  lemma: string;
  category: AdminContentCategory;
  themes: string[];
  imagePath: string | null;
  audioPath: string | null;
  worksheetSupported: boolean;
  duplicateCount: number;
  metadata: JsonRecord;
  createdAt: string | null;
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function count(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function category(value: unknown): AdminContentCategory {
  if (
    value === "verb"
    || value === "adjective"
    || value === "preposition"
    || value === "phonics"
  ) return value;
  return "noun";
}

function normalizeCategorySummary(value: unknown): AdminContentCategorySummary {
  const item = record(value);
  return {
    total: count(item.total),
    missingImages: count(item.missing_images),
    missingAudio: count(item.missing_audio),
    worksheetSupported: count(item.worksheet_supported),
  };
}

function normalizeEntry(value: unknown): AdminContentEntry {
  const item = record(value);
  return {
    id: text(item.id),
    lemma: text(item.lemma, "Untitled entry"),
    category: category(item.category),
    themes: Array.isArray(item.themes)
      ? item.themes.filter((theme): theme is string => typeof theme === "string")
      : [],
    imagePath: nullableText(item.image_path),
    audioPath: nullableText(item.audio_path),
    worksheetSupported: item.worksheet_supported === true,
    duplicateCount: count(item.duplicate_count),
    metadata: record(item.metadata),
    createdAt: nullableText(item.created_at),
  };
}

export async function getAdminContentSummary(): Promise<AdminContentSummary> {
  const { data, error } = await getSupabaseAdmin().rpc(
    "get_admin_content_summary",
  );
  if (error) throw new Error(`Could not load content summary: ${error.message}`);
  const root = record(data);
  const rawCategories = record(root.categories);
  const categories: AdminContentSummary["categories"] = {};
  for (const name of ["noun", "verb", "adjective", "preposition", "phonics"] as const) {
    if (rawCategories[name]) {
      categories[name] = normalizeCategorySummary(rawCategories[name]);
    }
  }

  return {
    totalEntries: count(root.total_entries),
    missingImages: count(root.missing_images),
    missingAudio: count(root.missing_audio),
    worksheetSupported: count(root.worksheet_supported),
    worksheetUnsupported: count(root.worksheet_unsupported),
    duplicateGroups: count(root.duplicate_groups),
    duplicateEntries: count(root.duplicate_entries),
    categories,
    themes: Array.isArray(root.themes)
      ? root.themes.filter((theme): theme is string => typeof theme === "string")
      : [],
  };
}

export async function getAdminContentEntries(params: {
  query?: string;
  category?: string;
  theme?: string;
  report?: string;
  page?: number;
}) {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const offset = (page - 1) * ADMIN_CONTENT_PAGE_SIZE;
  const { data, error } = await getSupabaseAdmin().rpc(
    "get_admin_content_entries",
    {
      search_query: params.query?.trim() ?? "",
      category_filter: params.category ?? "all",
      theme_filter: params.theme ?? "all",
      report_filter: params.report ?? "all",
      page_size: ADMIN_CONTENT_PAGE_SIZE,
      page_offset: offset,
    },
  );
  if (error) throw new Error(`Could not load vocabulary entries: ${error.message}`);
  const root = record(data);
  return {
    entries: Array.isArray(root.entries) ? root.entries.map(normalizeEntry) : [],
    total: count(root.total),
    page,
  };
}
