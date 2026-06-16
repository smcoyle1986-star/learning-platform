"use client";

import React, { useEffect, useRef } from "react";
import type PhaserNamespace from "phaser";

type PhaserFactoryContext<TApi, TEvent> = {
  Phaser: typeof PhaserNamespace;
  parent: HTMLDivElement;
  width: number;
  height: number;
  emit: (event: TEvent) => void;
  exposeApi: (api: TApi) => void;
};

type PhaserFactoryResult = {
  game: PhaserNamespace.Game;
};

type PhaserGameHostProps<TApi, TEvent> = {
  className?: string;
  createGame: (
    context: PhaserFactoryContext<TApi, TEvent>
  ) => Promise<PhaserFactoryResult> | PhaserFactoryResult;
  onEvent?: (event: TEvent) => void;
  onApiReady?: (api: TApi | null) => void;
};

export default function PhaserGameHost<TApi, TEvent>({
  className,
  createGame,
  onEvent,
  onApiReady,
}: PhaserGameHostProps<TApi, TEvent>) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<PhaserNamespace.Game | null>(null);
  const createGameRef = useRef(createGame);
  const onEventRef = useRef(onEvent);
  const onApiReadyRef = useRef(onApiReady);

  useEffect(() => {
    createGameRef.current = createGame;
    onEventRef.current = onEvent;
    onApiReadyRef.current = onApiReady;
  }, [createGame, onEvent, onApiReady]);

  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let resizeFrame: number | null = null;
    let resizePending: { width: number; height: number } | null = null;
    let detachFullscreenListener: (() => void) | null = null;
    let fullscreenResizeGuardUntil = 0;

    const destroyGameSafely = (game: PhaserNamespace.Game | null) => {
      if (!game) return;
      window.setTimeout(() => {
        try {
          game.destroy(true);
        } catch {
          // ignore shutdown timing errors during route transitions
        }
      }, 0);
    };

    const scheduleResize = (width: number, height: number) => {
      if (width <= 0 || height <= 0) return;
      if (Date.now() < fullscreenResizeGuardUntil) return;
      resizePending = { width, height };
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = null;
        const pending = resizePending;
        resizePending = null;
        if (!pending || disposed || !gameRef.current) return;
        try {
          gameRef.current.scale.resize(pending.width, pending.height);
        } catch {
          // ignore transient WebGL resize errors during fullscreen transitions
        }
      });
    };

    const onFullChange = () => {
      if (disposed || !gameRef.current || !mountRef.current) return;
      fullscreenResizeGuardUntil = Date.now() + 300;
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = window.requestAnimationFrame(() => {
          resizeFrame = null;
          if (disposed || !gameRef.current || !mountRef.current) return;
          const box = mountRef.current.getBoundingClientRect();
          window.setTimeout(() => {
            if (disposed || !gameRef.current || !mountRef.current) return;
            const settledBox = mountRef.current.getBoundingClientRect();
            scheduleResize(
              Math.max(320, Math.floor(settledBox.width || box.width)),
              Math.max(320, Math.floor(settledBox.height || box.height))
            );
          }, 220);
        });
      });
    };

    async function mount() {
      const parent = mountRef.current;
      if (!parent) return;

      const PhaserModule = await import("phaser");
      const Phaser = (PhaserModule.default ?? PhaserModule) as typeof PhaserNamespace;
      if (disposed) return;

      const width = Math.max(320, Math.floor(parent.clientWidth || 960));
      const height = Math.max(320, Math.floor(parent.clientHeight || 540));

      const result = await createGameRef.current({
        Phaser,
        parent,
        width,
        height,
        emit: (event) => onEventRef.current?.(event),
        exposeApi: (api) => onApiReadyRef.current?.(api),
      });
      if (disposed) {
        destroyGameSafely(result.game);
        return;
      }

      gameRef.current = result.game;

      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        const box = entry?.contentRect;
        if (!box || !gameRef.current) return;
        scheduleResize(Math.max(320, Math.floor(box.width)), Math.max(320, Math.floor(box.height)));
      });
      resizeObserver.observe(parent);
      document.addEventListener("fullscreenchange", onFullChange);
      detachFullscreenListener = () => document.removeEventListener("fullscreenchange", onFullChange);
    }

    mount();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      detachFullscreenListener?.();
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      onApiReadyRef.current?.(null);
      if (gameRef.current) {
        destroyGameSafely(gameRef.current);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={className ?? "w-full h-full"}
      style={{ touchAction: "manipulation" }}
    />
  );
}
