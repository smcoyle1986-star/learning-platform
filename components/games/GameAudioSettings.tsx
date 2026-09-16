"use client";

import { useState } from "react";
import { gameAudio } from "@/lib/games/audio/game-audio";

export default function GameAudioSettings() {
  const [settings, setSettings] = useState(() => gameAudio.settings);
  const sync = () => setSettings({ ...gameAudio.settings });

  return (
    <section className="mt-4 border-t border-black/8 pt-4" aria-label="Audio settings">
      <h3 className="mb-3 text-sm font-bold">Audio</h3>
      <label className="mb-3 flex items-center justify-between gap-3 font-semibold">
        <span>Music</span>
        <input type="checkbox" checked={settings.musicEnabled} onChange={() => { gameAudio.setMusicEnabled(!settings.musicEnabled); sync(); }} />
      </label>
      <label className="mb-4 grid gap-1 text-xs font-semibold text-slate-600">
        Music volume ({Math.round(settings.musicVolume * 100)}%)
        <input type="range" min="0" max="1" step="0.01" value={settings.musicVolume} onChange={(event) => { gameAudio.setMusicVolume(Number(event.target.value)); sync(); }} />
      </label>
      <label className="mb-3 flex items-center justify-between gap-3 font-semibold">
        <span>Sound effects</span>
        <input type="checkbox" checked={settings.sfxEnabled} onChange={() => { gameAudio.setSfxEnabled(!settings.sfxEnabled); sync(); }} />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">
        Effects volume ({Math.round(settings.sfxVolume * 100)}%)
        <input type="range" min="0" max="1" step="0.01" value={settings.sfxVolume} onChange={(event) => { gameAudio.setSfxVolume(Number(event.target.value)); sync(); }} />
      </label>
    </section>
  );
}
