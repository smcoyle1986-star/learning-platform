import type Phaser from "phaser";
import { makeTextureKey } from "@/lib/games/phaser/types";
import {
  PHASER_PANEL_STROKE,
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
  columns,
  rows,
  exposeApi,
}: {
  Phaser: typeof import("phaser");
  parent: HTMLDivElement;
  width: number;
  height: number;
  columns?: number;
  rows?: number;
  emit: (event: ImageRevealEvent) => void;
  exposeApi: (api: ImageRevealApi) => void;
}) {
  const COLS = columns ?? 6;
  const ROWS = rows ?? 4;
  const PATCH_COLORS = [0xfde68a, 0xfca5a5, 0xc7d2fe, 0xbbf7d0, 0xfbcfe8, 0xfee2b3, 0xdbeafe, 0xd1fae5];

  class ImageRevealScene extends Phaser.Scene {
    private previousState: ImageRevealState | null = null;
    private sceneWidth = 0;
    private sceneHeight = 0;
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
    private stageFrame?: Phaser.GameObjects.Graphics;
    private vignette?: Phaser.GameObjects.Graphics;
    private imageMatte?: Phaser.GameObjects.Graphics;
    private tileShadows: Phaser.GameObjects.Graphics[] = [];
    private tileGraphics: Phaser.GameObjects.Graphics[] = [];
    private sparkleBurst: Phaser.GameObjects.Graphics[] = [];
    private tileBounds: { x: number; y: number; width: number; height: number; radius: number }[] = [];
    private boardRect = { x: 0, y: 0, width: 0, height: 0 };
    private imageRevealTween?: Phaser.Tweens.Tween;
    private tileCountText?: Phaser.GameObjects.Text;
    private softHighlight?: Phaser.GameObjects.Graphics;

    create() {
      this.cameras.main.setBackgroundColor("#f6f7fb");
      this.stageFrame = this.add.graphics();
      this.vignette = this.add.graphics();
      this.imageMatte = this.add.graphics();
      this.softHighlight = this.add.graphics();

      this.image = this.add.image(0, 0, "__MISSING");
      this.image.setVisible(false);

      for (let i = 0; i < COLS * ROWS; i += 1) {
        const shadow = this.add.graphics();
        const tile = this.add.graphics();
        this.tileShadows.push(shadow);
        this.tileGraphics.push(tile);
        this.tileBounds.push({ x: 0, y: 0, width: 100, height: 100, radius: 12 });
      }

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
      const previous = this.previousState;
      this.state = next;
      void this.ensureTexture(next.imageUrl).then(() => this.renderState());
      this.renderState();
      this.animateTransitions(previous, next);
      this.previousState = {
        ...next,
        tilesRemoved: [...next.tilesRemoved],
      };
    }

    private layoutScene(size: Phaser.Structs.Size | { width: number; height: number }) {
      const sceneWidth = size.width;
      const sceneHeight = size.height;
      this.sceneWidth = sceneWidth;
      this.sceneHeight = sceneHeight;
      const paddingX = Math.max(18, sceneWidth * 0.04);
      const paddingTop = Math.max(18, sceneHeight * 0.04);
      const paddingBottom = Math.max(18, sceneHeight * 0.07);
      const cellWidth = Math.floor((sceneWidth - paddingX * 2) / COLS);
      const cellHeight = Math.floor((sceneHeight - paddingTop - paddingBottom) / ROWS);
      const overlap = 10;
      const radius = 0;

      this.boardRect = {
        x: paddingX,
        y: paddingTop,
        width: Math.max(1, sceneWidth - paddingX * 2),
        height: Math.max(1, sceneHeight - paddingTop - paddingBottom),
      };

      this.updateImageDisplay();
      this.image?.setDepth(0);
      this.tileCountText?.setPosition(sceneWidth - 156, sceneHeight - 34);
      this.tileCountText?.setDepth(8);

      this.stageFrame?.clear();
      this.stageFrame?.fillStyle(0xffffff, 0.35);
      this.stageFrame?.fillRoundedRect(8, 8, sceneWidth - 16, sceneHeight - 16, 24);
      this.stageFrame?.lineStyle(2, PHASER_PANEL_STROKE, 0.28);
      this.stageFrame?.strokeRoundedRect(8, 8, sceneWidth - 16, sceneHeight - 16, 24);
      this.stageFrame?.setDepth(1);

      this.vignette?.clear();
      const gradientPasses = 5;
      for (let i = 0; i < gradientPasses; i += 1) {
        const alpha = 0.04 + i * 0.022;
        const inset = i * 18;
        this.vignette?.lineStyle(36 - i * 4, 0x0f172a, alpha);
        this.vignette?.strokeRoundedRect(inset, inset, sceneWidth - inset * 2, sceneHeight - inset * 2, 26);
      }
      this.vignette?.setDepth(2);

      const boardLeft = Math.round(paddingX);
      const boardTop = Math.round(paddingTop);
      const boardRight = Math.round(sceneWidth - paddingX);
      const boardBottom = Math.round(sceneHeight - paddingBottom);

      this.imageMatte?.clear();
      this.imageMatte?.fillStyle(0xf6f7fb, 1);
      this.imageMatte?.fillRect(0, 0, sceneWidth, boardTop);
      this.imageMatte?.fillRect(0, boardBottom, sceneWidth, Math.max(0, sceneHeight - boardBottom));
      this.imageMatte?.fillRect(0, boardTop, boardLeft, Math.max(0, boardBottom - boardTop));
      this.imageMatte?.fillRect(
        boardRight,
        boardTop,
        Math.max(0, sceneWidth - boardRight),
        Math.max(0, boardBottom - boardTop)
      );
      this.imageMatte?.setDepth(3);

      this.tileGraphics.forEach((_, index) => {
        const col = index % COLS;
        const row = Math.floor(index / COLS);
        const x = Math.round(paddingX + col * cellWidth + cellWidth / 2);
        const y = Math.round(paddingTop + row * cellHeight + cellHeight / 2);
        const width = Math.max(24, cellWidth + overlap);
        const height = Math.max(24, cellHeight + overlap);
        this.tileBounds[index] = { x, y, width, height, radius };
        this.tileShadows[index]?.clear();
        this.tileShadows[index]?.fillStyle(0x0f172a, 0.08);
        this.tileShadows[index]?.fillRect(x - width / 2 + 2, y - height / 2 + 4, width, height);
        this.tileShadows[index]?.setAlpha(0.65);
        this.tileShadows[index]?.setDepth(3);
      });

      this.tileGraphics.forEach((tile, index) => {
        const bounds = this.tileBounds[index];
        tile.clear();
        tile.fillStyle(PATCH_COLORS[index % PATCH_COLORS.length], 1);
        tile.fillRect(-bounds.width / 2, -bounds.height / 2, bounds.width, bounds.height);
        tile.setPosition(bounds.x, bounds.y);
        tile.setDepth(4);
      });

      this.softHighlight?.clear();
      this.softHighlight?.fillStyle(0xffffff, 0.12);
      this.softHighlight?.fillRoundedRect(
        paddingX - 6,
        paddingTop - 6,
        sceneWidth - paddingX * 2 + 12,
        sceneHeight - paddingTop - paddingBottom + 12,
        28
      );
      this.softHighlight?.setDepth(5);
    }

    private renderState() {
      const textureKey = this.state.imageUrl ? makeTextureKey("reveal", this.state.imageUrl) : null;
      const hasImage = textureKey ? this.textures.exists(textureKey) : false;

      if (this.image) {
        if (hasImage && textureKey) {
          this.image.setTexture(textureKey);
          this.image.setVisible(true);
          this.image.setAlpha(1);
          this.updateImageDisplay(textureKey);
        } else {
          this.image.setVisible(false);
        }
      }
      this.tileGraphics.forEach((tile, index) => {
        const removed = this.state.tilesRemoved[index];
        const isGlowing = this.state.glowingIndex === index && !removed;
        const isUrgent = this.state.urgent && !removed;
        const bounds = this.tileBounds[index];
        const tileColor = PATCH_COLORS[index % PATCH_COLORS.length];

        tile.clear();
        if (!removed) {
          tile.fillStyle(tileColor, 1);
          tile.fillRect(-bounds.width / 2, -bounds.height / 2, bounds.width, bounds.height);
          if (isGlowing || isUrgent) {
            tile.lineStyle(isGlowing ? 8 : 5, 0xffffff, isGlowing ? 0.95 : 0.8);
            tile.strokeRect(-bounds.width / 2 + 2, -bounds.height / 2 + 2, bounds.width - 4, bounds.height - 4);
          }
          tile.setAlpha(1);
          tile.setScale(isGlowing ? 1.09 : isUrgent ? 1.03 : 1);
          tile.setVisible(true);
        } else {
          tile.setVisible(false);
        }

        const tileDepth = isGlowing ? 10 : 4;
        const shadowDepth = isGlowing ? 9 : 3;
        tile.setDepth(tileDepth);
        this.tileShadows[index]?.setVisible(!removed);
        this.tileShadows[index]?.setAlpha(removed ? 0 : isGlowing ? 1 : isUrgent ? 0.92 : 0.68);
        this.tileShadows[index]?.setScale(isGlowing ? 1.1 : isUrgent ? 1.03 : 1);
        this.tileShadows[index]?.setDepth(shadowDepth);
      });
      this.tileCountText?.setText(`${this.state.removedCount}/${this.state.totalTiles} tiles`);
    }

    private animateTransitions(previous: ImageRevealState | null, next: ImageRevealState) {
      const previousRemoved = previous?.tilesRemoved ?? Array.from({ length: COLS * ROWS }).map(() => false);
      const newlyRemoved: number[] = [];
      next.tilesRemoved.forEach((removed, index) => {
        if (removed && !previousRemoved[index]) {
          newlyRemoved.push(index);
        }
      });

      newlyRemoved.forEach((index, order) => {
        this.playTileBurst(index, order * 42);
      });

      if (!previous?.imageRevealed && next.imageRevealed) {
        this.animateImageReveal();
      }
    }

    private playTileBurst(index: number, delay = 0) {
      const bounds = this.tileBounds[index];
      if (!bounds) return;
      const centerX = bounds.x;
      const centerY = bounds.y;
      const pieces: Phaser.GameObjects.Graphics[] = [];
      const colors = [0xfef3c7, 0xdbf4ff, 0xdcfce7, 0xfce7f3, 0xffedd5, 0xe0e7ff];
      const tileColor = PATCH_COLORS[index % PATCH_COLORS.length];

      const burstTile = this.add.graphics();
      burstTile.fillStyle(tileColor, 1);
      burstTile.fillRect(-bounds.width / 2, -bounds.height / 2, bounds.width, bounds.height);
      burstTile.setPosition(centerX, centerY);
      burstTile.setDepth(11);
      burstTile.setRotation((index % 2 === 0 ? 1 : -1) * 0.03);

      const ring = this.add.graphics();
      ring.lineStyle(8, 0xffffff, 0.92);
      ring.strokeCircle(0, 0, Math.max(bounds.width, bounds.height) * 0.28);
      ring.setPosition(centerX, centerY);
      ring.setAlpha(0.95);
      ring.setDepth(12);

      const flash = this.add.graphics();
      flash.fillStyle(0xffffff, 0.95);
      flash.fillCircle(0, 0, 12);
      flash.setPosition(centerX, centerY);
      flash.setDepth(13);

      this.cameras.main.shake(140, 0.0055);
      this.tweens.add({
        targets: flash,
        alpha: { from: 0.95, to: 0 },
        scale: { from: 1, to: 6.2 },
        duration: 320,
        ease: "Cubic.out",
        onComplete: () => flash.destroy(),
      });
      this.tweens.add({
        targets: ring,
        alpha: { from: 0.95, to: 0 },
        scale: { from: 0.5, to: 4.25 },
        duration: 360,
        ease: "Cubic.out",
        onComplete: () => ring.destroy(),
      });
      this.tweens.add({
        targets: burstTile,
        alpha: { from: 0.98, to: 0 },
        scale: { from: 1, to: 1.35 },
        duration: 420,
        ease: "Back.out",
        onComplete: () => burstTile.destroy(),
      });

      for (let i = 0; i < 16; i += 1) {
        const piece = this.add.graphics();
        const color = colors[i % colors.length];
        piece.fillStyle(color, 0.98);
        piece.fillCircle(0, 0, 3.4 + (i % 4) * 1.25);
        piece.setPosition(centerX, centerY);
        piece.setAlpha(0.98);
        pieces.push(piece);
      }

      pieces.forEach((piece, i) => {
        const angle = (Math.PI * 2 * i) / pieces.length + (index % 3) * 0.2;
        const distance = 52 + (i % 4) * 16;
        const endX = centerX + Math.cos(angle) * distance;
        const endY = centerY + Math.sin(angle) * distance;
        this.tweens.add({
          targets: piece,
          x: endX,
          y: endY,
          alpha: 0,
          scale: { from: 1, to: 0.1 },
          rotation: { from: 0, to: (i % 2 === 0 ? 1 : -1) * Math.PI * 0.85 },
          duration: 580,
          delay,
          ease: "Cubic.out",
          onComplete: () => piece.destroy(),
        });
      });
    }

    private animateImageReveal() {
      if (!this.image) return;
      this.imageRevealTween?.stop();
      const textureKey = this.state.imageUrl ? makeTextureKey("reveal", this.state.imageUrl) : null;
      this.updateImageDisplay(textureKey);
      this.image.setAlpha(0.9);
      this.imageRevealTween = this.tweens.add({
        targets: this.image,
        alpha: { from: 0.9, to: 1 },
        duration: 220,
        ease: "Cubic.out",
      });

      this.cameras.main.flash(160, 255, 255, 255);
    }

    private updateImageDisplay(textureKey?: string | null) {
      if (!this.image || !this.sceneWidth || !this.sceneHeight) return;
      const boardWidth = this.boardRect.width || this.sceneWidth;
      const boardHeight = this.boardRect.height || this.sceneHeight;
      const maxW = boardWidth * 0.9;
      const maxH = boardHeight * 0.9;
      let sourceWidth = maxW;
      let sourceHeight = maxH;

      if (textureKey) {
        const texture = this.textures.get(textureKey);
        const source = texture?.source?.[0] as { width?: number; height?: number } | undefined;
        if (source?.width && source?.height) {
          sourceWidth = source.width;
          sourceHeight = source.height;
        }
      }

      const scale = Math.min(maxW / sourceWidth, maxH / sourceHeight);
      const displayWidth = Math.max(1, Math.floor(sourceWidth * scale));
      const displayHeight = Math.max(1, Math.floor(sourceHeight * scale));
      this.image.setPosition(
        this.boardRect.x + this.boardRect.width / 2,
        this.boardRect.y + this.boardRect.height / 2
      );
      this.image.setDisplaySize(displayWidth, displayHeight);
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
