"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Search, X, Printer, Menu } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
// removed duplicate createClient import to avoid creating a second client that triggers refresh token errors
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

/* ---------------------------
   Visual/theme notes applied locally:
   - Uses the same primary blue used on the homepage (#1e40af) via CSS variables set
   - Buttons, cards, input, modals are restyled to match homepage aesthetics:
     rounded-2xl cards, soft backgrounds, gentler shadows, primary CTA uses the brand blue
   - All previous green accents on this page have been replaced with the brand palette
   - No logic changes; only className/style changes for visuals
---------------------------- */

function rankResults<T extends { lemma: string; theme?: string }>(
  data: T[],
  query: string
) {
  return data.sort((a, b) => {
    const q = query.toLowerCase();

    const score = (item: T) => {
      const lemma = item.lemma.toLowerCase();
      const theme = item.theme?.toLowerCase() ?? "";

      if (lemma === q) return 0;
      if (lemma.startsWith(q)) return 1;
      if (lemma.includes(q)) return 2;
      if (theme.includes(q)) return 3;
      return 4;
    };

    return score(a) - score(b);
  });
}

type NounRow = {
  id: string;
  lemma: string;
  image_id: string | null;
};

export type Card = {
  id: string; // UUID or identifier
  word: string;
  image: string;
  type: "noun" | "verb" | "adjective" | "phonics" | "preposition";
};

type TrayItem = {
  id: string;
  word: string;
  image: string;
  type: Card["type"];
};

