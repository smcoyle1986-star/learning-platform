"use client";

import React, { useEffect, useRef } from "react";

type Tool = "pen" | "eraser" | "none";

type Props = {
  cardKey: string;
  tool: Tool;
  color: string;
  size: number;
  // drawingsRef is a mutable ref (Map) shared with the page; we store data URLs here
  drawingsRef: React.MutableRefObject<Map<string, string>>;
};

export default function ClassroomCanvas({ cardKey, tool, color, size, drawingsRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  // Resize canvas to parent size and restore drawing if present
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!(parent instanceof HTMLElement)) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parentEl: HTMLElement = parent;
    const ctx2: CanvasRenderingContext2D = ctx;
    const canvasEl: HTMLCanvasElement = canvas;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.floor(parentEl.clientWidth));
      const h = Math.max(1, Math.floor(parentEl.clientHeight));

      // set CSS size
      canvasEl.style.width = `${w}px`;
      canvasEl.style.height = `${h}px`;

      // set backing store size
      canvasEl.width = Math.floor(w * dpr);
      canvasEl.height = Math.floor(h * dpr);

      // reset transform then scale for DPR
      ctx2.setTransform(1, 0, 0, 1, 0, 0);
      ctx2.scale(dpr, dpr);

      // Clear then restore existing drawing for this card if available
      ctx2.clearRect(0, 0, w, h);
      const dataUrl = drawingsRef.current.get(cardKey);
      if (dataUrl) {
        const img = new Image();
        img.onload = () => {
          try {
            ctx2.drawImage(img, 0, 0, w, h);
          } catch (e) {
            // ignore cross-origin or decode errors
          }
        };
        img.src = dataUrl;
      }
    }

    // initial resize + observe
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parentEl);

    return () => {
      ro.disconnect();
    };
    // cardKey intentionally in deps so drawing for a card is restored when key changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardKey]);

  // Pointer event handlers — only attach when tool is active (pen or eraser)
  useEffect(() => {
    if (tool === "none") return; // don't attach handlers if drawing disabled

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const canvasEl: HTMLCanvasElement = canvas;
    const ctx2: CanvasRenderingContext2D = ctx;

    function getCoords(e: PointerEvent) {
      const rect = canvasEl.getBoundingClientRect();
      const x = "clientX" in e ? e.clientX - rect.left : 0;
      const y = "clientY" in e ? e.clientY - rect.top : 0;
      return { x, y };
    }

    function setStroke(context: CanvasRenderingContext2D) {
      context.lineJoin = "round";
      context.lineCap = "round";
      context.lineWidth = Math.max(1, size);
      if (tool === "eraser") {
        context.globalCompositeOperation = "destination-out";
        context.strokeStyle = "rgba(0,0,0,1)";
      } else {
        context.globalCompositeOperation = "source-over";
        context.strokeStyle = color || "#000";
      }
    }

    function onPointerDown(e: PointerEvent) {
      // only left button or touch
      if (e instanceof PointerEvent && e.button !== 0 && e.pointerType !== "touch") return;
      drawing.current = true;
      try {
        canvasEl.setPointerCapture?.(e.pointerId);
      } catch {}
      const coords = getCoords(e);
      last.current = coords;
      setStroke(ctx2);
      ctx2.beginPath();
      ctx2.moveTo(coords.x, coords.y);
      e.preventDefault();
    }

    function onPointerMove(e: PointerEvent) {
      if (!drawing.current || !last.current) return;
      const coords = getCoords(e);
      setStroke(ctx2);
      ctx2.lineTo(coords.x, coords.y);
      ctx2.stroke();
      last.current = coords;
      e.preventDefault();
    }

    function endDrawing(e: PointerEvent) {
      if (!drawing.current) return;
      drawing.current = false;
      try {
        canvasEl.releasePointerCapture?.((e as PointerEvent).pointerId);
      } catch {}
      last.current = null;

      // Save drawing as dataURL for current card
      try {
        const w = canvasEl.clientWidth;
        const h = canvasEl.clientHeight;
        const tmp = document.createElement("canvas");
        tmp.width = w;
        tmp.height = h;
        const tctx = tmp.getContext("2d");
        if (tctx) {
          // draw current canvas scaled down to CSS pixels
          tctx.drawImage(canvasEl as CanvasImageSource, 0, 0, w, h);
          const dataUrl = tmp.toDataURL("image/png");
          drawingsRef.current.set(cardKey, dataUrl);
        }
      } catch (err) {
        console.warn("Failed to save drawing:", err);
      }

      e.preventDefault();
    }

    // attach pointer handlers
    canvasEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrawing);
    window.addEventListener("pointercancel", endDrawing);

    return () => {
      canvasEl.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrawing);
      window.removeEventListener("pointercancel", endDrawing);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardKey, tool, color, size]);

  // pointer-events on canvas: disabled when tool === "none", enabled otherwise
  const pointerClass = tool === "none" ? "pointer-events-none" : "pointer-events-auto";

  return (
    // absolute inset so it covers parent image area. z-10 keeps it under toolbar (toolbar has z-40).
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full z-10 ${pointerClass}`}
      style={{ touchAction: "none" }}
    />
  );
}