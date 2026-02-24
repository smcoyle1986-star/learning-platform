'use client';

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Play, Search, AlertTriangle } from "lucide-react";

/**
 * Community page (teacher-facing)
 *
 * - Lists public lesson_sets (is_public = true) + sets owned by current user
 * - Search, sort, pagination, preview, add-to-dashboard, report
 *
 * NOTE: Minor query string change: use `.or('is_public.eq.true,user_id.eq.<userId>')`
 * (without outer parentheses) which is the form accepted by Supabase/PostgREST.
 * Also improved error logging to include response payload for debugging.
 */

type LessonSetItem = {
  id: string;
  name: string;
  user_id: string;
  created_at?: string;
  download_count?: number;
  tags?: string[];
};

type CardItem = {
  id: string;
  front: string;
  back?: string | null;
  position?: number | null;
};

const STORAGE_KEY = "classbloom-saved-lessons";

export default function CommunityPage() {
  const [query, setQuery] = useState("");
  const [sets, setSets] = useState<LessonSetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [sort, setSort] = useState<"popular" | "newest">("popular");

  // preview modal
  const [previewSet, setPreviewSet] = useState<LessonSetItem | null>(null);
  const [previewCards, setPreviewCards] = useState<CardItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // author map (user_id -> display name)
  const [authors, setAuthors] = useState<Record<string, string>>({});

  // toasts
  const [toast, setToast] = useState<{ message: string; action?: React.ReactNode } | null>(null);

  const totalPages = useMemo(() => {
    if (!totalCount) return null;
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [totalCount, pageSize]);

  useEffect(() => {
    fetchSets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sort]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchSets();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function fetchSets() {
    setLoading(true);
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // get current user id (supabase v2)
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      const userId = currentUser?.id ?? null;

      // Start building query (do not call .range yet)
      // include exact count
      let builder = supabase
        .from("lesson_sets")
        .select("id, name, user_id, created_at, download_count, tags", { count: "exact" });

      // Build filter so it returns public sets OR sets owned by the current user.
      // Use `.or('is_public.eq.true,user_id.eq.<userId>')` (no outer parentheses).
      if (userId) {
        builder = builder.or(`is_public.eq.true,user_id.eq.${userId}`);
      } else {
        // Not signed in -> only public sets
        builder = builder.eq("is_public", true);
      }

      // Apply partial, case-insensitive name search (ANDed with the above filter)
      if (query && query.trim()) {
        const q = query.trim();
        builder = builder.ilike("name", `%${q}%`);
      }

      // Sorting (order before range)
      if (sort === "popular") {
        builder = builder.order("download_count", { ascending: false, nullsFirst: false });
      } else {
        builder = builder.order("created_at", { ascending: false, nullsFirst: false });
      }

      // Pagination
      builder = builder.range(from, to);

      const { data, error, count } = await builder;

      if (error) {
        // improved logging: output the full response pieces for debugging
        console.error("Failed to fetch community sets:", { error, data, count });
        setToast({ message: "Failed to load community sets" });
        setSets([]);
        setTotalCount(null);
        setLoading(false);
        return;
      }

      const fetched: LessonSetItem[] = (data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        user_id: r.user_id,
        created_at: r.created_at,
        download_count: r.download_count ?? 0,
        tags: r.tags ?? [],
      }));

      setSets(fetched);
      setTotalCount(count ?? fetched.length);

      // fetch author names in bulk (if you have a profiles table)
      const userIds = Array.from(new Set(fetched.map((s) => s.user_id).filter(Boolean)));
      if (userIds.length > 0) {
        try {
          const { data: profs, error: profsErr } = await supabase
            .from("profiles")
            .select("id, display_name")
            .in("id", userIds);

          if (profsErr) {
            console.warn("Failed to fetch profiles:", profsErr);
          } else if (profs) {
            const map: Record<string, string> = {};
            profs.forEach((p: any) => {
              map[p.id] = p.display_name || p.id;
            });
            setAuthors((prev) => ({ ...prev, ...map }));
          }
        } catch (e) {
          // profiles table may not exist — ignore
        }
      }
    } catch (err) {
      console.error("Unexpected error loading community sets:", err);
      setToast({ message: "Unexpected error loading community sets" });
    } finally {
      setLoading(false);
    }
  }

  async function openPreview(setItem: LessonSetItem) {
    setPreviewSet(setItem);
    setPreviewLoading(true);
    setPreviewCards([]);
    try {
      const { data, error } = await supabase
        .from("cards")
        .select("id, front, back, position")
        .eq("lesson_set_id", setItem.id)
        .order("position", { ascending: true })
        .limit(50);

      if (error) {
        console.error("Failed to load preview cards:", error);
        setToast({ message: "Failed to load set preview" });
        return;
      }

      const cards: CardItem[] = (data || []).map((c: any) => ({
        id: c.id,
        front: c.front,
        back: c.back,
        position: c.position,
      }));

      setPreviewCards(cards);
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to load preview" });
    } finally {
      setPreviewLoading(false);
    }
  }

  async function addToDashboard(setItem: LessonSetItem) {
    try {
      setToast({ message: "Adding to your Dashboard..." });
      // call RPC
      const { data: rpcData, error: rpcErr } = await supabase.rpc("copy_lesson_set", { original_set: setItem.id });

      if (rpcErr) {
        console.error("copy_lesson_set RPC failed:", rpcErr);
        setToast({ message: "Failed to copy set. Try again." });
        return;
      }

      const newId = rpcData as string;

      // Try to fetch the newly created set and its cards to store locally
      let newSetName = setItem.name;
      let newCreatedAt = new Date().toISOString();
      let newCards: CardItem[] = [];

      try {
        const { data: newSetData } = await supabase.from("lesson_sets").select("id,name,created_at").eq("id", newId).single();
        if (newSetData) {
          newSetName = newSetData.name ?? newSetName;
          newCreatedAt = newSetData.created_at ?? newCreatedAt;
        }

        const { data: cardsData } = await supabase.from("cards").select("front,back,id,position").eq("lesson_set_id", newId).order("position", { ascending: true });
        if (cardsData) {
          newCards = cardsData.map((c: any) => ({
            id: c.id,
            front: c.front,
            back: c.back,
            position: c.position,
          }));
        }
      } catch (e) {
        // Non-fatal; continue with what we have
      }

      // Update localStorage saved-lessons cache exactly like Dashboard/Flashcards expect
      try {
        const raw = localStorage.getItem(STORAGE_KEY) || "[]";
        const parsed = JSON.parse(raw);
        const savedLessons = Array.isArray(parsed) ? parsed : [];
        const newEntry = {
          id: String(newId),
          name: newSetName,
          cards: newCards,
          createdAt: newCreatedAt,
          lastUsed: Date.now(),
          useCount: 0,
        };
        const updatedLocal = [newEntry, ...savedLessons];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLocal));
      } catch (e) {
        console.warn("Failed to update local saved-lessons cache:", e);
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
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to add set. Please try again." });
    }
  }

  async function reportSet(setItem: LessonSetItem) {
    const reason = window.prompt("Report this set — tell us why (spam, inappropriate, etc.)");
    if (!reason) {
      return;
    }

    try {
      const payload = {
        lesson_set_id: setItem.id,
        reason,
      };

      try {
        const { error: repErr } = await supabase.from("community_reports").insert([payload]);
        if (repErr) {
          console.warn("community_reports insert failed (may not exist):", repErr);
          setToast({ message: "Thanks — the report has been noted." });
        } else {
          setToast({ message: "Report submitted. Thank you." });
        }
      } catch (e) {
        console.warn("Report attempt failed:", e);
        setToast({ message: "Thanks — the report has been noted." });
      }
    } catch (err) {
      console.error("Report failed:", err);
      setToast({ message: "Could not submit report. Try again later." });
    }
  }

  function clearToastAfterDelay() {
    setTimeout(() => setToast(null), 6000);
  }

  useEffect(() => {
    if (toast) clearToastAfterDelay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg-main)]/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80">
            ClassBloom
          </Link>

          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-4xl font-bold text-black">Community</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => (window.location.href = "/flashcards")}
              className="btn btn-secondary"
            >
              Flashcards
            </button>

            <button
              onClick={() => (window.location.href = "/dashboard")}
              className="btn btn-secondary"
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Controls */}
      <main className="max-w-7xl mx-auto px-6 pt-10 pb-32">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 w-full md:w-2/3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search community lessons"
                className="w-full pl-12 pr-4 py-2 rounded-lg border border-black/10 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as any);
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg border bg-white text-sm"
            >
              <option value="popular">Most downloaded</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-[var(--color-text-muted)]">
              {totalCount !== null ? `${totalCount} sets` : ""}
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-[var(--color-text-muted)]">Per page</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 rounded border bg-white text-sm"
              >
                <option value={12}>12</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grid */}
        <section>
          {loading ? (
            <div className="text-center py-24 text-[var(--color-text-muted)]">Loading community sets…</div>
          ) : sets.length === 0 ? (
            <div className="text-center py-24 text-[var(--color-text-muted)]">
              <p className="text-lg mb-3">No community sets found.</p>
              <p>
                Try different search terms or{" "}
                <Link
                  href="/flashcards"
                  className="text-[var(--color-text-main)] underline underline-offset-4"
                >
                  create your own lesson
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sets.map((s) => (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl p-5 transition cursor-pointer relative border shadow-sm hover:shadow-md"
                >
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openPreview(s);
                      }}
                      title="Preview"
                      className="btn btn-secondary px-3 py-2"
                    >
                      Preview
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        reportSet(s);
                      }}
                      title="Report / Flag"
                      className="btn btn-secondary px-3 py-2"
                    >
                      <AlertTriangle size={14} />
                    </button>
                  </div>

                  {/* Thumbnail / placeholder */}
                  <div className="aspect-video rounded-lg bg-gray-50 mb-4 flex items-center justify-center text-gray-400">
                    <span className="text-sm">Preview</span>
                  </div>

                  <h3 className="font-semibold text-lg mb-1">{s.name}</h3>

                  <p className="text-xs text-[var(--color-text-muted)] mb-3">
                    {authors[s.user_id] ? `By ${authors[s.user_id]}` : `By ${s.user_id?.slice(0, 8)}`}
                    {s.tags && s.tags.length > 0 ? ` · ${s.tags.join(", ")}` : ""}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => addToDashboard(s)}
                      className="btn btn-primary flex-1 px-3 py-2"
                    >
                      Add to Dashboard
                    </button>

                    <div className="text-xs text-[var(--color-text-muted)]">
                      {s.download_count ?? 0} copies
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pagination */}
        {totalPages && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn btn-secondary px-3 py-1 disabled:opacity-60"
            >
              Prev
            </button>

            <div className="px-3 py-1 rounded text-sm">
              Page {page} of {totalPages}
            </div>

            <button
              disabled={page >= (totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
              className="btn btn-secondary px-3 py-1 disabled:opacity-60"
            >
              Next
            </button>
          </div>
        )}
      </main>

      {/* Preview Modal */}
      {previewSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-[92%] max-w-3xl shadow-xl">
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold">{previewSet.name}</h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {authors[previewSet.user_id] ? `By ${authors[previewSet.user_id]}` : previewSet.user_id}
                  {previewSet.tags && previewSet.tags.length > 0 ? ` · ${previewSet.tags?.join(", ")}` : ""}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    addToDashboard(previewSet);
                    setPreviewSet(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90"
                >
                  Add to Dashboard
                </button>

                <button
                  onClick={() => setPreviewSet(null)}
                  className="px-4 py-2 rounded-lg border bg-[var(--color-bg-soft)]"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto">
              {previewLoading ? (
                <div className="text-[var(--color-text-muted)]">Loading cards…</div>
              ) : previewCards.length === 0 ? (
                <div className="text-[var(--color-text-muted)]">No cards to preview</div>
              ) : (
                previewCards.map((c) => (
                  <div key={c.id} className="border rounded-lg p-3 bg-[var(--color-bg-soft)]">
                    <div className="text-sm font-medium mb-2">{c.front}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{c.back ? "Image / Back exists" : "No back"}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed right-4 bottom-6 z-60">
          <div className="bg-white border rounded-lg px-4 py-3 shadow-md max-w-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium">{toast.message}</div>
                {toast.action && <div className="mt-2">{toast.action}</div>}
              </div>
              <button onClick={() => setToast(null)} className="text-gray-400 ml-4">✕</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
