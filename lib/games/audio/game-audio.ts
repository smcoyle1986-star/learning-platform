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
  | "falling";

const SFX_VOLUME_KEY = "classendo-game-sfx-volume";
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
  private game?: GameAudioKey;
  private mode: GameAudioMode = "idle";
  private musicVolume = 0.4;
  private sfxVolume = 0.4;
  private musicEnabled = true;
  private sfxEnabled = true;

  constructor() {
    this.musicVolume = 0.4;
    this.sfxVolume = readNumber(SFX_VOLUME_KEY, 0.4);
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
    this.musicVolume = 0.4;
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
    window.localStorage.setItem(SFX_ENABLED_KEY, String(enabled));
  }

  setMusicVolume(volume: number) {
    this.musicVolume = Math.min(1, Math.max(0, volume));
    this.applyMusicSettings();
  }

  setSfxVolume(volume: number) {
    this.sfxVolume = Math.min(1, Math.max(0, volume));
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
