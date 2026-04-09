import { makeTextureKey } from "@/lib/games/phaser/types";
import {
  applyButtonFeedback,
  PHASER_PANEL_STROKE,
  PHASER_PRIMARY,
  PHASER_TEXT,
  PHASER_UI_FONT,
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
  | { type: "no-click" }
  | { type: "prev-click" }
  | { type: "next-click" };

export type YesNoSceneApi = {
  sync: (next: YesNoSceneState) => void;
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
  class YesNoScene extends Phaser.Scene {
    private state: YesNoSceneState = {
      imageUrl: null,
      roundPhase: "hidden",
      timerText: "Ready",
      displayedText: "—",
      canAnswer: false,
    };

    private image?: Phaser.GameObjects.Image;
    private timerBadge?: Phaser.GameObjects.Container;
    private timerTextNode?: Phaser.GameObjects.Text;
    private promptText?: Phaser.GameObjects.Text;
    private yesButton?: Phaser.GameObjects.Container;
    private noButton?: Phaser.GameObjects.Container;
    private prepOverlay?: Phaser.GameObjects.Container;
    private prevButton?: Phaser.GameObjects.Container;
    private nextButton?: Phaser.GameObjects.Container;
    private fallbackText?: Phaser.GameObjects.Text;

    create() {
      this.cameras.main.setBackgroundColor("#ffffff");
      const panel = this.add.rectangle(0, 0, 100, 100, 0xffffff).setStrokeStyle(2, 0xe5e7eb, 1);
      panel.setOrigin(0);

      this.image = this.add.image(0, 0, "__MISSING").setVisible(false);
      this.fallbackText = this.add
        .text(0, 0, "No image", {
          fontFamily: PHASER_UI_FONT,
          fontSize: "34px",
          color: "#94a3b8",
        })
        .setOrigin(0.5);

      const timerBg = this.add.rectangle(0, 0, 180, 68, 0xffffff).setStrokeStyle(2, PHASER_PANEL_STROKE);
      this.timerTextNode = this.add
        .text(0, 0, "Ready", {
          fontFamily: PHASER_UI_FONT,
          fontSize: "28px",
          fontStyle: "bold",
          color: PHASER_TEXT,
        })
        .setOrigin(0.5);
      this.timerBadge = this.add.container(0, 0, [timerBg, this.timerTextNode]);

      this.promptText = this.add
        .text(0, 0, "—", {
          fontFamily: PHASER_UI_FONT,
          fontSize: "38px",
          fontStyle: "bold",
          color: "#0f172a",
          align: "center",
          wordWrap: { width: 760 },
        })
        .setOrigin(0.5);

      this.yesButton = this.buildButton("Yes", PHASER_PRIMARY, () => emit({ type: "yes-click" }));
      this.noButton = this.buildButton("No", 0xe2e8f0, () => emit({ type: "no-click" }), "#0f172a");
      this.prevButton = this.buildCircleButton("◀", () => emit({ type: "prev-click" }));
      this.nextButton = this.buildCircleButton("▶", () => emit({ type: "next-click" }));

      const prepBg = this.add.rectangle(0, 0, 340, 170, 0x000000, 0.45).setStrokeStyle(2, 0xffffff, 0.1);
      const prepText = this.add
        .text(0, 0, "Get Ready", {
          fontFamily: PHASER_UI_FONT,
          fontSize: "46px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      this.prepOverlay = this.add.container(0, 0, [prepBg, prepText]).setVisible(false);

      this.children.bringToTop(this.prepOverlay);

      this.scale.on("resize", this.handleResize, this);
      this.handleResize(this.scale.gameSize);
      this.renderState();
    }

    shutdownScene() {
      this.scale.off("resize", this.handleResize, this);
    }

    sync(next: YesNoSceneState) {
      this.state = next;
      void this.ensureTexture(next.imageUrl).then(() => this.renderState());
      this.renderState();
    }

    private buildButton(label: string, color: number, onClick: () => void, textColor = "#ffffff") {
      const bg = this.add.rectangle(0, 0, 220, 86, color).setStrokeStyle(3, PHASER_PANEL_STROKE, 0.6);
      const text = this.add
        .text(0, 0, label, {
          fontFamily: PHASER_UI_FONT,
          fontSize: "34px",
          fontStyle: "bold",
          color: textColor,
        })
        .setOrigin(0.5);
      const container = this.add.container(0, 0, [bg, text]);
      container.setSize(220, 86);
      container.setInteractive(new Phaser.Geom.Rectangle(-110, -43, 220, 86), Phaser.Geom.Rectangle.Contains);
      container.on("pointerdown", onClick);
      applyButtonFeedback(container);
      return container;
    }

    private buildCircleButton(label: string, onClick: () => void) {
      const bg = this.add.circle(0, 0, 34, 0xffffff).setStrokeStyle(2, PHASER_PANEL_STROKE);
      const text = this.add
        .text(0, 0, label, {
          fontFamily: PHASER_UI_FONT,
          fontSize: "24px",
          fontStyle: "bold",
          color: PHASER_TEXT,
        })
        .setOrigin(0.5);
      const container = this.add.container(0, 0, [bg, text]);
      container.setSize(68, 68);
      container.setInteractive(new Phaser.Geom.Circle(0, 0, 34), Phaser.Geom.Circle.Contains);
      container.on("pointerdown", onClick);
      applyButtonFeedback(container);
      return container;
    }

    private handleResize(size: Phaser.Structs.Size | { width: number; height: number }) {
      const centerX = size.width / 2;
      const centerY = size.height / 2;
      const compact = size.width < 760;
      const imageWidth = Math.min(size.width * (compact ? 0.86 : 0.8), 920);
      const imageHeight = Math.min(size.height * (compact ? 0.42 : 0.5), 420);
      const sideInset = compact ? 34 : 44;
      const buttonOffset = compact ? 118 : 150;
      const buttonY = size.height - (compact ? 78 : 72);

      const panel = this.children.list[0] as Phaser.GameObjects.Rectangle;
      panel.setSize(size.width, size.height);

      this.timerBadge?.setPosition(centerX, 46);
      this.image?.setPosition(centerX, centerY - 80);
      this.image?.setDisplaySize(imageWidth, imageHeight);
      this.fallbackText?.setPosition(centerX, centerY - 80);
      this.prevButton?.setPosition(sideInset, centerY - 80);
      this.nextButton?.setPosition(size.width - sideInset, centerY - 80);
      this.promptText?.setPosition(centerX, size.height - (compact ? 168 : 170));
      this.promptText?.setWordWrapWidth(Math.min(size.width * 0.84, 820), true);
      this.promptText?.setFontSize(compact ? 30 : 38);
      this.yesButton?.setPosition(centerX - buttonOffset, buttonY);
      this.noButton?.setPosition(centerX + buttonOffset, buttonY);
      this.yesButton?.setScale(compact ? 0.9 : 1);
      this.noButton?.setScale(compact ? 0.9 : 1);
      this.prepOverlay?.setPosition(centerX, centerY - 40);
    }

    private renderState() {
      const textureKey = this.state.imageUrl ? makeTextureKey("yes-no", this.state.imageUrl) : null;
      const hasImage = textureKey ? this.textures.exists(textureKey) : false;
      if (hasImage && textureKey && this.image) {
        this.image.setTexture(textureKey);
        this.image.setVisible(true);
        this.fallbackText?.setVisible(false);
      } else {
        this.image?.setVisible(false);
        this.fallbackText?.setVisible(true);
      }

      this.timerTextNode?.setText(this.state.timerText);
      this.promptText?.setText(this.state.displayedText);
      this.promptText?.setAlpha(this.state.roundPhase === "hidden" ? 0.45 : 1);
      this.prepOverlay?.setVisible(this.state.roundPhase === "prepping");

      this.yesButton?.setAlpha(this.state.canAnswer ? 1 : 0.55);
      this.noButton?.setAlpha(this.state.canAnswer ? 1 : 0.55);
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
    backgroundColor: "#ffffff",
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
