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

function buildCommunitySearchFilter(rawQuery: string) {
  const query = rawQuery.trim();
  if (!query) return null;

  const safeQuery = query.replace(/[{}"]/g, "").replace(/,/g, " ");
  return `name.ilike.%${safeQuery}%,tags.cs.{${safeQuery}}`;
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

      let builder = supabase
        .from("lesson_sets")
        .select("id, name, user_id, created_at, download_count, tags, content_types", { count: "exact" });

      if (userId) {
        builder = builder.or(`is_public.eq.true,user_id.eq.${userId}`);
      } else {
        builder = builder.eq("is_public", true);
      }

      const searchFilter = buildCommunitySearchFilter(query);
      if (searchFilter) {
        builder = builder.or(searchFilter);
      }

      if (contentType !== "all") {
        builder = builder.overlaps("content_types", [contentType]);
      }

      if (sort === "popular") {
        builder = builder
          .order("download_count", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false, nullsFirst: false });
      } else {
        builder = builder.order("created_at", { ascending: false, nullsFirst: false });
      }

      builder = builder.range(from, to);

      const { data, error, count } = await builder;

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
      setToast({ message: "Adding to your Dashboard..." });

      const { data: rpcData, error: rpcErr } = await supabase.rpc("copy_lesson_set", {
        original_set: setItem.id,
      });

      if (rpcErr) {
        console.error("copy_lesson_set RPC failed:", rpcErr);
        setToast({ message: "Failed to copy set. Try again." });
        return;
      }

      const newId = String(rpcData);
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
