"use client";

import type { CSSProperties, ReactEventHandler, TransitionEventHandler } from "react";
import { getOptimizedImageUrl } from "@/lib/images/storage";

type ResponsiveStorageImageProps = {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
  widths: number[];
  quality?: number;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  style?: CSSProperties;
  onLoad?: ReactEventHandler<HTMLImageElement>;
  onTransitionEnd?: TransitionEventHandler<HTMLImageElement>;
};

/**
 * Uses Supabase's CDN transforms only for public Classendo artwork. Other URLs
 * (uploads, blobs, data URLs, or legacy sources) deliberately keep their
 * existing delivery path so no current card can be broken by this optimization.
 */
export function ResponsiveStorageImage({
  src,
  alt,
  className,
  sizes,
  widths,
  quality = 72,
  loading = "lazy",
  fetchPriority = "auto",
  style,
  onLoad,
  onTransitionEnd,
}: ResponsiveStorageImageProps) {
  const candidates = Array.from(new Set(widths))
    .filter((width) => Number.isFinite(width) && width > 0)
    .sort((left, right) => left - right)
    .map((width) => ({ width, url: getOptimizedImageUrl(src, width, quality) }))
    .filter((candidate): candidate is { width: number; url: string } => Boolean(candidate.url));

  if (candidates.length === 0) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        sizes={sizes}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        style={style}
        onLoad={onLoad}
        onTransitionEnd={onTransitionEnd}
      />
    );
  }

  const largest = candidates[candidates.length - 1];
  return (
    <picture>
      <source
        type="image/webp"
        sizes={sizes}
        srcSet={candidates.map(({ url, width }) => `${url} ${width}w`).join(", ")}
      />
      <img
        src={largest.url}
        alt={alt}
        className={className}
        sizes={sizes}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        style={style}
        onLoad={onLoad}
        onTransitionEnd={onTransitionEnd}
      />
    </picture>
  );
}
