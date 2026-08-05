"use client";

import { useEffect, useState } from "react";
import { SupabaseClient, User } from "@supabase/supabase-js";

import {
  findExistingLessonIdByName,
  LessonNameConflictError,
  loadLessonMetadata,
  saveLessonFromClient,
} from "@/lib/lessons/repository";
import { writeLastSavedTray } from "@/lib/lessons/tray";
import { LessonCard } from "@/lib/lessons/types";

export function useFlashcardLessonSave(params: {
  supabase: SupabaseClient;
  user: User | null;
  lessonTray: LessonCard[];
}) {
  const { supabase, user, lessonTray } = params;

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [lessonName, setLessonName] = useState("");
  const [nameError, setNameError] = useState("");
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [existingLessonId, setExistingLessonId] = useState<string | null>(null);
  const [showSaveLimitModal, setShowSaveLimitModal] = useState(false);
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [editingLessonSetId, setEditingLessonSetId] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [lastSavedTray, setLastSavedTray] = useState<LessonCard[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (showSaveModal && !editingLessonSetId) {
      setIsPublic(true);
    }
  }, [showSaveModal, editingLessonSetId]);

  useEffect(() => {
    const hasChanges =
      lessonTray.length !== lastSavedTray.length ||
      lessonTray.some((card) => !lastSavedTray.find((saved) => saved.id === card.id));

    setHasUnsavedChanges(hasChanges);
  }, [lessonTray, lastSavedTray]);

  useEffect(() => {
    if (!editingLessonSetId) return;

    (async () => {
      try {
        const data = await loadLessonMetadata(supabase, editingLessonSetId);
        if (data?.name) {
          setLessonName(data.name);
          setIsPublic(Boolean(data.is_public ?? true));
        }
      } catch (error) {
        console.error("Failed to load lesson_set name/is_public for editing:", error);
      }
    })();
  }, [editingLessonSetId, supabase]);

  function markSaved() {
    setLastSavedTray([...lessonTray]);
    writeLastSavedTray(lessonTray);
    setShowSavedIndicator(true);
    setTimeout(() => setShowSavedIndicator(false), 2000);
  }

  function finishSave() {
    setLessonName("");
    setNameError("");
    setExistingLessonId(null);
    setShowSaveModal(false);
    setIsPublic(true);
    setEditingLessonSetId(null);
  }

  function isDashboardSaveLimitError(error: unknown) {
    const message = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
    return /free accounts can save up to \d+ (dashboard resources|lesson sets|worksheets)/.test(message);
  }

  function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Save failed. Please try again.";
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

      if (!editingLessonSetId) {
        const existingId = await findExistingLessonIdByName(supabase, user.id, trimmedName);
        if (existingId) {
          setExistingLessonId(existingId);
          setShowReplaceConfirm(true);
          return;
        }
      }

      await saveLessonFromClient(supabase, {
        lessonId: editingLessonSetId,
        userId: user.id,
        name: trimmedName,
        isPublic,
        cards: lessonTray,
      });

      markSaved();
      finishSave();
      setShowSaveSuccessModal(true);
    } catch (error: unknown) {
      if (error instanceof LessonNameConflictError) {
        if (error.existingLessonId) {
          setExistingLessonId(error.existingLessonId);
          setShowReplaceConfirm(true);
        } else {
          setNameError("A lesson with this name already exists. Choose a different name.");
        }
        return;
      }
      if (isDashboardSaveLimitError(error)) {
        setShowSaveModal(false);
        setNameError("");
        setShowSaveLimitModal(true);
        return;
      }
      console.error("Save failed:", error);
      setNameError(getErrorMessage(error));
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

      await saveLessonFromClient(supabase, {
        lessonId: existingLessonId,
        userId: user.id,
        name: lessonName.trim(),
        isPublic,
        cards: lessonTray,
      });

      setShowReplaceConfirm(false);
      setExistingLessonId(null);
      markSaved();
      finishSave();
      setShowSaveSuccessModal(true);
    } catch (error: unknown) {
      if (isDashboardSaveLimitError(error)) {
        setShowReplaceConfirm(false);
        setNameError("");
        setShowSaveLimitModal(true);
        return;
      }
      console.error("Replace failed:", error);
      setNameError(error instanceof Error ? error.message : "Replace failed. Please try again.");
    }
  }

  return {
    showSaveModal,
    setShowSaveModal,
    lessonName,
    setLessonName,
    nameError,
    showReplaceConfirm,
    setShowReplaceConfirm,
    showSaveLimitModal,
    setShowSaveLimitModal,
    showSaveSuccessModal,
    setShowSaveSuccessModal,
    showSavedIndicator,
    editingLessonSetId,
    setEditingLessonSetId,
    isPublic,
    setIsPublic,
    lastSavedTray,
    setLastSavedTray,
    hasUnsavedChanges,
    handleSaveLesson,
    replaceLesson,
  };
}
