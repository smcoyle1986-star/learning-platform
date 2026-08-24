"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useBillingAccess } from "@/lib/billing/useBillingAccess";
import type { CommunityToast } from "@/lib/community/types";
import type { CommunityContentType } from "@/lib/community/types";
import { hydrateCreatorLessonCards } from "@/lib/creator/client";
import { supabase } from "@/lib/supabase/client";
import { normalizeWorksheet } from "@/lib/worksheets/repository";
import type { SavedWorksheetRecord, WorksheetType } from "@/lib/worksheets/types";

type SortOrder = "popular" | "newest";

export function useCommunityWorksheets(active: boolean) {
  const { access } = useBillingAccess();
  const [query, setQuery] = useState("");
  const [worksheets, setWorksheets] = useState<SavedWorksheetRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [sort, setSort] = useState<SortOrder>("popular");
  const [worksheetType, setWorksheetType] = useState<WorksheetType | "all">("all");
  const [contentType, setContentType] = useState<CommunityContentType | "all">("all");
  const [previewWorksheet, setPreviewWorksheet] = useState<SavedWorksheetRecord | null>(null);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<CommunityToast>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const canCopyToDashboard = Boolean(access?.isPremium);

  const totalPages = useMemo(
    () => totalCount ? Math.max(1, Math.ceil(totalCount / pageSize)) : null,
    [pageSize, totalCount],
  );

  const fetchWorksheets = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? null;
      setCurrentUserId(userId);
      const from = (page - 1) * pageSize;
      const safeQuery = query.trim().replace(/[,%()]/g, " ");

      const buildVisibleQuery = (enhancedSchema: boolean) => {
        let builder = supabase.from("worksheets").select("*", { count: "exact" });
        if (enhancedSchema) builder = builder.is("archived_at", null);
        builder = userId ? builder.or(`is_public.eq.true,user_id.eq.${userId}`) : builder.eq("is_public", true);
        if (worksheetType !== "all") builder = builder.eq("worksheet_type", worksheetType);
        if (enhancedSchema && contentType !== "all") builder = builder.overlaps("content_types", [contentType]);
        if (safeQuery) builder = builder.ilike("name", `%${safeQuery}%`);
        if (enhancedSchema && sort === "popular") {
          return builder.order("download_count", { ascending: false }).order("created_at", { ascending: false });
        }
        return builder.order("created_at", { ascending: false });
      };

      let result = await buildVisibleQuery(true).range(from, from + pageSize - 1);
      if (result.error) {
        // Older Classendo databases do not yet have the worksheet library fields.
        // Falling back keeps an empty/pre-migration Community page usable; once the
        // migration is applied, the enhanced archive/popularity query is used.
        result = await buildVisibleQuery(false).range(from, from + pageSize - 1);
      }
      if (result.error) {
        throw new Error(result.error.message || "The worksheet library could not be loaded.");
      }
      const { data, count } = result;
      const fetched = await Promise.all((data ?? []).map(async (row) => {
        const worksheet = normalizeWorksheet(row);
        return { ...worksheet, cards: await hydrateCreatorLessonCards(worksheet.cards) };
      }));
      setWorksheets(fetched);
      setTotalCount(count ?? fetched.length);

      const userIds = [...new Set(fetched.map((worksheet) => worksheet.userId).filter(Boolean))];
      if (userIds.length) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id,display_name,username")
          .in("id", userIds);
        if (!profileError && profiles) {
          const next: Record<string, string> = {};
          profiles.forEach((profile) => {
            next[String(profile.id)] = String(profile.username || profile.display_name || profile.id);
          });
          setAuthors((current) => ({ ...current, ...next }));
        }
      }
    } catch (error) {
      console.error("Failed to load community worksheets:", error);
      setWorksheets([]);
      setTotalCount(null);
      setToast({ message: "Failed to load community worksheets." });
    } finally {
      setLoading(false);
    }
  }, [active, contentType, page, pageSize, query, sort, worksheetType]);

  useEffect(() => {
    if (!active) return;
    const timeout = window.setTimeout(() => void fetchWorksheets(), query.trim() ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [active, fetchWorksheets, query]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function addToDashboard(worksheet: SavedWorksheetRecord) {
    if (!canCopyToDashboard) {
      setToast({ message: "Upgrade to Premium to add Community worksheets to My Lessons." });
      return;
    }
    if (!currentUserId) {
      setToast({ message: "Please sign in again to use Community worksheets." });
      return;
    }
    const openDashboardWorksheet = (worksheetId: string, notice: "owned" | "already_saved") => {
      const params = new URLSearchParams({ worksheet_id: worksheetId, notice });
      window.location.assign(`/dashboard?${params.toString()}`);
    };
    if (worksheet.userId === currentUserId) {
      openDashboardWorksheet(worksheet.id, "owned");
      return;
    }

    try {
      setToast({ message: "Adding worksheet to My Lessons…" });
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/worksheets/${encodeURIComponent(worksheet.id)}/copy`, {
        method: "POST",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.worksheetId) {
        throw new Error(String(payload?.error ?? "Failed to copy worksheet."));
      }
      if (payload.outcome === "owned" || payload.outcome === "already_saved") {
        openDashboardWorksheet(String(payload.worksheetId), payload.outcome);
        return;
      }
      setToast({
        message: `“${worksheet.name}” was added to My Lessons.`,
        action: <button type="button" className="text-sm font-semibold text-blue-700 underline" onClick={() => openDashboardWorksheet(String(payload.worksheetId), "already_saved")}>Open worksheet</button>,
      });
      void fetchWorksheets();
    } catch (error) {
      console.error("Failed to copy community worksheet:", error);
      setToast({ message: error instanceof Error ? error.message : "Failed to copy worksheet." });
    }
  }

  return {
    query, worksheets, loading, page, pageSize, totalCount, totalPages, sort, worksheetType, contentType,
    previewWorksheet, authors, toast, currentUserId, canCopyToDashboard,
    setQuery, setPage, setPageSize, setSort, setWorksheetType, setContentType, setPreviewWorksheet, setToast,
    addToDashboard,
  };
}