export default function FlashcardsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Card[]>([]);
  const [lessonTray, setLessonTray] = useState<TrayItem[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [lessonName, setLessonName] = useState("");

  const STORAGE_KEY = "classendo-saved-lessons";
  const [nameError, setNameError] = useState("");
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [existingLessonIndex, setExistingLessonIndex] = useState<string | null>(
    null
  );
  const [existingLessonId, setExistingLessonId] = useState<string | null>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTray, setLastSavedTray] = useState<Card[]>([]);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

  // Editing mode: store lesson_set id when opened from Dashboard for editing
  const [editingLessonSetId, setEditingLessonSetId] = useState<string | null>(null);

  // NEW: public/private toggle state for Save modal
  // Default to public
  const [isPublic, setIsPublic] = useState<boolean>(true);

  // NOTE: changed to preserve original case — only replace underscores with spaces.
  const formatWord = (word: string) => String(word ?? "").replace(/_/g, " ");

  type WordType = "noun" | "verb" | "adjective" | "phonics" | "preposition";

  const [activeWordType, setActiveWordType] = useState<WordType>("noun");

  const [activeTheme, setActiveTheme] = useState<string | null>(null);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [imageVariants, setImageVariants] = useState<Record<string, string[]>>({});
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const addToastTimeoutRef = useRef<number | null>(null);
  const [carouselState, setCarouselState] = useState<
    Record<
      string,
      {
        index: number;
        animating: boolean;
        direction: "left" | "right";
        nextIndex: number;
        phase: "start" | "move";
      }
    >
  >({});

  // useAuth from context (authentication requirement)
  const { user } = useAuth();

  // On mount: try to detect editing lesson_set id passed from Dashboard
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const idFromQuery =
        params.get("lesson_set_id") ||
        params.get("lessonSetId") ||
        params.get("id") ||
        null;
      if (idFromQuery) {
        setEditingLessonSetId(idFromQuery);
        return;
      }

      const possibleKeys = [
        "editingLessonSetId",
        "editing-lesson-set-id",
        "editing_lesson_set_id",
        "editLessonSetId",
      ];
      for (const k of possibleKeys) {
        const v = localStorage.getItem(k);
        if (v) {
          setEditingLessonSetId(v);
          break;
        }
      }
    } catch (e) {
      /* ignore */
    }
  }, []);

  // If editingLessonSetId is set, attempt to load lesson name and is_public so Save modal shows current name and visibility
  useEffect(() => {
    if (!editingLessonSetId) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("lesson_sets")
          .select("name,is_public")
          .eq("id", editingLessonSetId)
          .single();
        if (!error && data?.name) {
          setLessonName(data.name);
          setIsPublic(Boolean(data.is_public ?? true));
        }
      } catch (e) {
        console.error("Failed to load lesson_set name/is_public for editing:", e);
      }
    })();
  }, [editingLessonSetId]);

  useEffect(() => {
    if (showSaveModal && !editingLessonSetId) {
      setIsPublic(true);
    }
  }, [showSaveModal, editingLessonSetId]);

  // --- popularity counts state (persisted in localStorage) ---
  const POP_KEY = "classendo-card-select-counts";
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(POP_KEY);
      if (raw) setCardCounts(JSON.parse(raw));
    } catch (e) {
      console.warn("Failed to load card counts:", e);
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(POP_KEY, JSON.stringify(cardCounts));
    } catch (e) {
      /* ignore */
    }
  }, [cardCounts]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const trayItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevRectsRef = useRef<Record<string, DOMRect>>({});

  useEffect(() => {
    if (activeWordType && activeTheme) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWordType, activeTheme]);

  useEffect(() => {
    const savedTray = localStorage.getItem("classendo-lesson-tray");
    if (savedTray) setLessonTray(JSON.parse(savedTray));

    const lastSaved = localStorage.getItem("classendo-last-saved-tray");
    if (lastSaved) setLastSavedTray(JSON.parse(lastSaved));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("classendo-lesson-tray", JSON.stringify(lessonTray));
      try {
        window.dispatchEvent(new Event("lesson-tray-updated"));
      } catch (e) {
        /* ignore in restricted environments */
      }
    } catch (e) {
      console.warn("Failed to persist lesson tray:", e);
    }
  }, [lessonTray]);

  useEffect(() => {
    const hasChanges =
      lessonTray.length !== lastSavedTray.length ||
      lessonTray.some((card) => !lastSavedTray.find((c) => c.id === card.id));

    setHasUnsavedChanges(hasChanges);
  }, [lessonTray, lastSavedTray]);

  useEffect(() => {
    const pendingKeys = Object.keys(carouselState).filter(
      (k) => carouselState[k]?.animating && carouselState[k]?.phase === "start"
    );
    if (pendingKeys.length === 0) return;

    const timer = setTimeout(() => {
      setCarouselState((prev) => {
        const next = { ...prev };
        pendingKeys.forEach((k) => {
          const entry = next[k];
          if (entry && entry.animating && entry.phase === "start") {
            next[k] = { ...entry, phase: "move" };
          }
        });
        return next;
      });
    }, 16);

    return () => clearTimeout(timer);
  }, [carouselState]);

  useEffect(() => {
    if (results.length === 0) return;
    setCarouselState((prev) => {
      const next = { ...prev };
      results.forEach((card) => {
        const key = lemmaKey(card);
        const images = getCardImages(card);
        if (!next[key]) {
          next[key] = { index: 0, animating: false, direction: "right", nextIndex: 0, phase: "start" };
          return;
        }
        if (images.length > 0 && next[key].index >= images.length) {
          next[key] = { ...next[key], index: 0, nextIndex: 0, animating: false, phase: "start" };
        }
      });
      return next;
    });
  }, [results, imageVariants]);

  async function saveLesson() {
    const { user: innerUser } = useAuth();

    if (!innerUser) {
      alert("You must be logged in to save lessons.");
      return;
    }

    if (!lessonTray || lessonTray.length === 0) {
      alert("No cards to save.");
      return;
    }

    // 1) Create lesson set
    const { data: lessonSet, error: lessonError } = await supabase
      .from("lesson_sets")
      .insert({
        user_id: innerUser.id,
        name: `Lesson ${new Date().toLocaleString()}`,
      })
      .select()
      .single();

    if (lessonError || !lessonSet) {
      console.error("Failed to create lesson set:", lessonError);
      alert("Failed to save lesson.");
      return;
    }

    // 2) Insert cards
    const cardsPayload = lessonTray.map((card: any, index: number) => ({
      lesson_set_id: lessonSet.id,
      front: card.word ?? card.front ?? "",
      back: card.definition ?? card.back ?? "",
      position: index,
    }));

    const { error: cardsError } = await supabase
      .from("cards")
      .insert(cardsPayload);

    if (cardsError) {
      console.error("Failed to save cards:", cardsError);
      alert("Lesson was created but cards failed to save.");
      return;
    }

    // Optional UI feedback
    setShowSavedIndicator(true);
    setTimeout(() => setShowSavedIndicator(false), 2000);
  }

  const THEMES = {
    noun: [
      "food",
      "places",
      "animals baby",
      "animals land",
      "animals sea",
      "body",
      "classroom",
      "clothes",
      "dates",
      "drink",
      "family",
      "fruit",
      "furniture",
      "health",
      "holidays",
      "jobs",
      "nature",
      "numbers",
      "people",
      "rooms",
      "sports",
      "subjects",
      "time",
      "toys",
      "transport",
      "utensils",
      "vegetables",
      "weather",
    ],
    verb: ["activities", "action", "mental processes", "communication", "sensing"],
    adjective: [
      "condition",
      "size",
      "appearance",
      "personality",
      "feelings",
      "colors",
      "causes",
      "ful_less",
    ],
    phonics: [
      "alphabet",
      "short a",
      "short e",
      "short i",
      "short o",
      "short u",
      "long a",
      "long i",
      "long o",
      "long u",
      "double consonants",
      "double vowel",
      "sight words",
    ],
    preposition: ["place", "movement"],
  };

  const wordTypeButton = (active: boolean) =>
    `btn px-4 py-2 rounded-full text-sm font-semibold transition-all ${
      active ? "btn-primary" : "btn-secondary"
    }`;

  function scoreForCard(card: Card, rawQuery: string) {
    const q = (rawQuery || "").toLowerCase();
    const lemma = (card.word || "").toLowerCase();
    if (!q) return 999;
    if (lemma === q) return 0;
    if (lemma.startsWith(q)) return 1;
    if (lemma.includes(q)) return 2;
    return 3;
  }

  function lemmaKey(card: Pick<Card, "type" | "word">) {
    return `${card.type}:${card.word}`;
  }

  function sortByPopularity(cards: Card[], rawQuery = "") {
    return [...cards].sort((a, b) => {
      const ca = cardCounts[lemmaKey(a)] ?? 0;
      const cb = cardCounts[lemmaKey(b)] ?? 0;
      if (cb !== ca) return cb - ca;

      const sa = scoreForCard(a, rawQuery);
      const sb = scoreForCard(b, rawQuery);
      if (sa !== sb) return sa - sb;

      return a.word.localeCompare(b.word);
    });
  }

  async function handleSearch() {
    try {
      const raw = query.trim().toLowerCase();
      const normalized = raw.replace(/\s+/g, "_");

      if (!raw && !activeTheme) return;

      if (activeWordType === "noun") {
        let data, error;

        const queryBuilder = supabase
          .from("nouns")
          .select("id, lemma, image_id, themes");

        if (activeTheme) {
          queryBuilder.contains("themes", [activeTheme]);
        } else if (raw) {
          queryBuilder.or(`lemma.ilike.%${raw}%,themes.cs.{${raw}}`);
        }

        ({ data, error } = await queryBuilder);

        if (error) throw error;

        const cards: Card[] = (data || []).map((noun: any) => ({
          id: noun.id,
          word: noun.lemma,
          image: noun.image_id ?? "/placeholder.png",
          type: "noun",
        }));

        const sorted = sortByPopularity(cards, raw);
        setResults(sorted);
        await loadVocabImages(sorted, "noun");
        return;
      }

      if (activeWordType === "verb") {
        const { data, error } = await supabase
          .from("verbs")
          .select("id, lemma, image_id, themes")
          .or(
            activeTheme
              ? `themes.cs.{${activeTheme}}`
              : `lemma.ilike.%${raw}%,themes.cs.{${raw}}`
          );

        if (error) throw error;

        const cards: Card[] = (data || []).map((verb: any) => ({
          id: verb.id,
          word: verb.lemma,
          image: verb.image_id ?? "/placeholder.png",
          type: "verb",
        }));

        const sorted = sortByPopularity(cards, raw);
        setResults(sorted);
        await loadVocabImages(sorted, "verb");
        return;
      }

      if (activeWordType === "adjective") {
        const { data, error } = await supabase
          .from("adjectives")
          .select("id, lemma, image_id, themes")
          .or(
            activeTheme
              ? `themes.cs.{${activeTheme}}`
              : `lemma.ilike.%${raw}%,themes.cs.{${raw}}`
          );

        if (error) throw error;

        const cards: Card[] = (data || []).map((adj: any) => ({
          id: adj.id,
          word: adj.lemma,
          image: adj.image_id ?? "/placeholder.png",
          type: "adjective",
        }));

        const sorted = sortByPopularity(cards, raw);
        setResults(sorted);
        await loadVocabImages(sorted, "adjective");
        return;
      }

      if (activeWordType === "phonics") {
        const { data, error } = await supabase
          .from("phonics")
          .select("id, lemma, image_id, theme")
          .or(
            activeTheme
              ? `theme.ilike.%${activeTheme}%`
              : `lemma.ilike.%${raw}%,theme.ilike.%${raw}%`
          );

        if (error) throw error;

        const ranked = rankResults(data || [], raw);

        const cards: Card[] = ranked.map((ph: any) => ({
          id: ph.id,
          word: ph.lemma,
          image: ph.image_id ?? "/placeholder.png",
          type: "phonics",
        }));

        const sorted = sortByPopularity(cards, raw);
        setResults(sorted);
        await loadVocabImages(sorted, "phonics");
        return;
      }

      if (activeWordType === "preposition") {
        const { data, error } = await supabase
          .from("prepositions")
          .select("id, lemma, image_id, themes")
          .or(
            activeTheme
              ? `themes.cs.{${activeTheme}}`
              : `lemma.ilike.%${raw}%,themes.cs.{${raw}}`
          );

        if (error) throw error;

        const cards: Card[] = (data || []).map((prep: any) => ({
          id: prep.id,
          word: prep.lemma,
          image: prep.image_id ?? "/placeholder.png",
          type: "preposition",
        }));

        const sorted = sortByPopularity(cards, raw);
        setResults(sorted);
        await loadVocabImages(sorted, "preposition");
        return;
      }
    } catch (err) {
      console.error("Search failed:", err);
    }
  }

  async function loadVocabImages(cards: Card[], category: Card["type"]) {
    try {
      const lemmas = Array.from(new Set(cards.map((c) => c.word).filter(Boolean)));
      if (lemmas.length === 0) return;

      const { data, error } = await supabase
        .from("vocab_images")
        .select("lemma, category, image_path, is_default")
        .in("lemma", lemmas)
        .eq("category", category)
        .order("is_default", { ascending: false })
        .order("image_path", { ascending: true });

      if (error) throw error;

      const nextMap: Record<string, string[]> = {};
      (data || []).forEach((row: any) => {
        const key = `${row.category}:${row.lemma}`;
        if (!nextMap[key]) nextMap[key] = [];
        if (row.image_path) {
          const raw = String(row.image_path);
          const publicUrl = raw.startsWith("http")
            ? raw
            : supabase.storage.from("vocab-images").getPublicUrl(raw).data.publicUrl;
          nextMap[key].push(publicUrl);
        }
      });

      Object.keys(nextMap).forEach((k) => {
        nextMap[k] = Array.from(new Set(nextMap[k])).sort();
      });

      setImageVariants((prev) => ({ ...prev, ...nextMap }));
    } catch (err) {
      console.error("Failed to load vocab images:", err);
    }
  }

  function incrementCardCount(card: Card) {
    setCardCounts((prevCounts) => {
      const next = { ...(prevCounts || {}) };
      const key = lemmaKey(card);
      next[key] = (next[key] ?? 0) + 1;
      return next;
    });
  }

  function getCardImages(card: Card) {
    const key = lemmaKey(card);
    const variants = imageVariants[key];
    if (variants && variants.length > 0) return variants;
    return card.image ? [card.image] : [];
  }

  function getActiveImage(card: Card) {
    const key = lemmaKey(card);
    const images = getCardImages(card);
    const idx = carouselState[key]?.index ?? 0;
    return images[idx] ?? images[0] ?? card.image;
  }

  function addToLessonTray(card: Card) {
    const imagePath = getActiveImage(card);
    if (!imagePath) return;
    const trayId = `${card.type}:${card.word}:${imagePath}`;
    setLessonTray((prev) => {
      const exists = prev.some((item) => item.image === imagePath);
      if (exists) return prev;
      incrementCardCount(card);
      return [...prev, { id: trayId, word: card.word, image: imagePath, type: card.type }];
    });
    setLastAddedId(trayId);
    if (addToastTimeoutRef.current) {
      window.clearTimeout(addToastTimeoutRef.current);
    }
    addToastTimeoutRef.current = window.setTimeout(() => {
      setLastAddedId(null);
    }, 900);
  }

  function removeFromLessonTray(id: string) {
    setLessonTray((prev) => prev.filter((c) => c.id !== id));
  }

  function clearLessonTray() {
    setLessonTray([]);
    localStorage.removeItem("classendo-lesson-tray");
    try {
      window.dispatchEvent(new Event("lesson-tray-updated"));
    } catch (e) {
      /* ignore */
    }
  }

  function captureRects() {
    const map: Record<string, DOMRect> = {};
    lessonTray.forEach((card) => {
      const el = trayItemRefs.current[card.id];
      if (el) map[card.id] = el.getBoundingClientRect();
    });
    return map;
  }

  function animateFlip(oldRects: Record<string, DOMRect>, newRects: Record<string, DOMRect>) {
    Object.keys(newRects).forEach((id) => {
      const el = trayItemRefs.current[id];
      const oldRect = oldRects[id];
      const newRect = newRects[id];
      if (!el || !oldRect || !newRect) return;

      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top - newRect.top;
      if (dx === 0 && dy === 0) return;

      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      void el.offsetWidth;
      el.style.transition = "transform 260ms cubic-bezier(.2,.9,.3,1)";
      el.style.transform = "";
      const cleanup = () => {
        el.style.transition = "";
        el.style.transform = "";
        el.removeEventListener("transitionend", cleanup);
      };
      el.addEventListener("transitionend", cleanup);
      setTimeout(cleanup, 350);
    });
  }

  function reorderWithAnimation(from: number, to: number) {
    if (from === to) return;
    const oldRects = captureRects();

    setLessonTray((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const newRects: Record<string, DOMRect> = {};
        Object.keys(trayItemRefs.current).forEach((id) => {
          const el = trayItemRefs.current[id];
          if (el) newRects[id] = el.getBoundingClientRect();
        });
        animateFlip(oldRects, newRects);
      });
    });
  }

  function onDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index);
    prevRectsRef.current = captureRects();
    try {
      e.dataTransfer.setData("text/plain", String(index));
      e.dataTransfer.effectAllowed = "move";
    } catch {}
  }

  function onDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function onDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    const from =
      draggedIndex ??
      parseInt(e.dataTransfer.getData("text/plain") || "-1", 10);
    const to = index;
    if (from < 0 || to < 0 || from === to) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    reorderWithAnimation(from, to);

    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function onDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function onTrayItemKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      if (index > 0) {
        reorderWithAnimation(index, index - 1);
        setTimeout(() => {
          const movedId = lessonTray[index - 1]?.id;
          trayItemRefs.current[movedId ?? ""]?.focus();
        }, 260);
      }
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      if (index < lessonTray.length - 1) {
        reorderWithAnimation(index, index + 1);
        setTimeout(() => {
          const movedId = lessonTray[index + 1]?.id;
          trayItemRefs.current[movedId ?? ""]?.focus();
        }, 260);
      }
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      const id = lessonTray[index]?.id;
      if (id) removeFromLessonTray(id);
    }
  }

  function getCarouselKey(card: Card) {
    return lemmaKey(card);
  }

  function startCarouselSlide(card: Card, direction: "left" | "right") {
    const key = getCarouselKey(card);
    const images = getCardImages(card);
    if (images.length <= 1) return;
    const current = carouselState[key] || { index: 0, animating: false, direction: "right", nextIndex: 0, phase: "start" };
    if (current.animating) return;
    if (direction === "left" && current.index <= 0) return;
    if (direction === "right" && current.index >= images.length - 1) return;

    const nextIndex = direction === "right" ? current.index + 1 : current.index - 1;
    setCarouselState((prev) => ({
      ...prev,
      [key]: { ...current, animating: true, direction, nextIndex, phase: "start" },
    }));
  }

  function finishCarouselSlide(card: Card) {
    const key = getCarouselKey(card);
    const current = carouselState[key];
    if (!current || !current.animating) return;
    setCarouselState((prev) => ({
      ...prev,
      [key]: { ...current, animating: false, index: current.nextIndex },
    }));
  }

  async function handleSaveLesson() {
    if (!lessonName.trim()) {
      setNameError("Lesson name is required");
      return;
    }

    try {
      if (!user) {
        setNameError("You must be signed in to save lessons");
        return;
      }

      const trimmedName = lessonName.trim();

      if (editingLessonSetId) {
        const lessonSetId = editingLessonSetId;

        const { error: updateErr } = await supabase
          .from("lesson_sets")
          .update({
            name: trimmedName,
            last_used: new Date().toISOString(),
            is_public: isPublic,
          })
          .eq("id", lessonSetId);

        if (updateErr) throw updateErr;

        const { error: delErr } = await supabase
          .from("cards")
          .delete()
          .eq("lesson_set_id", lessonSetId);

        if (delErr) throw delErr;

        if (lessonTray.length > 0) {
          const cardsToInsert = lessonTray.map((card, idx) => ({
            lesson_set_id: lessonSetId,
            front: card.word,
            back: card.image ?? null,
            position: idx,
          }));

          const { error: cardsErr } = await supabase
            .from("cards")
            .insert(cardsToInsert);

          if (cardsErr) throw cardsErr;
        }

        setLastSavedTray([...lessonTray]);
        setShowSavedIndicator(true);
        setTimeout(() => setShowSavedIndicator(false), 2000);

        finishSave();
        return;
      }

      const { data: existing, error: existingErr } = await supabase
        .from("lesson_sets")
        .select("id")
        .eq("user_id", user.id)
        .ilike("name", trimmedName)
        .limit(1);

      if (existingErr) throw existingErr;

      if (existing && existing.length > 0) {
        setExistingLessonId(existing[0].id);
        setShowReplaceConfirm(true);
        return;
      }

      const { data: insertedLesson, error: insertErr } = await supabase
        .from("lesson_sets")
        .insert({
          name: trimmedName,
          user_id: user.id,
          last_used: new Date().toISOString(),
          is_public: isPublic,
        })
        .select("id, created_at")
        .single();

      if (insertErr) throw insertErr;

      const lessonSetId = (insertedLesson as any).id;

      if (lessonTray.length > 0) {
        const cardsToInsert = lessonTray.map((card, idx) => ({
          lesson_set_id: lessonSetId,
          front: card.word,
          back: card.image ?? null,
          position: idx,
        }));

        const { error: cardsErr } = await supabase.from("cards").insert(cardsToInsert);
        if (cardsErr) throw cardsErr;
      }

      setLastSavedTray([...lessonTray]);
      setShowSavedIndicator(true);
      setTimeout(() => setShowSavedIndicator(false), 2000);

      finishSave();
    } catch (err: any) {
      console.error("Save failed:", err);
      setNameError(err?.message || "Save failed. Please try again.");
    }
  }

  async function replaceLesson() {
    try {
      if (!existingLessonId) {
        setShowReplaceConfirm(false);
        return;
      }

      if (!user) {
        setNameError("You must be signed in to replace lessons");
        return;
      }

      const targetLessonId = existingLessonId;

      const { error: delErr } = await supabase
        .from("cards")
        .delete()
        .eq("lesson_set_id", targetLessonId);

      if (delErr) throw delErr;

      if (lessonTray.length > 0) {
        const cardsToInsert = lessonTray.map((card, idx) => ({
          lesson_set_id: targetLessonId,
          front: card.word,
          back: card.image ?? null,
          position: idx,
        }));

        const { error: insertCardsErr } = await supabase.from("cards").insert(cardsToInsert);
        if (insertCardsErr) throw insertCardsErr;
      }

      const { error: updateErr } = await supabase
        .from("lesson_sets")
        .update({
          name: lessonName.trim(),
          last_used: new Date().toISOString(),
          is_public: isPublic,
        })
        .eq("id", targetLessonId);

      if (updateErr) throw updateErr;

      setShowReplaceConfirm(false);
      setExistingLessonId(null);

      setLastSavedTray([...lessonTray]);
      setShowSavedIndicator(true);
      setTimeout(() => setShowSavedIndicator(false), 2000);

      finishSave();
    } catch (err: any) {
      console.error("Replace failed:", err);
      setNameError(err?.message || "Replace failed. Please try again.");
    }
  }

  function finishSave() {
    setLessonName("");
    setNameError("");
    setExistingLessonIndex(null);
    setExistingLessonId(null);
    setShowSaveModal(false);
    setIsPublic(true);
  }

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!openDropdown) return;
      const target = e.target as HTMLElement | null;
      if (!target) {
        setOpenDropdown(null);
        return;
      }

      const inDropdown = target.closest(`[data-dropdown-type="${openDropdown}"]`);
      const inBtn = target.closest(`[data-dropdown-btn="${openDropdown}"]`);

      if (!inDropdown && !inBtn) {
        setOpenDropdown(null);
      }
    }

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [openDropdown]);

  return (
    <div
      className="min-h-screen"
      style={
        {
          ['--color-primary' as any]: '#1e40af',
          ['--color-primary-soft' as any]: '#eef2ff',
          ['--color-bg-main' as any]: '#f7f6f2',
          ['--color-bg-card' as any]: '#eef0e7',
          ['--color-bg-soft' as any]: '#f1f5f9',
          ['--color-text-main' as any]: '#2f3a2f',
          ['--color-text-muted' as any]: '#6b756b'
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg-main)] border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80">
            Classendo
          </Link>

          <div className="absolute left-1/2 transform -translate-x-1/2">
            <nav className="text-lg font-semibold text-[var(--color-text-main)]">Flashcards</nav>
          </div>

          <div className="flex items-center gap-3">
            {/* NAV DROPDOWN (hamburger) */}
            <div className="relative" data-dropdown-btn="nav">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdown(openDropdown === "nav" ? null : "nav");
                }}
                className="btn btn-secondary px-3 py-2 flex items-center gap-2"
                aria-haspopup="true"
                aria-expanded={openDropdown === "nav"}
                data-dropdown-btn="nav"
              >
                <Menu size={16} />
              </button>

              {openDropdown === "nav" && (
                <div
                  data-dropdown-type="nav"
                  className="absolute right-0 mt-2 w-44 rounded-2xl bg-white border shadow-lg p-2 z-50 animate-fade-up"
                >
                  <button
                    onClick={() => { setOpenDropdown(null); router.push("/dashboard"); }}
                    className="btn btn-secondary w-full px-3 py-2 text-left"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => { setOpenDropdown(null); router.push("/teacher/editor"); }}
                    className="btn btn-secondary w-full px-3 py-2 text-left"
                  >
                    Editor
                  </button>
                  <button
                    onClick={() => { setOpenDropdown(null); router.push("/games"); }}
                    className="btn btn-secondary w-full px-3 py-2 text-left"
                  >
                    Games
                  </button>
                  <button
                    onClick={() => { setOpenDropdown(null); router.push("/teacher/community"); }}
                    className="btn btn-secondary w-full px-3 py-2 text-left"
                  >
                    Community
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => router.push("/flashcards/classroom")}
              className="btn btn-secondary"
            >
              Classroom
            </button>
          </div>
        </div>
      </header>

      {/* Lesson Tray (sticky) */}
      <section className="sticky top-[72px] z-40 bg-[var(--color-bg-main)] border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-2">
          {editingLessonSetId && (
            <div className="text-sm text-[var(--color-text-muted)]">
              <span className="font-medium mr-2">Editing:</span>
              <span className="font-semibold">{lessonName || "Untitled Lesson"}</span>
            </div>
          )}

          <div className="flex items-center gap-3 overflow-x-auto scroll-smooth">
            {lessonTray.length === 0 && (
              <div className="px-4 py-2 rounded-lg border border-dashed border-black/20 text-sm text-[var(--color-text-muted)] whitespace-nowrap">
                Click flashcards to add
              </div>
            )}

            {lessonTray.map((card, idx) => (
              <div
                key={card.id}
                ref={(el) => { trayItemRefs.current[card.id] = el; }}
                draggable
                onDragStart={(e) => onDragStart(e, idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDrop={(e) => onDrop(e, idx)}
                onDragEnd={onDragEnd}
                tabIndex={0}
                onKeyDown={(e) => onTrayItemKeyDown(e, idx)}
                aria-label={`Tray card ${formatWord(card.word)} — position ${idx + 1}`}
                role="button"
                className={`relative px-3 py-2 rounded-xl border bg-[var(--color-bg-soft)] text-sm whitespace-nowrap select-none transition transform will-change-transform
                  ${draggedIndex === idx ? "opacity-60 scale-95 cursor-grabbing" : "cursor-grab"}
                  ${dragOverIndex === idx && draggedIndex !== null ? "ring-2 ring-dashed ring-[var(--color-accent)]" : ""}`}
                title={`${formatWord(card.word)} — use Left/Right to move, Delete to remove`}
              >
                <span className="text-xs">{formatWord(card.word)}</span>
                <button
                  onClick={() => removeFromLessonTray(card.id)}
                  className="absolute -top-0 -right-2 bg-white rounded-full border shadow p-0.5 hover:bg-red-50"
                  aria-label={`Remove ${formatWord(card.word)} from tray`}
                >
                  <X size={12} className="text-red-500" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {lessonTray.length > 0 && (
              <>
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="btn btn-primary px-4 py-2"
                >
                  Save To Dashboard
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    try {
                      localStorage.setItem("classendo-lesson-tray", JSON.stringify(lessonTray || []));
                      try {
                        window.dispatchEvent(new Event("lesson-tray-updated"));
                      } catch (err) {
                        /* ignore */
                      }
                    } catch (err) {
                      console.error("Failed to set lesson tray for printing:", err);
                    }
                    router.push("/printables?from=flashcards");
                  }}
                  className="btn btn-secondary px-4 py-2 flex items-center gap-2"
                  title="Print lesson"
                >
                  <Printer size={16} />
                  Print
                </button>

                <button
                  onClick={clearLessonTray}
                  className="btn btn-secondary px-3 py-2 text-sm"
                >
                  Remove all
                </button>
              </>
            )}

            {showSavedIndicator && (
              <span className="text-sm text-[var(--color-accent)] font-medium animate-pulse">
                Saved!
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="sticky top-[72px] z-40 bg-[var(--color-bg-main)] border-b border-black/5">
        {/* Search + AI */}
        <div className="mb-8">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    await handleSearch();
                  }
                }}
                placeholder="Select a tab before searching"
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-black/10 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white"
              />
            </div>

            <button
              onClick={handleSearch}
              className="btn btn-primary px-5 py-3 whitespace-nowrap"
            >
              Search
            </button>

            <button
              type="button"
              onClick={() => {
                setResults([]);
                setQuery("");
              }}
              className="btn btn-secondary px-4 py-2 flex items-center gap-2 whitespace-nowrap"
            >
              <X size={16} />
              Clear Grid
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mt-4 relative justify-center">
          {(
            ["noun", "verb", "adjective", "phonics", "preposition"] as const
          ).map((type) => {
            const isSelectedType = activeWordType === type;

            return (
              <div key={type} className="relative" data-dropdown-type={type}>
                <button
                  className={wordTypeButton(isSelectedType)}
                  onClick={() => {
                    setOpenDropdown(openDropdown === type ? null : type);
                    setActiveWordType(type);
                    setActiveTheme(null);
                  }}
                  data-dropdown-btn={type}
                >
                  {activeWordType === type && activeTheme ? activeTheme : type}
                </button>

                {openDropdown === type && (
                  <div className="absolute z-50 mt-2 w-48 rounded-2xl bg-white shadow-lg border p-2 max-h-64 overflow-y-auto overscroll-contain" data-dropdown-type={type}>
                    {THEMES[type].map((theme) => (
                      <button
                        key={theme}
                        onClick={() => {
                          setActiveTheme(theme);
                          setActiveWordType(type);
                          setOpenDropdown(null);
                          setTimeout(() => {
                            handleSearch();
                          }, 0);
                        }}
                          className={`btn w-full px-3 py-2 text-left ${
                            activeTheme === theme ? "btn-primary" : "btn-secondary"
                          }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Results grid */}
{results.length > 0 && (
  <section className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
    {results.map((card) => {
      const key = getCarouselKey(card);
      const images = getCardImages(card);
      const carousel = carouselState[key] || {
        index: 0,
        animating: false,
        direction: "right",
        nextIndex: 0,
        phase: "start",
      };
      const currentIndex = carousel.index ?? 0;
      const currentImage = images[currentIndex] ?? card.image;
      const nextIndex = carousel.nextIndex ?? currentIndex;
      const nextImage = images[nextIndex] ?? currentImage;
      const showLeft = currentIndex > 0;
      const showRight = currentIndex < images.length - 1;

      return (
        <div
          key={card.id}
          onClick={() => addToLessonTray(card)}
          className="group relative cursor-pointer rounded-2xl bg-white p-4 shadow-sm hover:shadow-md transition"
        >
          {lastAddedId === `${card.type}:${card.word}:${getActiveImage(card)}` && (
            <div className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-blue-200 bg-white/95 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm animate-fade-up">
              Added!
            </div>
          )}
          <div className="relative aspect-square rounded-xl bg-[var(--color-bg-card)] mb-3 overflow-hidden">
            <img
              src={currentImage}
              alt={card.word}
              className={`absolute inset-0 h-full w-full object-contain transition-transform duration-300 ${
                carousel.animating
                  ? carousel.direction === "right"
                    ? "-translate-x-full"
                    : "translate-x-full"
                  : "translate-x-0"
              }`}
            />
            {carousel.animating && (
              <img
                src={nextImage}
                alt={card.word}
                onTransitionEnd={() => finishCarouselSlide(card)}
                className="absolute inset-0 h-full w-full object-contain transition-transform duration-300"
                style={{
                  transform:
                    carousel.phase === "start"
                      ? carousel.direction === "right"
                        ? "translateX(100%)"
                        : "translateX(-100%)"
                      : "translateX(0%)",
                }}
              />
            )}

            {showLeft && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startCarouselSlide(card, "left");
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 border shadow px-2 py-1 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Previous image"
              >
                ◀
              </button>
            )}
            {showRight && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startCarouselSlide(card, "right");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 border shadow px-2 py-1 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Next image"
              >
                ▶
              </button>
            )}
          </div>
          <h3 className="font-semibold">{card.word.replaceAll("_", " ")}</h3>

          <p className="text-xs text-[var(--color-text-muted)] capitalize">
            {card.type}
          </p>
        </div>
      );
    })}
  </section>
)}

{/* Empty State (moved to bottom of content) */}
{results.length === 0 && (
  <div className="text-center py-24 text-[var(--color-text-muted)]">
    <p className="text-lg mb-2">Select a tab to load flashcards</p>
  </div>
)}

       {showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl w-[90%] max-w-md p-6">
              <h2 className="text-lg font-semibold mb-4">Save To Dashboard</h2>

              <input
                type="text"
                value={lessonName}
                onChange={(e) => setLessonName(e.target.value)}
                placeholder="Enter lesson name"
                className="w-full mb-3 px-3 py-2 rounded-lg border border-black/10 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />

              {/* Public / Private toggle */}
              <div className="flex items-center justify-between mb-5">
                <label className="flex items-center gap-2 text-sm">
                   <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={() => setIsPublic((p) => !p)}
                    aria-label="Make lesson public"
                    className="w-4 h-4"
                  />
                  <span className="select-none">
                    {isPublic ? "Public — visible in Community" : "Private — only visible to you"}
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setLessonName("");
                    setShowSaveModal(false);
                  }}
                  className="px-4 py-2 rounded-lg border border-black/10 bg-[var(--color-bg-soft)] text-sm hover:bg-white transition"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSaveLesson}
                  className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90 transition"
                >
                  Save Lesson
                </button>
              </div>
            </div>
          </div>
        )}

        {showReplaceConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h3 className="text-lg font-semibold mb-2">Lesson already exists</h3>

              <p className="text-sm text-[var(--color-text-muted)] mb-6">
                A lesson with this name is already saved. Do you want to replace it
                or change the name?
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowReplaceConfirm(false)}
                  className="px-4 py-2 rounded-lg border border-black/10 bg-[var(--color-bg-soft)] text-sm hover:bg-white transition"
                >
                  Change name
                </button>

                <button
                  onClick={replaceLesson}
                  className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90 transition"
                >
                  Replace
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
