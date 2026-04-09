import type Phaser from "phaser";
import { makeTextureKey } from "@/lib/games/phaser/types";
import {
  applyButtonFeedback,
  PHASER_MUTED,
  PHASER_PRIMARY,
  PHASER_PRIMARY_DARK,
  PHASER_TEXT,
  PHASER_UI_FONT,
} from "@/lib/games/phaser/ui-theme";

export type ImageRevealState = {
  imageUrl: string | null;
  tilesRemoved: boolean[];
  glowingIndex: number | null;
  specialRemoveActive: boolean;
  urgent: boolean;
  imageRevealed: boolean;
  showRemoveButton: boolean;
  removedCount: number;
  totalTiles: number;
};

export type ImageRevealEvent = { type: "remove-click" };

export type ImageRevealApi = {
  sync: (next: ImageRevealState) => void;
};

export async function createImageRevealGame({
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
  emit: (event: ImageRevealEvent) => void;
  exposeApi: (api: ImageRevealApi) => void;
}) {
  const COLS = 6;
  const ROWS = 4;
  const PATCH_COLORS = [0xfde68a, 0xfca5a5, 0xc7d2fe, 0xbbf7d0, 0xfbcfe8, 0xfee2b3, 0xdbeafe, 0xd1fae5];

  class ImageRevealScene extends Phaser.Scene {
    private state: ImageRevealState = {
      imageUrl: null,
      tilesRemoved: Array.from({ length: COLS * ROWS }).map(() => false),
      glowingIndex: null,
      specialRemoveActive: false,
      urgent: false,
      imageRevealed: false,
      showRemoveButton: false,
      removedCount: 0,
      totalTiles: COLS * ROWS,
    };

    private image?: Phaser.GameObjects.Image;
    private tileGraphics: Phaser.GameObjects.Rectangle[] = [];
    private labelText?: Phaser.GameObjects.Text;
    private removeButton?: Phaser.GameObjects.Container;
    private tileCountText?: Phaser.GameObjects.Text;

    create() {
      this.cameras.main.setBackgroundColor("#f3f4f6");
      this.image = this.add.image(0, 0, "__MISSING");
      this.image.setVisible(false);

      for (let i = 0; i < COLS * ROWS; i += 1) {
        const rect = this.add.rectangle(0, 0, 100, 100, PATCH_COLORS[i % PATCH_COLORS.length]).setStrokeStyle(1, 0x000000, 0.08);
        this.tileGraphics.push(rect);
      }

      this.labelText = this.add.text(0, 0, "No image", {
        fontFamily: PHASER_UI_FONT,
        fontSize: "40px",
        color: "#9ca3af",
      }).setOrigin(0.5);

      const buttonBg = this.add.rectangle(0, 0, 220, 84, PHASER_PRIMARY).setStrokeStyle(2, PHASER_PRIMARY_DARK);
      const buttonText = this.add.text(0, 0, "Remove Tile", {
        fontFamily: PHASER_UI_FONT,
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold",
      }).setOrigin(0.5);
      this.removeButton = this.add.container(0, 0, [buttonBg, buttonText]);
      this.removeButton.setSize(220, 84);
      this.removeButton.setInteractive(
        new Phaser.Geom.Rectangle(-110, -42, 220, 84),
        Phaser.Geom.Rectangle.Contains
      );
      this.removeButton.on("pointerdown", () => emit({ type: "remove-click" }));
      applyButtonFeedback(this.removeButton);

      this.tileCountText = this.add.text(0, 0, "", {
        fontFamily: PHASER_UI_FONT,
        fontSize: "18px",
        color: PHASER_TEXT,
        backgroundColor: "#ffffff",
        padding: { left: 10, right: 10, top: 6, bottom: 6 },
      });

      this.scale.on("resize", this.layoutScene, this);
      this.layoutScene(this.scale.gameSize);
      this.renderState();
    }

    shutdownScene() {
      this.scale.off("resize", this.layoutScene, this);
    }

    sync(next: ImageRevealState) {
      this.state = next;
      void this.ensureTexture(next.imageUrl).then(() => this.renderState());
      this.renderState();
    }

    private layoutScene(size: Phaser.Structs.Size | { width: number; height: number }) {
      const sceneWidth = size.width;
      const sceneHeight = size.height;
      const cellWidth = sceneWidth / COLS;
      const cellHeight = sceneHeight / ROWS;

      this.image?.setPosition(sceneWidth / 2, sceneHeight / 2);
      this.image?.setDisplaySize(sceneWidth, sceneHeight);
      this.labelText?.setPosition(sceneWidth / 2, sceneHeight / 2);
      this.removeButton?.setPosition(sceneWidth / 2, sceneHeight / 2);
      this.tileCountText?.setPosition(sceneWidth - 148, sceneHeight - 30);

      this.tileGraphics.forEach((tile, index) => {
        const col = index % COLS;
        const row = Math.floor(index / COLS);
        tile.setPosition(col * cellWidth + cellWidth / 2, row * cellHeight + cellHeight / 2);
        tile.setSize(cellWidth + 1, cellHeight + 1);
      });
    }

    private renderState() {
      const textureKey = this.state.imageUrl ? makeTextureKey("reveal", this.state.imageUrl) : null;
      const hasImage = textureKey ? this.textures.exists(textureKey) : false;

      if (this.image) {
        if (hasImage && textureKey) {
          this.image.setTexture(textureKey);
          this.image.setVisible(true);
          this.image.setAlpha(this.state.imageRevealed ? 1 : 0.94);
        } else {
          this.image.setVisible(false);
        }
      }
      this.labelText?.setVisible(!hasImage);

      this.tileGraphics.forEach((tile, index) => {
        const removed = this.state.tilesRemoved[index];
        const isGlowing = this.state.glowingIndex === index && !removed;
        const isUrgent = this.state.urgent && !removed;

        tile.setVisible(!removed);
        tile.setAlpha(removed ? 0 : 1);
        tile.setFillStyle(PATCH_COLORS[index % PATCH_COLORS.length], hasImage ? 0.22 : 1);
        tile.setStrokeStyle(1, 0x000000, 0.08);

        if (hasImage) {
          tile.setFillStyle(0xd7f7e1, 0.18);
        }

        if (isGlowing) {
          tile.setStrokeStyle(6, 0xffd700, 0.95);
          tile.setScale(1.1);
        } else if (isUrgent) {
          tile.setStrokeStyle(4, 0xff2d55, 0.85);
          tile.setScale(1.03);
        } else {
          tile.setStrokeStyle(1, 0x000000, 0.08);
          tile.setScale(1);
        }

        if (!isGlowing && (this.state.specialRemoveActive || this.state.urgent) && !removed) {
          tile.setFillStyle(hasImage ? 0xd7f7e1 : PATCH_COLORS[index % PATCH_COLORS.length], hasImage ? 0.14 : 0.85);
        }
      });

      this.removeButton?.setVisible(this.state.showRemoveButton);
      this.tileCountText?.setText(`${this.state.removedCount}/${this.state.totalTiles} tiles`);
    }

    private ensureTexture(imageUrl: string | null) {
      if (!imageUrl) return Promise.resolve(null);
      const textureKey = makeTextureKey("reveal", imageUrl);
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

  const scene = new ImageRevealScene();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: "#f3f4f6",
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
    sync: (next) => scene.sync(next),
  });

  game.events.once("destroy", () => {
    scene.shutdownScene();
  });

  return { game };
}
