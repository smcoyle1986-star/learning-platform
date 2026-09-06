import { makeTextureKey } from "@/lib/games/phaser/types";
import { PHASER_TEXT, PHASER_UI_FONT, waitForPhaserStudentFont } from "@/lib/games/phaser/ui-theme";

export type MemoryPhaserCard = {
  id: string;
  pairId: string;
  faceText?: string;
  faceImage?: string | null;
  matched: boolean;
  revealed: boolean;
};

export type MemoryFlipSceneState = {
  cards: MemoryPhaserCard[];
  gridCols: number;
  gridRows: number;
  gameStyle: "image-image" | "text-text" | "image-text";
  locked: boolean;
  matchedPair: { a: number; b: number } | null;
};

export type MemoryFlipSceneEvent = {
  type: "card-click";
  index: number;
};

export type MemoryFlipSceneApi = {
  sync: (next: MemoryFlipSceneState) => void;
};

type TileNode = {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  centerText: Phaser.GameObjects.Text;
  image?: Phaser.GameObjects.Image;
};

const ROW_BACK_COLORS = [0xe6fffa, 0xecfccb, 0xfef3c7, 0xfee2e2, 0xede9fe, 0xfff7ed];

export async function createMemoryFlipGame({
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
  emit: (event: MemoryFlipSceneEvent) => void;
  exposeApi: (api: MemoryFlipSceneApi) => void;
}) {
  await waitForPhaserStudentFont();
  class MemoryFlipScene extends Phaser.Scene {
    private state: MemoryFlipSceneState = {
      cards: [],
      gridCols: 4,
      gridRows: 4,
      gameStyle: "image-text",
      locked: false,
      matchedPair: null,
    };

    private tiles: TileNode[] = [];

    create() {
      this.cameras.main.setBackgroundColor("#dff6e9");
      this.scale.on("resize", this.handleResize, this);
      this.handleResize(this.scale.gameSize);
    }

    shutdownScene() {
      this.scale.off("resize", this.handleResize, this);
    }

    sync(next: MemoryFlipSceneState) {
      const shapeChanged =
        next.cards.length !== this.state.cards.length ||
        next.gridCols !== this.state.gridCols ||
        next.gridRows !== this.state.gridRows;
      this.state = next;
      if (shapeChanged) {
        this.rebuildTiles();
      }
      void this.ensureTextures().then(() => {
        this.renderState();
        this.handleResize(this.scale.gameSize);
      });
      this.renderState();
      this.handleResize(this.scale.gameSize);
    }

    private rebuildTiles() {
      this.tiles.forEach((tile) => tile.container.destroy(true));
      this.tiles = [];

      this.state.cards.forEach((card, index) => {
        const bg = this.add.rectangle(0, 0, 160, 120, 0xffffff).setStrokeStyle(3, 0xd1d5db, 1);
        const centerText = this.add
          .text(0, 0, "", {
            fontFamily: PHASER_UI_FONT,
            fontSize: "26px",
            fontStyle: "bold",
            color: PHASER_TEXT,
            align: "center",
            wordWrap: { width: 132 },
          })
          .setOrigin(0.5);
        const container = this.add.container(0, 0, [bg, centerText]);
        container.setSize(160, 120);
        container.setInteractive(new Phaser.Geom.Rectangle(-80, -60, 160, 120), Phaser.Geom.Rectangle.Contains);
        container.on("pointerdown", () => {
          if (!this.state.locked) {
            emit({ type: "card-click", index });
          }
        });
        this.tiles.push({ container, bg, centerText });
      });
    }

    private handleResize(size: Phaser.Structs.Size | { width: number; height: number }) {
      const gap = Math.max(10, Math.min(16, Math.min(size.width, size.height) * 0.018));
      const cellWidth = (size.width - gap * (this.state.gridCols + 1)) / this.state.gridCols;
      const cellHeight = (size.height - gap * (this.state.gridRows + 1)) / this.state.gridRows;
      const scale = Math.min(cellWidth / 160, cellHeight / 120);

      this.tiles.forEach((tile, index) => {
        const col = index % this.state.gridCols;
        const row = Math.floor(index / this.state.gridCols);
        const x = gap + cellWidth / 2 + col * (cellWidth + gap);
        const y = gap + cellHeight / 2 + row * (cellHeight + gap);
        tile.container.setPosition(x, y);
        tile.container.setScale(scale);
      });
    }

    private renderState() {
      this.tiles.forEach((tile, index) => {
        const card = this.state.cards[index];
        if (!card) return;
        const revealed = card.revealed || card.matched;
        const row = Math.floor(index / this.state.gridCols);
        const backColor = ROW_BACK_COLORS[row % ROW_BACK_COLORS.length];
        tile.bg.setFillStyle(revealed ? 0xffffff : backColor, 1);
        tile.bg.setStrokeStyle(3, revealed ? 0xcbd5e1 : 0xb8e0c8, 1);
        tile.centerText.setVisible(true);

        if (!revealed) {
          tile.centerText.setText(String(index + 1));
          tile.centerText.setFontSize(34);
          tile.centerText.setColor(PHASER_TEXT);
          tile.centerText.setY(0);
          if (tile.image) tile.image.setVisible(false);
        } else {
          const shouldUseText = this.state.gameStyle === "text-text" || !card.faceImage;
          const shouldUseImage = !shouldUseText && card.faceImage;
          if (shouldUseImage && card.faceImage) {
            const textureKey = makeTextureKey("memory-flip", card.faceImage);
            if (this.textures.exists(textureKey)) {
              if (!tile.image) {
                tile.image = this.add.image(0, 0, textureKey);
                tile.container.add(tile.image);
                tile.image.setDepth(1);
              } else {
                tile.image.setTexture(textureKey);
              }
              tile.image.setDisplaySize(126, 92);
              tile.image.setVisible(true);
              tile.centerText.setText(this.state.gameStyle === "image-text" ? card.faceText ?? "" : "");
              tile.centerText.setFontSize(this.state.gameStyle === "image-text" ? 18 : 1);
              tile.centerText.setY(this.state.gameStyle === "image-text" ? 42 : 0);
              tile.centerText.setColor(PHASER_TEXT);
            } else {
              tile.centerText.setText(card.faceText ?? "");
              tile.centerText.setFontSize(22);
              tile.centerText.setY(0);
            }
          } else {
            if (tile.image) tile.image.setVisible(false);
            tile.centerText.setText(card.faceText ?? "");
            tile.centerText.setFontSize(22);
            tile.centerText.setY(0);
            tile.centerText.setColor(PHASER_TEXT);
          }
        }

        const highlighted =
          this.state.matchedPair &&
          (this.state.matchedPair.a === index || this.state.matchedPair.b === index);
        tile.container.setScale(tile.container.scaleX, tile.container.scaleY);
        tile.container.setAlpha(card.matched ? 1 : 0.98);
        if (highlighted) {
          tile.bg.setStrokeStyle(5, 0xf59e0b, 1);
          tile.bg.setFillStyle(0xfffbeb, 1);
        }
      });
    }

    private async ensureTextures() {
      const imageUrls = Array.from(
        new Set(this.state.cards.map((card) => card.faceImage).filter(Boolean) as string[])
      );
      await Promise.all(imageUrls.map((url) => this.ensureTexture(url)));
    }

    private ensureTexture(imageUrl: string | null) {
      if (!imageUrl) return Promise.resolve(null);
      const textureKey = makeTextureKey("memory-flip", imageUrl);
      if (this.textures.exists(textureKey)) return Promise.resolve(textureKey);

      return new Promise<string | null>((resolve) => {
        const completeEvent = `filecomplete-image-${textureKey}`;
        const cleanup = () => {
          this.load.off(completeEvent, handleComplete);
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

        this.load.once(completeEvent, handleComplete);
        this.load.on("loaderror", handleError);
        this.load.image(textureKey, imageUrl);
        if (!this.load.isLoading()) this.load.start();
      });
    }
  }

  const scene = new MemoryFlipScene();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: "#dff6e9",
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

  game.events.once("destroy", () => scene.shutdownScene());

  return { game };
}
