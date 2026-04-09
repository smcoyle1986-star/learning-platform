import type Phaser from "phaser";

export const PHASER_UI_FONT = "Arial";
export const PHASER_PRIMARY = 0x2563eb;
export const PHASER_PRIMARY_DARK = 0x1d4ed8;
export const PHASER_PANEL_STROKE = 0xcbd5e1;
export const PHASER_TEXT = "#0f172a";
export const PHASER_MUTED = "#475569";

export function applyButtonFeedback(
  container: Phaser.GameObjects.Container,
  options?: {
    hoverScale?: number;
    pressedScale?: number;
    disabledAlpha?: number;
  }
) {
  const hoverScale = options?.hoverScale ?? 1.03;
  const pressedScale = options?.pressedScale ?? 0.97;
  const baseAlpha = 1;
  let baseScaleX = container.scaleX || 1;
  let baseScaleY = container.scaleY || 1;

  const refreshBase = () => {
    baseScaleX = container.scaleX || 1;
    baseScaleY = container.scaleY || 1;
  };

  container.on("pointerover", () => {
    refreshBase();
    container.setScale(baseScaleX * hoverScale, baseScaleY * hoverScale);
    container.setAlpha(baseAlpha);
  });
  container.on("pointerout", () => {
    container.setScale(baseScaleX, baseScaleY);
    container.setAlpha(baseAlpha);
  });
  container.on("pointerdown", () => {
    refreshBase();
    container.setScale(baseScaleX * pressedScale, baseScaleY * pressedScale);
  });
  container.on("pointerup", () => {
    container.setScale(baseScaleX * hoverScale, baseScaleY * hoverScale);
  });
}
