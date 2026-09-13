import type Phaser from "phaser";
import type { PhaserVocabCard } from "@/lib/games/phaser/types";
import { makeTextureKey } from "@/lib/games/phaser/types";
import { PHASER_UI_FONT, waitForPhaserStudentFont } from "@/lib/games/phaser/ui-theme";

export type WhackDifficulty = "easy" | "medium" | "hard";
export type WhackMode = "idle" | "playing";

export type WhackSceneState = {
  cards: PhaserVocabCard[];
  targetCard: PhaserVocabCard | null;
  mode: WhackMode;
  useImages: boolean;
  difficulty: WhackDifficulty;
  reducedMotion: boolean;
  teacherMarkedCorrect: boolean;
};

export type WhackSceneEvent =
  | {
      type: "hit";
      cardId: string;
      isTarget: boolean;
    };

export type WhackSceneApi = {
  sync: (next: WhackSceneState) => void;
};

function getSpawnParams(difficulty: WhackDifficulty) {
  if (difficulty === "easy") return { minSpawn: 950, maxSpawn: 1400, visible: 1700, maxActive: 1 };
  if (difficulty === "hard") return { minSpawn: 350, maxSpawn: 650, visible: 1050, maxActive: 3 };
  return { minSpawn: 600, maxSpawn: 950, visible: 1300, maxActive: 2 };
}

