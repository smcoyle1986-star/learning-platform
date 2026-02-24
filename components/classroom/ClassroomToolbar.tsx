"use client";

import React from "react";

type Tool = "pen" | "eraser" | "none";

type Props = {
  tool: Tool;
  setTool: (t: Tool) => void;
  color: string;
  setColor: (c: string) => void;
  size: number;
  setSize: (n: number) => void;
  clearCanvas: () => void;
  orientation?: "vertical" | "horizontal"; // new prop
};

const COLORS = ["#ef4444", "#2563eb", "#16a34a", "#000000"];
const SIZES = [4, 8, 14];

/**
 * ClassroomToolbar
 * - orientation="vertical" (default): the original floating column used in the image area
 * - orientation="horizontal": compact inline toolbar intended for header placement
 */
export default function ClassroomToolbar({
  tool,
  setTool,
  color,
  setColor,
  size,
  setSize,
  clearCanvas,
  orientation = "vertical",
}: Props) {
  if (orientation === "horizontal") {
    // compact header style
    return (
      <div className="flex items-center gap-2 bg-[var(--color-bg-card)] border border-black/5 rounded-full px-2 py-1 shadow-sm">
        {/* Tool toggles as small pills */}
        <button
          onClick={() => setTool(tool === "pen" ? "none" : "pen")}
          className={`px-3 py-1 rounded-full text-sm font-medium transition ${
            tool === "pen" ? "bg-[var(--color-primary)] text-white" : "bg-white text-[var(--color-text-main)]"
          }`}
          aria-pressed={tool === "pen"}
          title="Pen (toggle)"
        >
          ✏️
        </button>

        <button
          onClick={() => setTool(tool === "eraser" ? "none" : "eraser")}
          className={`px-3 py-1 rounded-full text-sm font-medium transition ${
            tool === "eraser" ? "bg-[var(--color-primary)] text-white" : "bg-white text-[var(--color-text-main)]"
          }`}
          aria-pressed={tool === "eraser"}
          title="Eraser (toggle)"
        >
          🧽
        </button>

        {/* Color swatches (small) */}
        <div className="flex items-center gap-1 pl-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-6 h-6 rounded-full border"
              style={{
                backgroundColor: c,
                outline: c === color ? "2px solid rgba(0,0,0,0.75)" : "none",
              }}
              aria-label={`Set color ${c}`}
              title={`Color ${c}`}
            />
          ))}
        </div>

        {/* Sizes */}
        <div className="flex items-center gap-1">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`px-2 py-1 rounded-full text-sm ${
                size === s ? "bg-[var(--color-primary)] text-white" : "bg-white text-[var(--color-text-main)]"
              }`}
              aria-pressed={size === s}
              title={`Size ${s}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Clear */}
        <button
          onClick={clearCanvas}
          className="ml-1 px-3 py-1 rounded-full text-sm bg-red-50 text-red-600 border"
          title="Clear drawing"
        >
          Clear
        </button>
      </div>
    );
  }

  // vertical (existing) layout — kept for backward compatibility
  return (
    // Caller should position wrapper; this is the content container
    <div className="z-40 bg-white rounded-2xl shadow-lg border border-black/10 p-3 space-y-3">
      {/* Tool toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setTool(tool === "pen" ? "none" : "pen")}
          className={`px-3 py-1 rounded-lg text-sm ${
            tool === "pen" ? "bg-black text-white" : "bg-gray-100"
          }`}
        >
          ✏️
        </button>
        <button
          onClick={() => setTool(tool === "eraser" ? "none" : "eraser")}
          className={`px-3 py-1 rounded-lg text-sm ${
            tool === "eraser" ? "bg-black text-white" : "bg-gray-100"
          }`}
        >
          🧽
        </button>
      </div>

      {/* Colors */}
      <div className="flex gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className="w-6 h-6 rounded-full border"
            style={{
              backgroundColor: c,
              outline: c === color ? "2px solid black" : "none",
            }}
          />
        ))}
      </div>

      {/* Sizes */}
      <div className="flex gap-2">
        {SIZES.map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className={`px-2 py-1 rounded text-sm ${
              size === s ? "bg-black text-white" : "bg-gray-100"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Clear */}
      <button
        onClick={clearCanvas}
        className="w-full text-sm bg-red-50 text-red-600 rounded-lg py-1"
      >
        Clear
      </button>
    </div>
  );
}