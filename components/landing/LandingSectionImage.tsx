"use client";

import { useEffect, useRef, useState } from "react";
import { ResponsiveStorageImage } from "@/components/images/ResponsiveStorageImage";

type ExpandedImage = { src: string; alt: string };

export function LandingSectionImage({ path, alt, version = "2026-09-06" }: { path: string; alt: string; version?: string }) {
  const [expandedImage, setExpandedImage] = useState<ExpandedImage | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const src = `/api/landing-image?path=${encodeURIComponent(path)}&v=${encodeURIComponent(version)}`;

  useEffect(() => {
    const target = containerRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!expandedImage) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpandedImage(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [expandedImage]);

  return (
    <>
      <button
        type="button"
        onClick={() => setExpandedImage({ src, alt })}
        className="group block w-full touch-manipulation cursor-zoom-in rounded-[2rem] text-left outline-none transition-transform duration-200 hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-[#86a96a]/50"
        aria-label={`Expand ${alt}`}
      >
        <span ref={containerRef} className="block aspect-[3/2] rounded-[2rem] border-[3px] border-[#d8e6ce] bg-[#fcfcf8] p-3 shadow-[0_16px_40px_rgba(54,64,46,0.08)] transition-shadow duration-200 group-hover:shadow-[0_22px_48px_rgba(54,64,46,0.16)]">
          {shouldLoad ? (
            <ResponsiveStorageImage
              src={src}
              alt={alt}
              className="block h-full w-full rounded-[1.35rem] object-contain"
              sizes="(max-width: 1023px) calc(100vw - 2rem), 60vw"
              widths={[480, 768, 1024]}
              loading="lazy"
            />
          ) : null}
        </span>
      </button>

      {expandedImage ? (
        <button
          type="button"
          onClick={() => setExpandedImage(null)}
          className="fixed inset-0 z-[200] flex touch-manipulation cursor-zoom-out items-center justify-center bg-[#182016]/90 p-4 outline-none sm:p-8"
          aria-label="Close fullscreen image"
        >
          <img
            src={expandedImage.src}
            alt={expandedImage.alt}
            className="h-auto w-full max-h-[calc(100dvh-2rem)] max-w-[calc(100dvw-2rem)] rounded-2xl object-contain shadow-2xl sm:max-h-[calc(100dvh-4rem)] sm:max-w-[calc(100dvw-4rem)]"
          />
          <span className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white">
            Tap, click, or press Escape to close
          </span>
        </button>
      ) : null}
    </>
  );
}