export async function createWhackWordGame({
  Phaser,
  parent,
  width,
  height,
  emit,
  exposeApi,
}: {
  Phaser: typeof import("phaser");
  parent: HTMLDivElement;
  width: number;
  height: number;
  emit: (event: WhackSceneEvent) => void;
  exposeApi: (api: WhackSceneApi) => void;
}) {
  await waitForPhaserStudentFont();
  type HoleState = {
    container: Phaser.GameObjects.Container;
    content: Phaser.GameObjects.Container;
    frontRim: Phaser.GameObjects.Ellipse;
    cardId: string | null;
    clearTimer: Phaser.Time.TimerEvent | null;
    isHittable: boolean;
    isLoading: boolean;
    generation: number;
  };

  class WhackWordScene extends Phaser.Scene {
    private externalState: WhackSceneState = {
      cards: [],
      targetCard: null,
      mode: "idle",
      useImages: true,
      difficulty: "medium",
      reducedMotion: false,
      teacherMarkedCorrect: false,
    };

    private readonly holes: HoleState[] = [];
    private spawnTimer: Phaser.Time.TimerEvent | null = null;

    create() {
      this.cameras.main.setBackgroundColor("#fffdf8");
      this.buildBoard();
      this.input.on("pointerdown", this.handleBoardPointer, this);
      this.scale.on("resize", this.handleResize, this);
      this.handleResize(this.scale.gameSize);
    }

    shutdownScene() {
      this.stopSpawning();
      this.holes.forEach((hole) => this.clearHole(hole));
      this.input.off("pointerdown", this.handleBoardPointer, this);
      this.scale.off("resize", this.handleResize, this);
    }

    sync(next: WhackSceneState) {
      const previousMode = this.externalState.mode;
      const previousTargetId = this.externalState.targetCard?.id;
      this.externalState = next;

      if (next.mode !== "playing") {
        this.stopSpawning();
        this.holes.forEach((hole) => this.clearHole(hole));
        return;
      }

      if (previousMode !== "playing") {
        this.holes.forEach((hole) => this.clearHole(hole));
        this.startSpawning();
      } else if (previousTargetId !== next.targetCard?.id) {
        // A correct hit begins a clean new target cycle instead of leaving
        // objects from the prior prompt on screen.
        this.holes.forEach((hole) => this.clearHole(hole));
        this.startSpawning();
      }
    }

    private buildBoard() {
      for (let i = 0; i < 6; i += 1) {
        const mound = this.add.ellipse(0, 36, 322, 128, 0xb98358).setAlpha(0.28);
        const rearRim = this.add.ellipse(0, 16, 312, 118, 0xe8bd8b).setStrokeStyle(4, 0xd29a62);
        const darkHole = this.add.ellipse(0, 24, 268, 80, 0x563b2b).setStrokeStyle(4, 0x8b6042);
        const content = this.add.container(0, 30);
        const frontRim = this.add.ellipse(0, 54, 290, 72, 0xf1c99b).setStrokeStyle(3, 0xd49a63);
        const grass = this.add.ellipse(0, 48, 320, 34, 0x8cbf73).setAlpha(0.7);
        const slot = this.add.container(0, 0, [mound, rearRim, darkHole, content, frontRim, grass]);
        slot.setSize(340, 260);
        const holeState: HoleState = {
          container: slot,
          content,
          frontRim,
          cardId: null,
          clearTimer: null,
          isHittable: false,
          isLoading: false,
          generation: 0,
        };
        this.holes.push(holeState);
      }
    }

    private handleBoardPointer(pointer: Phaser.Input.Pointer) {
      if (this.externalState.mode !== "playing") return;
      // Phaser's Scale Manager already maps browser coordinates into the
      // high-DPI game canvas before exposing pointer.x/y.
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const hole = this.holes.find((candidate) =>
        candidate.cardId && candidate.isHittable && candidate.container.getBounds().contains(point.x, point.y),
      );
      if (!hole?.cardId) return;

      const isTarget = hole.cardId === this.externalState.targetCard?.id;
      this.playHitFeedback(hole, hole.cardId, isTarget);
    }

    private handleResize(size: Phaser.Structs.Size | { width: number; height: number }) {
      const nextWidth = size.width;
      const nextHeight = size.height;
      const horizontalGap = Math.max(18, Math.min(36, nextWidth * 0.03));
      const verticalGap = Math.max(18, Math.min(32, nextHeight * 0.045));
      // Fill the complete measured play area, then centre the 3×2 grid. This
      // avoids a dead strip beneath the lower row on tall projector screens.
      const holeWidth = (nextWidth - horizontalGap * 2) / 3;
      const holeHeight = (nextHeight - verticalGap) / 2;
      const startX = (nextWidth - (holeWidth * 3 + horizontalGap * 2)) / 2;
      const startY = (nextHeight - (holeHeight * 2 + verticalGap)) / 2;

      this.holes.forEach((hole, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const x = startX + holeWidth / 2 + col * (holeWidth + horizontalGap);
        const y = startY + holeHeight / 2 + row * (holeHeight + verticalGap);
        hole.container.setPosition(x, y);
        hole.container.setScale(holeWidth / 340, holeHeight / 260);
      });
    }

    private startSpawning() {
      this.stopSpawning();
      // First pop uses the ordinary target/distractor selection rather than
      // revealing the answer at the start of every turn.
      this.spawnOne();
      this.scheduleSpawn();
    }

    private stopSpawning() {
      this.spawnTimer?.remove(false);
      this.spawnTimer = null;
    }

    private scheduleSpawn() {
      if (this.externalState.mode !== "playing") return;
      const params = getSpawnParams(this.externalState.difficulty);
      const delay = Phaser.Math.Between(params.minSpawn, params.maxSpawn);
      this.spawnTimer = this.time.delayedCall(delay, () => {
        this.spawnOne();
        this.scheduleSpawn();
      });
    }

    private spawnOne(forceTarget = false) {
      const params = getSpawnParams(this.externalState.difficulty);
      const activeCount = this.holes.filter((hole) => hole.cardId || hole.isLoading).length;
      if (activeCount >= params.maxActive) return;
      const available = this.holes.filter((hole) => !hole.cardId && !hole.isLoading);
      if (!available.length || !this.externalState.cards.length) return;
      const hole = Phaser.Utils.Array.GetRandom(available);
      const card = this.pickCardForSpawn(forceTarget);
      if (!card) return;
      this.populateHole(hole, card);
    }

    private pickCardForSpawn(forceTarget = false) {
      const { cards, targetCard, teacherMarkedCorrect } = this.externalState;
      if (!cards.length) return null;
      const chanceTarget = 0.34 + (teacherMarkedCorrect ? 0.14 : 0);
      if (targetCard && (forceTarget || Math.random() < chanceTarget)) return targetCard;
      const distractors = cards.filter((card) => card.id !== targetCard?.id);
      return distractors.length
        ? Phaser.Utils.Array.GetRandom(distractors)
        : Phaser.Utils.Array.GetRandom(cards);
    }

    private async populateHole(hole: HoleState, card: PhaserVocabCard) {
      this.clearHole(hole);
      const generation = hole.generation;
      hole.isLoading = true;

      if (this.externalState.useImages && card.image) {
        const textureKey = await this.ensureTexture(card.image, card.imageFallback);
        if (hole.generation !== generation || !hole.isLoading) return;
        if (textureKey && this.textures.exists(textureKey)) {
          const image = this.add.image(0, -38, textureKey);
          // Some vocabulary art includes transparent breathing room, so give
          // the visible illustration a projector-friendly share of the hole.
          const imageScale = Math.min(278 / image.width, 224 / image.height);
          image.setScale(imageScale);
          hole.content.add(image);
        } else {
          hole.content.add(this.makeWordLabel(card.word));
        }
      } else {
        hole.content.add(this.makeWordLabel(card.word));
      }

      hole.isLoading = false;
      hole.cardId = card.id;
      hole.isHittable = true;

      if (!this.externalState.reducedMotion) {
        hole.content.setAlpha(0);
        hole.content.setY(92);
        this.tweens.add({
          targets: hole.content,
          alpha: 1,
          y: 30,
          duration: 180,
          ease: "Quad.out",
        });
      } else {
        hole.content.setAlpha(1);
        hole.content.setY(30);
      }

      const params = getSpawnParams(this.externalState.difficulty);
      hole.clearTimer = this.time.delayedCall(params.visible, () => {
        this.clearHole(hole);
      });
    }

    private makeWordLabel(word: string) {
      const labelBg = this.add.rectangle(0, -38, 220, 112, 0xffffff).setStrokeStyle(3, 0xdbeafe);
      const labelText = this.add
        .text(0, -38, word, {
          fontFamily: PHASER_UI_FONT,
          fontSize: "34px",
          color: "#0b2545",
          fontStyle: "bold",
          align: "center",
          wordWrap: { width: 200, useAdvancedWrap: true },
        })
        .setOrigin(0.5);
      return this.add.container(0, 0, [labelBg, labelText]);
    }

    private playHitFeedback(hole: HoleState, cardId: string, isTarget: boolean) {
      hole.isHittable = false;
      hole.clearTimer?.remove(false);
      hole.clearTimer = null;

      const feedback = this.add
        .text(0, -112, isTarget ? "✓\n+1" : "✕", {
          fontFamily: PHASER_UI_FONT,
          fontSize: isTarget ? "54px" : "70px",
          fontStyle: "bold",
          color: isTarget ? "#15803d" : "#dc2626",
          align: "center",
          stroke: "#ffffff",
          strokeThickness: 8,
        })
        .setOrigin(0.5);
      hole.container.add(feedback);

      if (isTarget) {
        hole.frontRim.setFillStyle(0x86efac);
        this.tweens.add({
          targets: hole.content,
          y: 100,
          alpha: 0,
          duration: this.externalState.reducedMotion ? 0 : 220,
          ease: "Quad.in",
        });
      } else {
        hole.frontRim.setFillStyle(0xfca5a5);
        this.tweens.add({
          targets: hole.container,
          x: hole.container.x + 10,
          duration: this.externalState.reducedMotion ? 0 : 55,
          yoyo: true,
          repeat: 3,
          ease: "Sine.inOut",
        });
      }

      this.time.delayedCall(this.externalState.reducedMotion ? 0 : 420, () => {
        feedback.destroy();
        hole.frontRim.setFillStyle(0xf1c99b);
        this.clearHole(hole);
        emit({ type: "hit", cardId, isTarget });
      });
    }

    private clearHole(hole: HoleState) {
      hole.clearTimer?.remove(false);
      hole.clearTimer = null;
      hole.cardId = null;
      hole.isHittable = false;
      hole.isLoading = false;
      hole.generation += 1;
      this.tweens.killTweensOf(hole.content);
      hole.content.removeAll(true);
    }

    private ensureTexture(imageUrl: string, fallbackImageUrl?: string | null) {
      const textureKey = makeTextureKey("whack", imageUrl);
      if (this.textures.exists(textureKey)) {
        return Promise.resolve(textureKey);
      }

      return new Promise<string | null>((resolve) => {
        const fileCompleteEvent = `filecomplete-image-${textureKey}`;
        const cleanup = () => {
          this.load.off(fileCompleteEvent, handleComplete);
          this.load.off("loaderror", handleError);
        };
        const handleComplete = () => {
          cleanup();
          resolve(textureKey);
        };
        const handleError = (file: { key?: string }) => {
          if (file?.key !== textureKey) return;
          cleanup();
          if (fallbackImageUrl && fallbackImageUrl !== imageUrl) {
            void this.ensureTexture(fallbackImageUrl).then(resolve);
            return;
          }
          resolve(null);
        };

        this.load.once(fileCompleteEvent, handleComplete);
        this.load.on("loaderror", handleError);
        this.load.image(textureKey, imageUrl);
        if (!this.load.isLoading()) {
          this.load.start();
        }
      });
    }
  }

  const scene = new WhackWordScene();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: width * pixelRatio,
    height: height * pixelRatio,
    backgroundColor: "#fffdf8",
    scene,
    render: {
      antialias: true,
      pixelArt: false,
      powerPreference: "high-performance",
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: width * pixelRatio,
      height: height * pixelRatio,
      zoom: 1 / pixelRatio,
    },
  });

  exposeApi({
    sync: (next) => {
      scene.sync(next);
    },
  });

  game.events.once("destroy", () => {
    scene.shutdownScene();
  });

  return { game, pixelRatio };
}
