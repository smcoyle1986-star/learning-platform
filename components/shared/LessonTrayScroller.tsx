"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

type LessonTrayScrollerProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function LessonTrayScroller({
  children,
  className = "",
  contentClassName = "",
}: LessonTrayScrollerProps) {
  const THUMB_SIZE = 28;
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const dragStartXRef = useRef<number>(0);
  const dragStartScrollRef = useRef<number>(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [isRailHovered, setIsRailHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [railWidth, setRailWidth] = useState(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const sync = () => {
      const nextMax = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      setMaxScroll(nextMax);
      setHasOverflow(nextMax > 0);
      setScrollLeft(viewport.scrollLeft);
      setRailWidth(railRef.current?.clientWidth ?? 0);
    };

    sync();

    const onScroll = () => setScrollLeft(viewport.scrollLeft);
    viewport.addEventListener("scroll", onScroll, { passive: true });

    const resizeObserver = new ResizeObserver(sync);
    resizeObserver.observe(viewport);
    resizeObserver.observe(content);

    return () => {
      viewport.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
    };
  }, [children]);

  const thumbRatio = hasOverflow && maxScroll > 0 ? Math.min(Math.max(scrollLeft / maxScroll, 0), 1) : 0;
  const thumbTravel = Math.max(0, railWidth - THUMB_SIZE);
  const thumbLeft = thumbRatio * thumbTravel;

  const updateScrollFromClientX = (clientX: number) => {
    const rail = railRef.current;
    const viewport = viewportRef.current;
    if (!rail || !viewport || maxScroll <= 0) return;

    const rect = rail.getBoundingClientRect();
    const usableWidth = Math.max(1, rect.width - THUMB_SIZE);
    const deltaX = clientX - dragStartXRef.current;
    const nextScroll = dragStartScrollRef.current + (deltaX / usableWidth) * maxScroll;
    viewport.scrollLeft = nextScroll;
    setScrollLeft(nextScroll);
  };

  const handleTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    setIsDragging(true);
    activePointerIdRef.current = event.pointerId;
    dragStartXRef.current = event.clientX;
    dragStartScrollRef.current = viewportRef.current?.scrollLeft ?? 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleTrackPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || activePointerIdRef.current !== event.pointerId) return;
    updateScrollFromClientX(event.clientX);
  };

  const handleTrackPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) return;
    setIsDragging(false);
    activePointerIdRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full min-w-0">
      <div
        ref={viewportRef}
        className={`lesson-tray-scroll overflow-x-auto overflow-y-hidden scroll-smooth ${className}`}
        style={{ scrollBehavior: isDragging ? "auto" : "smooth" }}
      >
        <div ref={contentRef} className={`flex w-max min-w-full items-center gap-2 [&>*]:shrink-0 ${contentClassName}`}>
          {children}
        </div>
      </div>

      {hasOverflow ? (
        <div className="mt-2">
          <div
            ref={railRef}
            className={`lesson-tray-rail relative h-5 w-full rounded-full ${isRailHovered || isDragging ? "is-active" : ""}`}
            onPointerEnter={() => setIsRailHovered(true)}
            onPointerLeave={() => setIsRailHovered(false)}
            onPointerDown={handleTrackPointerDown}
            onPointerMove={handleTrackPointerMove}
            onPointerUp={handleTrackPointerUp}
            onPointerCancel={handleTrackPointerUp}
            role="scrollbar"
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={maxScroll}
            aria-valuenow={Math.round(scrollLeft)}
            aria-valuetext="Lesson tray scroll bar"
            tabIndex={0}
          >
            <div className="lesson-tray-rail-track absolute inset-0 rounded-full" />
            <button
              type="button"
              className={`lesson-tray-thumb pointer-events-none absolute top-1/2 h-7 w-7 -translate-y-1/2 rounded-full shadow-md ${isDragging ? "is-dragging" : ""}`}
              style={{
                left: `${thumbLeft}px`,
              }}
              aria-hidden="true"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
