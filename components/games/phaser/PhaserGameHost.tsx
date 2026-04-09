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
        result.game.destroy(true);
        return;
      }

      gameRef.current = result.game;

      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        const box = entry?.contentRect;
        if (!box || !gameRef.current) return;
        const nextWidth = Math.max(320, Math.floor(box.width));
        const nextHeight = Math.max(320, Math.floor(box.height));
        gameRef.current.scale.resize(nextWidth, nextHeight);
      });
      resizeObserver.observe(parent);
    }

    mount();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      onApiReadyRef.current?.(null);
      if (gameRef.current) {
        gameRef.current.destroy(true);
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
