import type Phaser from "phaser";
import { makeTextureKey } from "@/lib/games/phaser/types";
import {
  applyButtonFeedback,
  PHASER_PANEL_STROKE,
  PHASER_PRIMARY,
  PHASER_PRIMARY_DARK,
  PHASER_TEXT,
  PHASER_UI_FONT,
  waitForPhaserStudentFont,
} from "@/lib/games/phaser/ui-theme";

export type YesNoSceneState = {
  imageUrl: string | null;
  roundPhase: "prepping" | "hidden" | "timing" | "feedback";
  timerText: string;
  displayedText: string;
  canAnswer: boolean;
};

export type YesNoSceneEvent =
  | { type: "yes-click" }
  | { type: "no-click" };

export type YesNoSceneApi = {
  sync: (next: YesNoSceneState) => void;
};

type AnswerButtonKind = "yes" | "no";

type AnswerButtonUi = {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Arc;
  shadow: Phaser.GameObjects.Arc;
  pulseTween?: Phaser.Tweens.Tween;
  kind: AnswerButtonKind;
};

export async function createYesNoGame({
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
  emit: (event: YesNoSceneEvent) => void;
  exposeApi: (api: YesNoSceneApi) => void;
}) {
  await waitForPhaserStudentFont();
  class YesNoScene extends Phaser.Scene {
    private state: YesNoSceneState = {
      imageUrl: null,
      roundPhase: "hidden",
      timerText: "Ready",
      displayedText: "—",
      canAnswer: false,
    };

    private previousImageUrl: string | null = null;
    private sceneWidth = 0;
    private sceneHeight = 0;

    private stageFrame?: Phaser.GameObjects.Graphics;
    private stageWash?: Phaser.GameObjects.Graphics;
    private stageGlow?: Phaser.GameObjects.Graphics;
    private imageFrame?: Phaser.GameObjects.Rectangle;
    private promptFrame?: Phaser.GameObjects.Rectangle;
    private timerFrame?: Phaser.GameObjects.Rectangle;
    private timerTextNode?: Phaser.GameObjects.Text;
    private promptText?: Phaser.GameObjects.Text;
    private image?: Phaser.GameObjects.Image;
    private fallbackText?: Phaser.GameObjects.Text;
    private prepOverlay?: Phaser.GameObjects.Container;

    private yesButton?: AnswerButtonUi;
    private noButton?: AnswerButtonUi;

    create() {
      this.cameras.main.setBackgroundColor("#f6fbf7");
      this.stageFrame = this.add.graphics();
      this.stageWash = this.add.graphics();
      this.stageGlow = this.add.graphics();

      this.imageFrame = this.add.rectangle(0, 0, 100, 100, 0xffffff).setStrokeStyle(2, PHASER_PANEL_STROKE, 0.92);
      this.promptFrame = this.add.rectangle(0, 0, 100, 100, 0xffffff).setStrokeStyle(2, PHASER_PANEL_STROKE, 0.92);
      this.timerFrame = this.add.rectangle(0, 0, 100, 100, PHASER_PRIMARY).setStrokeStyle(2, 0xffffff, 0.85);

      this.image = this.add.image(0, 0, "__MISSING");
      this.image.setVisible(false);
      this.image.setDepth(3);

      this.fallbackText = this.add
        .text(0, 0, "No image selected", {
          fontFamily: PHASER_UI_FONT,
          fontSize: "30px",
          fontStyle: "bold",
          color: "#94a3b8",
        })
        .setOrigin(0.5)
        .setDepth(4);

      this.timerTextNode = this.add
        .text(0, 0, "Ready", {
          fontFamily: PHASER_UI_FONT,
          fontSize: "34px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5)
        .setDepth(6);

      this.timerFrame.setDepth(5);

      this.promptText = this.add
        .text(0, 0, "—", {
          fontFamily: PHASER_UI_FONT,
          fontSize: "38px",
          fontStyle: "bold",
          color: PHASER_TEXT,
          align: "center",
          wordWrap: { width: 740 },
        })
        .setOrigin(0.5)
        .setDepth(4);

      this.yesButton = this.buildAnswerButton("yes");
      this.noButton = this.buildAnswerButton("no");

      const prepCard = this.add.rectangle(0, 0, 360, 170, 0x0f172a, 0.72).setStrokeStyle(2, 0xffffff, 0.12);
      const prepText = this.add
        .text(0, 0, "Get Ready", {
          fontFamily: PHASER_UI_FONT,
          fontSize: "48px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      this.prepOverlay = this.add.container(0, 0, [prepCard, prepText]).setVisible(false);
      this.prepOverlay.setDepth(20);

      this.scale.on("resize", this.handleResize, this);
      this.handleResize(this.scale.gameSize);
      this.renderState();
      this.syncButtonStates();
      this.children.bringToTop(this.prepOverlay);
    }

    shutdownScene() {
      this.scale.off("resize", this.handleResize, this);
      this.yesButton?.pulseTween?.stop();
      this.noButton?.pulseTween?.stop();
    }

    sync(next: YesNoSceneState) {
      const imageChanged = next.imageUrl !== this.previousImageUrl;
      this.state = next;
      if (imageChanged) {
        void this.ensureTexture(next.imageUrl).then(() => {
          this.renderState();
        });
        this.previousImageUrl = next.imageUrl;
      }
      this.renderState();
      this.syncButtonStates();
    }

    private buildAnswerButton(kind: AnswerButtonKind): AnswerButtonUi {
      const isYes = kind === "yes";
      const fill = isYes ? 0x22c55e : 0xef4444;
      const fillActive = isYes ? 0x16a34a : 0xdc2626;

      const shadow = this.add.circle(0, 12, 86, 0x0f172a, 0.18);
      const glow = this.add.circle(0, 0, 82, 0xffffff, 0.14).setVisible(false);
      const bg = this.add.circle(0, 0, 76, fill, 1).setStrokeStyle(4, 0xffffff, 0.95);
      const label = this.add
        .text(0, 0, isYes ? "YES" : "NO", {
          fontFamily: PHASER_UI_FONT,
          fontSize: "34px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      const container = this.add.container(0, 0, [shadow, glow, bg, label]);
      container.setSize(180, 180);
      container.setInteractive(new Phaser.Geom.Circle(0, 0, 86), Phaser.Geom.Circle.Contains);
      container.on("pointerdown", () => {
        if (!this.state.canAnswer) return;
        emit({ type: isYes ? "yes-click" : "no-click" });
      });
      applyButtonFeedback(container, { hoverScale: 1.04, pressedScale: 0.96 });

      return {
        container,
        bg,
        glow,
        shadow,
        kind,
        pulseTween: undefined,
      };
    }

    private syncButtonStates() {
      this.updateAnswerButton(this.yesButton, this.state.canAnswer);
      this.updateAnswerButton(this.noButton, this.state.canAnswer);
    }

    private updateAnswerButton(button: AnswerButtonUi | undefined, active: boolean) {
      if (!button) return;

      const fill = button.kind === "yes" ? (active ? 0x22c55e : 0x86efac) : active ? 0xef4444 : 0xfca5a5;
      const stroke = active ? 0xffffff : 0xf8fafc;
      button.bg.setFillStyle(fill, 1);
      button.bg.setStrokeStyle(active ? 5 : 4, stroke, active ? 0.98 : 0.86);
      button.shadow.setAlpha(active ? 0.28 : 0.16);
      button.glow.setVisible(active);

      if (active) {
        if (!button.container.input) {
          button.container.setInteractive(new Phaser.Geom.Circle(0, 0, 86), Phaser.Geom.Circle.Contains);
        }
        if (!button.pulseTween) {
          button.pulseTween = this.tweens.add({
            targets: button.glow,
            scaleX: 1.28,
            scaleY: 1.28,
            alpha: 0.02,
            duration: 850,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });
        }
        button.glow.setScale(1);
        button.glow.setAlpha(0.14);
      } else {
        button.container.disableInteractive();
        if (button.pulseTween) {
          button.pulseTween.stop();
          button.pulseTween = undefined;
        }
        button.glow.setVisible(false);
        button.glow.setScale(1);
        button.glow.setAlpha(0);
      }
    }

    private handleResize(size: Phaser.Structs.Size | { width: number; height: number }) {
      const centerX = size.width / 2;
      const centerY = size.height / 2;
      const compact = size.width < 840;

      const boardPaddingX = Math.max(18, size.width * 0.035);
      const boardPaddingY = Math.max(18, size.height * 0.035);
      const boardWidth = size.width - boardPaddingX * 2;
      const boardHeight = size.height - boardPaddingY * 2;

      const imageFrameWidth = Math.min(size.width * (compact ? 0.8 : 0.76), 980);
      const imageFrameHeight = Math.min(size.height * (compact ? 0.4 : 0.42), 380);
      const promptFrameWidth = Math.min(size.width * (compact ? 0.74 : 0.68), 880);
      const promptFrameHeight = compact ? 92 : 102;
      const imageY = centerY - (compact ? 124 : 132);
      const promptY = centerY + (compact ? 120 : 130);
      const timerY = Math.max(56, boardPaddingY + 30);
      const buttonY = size.height - Math.max(168, size.height * 0.18);
      const buttonOffset = compact ? 180 : 214;

      this.sceneWidth = size.width;
      this.sceneHeight = size.height;

      this.stageFrame?.clear();
      this.stageFrame?.fillStyle(0xffffff, 0.96);
      this.stageFrame?.fillRoundedRect(10, 10, boardWidth, boardHeight, 24);
      this.stageFrame?.lineStyle(2, PHASER_PANEL_STROKE, 0.42);
      this.stageFrame?.strokeRoundedRect(10, 10, boardWidth, boardHeight, 24);
      this.stageFrame?.setDepth(1);

      this.stageWash?.clear();
      this.stageWash?.fillStyle(0xeff6f1, 0.8);
      this.stageWash?.fillRoundedRect(16, 16, boardWidth - 12, boardHeight - 12, 22);
      this.stageWash?.lineStyle(24, 0x0f172a, 0.03);
      this.stageWash?.strokeRoundedRect(16, 16, boardWidth - 12, boardHeight - 12, 22);
      this.stageWash?.setDepth(2);

      this.stageGlow?.clear();
      this.stageGlow?.fillStyle(0xffffff, 0.16);
      this.stageGlow?.fillRoundedRect(24, 24, boardWidth - 28, boardHeight - 28, 18);
      this.stageGlow?.setDepth(3);

      this.timerFrame?.setPosition(centerX, timerY);
      this.timerFrame?.setSize(240, 82);
      this.timerTextNode?.setPosition(centerX, timerY);

      this.imageFrame?.setPosition(centerX, imageY);
      this.imageFrame?.setSize(imageFrameWidth, imageFrameHeight);
      this.image?.setPosition(centerX, imageY);
      this.fallbackText?.setPosition(centerX, imageY);

      this.promptFrame?.setPosition(centerX, promptY);
      this.promptFrame?.setSize(promptFrameWidth, promptFrameHeight);
      this.promptText?.setPosition(centerX, promptY);
      this.promptText?.setWordWrapWidth(promptFrameWidth - 48, true);

      this.yesButton?.container.setPosition(centerX - buttonOffset, buttonY);
      this.noButton?.container.setPosition(centerX + buttonOffset, buttonY);
      this.yesButton?.container.setScale(compact ? 0.98 : 1);
      this.noButton?.container.setScale(compact ? 0.98 : 1);
      this.prepOverlay?.setPosition(centerX, centerY - 36);
    }

    private renderState() {
      const textureKey = this.state.imageUrl ? makeTextureKey("yes-no", this.state.imageUrl) : null;
      const hasImage = textureKey ? this.textures.exists(textureKey) : false;

      if (hasImage && textureKey && this.image) {
        this.image.setTexture(textureKey);
        this.image.setVisible(true);
        this.fallbackText?.setVisible(false);

        const source = this.textures.get(textureKey).getSourceImage() as { width?: number; height?: number } | undefined;
        const naturalWidth = Math.max(1, Number(source?.width ?? 1));
        const naturalHeight = Math.max(1, Number(source?.height ?? 1));
        const frameWidth = Math.max(1, (this.imageFrame?.width ?? this.sceneWidth * 0.72) - 72);
        const frameHeight = Math.max(1, (this.imageFrame?.height ?? this.sceneHeight * 0.4) - 44);
        const scale = Math.min(frameWidth / naturalWidth, frameHeight / naturalHeight);
        this.image.setDisplaySize(naturalWidth * scale, naturalHeight * scale);
      } else {
        this.image?.setVisible(false);
        this.fallbackText?.setVisible(true);
      }

      this.timerTextNode?.setText(this.state.timerText);
      this.promptText?.setText(this.state.displayedText);
      this.promptText?.setAlpha(this.state.roundPhase === "hidden" ? 0.42 : 1);
      this.prepOverlay?.setVisible(this.state.roundPhase === "prepping");
    }

    private ensureTexture(imageUrl: string | null) {
      if (!imageUrl) return Promise.resolve(null);
      const textureKey = makeTextureKey("yes-no", imageUrl);
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

  const scene = new YesNoScene();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: "#f6fbf7",
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
