"use client";

import { useRef, useState } from "react";

import { TrayItem } from "@/lib/flashcards/types";

export function useLessonTrayInteractions(params: {
  lessonTray: TrayItem[];
  setLessonTray: React.Dispatch<React.SetStateAction<TrayItem[]>>;
  removeFromLessonTray: (id: string) => void;
}) {
  const { lessonTray, setLessonTray, removeFromLessonTray } = params;

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const trayItemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function captureRects() {
    const map: Record<string, DOMRect> = {};
    lessonTray.forEach((card) => {
      const element = trayItemRefs.current[card.id];
      if (element) map[card.id] = element.getBoundingClientRect();
    });
    return map;
  }

  function animateFlip(oldRects: Record<string, DOMRect>, newRects: Record<string, DOMRect>) {
    Object.keys(newRects).forEach((id) => {
      const element = trayItemRefs.current[id];
      const oldRect = oldRects[id];
      const newRect = newRects[id];
      if (!element || !oldRect || !newRect) return;

      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top - newRect.top;
      if (dx === 0 && dy === 0) return;

      element.style.transition = "none";
      element.style.transform = `translate(${dx}px, ${dy}px)`;
      void element.offsetWidth;
      element.style.transition = "transform 260ms cubic-bezier(.2,.9,.3,1)";
      element.style.transform = "";
      const cleanup = () => {
        element.style.transition = "";
        element.style.transform = "";
        element.removeEventListener("transitionend", cleanup);
      };
      element.addEventListener("transitionend", cleanup);
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
          const element = trayItemRefs.current[id];
          if (element) newRects[id] = element.getBoundingClientRect();
        });
        animateFlip(oldRects, newRects);
      });
    });
  }

  function onDragStart(event: React.DragEvent, index: number) {
    setDraggedIndex(index);
    try {
      event.dataTransfer.setData("text/plain", String(index));
      event.dataTransfer.effectAllowed = "move";
    } catch {}
  }

  function onDragOver(event: React.DragEvent, index: number) {
    event.preventDefault();
    setDragOverIndex(index);
  }

  function onDrop(event: React.DragEvent, index: number) {
    event.preventDefault();
    const from =
      draggedIndex ?? parseInt(event.dataTransfer.getData("text/plain") || "-1", 10);
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

  function onTrayItemKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      if (index > 0) {
        reorderWithAnimation(index, index - 1);
        setTimeout(() => {
          const movedId = lessonTray[index - 1]?.id;
          trayItemRefs.current[movedId ?? ""]?.focus();
        }, 260);
      }
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      if (index < lessonTray.length - 1) {
        reorderWithAnimation(index, index + 1);
        setTimeout(() => {
          const movedId = lessonTray[index + 1]?.id;
          trayItemRefs.current[movedId ?? ""]?.focus();
        }, 260);
      }
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      const id = lessonTray[index]?.id;
      if (id) removeFromLessonTray(id);
    }
  }

  return {
    draggedIndex,
    dragOverIndex,
    trayItemRefs,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    onTrayItemKeyDown,
  };
}
