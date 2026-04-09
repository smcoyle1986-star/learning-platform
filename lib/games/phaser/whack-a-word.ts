import type Phaser from "phaser";
import type { PhaserVocabCard } from "@/lib/games/phaser/types";
import { makeTextureKey } from "@/lib/games/phaser/types";

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
  if (difficulty === "easy") return { minSpawn: 900, maxSpawn: 1400, visible: 1400 };
  if (difficulty === "hard") return { minSpawn: 350, maxSpawn: 700, visible: 800 };
  return { minSpawn: 500, maxSpawn: 900, visible: 1100 };
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
  type HoleState = {
    container: Phaser.GameObjects.Container;
    content: Phaser.GameObjects.Container;
    cardId: string | null;
    clearTimer: Phaser.Time.TimerEvent | null;
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
      this.scale.on("resize", this.handleResize, this);
      this.handleResize(this.scale.gameSize);
    }

    shutdownScene() {
      this.stopSpawning();
      this.holes.forEach((hole) => this.clearHole(hole));
      this.scale.off("resize", this.handleResize, this);
    }

    sync(next: WhackSceneState) {
      const previousMode = this.externalState.mode;
      this.externalState = next;

      if (next.mode !== "playing") {
        this.stopSpawning();
        this.holes.forEach((hole) => this.clearHole(hole));
        return;
      }

      if (previousMode !== "playing") {
        this.holes.forEach((hole) => this.clearHole(hole));
        this.startSpawning();
      }
    }

    private buildBoard() {
      for (let i = 0; i < 6; i += 1) {
        const base = this.add.rectangle(0, 0, 220, 180, 0xffefef).setStrokeStyle(2, 0xf3d4d4);
        const rim = this.add.rectangle(0, -48, 220, 64, 0xfff4e6).setStrokeStyle(2, 0xf9d9b7);
        const content = this.add.container(0, 12);
        const slot = this.add.container(0, 0, [base, rim, content]);
        slot.setSize(220, 180);
        slot.setInteractive(
          new Phaser.Geom.Rectangle(-110, -90, 220, 180),
          Phaser.Geom.Rectangle.Contains
        );
        const holeState: HoleState = {
          container: slot,
          content,
          cardId: null,
          clearTimer: null,
        };
        slot.on("pointerdown", () => {
          if (!holeState.cardId || this.externalState.mode !== "playing") return;
          const cardId = holeState.cardId;
          const isTarget = cardId === this.externalState.targetCard?.id;
          this.clearHole(holeState);
          emit({ type: "hit", cardId, isTarget });
        });
        this.holes.push(holeState);
      }
    }

    private handleResize(size: Phaser.Structs.Size | { width: number; height: number }) {
      const nextWidth = size.width;
      const nextHeight = size.height;
      const topOffset = 36;
      const horizontalGap = Math.min(44, nextWidth * 0.04);
      const verticalGap = Math.min(38, nextHeight * 0.05);
      const cardWidth = Math.min(220, (nextWidth - horizontalGap * 4) / 3);
      const cardHeight = Math.min(180, (nextHeight - topOffset - verticalGap * 3) / 2);

      this.holes.forEach((hole, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const x = horizontalGap + cardWidth / 2 + col * (cardWidth + horizontalGap);
        const y = topOffset + verticalGap + cardHeight / 2 + row * (cardHeight + verticalGap);
        hole.container.setPosition(x, y);
        hole.container.setScale(cardWidth / 220, cardHeight / 180);
      });
    }

    private startSpawning() {
      this.stopSpawning();
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

    private spawnOne() {
      const available = this.holes.filter((hole) => !hole.cardId);
      if (!available.length || !this.externalState.cards.length) return;
      const hole = Phaser.Utils.Array.GetRandom(available);
      const card = this.pickCardForSpawn();
      if (!card) return;
      this.populateHole(hole, card);
    }

    private pickCardForSpawn() {
      const { cards, targetCard, teacherMarkedCorrect } = this.externalState;
      if (!cards.length) return null;
      const chanceTarget = 0.3 + (teacherMarkedCorrect ? 0.2 : 0);
      if (targetCard && Math.random() < chanceTarget) return targetCard;
      const distractors = cards.filter((card) => card.id !== targetCard?.id);
      return distractors.length
        ? Phaser.Utils.Array.GetRandom(distractors)
        : Phaser.Utils.Array.GetRandom(cards);
    }

    private async populateHole(hole: HoleState, card: PhaserVocabCard) {
      this.clearHole(hole);
      hole.cardId = card.id;

      if (this.externalState.useImages && card.image) {
        const textureKey = await this.ensureTexture(card.image);
        if (hole.cardId !== card.id) return;
        if (textureKey && this.textures.exists(textureKey)) {
          const image = this.add.image(0, 0, textureKey);
          image.setDisplaySize(132, 112);
          hole.content.add(image);
        } else {
          hole.content.add(this.makeWordLabel(card.word));
        }
      } else {
        hole.content.add(this.makeWordLabel(card.word));
      }

      if (!this.externalState.reducedMotion) {
        hole.content.setAlpha(0);
        hole.content.setY(28);
        this.tweens.add({
          targets: hole.content,
          alpha: 1,
          y: 12,
          duration: 150,
          ease: "Quad.out",
        });
      } else {
        hole.content.setAlpha(1);
        hole.content.setY(12);
      }

      const params = getSpawnParams(this.externalState.difficulty);
      hole.clearTimer = this.time.delayedCall(params.visible, () => {
        this.clearHole(hole);
      });
    }

    private makeWordLabel(word: string) {
      const labelBg = this.add.rectangle(0, 0, 150, 80, 0xffffff).setStrokeStyle(2, 0xdbeafe);
      const labelText = this.add
        .text(0, 0, word, {
          fontFamily: "Arial",
          fontSize: "28px",
          color: "#0b2545",
          fontStyle: "bold",
          align: "center",
          wordWrap: { width: 132, useAdvancedWrap: true },
        })
        .setOrigin(0.5);
      return this.add.container(0, 0, [labelBg, labelText]);
    }

    private clearHole(hole: HoleState) {
      hole.clearTimer?.remove(false);
      hole.clearTimer = null;
      hole.cardId = null;
      hole.content.removeAll(true);
    }

    private ensureTexture(imageUrl: string) {
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
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
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
      width,
      height,
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

  return { game };
}
