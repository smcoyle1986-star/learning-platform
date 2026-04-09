export type ConnectFourFallingState = {
  col: number;
  row: number;
  player: 1 | 2;
} | null;

export type ConnectFourSceneState = {
  rows: number;
  cols: number;
  board: (0 | 1 | 2)[][];
  cursorCol: number;
  currentPlayer: 1 | 2;
  winnerLine: [number, number][] | null;
  falling: ConnectFourFallingState;
};

export type ConnectFourSceneEvent = {
  type: "column-click";
  col: number;
};

export type ConnectFourSceneApi = {
  sync: (next: ConnectFourSceneState) => void;
};

type ColumnNode = {
  numberBg: Phaser.GameObjects.Rectangle;
  numberText: Phaser.GameObjects.Text;
  previewDisc: Phaser.GameObjects.Arc;
  hitArea: Phaser.GameObjects.Zone;
};

type CellNode = {
  bg: Phaser.GameObjects.Rectangle;
  hole: Phaser.GameObjects.Arc;
};

function isWinningCell(line: [number, number][] | null, row: number, col: number) {
  return !!line?.some(([r, c]) => r === row && c === col);
}

export async function createConnectFourGame({
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
  emit: (event: ConnectFourSceneEvent) => void;
  exposeApi: (api: ConnectFourSceneApi) => void;
}) {
  class ConnectFourScene extends Phaser.Scene {
    private state: ConnectFourSceneState = {
      rows: 6,
      cols: 7,
      board: Array.from({ length: 6 }, () => Array.from({ length: 7 }, () => 0 as 0 | 1 | 2)),
      cursorCol: 3,
      currentPlayer: 1,
      winnerLine: null,
      falling: null,
    };

    private boardLayer?: Phaser.GameObjects.Container;
    private columns: ColumnNode[] = [];
    private cells: CellNode[] = [];
    private fallingDisc?: Phaser.GameObjects.Arc;
    private fallingTween?: Phaser.Tweens.Tween;

    create() {
      this.cameras.main.setBackgroundColor("#f3f4f6");
      this.boardLayer = this.add.container(0, 0);
      this.fallingDisc = this.add.circle(0, 0, 24, 0xef4444).setVisible(false).setDepth(20);
      this.scale.on("resize", this.handleResize, this);
      this.rebuildBoard();
      this.handleResize(this.scale.gameSize);
      this.renderState();
    }

    shutdownScene() {
      this.scale.off("resize", this.handleResize, this);
      this.fallingTween?.stop();
    }

    sync(next: ConnectFourSceneState) {
      const shapeChanged = next.rows !== this.state.rows || next.cols !== this.state.cols;
      this.state = next;
      if (shapeChanged) {
        this.rebuildBoard();
        this.handleResize(this.scale.gameSize);
      }
      this.renderState();
    }

    private rebuildBoard() {
      this.columns.forEach((column) => {
        column.numberBg.destroy();
        column.numberText.destroy();
        column.previewDisc.destroy();
        column.hitArea.destroy();
      });
      this.cells.forEach((cell) => {
        cell.bg.destroy();
        cell.hole.destroy();
      });
      this.columns = [];
      this.cells = [];

      for (let col = 0; col < this.state.cols; col += 1) {
        const numberBg = this.add.rectangle(0, 0, 72, 44, 0xffffff).setStrokeStyle(2, PHASER_PANEL_STROKE);
        const numberText = this.add
          .text(0, 0, String(col + 1), {
            fontFamily: PHASER_UI_FONT,
            fontSize: "24px",
            fontStyle: "bold",
            color: "#000000",
          })
          .setOrigin(0.5);
        const previewDisc = this.add.circle(0, 0, 18, 0xef4444).setVisible(false);
        const hitArea = this.add.zone(0, 0, 72, 120).setOrigin(0.5);
        hitArea.setInteractive();
        hitArea.on("pointerdown", () => emit({ type: "column-click", col }));
        this.columns.push({ numberBg, numberText, previewDisc, hitArea });
        this.boardLayer?.add([numberBg, numberText, previewDisc, hitArea]);
      }

      for (let row = 0; row < this.state.rows; row += 1) {
        for (let col = 0; col < this.state.cols; col += 1) {
          const bg = this.add.rectangle(0, 0, 88, 88, 0x2563eb).setStrokeStyle(2, 0x1d4ed8, 1);
          const hole = this.add.circle(0, 0, 26, 0xffffff);
          this.cells.push({ bg, hole });
          this.boardLayer?.add([bg, hole]);
        }
      }
    }

    private handleResize(size: Phaser.Structs.Size | { width: number; height: number }) {
      const gap = 10;
      const topZone = Math.max(92, Math.min(120, size.height * 0.16));
      const cellWidth = (size.width - gap * (this.state.cols + 1)) / this.state.cols;
      const cellHeight = (size.height - topZone - gap * (this.state.rows + 1)) / this.state.rows;
      const scale = Math.min(cellWidth / 88, cellHeight / 88);
      const previewY = 72;
      const numberY = 28;
      const firstCellY = topZone + cellHeight / 2;

      this.columns.forEach((column, col) => {
        const centerX = gap + cellWidth / 2 + col * (cellWidth + gap);
        column.numberBg.setPosition(centerX, numberY);
        column.numberText.setPosition(centerX, numberY);
        column.previewDisc.setPosition(centerX, previewY);
        column.previewDisc.setScale(scale);
        column.hitArea.setPosition(centerX, topZone / 2 + 20);
        column.hitArea.setSize(cellWidth, topZone);
      });

      this.cells.forEach((cell, index) => {
        const row = Math.floor(index / this.state.cols);
        const col = index % this.state.cols;
        const centerX = gap + cellWidth / 2 + col * (cellWidth + gap);
        const centerY = firstCellY + row * (cellHeight + gap);
        cell.bg.setPosition(centerX, centerY);
        cell.bg.setDisplaySize(cellWidth, cellHeight);
        cell.hole.setPosition(centerX, centerY);
        cell.hole.setRadius(Math.min(cellWidth, cellHeight) * 0.32);
      });
    }

    private renderState() {
      this.columns.forEach((column, col) => {
        const isActive = col === this.state.cursorCol;
        column.numberBg.setFillStyle(isActive ? 0x2563eb : 0xffffff, 1);
        column.numberBg.setStrokeStyle(isActive ? 3 : 2, isActive ? 0x93c5fd : 0xcbd5e1, 1);
        column.numberText.setColor(isActive ? "#ffffff" : "#000000");
        column.previewDisc.setVisible(isActive);
        column.previewDisc.setFillStyle(this.state.currentPlayer === 1 ? 0xef4444 : 0xfacc15, 1);
        column.previewDisc.setAlpha(this.state.falling ? 0.35 : 1);
      });

      this.cells.forEach((cell, index) => {
        const row = Math.floor(index / this.state.cols);
        const col = index % this.state.cols;
        const value = this.state.board[row]?.[col] ?? 0;
        const winning = isWinningCell(this.state.winnerLine, row, col);
        cell.bg.setFillStyle(0x2563eb, 1);
        cell.hole.setFillStyle(
          value === 0 ? 0xffffff : value === 1 ? 0xef4444 : 0xfacc15,
          1
        );
        cell.hole.setStrokeStyle(winning ? 6 : 0, winning ? 0x86efac : 0, 1);
      });

      this.renderFallingDisc();
    }

    private renderFallingDisc() {
      const falling = this.state.falling;
      if (!falling || !this.fallingDisc) {
        this.fallingTween?.stop();
        this.fallingDisc?.setVisible(false);
        return;
      }

      const column = this.columns[falling.col];
      const targetCell = this.cells[Math.max(0, falling.row) * this.state.cols + falling.col];
      if (!column || !targetCell) return;

      this.fallingTween?.stop();
      this.fallingDisc.setVisible(true);
      this.fallingDisc.setFillStyle(falling.player === 1 ? 0xef4444 : 0xfacc15, 1);
      this.fallingDisc.setPosition(column.previewDisc.x, column.previewDisc.y);
      this.fallingDisc.setRadius(targetCell.hole.radius);
      this.fallingTween = this.tweens.add({
        targets: this.fallingDisc,
        x: targetCell.hole.x,
        y: targetCell.hole.y,
        duration: 360 + Math.max(0, falling.row) * 80,
        ease: "Cubic.easeOut",
      });
    }
  }

  const scene = new ConnectFourScene();
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

  game.events.once("destroy", () => scene.shutdownScene());

  return { game };
}
import { PHASER_PANEL_STROKE, PHASER_UI_FONT } from "@/lib/games/phaser/ui-theme";
