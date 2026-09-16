export type GameAudioKey =
  | "four-corners"
  | "kaboom"
  | "connect-four"
  | "memory-flip"
  | "image-reveal"
  | "yes-or-no"
  | "choose-your-side"
  | "spin-and-speak"
  | "conquer"
  | "whack-a-word";

export type GameAudioMode = "idle" | "playing" | "countdown" | "success" | "failure";

export type GameAudioEffect =
  | "ui-click"
  | "game-start"
  | "card-flip"
  | "reveal"
  | "correct"
  | "incorrect"
  | "bomb"
  | "winner"
  | "falling"
  | "spinning"
  | "points-spin";

const SFX_VOLUME_KEY = "classendo-game-sfx-volume";
const DEFAULT_MUSIC_VOLUME = 0.3;
const DEFAULT_SFX_VOLUME = 0.4;
const SFX_ENABLED_KEY = "classendo-game-sfx-enabled";

const effectFiles: Record<GameAudioEffect, string> = {
  "ui-click": "ui-click.mp3",
  "game-start": "game-start.mp3",
  "card-flip": "card-flip.mp3",
  reveal: "reveal.mp3",
  correct: "correct.mp3",
  incorrect: "incorrect.mp3",
  bomb: "bomb.mp3",
  winner: "winner.mp3",
  falling: "falling.mp3",
  spinning: "spinning.mp3",
  "points-spin": "points-spin.mp3",
};

function readNumber(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

function readBoolean(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  return value === null ? fallback : value === "true";
}

class GameAudioEngine {
  private music?: HTMLAudioElement;
  private readonly effects = new Map<GameAudioEffect, HTMLAudioElement>();
  private readonly loopingEffects = new Map<GameAudioEffect, HTMLAudioElement>();
  private game?: GameAudioKey;
  private mode: GameAudioMode = "idle";
  private musicVolume = DEFAULT_MUSIC_VOLUME;
  private sfxVolume = DEFAULT_SFX_VOLUME;
  private musicEnabled = true;
  private sfxEnabled = true;

  constructor() {
    this.musicVolume = DEFAULT_MUSIC_VOLUME;
    this.sfxVolume = readNumber(SFX_VOLUME_KEY, DEFAULT_SFX_VOLUME);
    this.sfxEnabled = readBoolean(SFX_ENABLED_KEY, true);
    if (typeof window !== "undefined") {
      (Object.keys(effectFiles) as GameAudioEffect[]).forEach((effect) => {
        const audio = new Audio(`/audio/${effectFiles[effect]}`);
        audio.preload = "auto";
        this.effects.set(effect, audio);
      });
    }
  }

  get settings() {
    return {
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      musicEnabled: this.musicEnabled,
      sfxEnabled: this.sfxEnabled,
    };
  }

  setGame(game: GameAudioKey) {
    if (this.game === game && this.music) return;
    this.stopMusic();
    this.game = game;
    this.musicVolume = DEFAULT_MUSIC_VOLUME;
    this.musicEnabled = true;
    this.music = new Audio(`/audio/${game}.mp3`);
    this.music.loop = true;
    this.music.preload = "auto";
    this.applyMusicSettings();
  }

  setMode(mode: GameAudioMode) {
    this.mode = mode;
    if (this.music) {
      this.music.playbackRate = 1;
      this.music.preservesPitch = true;
    }
  }

  unlock() {
    if (!this.musicEnabled || !this.music) return;
    void this.music.play().catch(() => {});
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (enabled) this.unlock();
    else this.pauseMusic();
  }

  setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
    if (!enabled) {
      for (const effect of this.loopingEffects.keys()) this.stopLoop(effect);
    }
    window.localStorage.setItem(SFX_ENABLED_KEY, String(enabled));
  }

  setMusicVolume(volume: number) {
    this.musicVolume = Math.min(1, Math.max(0, volume));
    this.applyMusicSettings();
  }

  setSfxVolume(volume: number) {
    this.sfxVolume = Math.min(1, Math.max(0, volume));
    for (const audio of this.loopingEffects.values()) audio.volume = this.sfxVolume;
    window.localStorage.setItem(SFX_VOLUME_KEY, String(this.sfxVolume));
  }

  playEffect(effect: GameAudioEffect) {
    if (!this.sfxEnabled) return;
    const template = this.effects.get(effect);
    const audio = template ? template.cloneNode(true) as HTMLAudioElement : new Audio(`/audio/${effectFiles[effect]}`);
    audio.volume = this.sfxVolume;
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  }

  playLoop(effect: GameAudioEffect) {
    if (!this.sfxEnabled || this.loopingEffects.has(effect)) return;
    const template = this.effects.get(effect);
    const audio = template ? template.cloneNode(true) as HTMLAudioElement : new Audio(`/audio/${effectFiles[effect]}`);
    audio.loop = true;
    audio.volume = this.sfxVolume;
    audio.currentTime = 0;
    this.loopingEffects.set(effect, audio);
    void audio.play().catch(() => {});
  }

  stopLoop(effect: GameAudioEffect) {
    const audio = this.loopingEffects.get(effect);
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    this.loopingEffects.delete(effect);
  }

  stopMusic() {
    if (!this.music) return;
    this.music.pause();
    this.music.currentTime = 0;
  }

  pauseMusic() {
    this.music?.pause();
  }

  dispose() {
    this.stopMusic();
    for (const effect of this.loopingEffects.keys()) this.stopLoop(effect);
    this.music = undefined;
  }

  private applyMusicSettings() {
    if (!this.music) return;
    this.music.volume = this.musicEnabled ? this.musicVolume : 0;
    this.music.playbackRate = 1;
    this.music.preservesPitch = true;
  }
}

export const gameAudio = new GameAudioEngine();
