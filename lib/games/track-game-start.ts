"use client";

export function trackGameStart(gameKey: string) {
  const cleanKey = String(gameKey ?? "").trim();
  if (!cleanKey) return;

  try {
    fetch("/api/games/track-play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameKey: cleanKey }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Ignore tracking failures so gameplay keeps moving.
  }
}
