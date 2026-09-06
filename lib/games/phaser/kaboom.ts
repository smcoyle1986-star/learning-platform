import type Phaser from "phaser";
import { PHASER_TEXT, PHASER_UI_FONT, waitForPhaserStudentFont } from "@/lib/games/phaser/ui-theme";

export type KaboomCenterReveal =
  | { kind: "points"; value?: number }
  | { kind: "bomb"; value?: number }
  | null;

export type KaboomSceneState = {
  rows: number;
  cols: number;
  tilesRemoved: boolean[];
  tilesPoints: (number | null)[];
  tilesBomb: boolean[];
  glowingIndex: number | null;
  specialRemoveActive: boolean;
  centerReveal: KaboomCenterReveal;
};

export type KaboomSceneEvent = {
  type: "tile-click";
  index: number;
};

export type KaboomSceneApi = {
  sync: (next: KaboomSceneState) => void;
};

type TileNode = {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  indexLabel: Phaser.GameObjects.Text;
  reveal: Phaser.GameObjects.Text;
  baseScale: number;
};

function tileLabel(index: number, cols: number) {
  const row = Math.floor(index / cols);
  const col = index % cols;
  return `${String.fromCharCode(65 + row)}${col + 1}`;
}

export async function createKaboomGame({
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
  emit: (event: KaboomSceneEvent) => void;
  exposeApi: (api: KaboomSceneApi) => void;
}) {
  await waitForPhaserStudentFont();
  class KaboomScene extends Phaser.Scene {
    private state: KaboomSceneState = {
      rows: 6,
      cols: 6,
      tilesRemoved: Array.from({ length: 36 }).map(() => false),
      tilesPoints: Array.from({ length: 36 }).map(() => null),
      tilesBomb: Array.from({ length: 36 }).map(() => false),
      glowingIndex: null,
      specialRemoveActive: false,
      centerReveal: null,
    };

    private board?: Phaser.GameObjects.Container;
    private tiles: TileNode[] = [];
    private centerBackdrop?: Phaser.GameObjects.Arc;
    private centerTitle?: Phaser.GameObjects.Text;
    private centerSubtitle?: Phaser.GameObjects.Text;
    private pulseTween?: Phaser.Tweens.Tween;

    create() {
      this.cameras.main.setBackgroundColor("#f3f4f6");
      this.board = this.add.container(0, 0);
      this.centerBackdrop = this.add
        .circle(0, 0, 320, 0xffffff, 0.98)
        .setStrokeStyle(12, 0x93c5fd, 0.95)
        .setDepth(19)
        .setVisible(false);
      this.centerTitle = this.add
        .text(0, 0, "", {
          fontFamily: PHASER_UI_FONT,
          fontSize: "104px",
          fontStyle: "bold",
          color: "#16a34a",
          stroke: "#ffffff",
          strokeThickness: 10,
        })
        .setOrigin(0.5)
        .setDepth(20)
        .setVisible(false);
      this.centerSubtitle = this.add
        .text(0, 0, "", {
          fontFamily: PHASER_UI_FONT,
          fontSize: "34px",
          fontStyle: "bold",
          color: "#111827",
          stroke: "#ffffff",
          strokeThickness: 8,
        })
        .setOrigin(0.5)
        .setDepth(20)
        .setVisible(false);

      this.scale.on("resize", this.handleResize, this);
      this.rebuildTiles();
      this.handleResize(this.scale.gameSize);
      this.renderState();
    }

    shutdownScene() {
      this.scale.off("resize", this.handleResize, this);
      this.pulseTween?.stop();
    }

    sync(next: KaboomSceneState) {
      const sizeChanged =
        next.rows !== this.state.rows ||
        next.cols !== this.state.cols ||
        next.tilesRemoved.length !== this.state.tilesRemoved.length;
      this.state = next;
      if (sizeChanged) {
        this.rebuildTiles();
      }
      this.renderState();
      this.handleResize(this.scale.gameSize);
    }

    private rebuildTiles() {
      this.tiles.forEach((tile) => tile.container.destroy(true));
      this.tiles = [];
      const total = this.state.rows * this.state.cols;

      for (let index = 0; index < total; index += 1) {
        const bg = this.add.rectangle(0, 0, 140, 110, 0xdff7e6).setStrokeStyle(2, 0x9bd3ab, 0.8);
        const indexLabel = this.add
          .text(-48, -34, tileLabel(index, this.state.cols), {
            fontFamily: PHASER_UI_FONT,
            fontSize: "16px",
            fontStyle: "bold",
            color: "#3f3f46",
          })
          .setOrigin(0, 0.5);
        const label = this.add
          .text(0, 4, tileLabel(index, this.state.cols), {
            fontFamily: PHASER_UI_FONT,
            fontSize: "30px",
            fontStyle: "bold",
            color: PHASER_TEXT,
          })
          .setOrigin(0.5);
        const reveal = this.add
          .text(0, 0, "", {
            fontFamily: PHASER_UI_FONT,
            fontSize: "36px",
            fontStyle: "bold",
            color: "#16a34a",
          })
          .setOrigin(0.5)
          .setVisible(false);

        const container = this.add.container(0, 0, [bg, indexLabel, label, reveal]);
        container.setSize(140, 110);
        container.setInteractive(new Phaser.Geom.Rectangle(-70, -55, 140, 110), Phaser.Geom.Rectangle.Contains);
        container.on("pointerdown", () => {
          const removed = this.state.tilesRemoved[index];
          if (!removed) {
            emit({ type: "tile-click", index });
          }
        });

        this.board?.add(container);
        this.tiles.push({ container, bg, label, indexLabel, reveal, baseScale: 1 });
      }
    }

    private handleResize(size: Phaser.Structs.Size | { width: number; height: number }) {
      const boardWidth = size.width;
      const boardHeight = size.height;
      const gap = Math.max(6, Math.min(14, Math.min(boardWidth, boardHeight) * 0.01));
      const tileWidth = (boardWidth - gap * (this.state.cols + 1)) / this.state.cols;
      const tileHeight = (boardHeight - gap * (this.state.rows + 1)) / this.state.rows;
      const scale = Math.min(tileWidth / 140, tileHeight / 110);

      this.board?.setPosition(0, 0);
      this.tiles.forEach((tile, index) => {
        const col = index % this.state.cols;
        const row = Math.floor(index / this.state.cols);
        const x = gap + tileWidth / 2 + col * (tileWidth + gap);
        const y = gap + tileHeight / 2 + row * (tileHeight + gap);
        tile.container.setPosition(x, y);
        tile.baseScale = scale;
        tile.container.setScale(scale);
      });

      this.centerTitle?.setPosition(boardWidth / 2, boardHeight / 2 - 16);
      this.centerBackdrop?.setPosition(boardWidth / 2, boardHeight / 2 + 4);
      this.centerSubtitle?.setPosition(boardWidth / 2, boardHeight / 2 + 68);
    }

    private renderState() {
      this.tiles.forEach((tile, index) => {
        const removed = this.state.tilesRemoved[index];
        const points = this.state.tilesPoints[index];
        const isBomb = this.state.tilesBomb[index];
        const isGlowing = this.state.glowingIndex === index && !removed;

        tile.indexLabel.setText(tileLabel(index, this.state.cols));
        tile.label.setText(tileLabel(index, this.state.cols));
        tile.bg.setVisible(true);
        tile.indexLabel.setVisible(!removed);
        tile.label.setVisible(!removed);
        tile.reveal.setVisible(removed);
        tile.container.setAlpha(removed ? 0.72 : 1);

        if (removed && isBomb) {
          tile.reveal.setText("💣");
          tile.reveal.setColor("#b91c1c");
          tile.bg.setFillStyle(0xfee2e2, 1);
          tile.bg.setStrokeStyle(2, 0xfca5a5, 0.9);
        } else if (removed && points !== null) {
          tile.reveal.setText(`+${points}`);
          tile.reveal.setColor("#16a34a");
          tile.bg.setFillStyle(0xdcfce7, 1);
          tile.bg.setStrokeStyle(2, 0x86efac, 0.9);
        } else {
          tile.bg.setFillStyle(0xdff7e6, 1);
          tile.bg.setStrokeStyle(2, 0x9bd3ab, 0.8);
        }

        if (isGlowing) {
          tile.container.setScale(tile.baseScale * 1.04, tile.baseScale * 1.04);
          tile.bg.setStrokeStyle(4, 0xfacc15, 1);
          tile.bg.setFillStyle(0xfef08a, 0.95);
        } else if (this.state.specialRemoveActive && !removed) {
          tile.container.setScale(tile.baseScale);
          tile.bg.setFillStyle(0xbddcc4, 1);
        } else {
          tile.container.setScale(tile.baseScale);
        }
      });

      if (!this.state.centerReveal) {
        this.centerBackdrop?.setVisible(false);
        this.centerTitle?.setVisible(false);
        this.centerSubtitle?.setVisible(false);
        this.pulseTween?.stop();
        return;
      }

      const isBomb = this.state.centerReveal.kind === "bomb";
      this.centerTitle?.setText(isBomb ? "KABOOM!" : `+${this.state.centerReveal.value ?? 0}`);
      this.centerTitle?.setColor(isBomb ? "#dc2626" : "#16a34a");
      this.centerSubtitle?.setText(isBomb ? "-5 points" : "Great job!");
      this.centerBackdrop?.setFillStyle(isBomb ? 0xfef2f2 : 0xffffff, 0.98);
      this.centerBackdrop?.setStrokeStyle(12, isBomb ? 0xf87171 : 0x93c5fd, 0.95);
      this.centerBackdrop?.setVisible(true);
      this.centerTitle?.setVisible(true);
      this.centerSubtitle?.setVisible(true);

      this.pulseTween?.stop();
      this.centerBackdrop?.setScale(0.78);
      this.centerTitle?.setScale(0.58);
      this.centerSubtitle?.setScale(0.72);
      this.pulseTween = this.tweens.add({
        targets: [this.centerBackdrop, this.centerTitle, this.centerSubtitle],
        scale: { from: 0.78, to: 1 },
        alpha: { from: 0.08, to: 1 },
        duration: 420,
        ease: "Back.out",
      });
    }
  }

  const scene = new KaboomScene();
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
