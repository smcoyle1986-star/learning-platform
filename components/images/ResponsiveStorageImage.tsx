"use client";

import { useMemo, useState, type CSSProperties, type ReactEventHandler, type SyntheticEvent, type TransitionEventHandler } from "react";
import { getResponsiveImageUrl } from "@/lib/images/storage";

function retryImageSource(event: SyntheticEvent<HTMLImageElement>, originalSrc: string) {
  const image = event.currentTarget;
  if (image.dataset.originalAttempted !== "true") {
    image.dataset.originalAttempted = "true";
  }

  let source: URL;
  try {
    source = new URL(originalSrc, window.location.href);
  } catch {
    return;
  }
  const match = source.pathname.match(/\.(png|jpe?g|webp)$/i);
  if (!match) return;
  const formats = ["webp", "png", "jpg", "jpeg"];
  const tried = new Set((image.dataset.triedFormats ?? "").split(",").filter(Boolean));
  tried.add(match[1].toLowerCase());
  const next = formats.find((format) => !tried.has(format));
  if (!next) return;
  tried.add(next);
  image.dataset.triedFormats = Array.from(tried).join(",");
  source.pathname = source.pathname.replace(/\.(png|jpe?g|webp)$/i, `.${next}`);
  image.src = source.toString();
  image.srcset = "";
}

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
 * Uses pre-generated public WebP assets for vocabulary artwork. Landing images
 * retain their existing application proxy; legacy and uploaded sources keep
 * their direct URL. An original image is always available as a safe fallback.
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
  // Store the failed source rather than a boolean. A new card naturally gets
  // a fresh static-asset attempt without synchronously resetting state in an
  // effect, while a missing derivative safely falls back to its master image.
  const [failedStaticSource, setFailedStaticSource] = useState<string | null>(null);
  const useOriginal = failedStaticSource === src;

  const candidates = useMemo(
    () => Array.from(new Set(widths))
      .filter((width) => Number.isFinite(width) && width > 0)
      .sort((left, right) => left - right)
      .map((width) => ({ width, url: getResponsiveImageUrl(src, width, quality) }))
      .filter((candidate): candidate is { width: number; url: string } => Boolean(candidate.url)),
    [quality, src, widths],
  );

  if (useOriginal || candidates.length === 0) {
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
        onError={(event) => retryImageSource(event, src)}
        onLoad={onLoad}
        onTransitionEnd={onTransitionEnd}
      />
    );
  }

  const largest = candidates[candidates.length - 1];
  return (
    <img
      src={largest.url}
      srcSet={candidates.map(({ url, width }) => `${url} ${width}w`).join(", ")}
      alt={alt}
      className={className}
      sizes={sizes}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
      style={style}
      onError={() => setFailedStaticSource(src)}
      onLoad={onLoad}
      onTransitionEnd={onTransitionEnd}
    />
  );
}
