"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase/client";
import { useBillingAccess } from "@/lib/billing/useBillingAccess";
import { CommunityCardPreview, CommunityContentType, CommunityLessonSet, CommunityToast } from "@/lib/community/types";
import { hydrateCreatorLessonCards } from "@/lib/creator/client";
import type { LessonCard } from "@/lib/lessons/types";

const STORAGE_KEY = "classendo-saved-lessons";

type CommunitySetRow = CommunityLessonSet;
type CommunityCardRow = {
  id: string;
  lesson_set_id?: string;
  front: string;
  back?: string | null;
  creator_image_id?: string | null;
  position?: number | null;
};
type CommunityProfileRow = {
  id: string;
  display_name?: string | null;
  username?: string | null;
};

function resolveCommunityImage(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("http")) return raw;
  return supabase.storage.from("vocab-images").getPublicUrl(raw).data.publicUrl;
}

function normalizeCommunitySearchTerm(rawQuery: string) {
  const query = rawQuery.trim();
  if (!query) return null;

  const safeQuery = query.replace(/[{}"]/g, "").replace(/,/g, " ");
  return safeQuery;
}

export function useCommunitySets() {
  const { access } = useBillingAccess();
  const [query, setQuery] = useState("");
  const [sets, setSets] = useState<CommunityLessonSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [sort, setSort] = useState<"popular" | "newest">("popular");
  const [contentType, setContentType] = useState<CommunityContentType | "all">("all");
  const [previewSet, setPreviewSet] = useState<CommunityLessonSet | null>(null);
  const [previewCards, setPreviewCards] = useState<CommunityCardPreview[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [previewImages, setPreviewImages] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<CommunityToast>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const canCopyToDashboard = Boolean(access?.isPremium);

  const totalPages = useMemo(() => {
    if (!totalCount) return null;
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [totalCount, pageSize]);

  const fetchSets = useCallback(async () => {
    setLoading(true);

    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      const userId = currentUser?.id ?? null;
      setCurrentUserId(userId);

      const columns = "id, name, user_id, created_at, download_count, tags, content_types, copied_from";
      const buildVisibleSetsQuery = (head = false) => {
        let builder = supabase.from("lesson_sets").select(columns, { count: "exact", head });

        if (userId) {
          builder = builder.or(`is_public.eq.true,user_id.eq.${userId}`);
        } else {
          builder = builder.eq("is_public", true);
        }

        if (contentType !== "all") {
          builder = builder.overlaps("content_types", [contentType]);
        }

        return builder;
      };
      const orderSets = (builder: ReturnType<typeof buildVisibleSetsQuery>) => {
        if (sort === "popular") {
          return builder
            .order("download_count", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false, nullsFirst: false })
            .order("id", { ascending: true });
        }
        return builder
          .order("created_at", { ascending: false, nullsFirst: false })
          .order("id", { ascending: true });
      };

      const searchTerm = normalizeCommunitySearchTerm(query);
      let data: CommunitySetRow[] | null = null;
      let error: { message: string } | null = null;
      let count: number | null = null;

      if (!searchTerm) {
        const result = await orderSets(buildVisibleSetsQuery()).range(from, to);
        data = result.data as CommunitySetRow[] | null;
        error = result.error;
        count = result.count;
      } else {
        const exactFilter = `name.ilike.${searchTerm},name.ilike.${searchTerm} - %,tags.cs.{${searchTerm}}`;
        const addRemainingSearch = (builder: ReturnType<typeof buildVisibleSetsQuery>) => builder
          .ilike("name", `%${searchTerm}%`)
          .not("name", "ilike", searchTerm)
          .not("name", "ilike", `${searchTerm} - %`)
          .not("tags", "cs", `{${searchTerm}}`);

        const [exactCountResult, remainingCountResult] = await Promise.all([
          buildVisibleSetsQuery(true).or(exactFilter),
          addRemainingSearch(buildVisibleSetsQuery(true)),
        ]);

        error = exactCountResult.error ?? remainingCountResult.error;
        const exactCount = exactCountResult.count ?? 0;
        const remainingCount = remainingCountResult.count ?? 0;
        count = exactCount + remainingCount;

        if (!error) {
          const pageRows: CommunitySetRow[] = [];
          const exactFrom = from;
          const exactTo = Math.min(to, exactCount - 1);

          if (exactFrom <= exactTo) {
            const exactResult = await orderSets(buildVisibleSetsQuery().or(exactFilter)).range(exactFrom, exactTo);
            if (exactResult.error) {
              error = exactResult.error;
            } else {
              pageRows.push(...((exactResult.data ?? []) as CommunitySetRow[]));
            }
          }

          const remainingSlots = pageSize - pageRows.length;
          const remainingFrom = Math.max(0, from - exactCount);
          if (!error && remainingSlots > 0 && remainingFrom < remainingCount) {
            const remainingResult = await orderSets(addRemainingSearch(buildVisibleSetsQuery()))
              .range(remainingFrom, remainingFrom + remainingSlots - 1);
            if (remainingResult.error) {
              error = remainingResult.error;
            } else {
              pageRows.push(...((remainingResult.data ?? []) as CommunitySetRow[]));
            }
          }

          data = pageRows;
        }
      }

      if (error) {
        console.error("Failed to fetch community sets:", { error, data, count });
        setToast({ message: "Failed to load community sets" });
        setSets([]);
        setTotalCount(null);
        return;
      }

      const fetched: CommunityLessonSet[] = ((data ?? []) as CommunitySetRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        user_id: row.user_id,
        created_at: row.created_at,
        download_count: row.download_count ?? 0,
        tags: row.tags ?? [],
        content_types: row.content_types ?? [],
        copied_from: row.copied_from ?? null,
      }));

      setSets(fetched);
      setTotalCount(count ?? fetched.length);

      const lessonIds = fetched.map((set) => set.id);
      if (lessonIds.length > 0) {
        try {
          const { data: cardsData, error: cardsError } = await supabase
            .from("cards")
            .select("id, lesson_set_id, front, back, creator_image_id, position")
            .in("lesson_set_id", lessonIds)
            .order("position", { ascending: true });

          if (cardsError) {
            console.warn("Failed to fetch preview images:", cardsError);
          } else if (cardsData) {
            const hydratedCards = await hydrateCreatorLessonCards(
              (cardsData as CommunityCardRow[]).map((card) => ({
                id: String(card.id),
                word: String(card.front ?? ""),
                image: card.back,
                back: card.back,
                creator_image_id: card.creator_image_id,
                position: card.position,
                lesson_set_id: card.lesson_set_id,
              })) as Array<LessonCard & { lesson_set_id: string }>
            );
            const nextPreviewImages: Record<string, string> = {};

            hydratedCards.forEach((card) => {
              const lessonId = String(card.lesson_set_id ?? "");
              if (!lessonId || nextPreviewImages[lessonId]) return;

              const resolvedImage = resolveCommunityImage(card.image ?? card.back);
              if (!resolvedImage) return;
              nextPreviewImages[lessonId] = resolvedImage;
            });

            setPreviewImages(nextPreviewImages);
          }
        } catch (error) {
          console.warn("Preview image lookup skipped:", error);
        }
      }

      const userIds = Array.from(new Set(fetched.map((set) => set.user_id).filter(Boolean)));
      if (userIds.length > 0) {
        try {
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, display_name, username")
            .in("id", userIds);

          if (profilesError) {
            console.warn("Failed to fetch profiles:", profilesError);
          } else if (profiles) {
            const nextAuthors: Record<string, string> = {};
            (profiles as CommunityProfileRow[]).forEach((profile) => {
              nextAuthors[profile.id] = profile.username || profile.display_name || profile.id;
            });
            setAuthors((prev) => ({ ...prev, ...nextAuthors }));
          }
        } catch (error) {
          console.warn("Profiles lookup skipped:", error);
        }
      }
    } catch (error) {
      console.error("Unexpected error loading community sets:", error);
      setToast({ message: "Unexpected error loading community sets" });
    } finally {
      setLoading(false);
    }
  }, [contentType, page, pageSize, query, sort]);

  useEffect(() => {
    if (query.trim()) return;
    void fetchSets();
  }, [fetchSets, query]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      void fetchSets();
    }, 250);

    return () => clearTimeout(timeout);
  }, [query, fetchSets]);

  useEffect(() => {
    if (!toast) return;

    const timeout = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timeout);
  }, [toast]);

  async function openPreview(setItem: CommunityLessonSet) {
    setPreviewSet(setItem);
    setPreviewLoading(true);
    setPreviewCards([]);

    try {
      const { data, error } = await supabase
        .from("cards")
        .select("id, front, back, creator_image_id, position")
        .eq("lesson_set_id", setItem.id)
        .order("position", { ascending: true })
        .limit(50);

      if (error) {
        console.error("Failed to load preview cards:", error);
        setToast({ message: "Failed to load set preview" });
        return;
      }

      const hydrated = await hydrateCreatorLessonCards(
        ((data ?? []) as CommunityCardRow[]).map((card) => ({
          id: card.id,
          word: card.front,
          image: card.back,
          back: resolveCommunityImage(card.back),
          creator_image_id: card.creator_image_id,
          position: card.position,
        })) as LessonCard[]
      );
      setPreviewCards(
        hydrated.map((card) => ({
          id: card.id,
          front: card.word,
          back: card.image ?? card.back,
          position: card.position,
        }))
      );
    } catch (error) {
      console.error("Preview load failed:", error);
      setToast({ message: "Failed to load preview" });
    } finally {
      setPreviewLoading(false);
    }
  }

  async function addToDashboard(setItem: CommunityLessonSet) {
    if (!canCopyToDashboard) {
      setToast({
        message: "Upgrade to Premium to add Community sets to your Dashboard.",
      });
      return;
    }

    try {
      if (!currentUserId) {
        setToast({ message: "Please sign in again to use Community sets." });
        return;
      }

      const openExistingDashboardSet = (lessonSetId: string, reason: "owned" | "already_saved") => {
        const params = new URLSearchParams({
          lesson_set_id: lessonSetId,
          notice: reason,
        });
        window.location.assign(`/dashboard?${params.toString()}`);
      };

      if (setItem.user_id === currentUserId) {
        openExistingDashboardSet(setItem.id, "owned");
        return;
      }

      setToast({ message: "Adding to your Dashboard..." });

      const sourceIds = Array.from(new Set([setItem.id, setItem.copied_from].filter((value): value is string => Boolean(value))));
      const { data: existingCopies, error: existingCopyError } = await supabase
        .from("lesson_sets")
        .select("id")
        .eq("user_id", currentUserId)
        .in("copied_from", sourceIds)
        .order("created_at", { ascending: true })
        .limit(1);
      if (existingCopyError) throw existingCopyError;
      if (existingCopies?.[0]?.id) {
        openExistingDashboardSet(String(existingCopies[0].id), "already_saved");
        return;
      }

      const { data: rpcData, error: rpcErr } = await supabase.rpc("copy_lesson_set_once", {
        original_set: setItem.id,
      });

      if (rpcErr) {
        const rpcDetails = {
          code: rpcErr.code,
          message: rpcErr.message,
          details: rpcErr.details,
          hint: rpcErr.hint,
        };
        console.error("copy_lesson_set_once RPC failed:", JSON.stringify(rpcDetails));

        const { data: copyAfterFailure } = await supabase
          .from("lesson_sets")
          .select("id")
          .eq("user_id", currentUserId)
          .in("copied_from", sourceIds)
          .order("created_at", { ascending: true })
          .limit(1);
        if (copyAfterFailure?.[0]?.id) {
          openExistingDashboardSet(String(copyAfterFailure[0].id), "already_saved");
          return;
        }

        setToast({
          message: /premium|upgrade|6 active lesson sets/i.test(rpcErr.message ?? "")
            ? rpcErr.message
            : "Failed to copy set. Try again.",
        });
        return;
      }

      const copyResult = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      const newId = String(copyResult?.lesson_set_id ?? "");
      const copyOutcome = String(copyResult?.outcome ?? "copied");
      if (!newId) throw new Error("Community copy did not return a lesson set.");
      if (copyOutcome === "owned" || copyOutcome === "already_saved") {
        openExistingDashboardSet(
          newId,
          copyOutcome === "owned" ? "owned" : "already_saved",
        );
        return;
      }
      let newSetName = setItem.name;
      let newCreatedAt = new Date().toISOString();
      let newCards: CommunityCardPreview[] = [];

      try {
        const { data: newSetData } = await supabase
          .from("lesson_sets")
          .select("id, name, created_at")
          .eq("id", newId)
          .single();

        if (newSetData) {
          newSetName = newSetData.name ?? newSetName;
          newCreatedAt = newSetData.created_at ?? newCreatedAt;
        }

        const { data: cardsData } = await supabase
          .from("cards")
          .select("front, back, creator_image_id, id, position")
          .eq("lesson_set_id", newId)
          .order("position", { ascending: true });

        if (cardsData) {
          newCards = (cardsData as CommunityCardRow[]).map((card) => ({
            id: card.id,
            front: card.front,
            back: card.back,
            creator_image_id: card.creator_image_id,
            position: card.position,
          }));
        }
      } catch (error) {
        console.warn("Follow-up fetch after copy failed:", error);
      }

      try {
        const raw = localStorage.getItem(STORAGE_KEY) || "[]";
        const parsed = JSON.parse(raw);
        const savedLessons = Array.isArray(parsed) ? parsed : [];
        const newEntry = {
          id: newId,
          name: newSetName,
          cards: newCards,
          createdAt: newCreatedAt,
          lastUsed: Date.now(),
          useCount: 0,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify([newEntry, ...savedLessons]));
      } catch (error) {
        console.warn("Failed to update local saved-lessons cache:", error);
      }

      setToast({
        message: "Added to your Dashboard",
        action: (
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="text-sm text-[var(--color-text-main)] underline underline-offset-4"
            >
              Open Dashboard
            </Link>
            <Link
              href="/teacher/editor"
              className="text-sm text-[var(--color-text-main)] underline underline-offset-4"
            >
              Edit now
            </Link>
          </div>
        ),
      });
    } catch (error) {
      console.error("Failed to add set:", error);
      setToast({ message: "Failed to add set. Please try again." });
    }
  }

  async function reportSet(setItem: CommunityLessonSet) {
    const reason = window.prompt("Report this set — tell us why (spam, inappropriate, etc.)");
    if (!reason) return;

    try {
      const payload = {
        lesson_set_id: setItem.id,
        reason,
      };

      const { error } = await supabase.from("community_reports").insert([payload]);

      if (error) {
        console.warn("community_reports insert failed:", error);
        setToast({ message: "Thanks — the report has been noted." });
        return;
      }

      setToast({ message: "Report submitted. Thank you." });
    } catch (error) {
      console.warn("Report attempt failed:", error);
      setToast({ message: "Thanks — the report has been noted." });
    }
  }

  return {
    query,
    sets,
    loading,
    page,
    pageSize,
    totalCount,
    totalPages,
    sort,
    contentType,
    previewSet,
    previewCards,
    previewLoading,
    authors,
    previewImages,
    toast,
    currentUserId,
    canCopyToDashboard,
    setQuery,
    setPage,
    setPageSize,
    setSort,
    setContentType,
    setPreviewSet,
    setToast,
    openPreview,
    addToDashboard,
    reportSet,
  };
}
