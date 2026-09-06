import { makeTextureKey } from "@/lib/games/phaser/types";
import {
  applyButtonFeedback,
  PHASER_MUTED,
  PHASER_PRIMARY,
  PHASER_PRIMARY_DARK,
  PHASER_TEXT,
  PHASER_UI_FONT,
  waitForPhaserStudentFont,
} from "@/lib/games/phaser/ui-theme";

export type FourCornersPhase = "idle" | "countdown" | "animating" | "bomb" | "showcard" | "finished";

export type FourCornersSceneState = {
  phase: FourCornersPhase;
  count: number;
  spotlightIndex: number | null;
  blackedOut: boolean[];
  eliminated: boolean[];
  currentCardWord: string | null;
  currentCardImage: string | null;
};

export type FourCornersSceneEvent = { type: "start-click" } | { type: "next-click" };

export type FourCornersSceneApi = {
  sync: (next: FourCornersSceneState) => void;
};

type QuarterNode = {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  title: Phaser.GameObjects.Text;
  caption: Phaser.GameObjects.Text;
  number: Phaser.GameObjects.Text;
  icon: Phaser.GameObjects.Text;
  blackout: Phaser.GameObjects.Rectangle;
};

export async function createFourCornersGame({
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
  emit: (event: FourCornersSceneEvent) => void;
  exposeApi: (api: FourCornersSceneApi) => void;
}) {
  await waitForPhaserStudentFont();
  class FourCornersScene extends Phaser.Scene {
    private state: FourCornersSceneState = {
      phase: "idle",
      count: 10,
      spotlightIndex: null,
      blackedOut: [false, false, false, false],
      eliminated: [false, false, false, false],
      currentCardWord: null,
      currentCardImage: null,
    };

    private quarters: QuarterNode[] = [];
    private centerLayer?: Phaser.GameObjects.Container;
    private centerButton?: Phaser.GameObjects.Container;
    private centerButtonText?: Phaser.GameObjects.Text;
    private countdownText?: Phaser.GameObjects.Text;
    private helperText?: Phaser.GameObjects.Text;
    private cardImage?: Phaser.GameObjects.Image;
    private cardWord?: Phaser.GameObjects.Text;
    private boomCircle?: Phaser.GameObjects.Arc;
    private activeTween?: Phaser.Tweens.Tween;

    create() {
      this.cameras.main.setBackgroundColor("#f8fafc");
      this.buildBoard();
      this.buildCenterLayer();
      this.scale.on("resize", this.handleResize, this);
      this.handleResize(this.scale.gameSize);
      this.renderState();
    }

    shutdownScene() {
      this.scale.off("resize", this.handleResize, this);
      this.activeTween?.stop();
    }

    sync(next: FourCornersSceneState) {
      this.state = next;
      void this.ensureTexture(next.currentCardImage).then(() => this.renderState());
      this.renderState();
    }

    private buildBoard() {
      const colors = [0x6366f1, 0x10b981, 0xf59e0b, 0xf43f5e];
      const titles = ["Make a sentence", "Make a question", "Do an action", "Make a negative"];
      const captions = [
        "Create a sentence",
        "Turn it into a question",
        "Act it out",
        "Say the negative form",
      ];
      const icons = ["📝", "❓", "🎭", "🚫"];

      for (let index = 0; index < 4; index += 1) {
        const bg = this.add.rectangle(0, 0, 100, 100, colors[index]).setStrokeStyle(2, 0xffffff, 0.3);
        const icon = this.add.text(0, -48, icons[index], { fontSize: "40px" }).setOrigin(0.5);
        const title = this.add
          .text(0, 6, titles[index], {
            fontFamily: PHASER_UI_FONT,
            fontSize: "26px",
            fontStyle: "bold",
            color: "#ffffff",
            align: "center",
            wordWrap: { width: 280 },
          })
          .setOrigin(0.5);
        const caption = this.add
          .text(0, 52, captions[index], {
            fontFamily: PHASER_UI_FONT,
            fontSize: "16px",
            color: "#ffffff",
            align: "center",
            wordWrap: { width: 300 },
          })
          .setOrigin(0.5);
        const number = this.add
          .text(0, 110, String(index + 1), {
            fontFamily: PHASER_UI_FONT,
            fontSize: "44px",
            fontStyle: "bold",
            color: "#ffffff",
          })
          .setOrigin(0.5);
        const blackout = this.add.rectangle(0, 0, 100, 100, 0x000000, 0.96).setVisible(false);
        const container = this.add.container(0, 0, [bg, icon, title, caption, number, blackout]);
        this.quarters.push({ container, bg, title, caption, number, icon, blackout });
      }
    }

    private buildCenterLayer() {
      this.centerLayer = this.add.container(0, 0);

      const buttonBg = this.add.rectangle(0, 0, 240, 94, PHASER_PRIMARY).setStrokeStyle(3, PHASER_PRIMARY_DARK);
      this.centerButtonText = this.add
        .text(0, 0, "Start", {
          fontFamily: PHASER_UI_FONT,
          fontSize: "34px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      this.centerButton = this.add.container(0, 0, [buttonBg, this.centerButtonText]);
      this.centerButton.setSize(240, 94);
      this.centerButton.setInteractive(new Phaser.Geom.Rectangle(-120, -47, 240, 94), Phaser.Geom.Rectangle.Contains);
      this.centerButton.on("pointerdown", () => {
        if (this.state.phase === "idle") emit({ type: "start-click" });
        if (this.state.phase === "bomb" || this.state.phase === "showcard") emit({ type: "next-click" });
      });
      applyButtonFeedback(this.centerButton);

      this.countdownText = this.add
        .text(0, -18, "", {
          fontFamily: PHASER_UI_FONT,
          fontSize: "96px",
          fontStyle: "bold",
          color: "#111827",
        })
        .setOrigin(0.5)
        .setVisible(false);
      this.helperText = this.add
        .text(0, 52, "", {
          fontFamily: PHASER_UI_FONT,
          fontSize: "24px",
          fontStyle: "bold",
          color: PHASER_MUTED,
          align: "center",
        })
        .setOrigin(0.5)
        .setVisible(false);
      this.boomCircle = this.add.circle(0, 0, 180, 0xf97316, 0.96).setVisible(false);
      this.cardImage = this.add.image(0, 0, "__MISSING").setVisible(false);
      this.cardWord = this.add
        .text(0, 0, "", {
          fontFamily: PHASER_UI_FONT,
          fontSize: "40px",
          fontStyle: "bold",
          color: PHASER_TEXT,
          backgroundColor: "#ffffff",
          padding: { left: 24, right: 24, top: 20, bottom: 20 },
          align: "center",
          wordWrap: { width: 460 },
        })
        .setOrigin(0.5)
        .setVisible(false);

      this.centerLayer.add([
        this.boomCircle,
        this.cardImage,
        this.cardWord,
        this.countdownText,
        this.helperText,
        this.centerButton,
      ]);
    }

    private handleResize(size: Phaser.Structs.Size | { width: number; height: number }) {
      const quarterWidth = size.width / 2;
      const quarterHeight = size.height / 2;

      this.quarters.forEach((quarter, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const centerX = col * quarterWidth + quarterWidth / 2;
        const centerY = row * quarterHeight + quarterHeight / 2;
        quarter.container.setPosition(centerX, centerY);
        quarter.bg.setSize(quarterWidth + 2, quarterHeight + 2);
        quarter.blackout.setSize(quarterWidth + 2, quarterHeight + 2);
        const scale = Math.min(1.2, Math.min(quarterWidth / 360, quarterHeight / 260));
        quarter.icon.setScale(scale);
        quarter.title.setScale(scale);
        quarter.caption.setScale(scale);
        quarter.number.setScale(scale);
      });

      this.centerLayer?.setPosition(size.width / 2, size.height / 2);
      this.cardImage?.setDisplaySize(Math.min(size.width * 0.42, 520), Math.min(size.height * 0.32, 320));
      this.cardWord?.setWordWrapWidth(Math.min(size.width * 0.5, 500), true);
    }

    private renderState() {
      this.quarters.forEach((quarter, index) => {
        const eliminated = this.state.eliminated[index];
        const blackedOut = this.state.blackedOut[index];
        const spotlight = this.state.phase === "countdown" && this.state.spotlightIndex === index;
        quarter.container.setAlpha(eliminated ? 0.42 : 1);
        quarter.bg.setStrokeStyle(spotlight ? 6 : 2, spotlight ? 0xfef08a : 0xffffff, spotlight ? 1 : 0.3);
        quarter.container.setScale(spotlight ? 1.02 : 1);
        quarter.blackout.setVisible(blackedOut);
      });

      const textureKey = this.state.currentCardImage ? makeTextureKey("four-corners", this.state.currentCardImage) : null;
      const hasTexture = textureKey ? this.textures.exists(textureKey) : false;

      this.centerButton?.setVisible(false);
      this.centerButton?.setY(0);
      this.countdownText?.setVisible(false);
      this.helperText?.setVisible(false);
      this.helperText?.setFontSize(24);
      this.helperText?.setColor(PHASER_MUTED);
      this.cardImage?.setVisible(false);
      this.cardWord?.setVisible(false);
      this.boomCircle?.setVisible(false);
      this.activeTween?.stop();

      if (this.state.phase === "idle") {
        this.centerButtonText?.setText("Start");
        this.centerButton?.setVisible(true);
        return;
      }

      if (this.state.phase === "countdown") {
        this.countdownText?.setText(String(this.state.count));
        this.countdownText?.setColor(this.state.count <= 3 ? "#dc2626" : "#111827");
        this.countdownText?.setVisible(true);
        this.helperText?.setText("Quick! Find a corner!");
        this.helperText?.setVisible(true);
        this.countdownText?.setScale(this.state.count <= 3 ? 1.08 : 1);
        return;
      }

      if (this.state.phase === "animating") {
        this.helperText?.setText("Selecting...");
        this.helperText?.setVisible(true);
        this.helperText?.setFontSize(38);
        return;
      }

      if (this.state.phase === "bomb") {
        this.boomCircle?.setVisible(true);
        this.activeTween = this.tweens.add({
          targets: this.boomCircle,
          scale: { from: 0.92, to: 1.05 },
          alpha: { from: 0.86, to: 1 },
          duration: 420,
          yoyo: true,
          repeat: -1,
          ease: "Sine.inOut",
        });
        this.helperText?.setText("BOOM!");
        this.helperText?.setVisible(true);
        this.helperText?.setFontSize(54);
        this.helperText?.setColor("#ffffff");
        this.centerButtonText?.setText("Next");
        this.centerButton?.setY(170);
        this.centerButton?.setVisible(true);
        return;
      }

      if (this.state.phase === "showcard") {
        if (hasTexture && textureKey && this.cardImage) {
          this.cardImage.setTexture(textureKey);
          this.cardImage.setVisible(true);
        } else if (this.cardWord) {
          this.cardWord.setText(this.state.currentCardWord ?? "");
          this.cardWord.setVisible(true);
        }
        this.centerButtonText?.setText("Next");
        this.centerButton?.setY(190);
        this.centerButton?.setVisible(true);
        this.activeTween = this.tweens.add({
          targets: hasTexture && this.cardImage ? this.cardImage : this.cardWord,
          alpha: { from: 0.2, to: 1 },
          scale: { from: 0.96, to: 1 },
          duration: 280,
          ease: "Quad.out",
        });
        return;
      }
    }

    private ensureTexture(imageUrl: string | null) {
      if (!imageUrl) return Promise.resolve(null);
      const textureKey = makeTextureKey("four-corners", imageUrl);
      if (this.textures.exists(textureKey)) {
        return Promise.resolve(textureKey);
      }

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
        if (!this.load.isLoading()) {
          this.load.start();
        }
      });
    }
  }

  const scene = new FourCornersScene();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: "#f8fafc",
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
