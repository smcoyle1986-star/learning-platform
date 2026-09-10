"use client";
import { createContext, useContext } from "react";
import type { GameTopic } from "@/lib/games/topics";
export const GameFlowContext = createContext<{ gameId: string; topic?: GameTopic } | null>(null);
export function useGameFlow() { return useContext(GameFlowContext); }
