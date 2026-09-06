import type Phaser from "phaser";
import { PHASER_UI_FONT, waitForPhaserStudentFont } from "@/lib/games/phaser/ui-theme";

export type SpinSegment = {
  id: string;
  label: string;
};

export type SpinWheelEvent =
  | { type: "spin-start" }
  | { type: "spin-landed"; segment: SpinSegment };

export type SpinWheelApi = {
  spin: () => void;
};

export async function createSpinWheelGame({
  Phaser,
  parent,
  width,
  height,
  emit,
  exposeApi,
  segments,
}: {
  Phaser: typeof import("phaser");
  parent: HTMLDivElement;
  width: number;
  height: number;
  emit: (event: SpinWheelEvent) => void;
  exposeApi: (api: SpinWheelApi) => void;
  segments: SpinSegment[];
}) {
  await waitForPhaserStudentFont();
  class SpinWheelScene extends Phaser.Scene {
    private wheelContainer!: Phaser.GameObjects.Container;
    private pointer!: Phaser.GameObjects.Polygon;
    private spinGlow?: Phaser.GameObjects.Arc;
    private wheelBase?: Phaser.GameObjects.Arc;
    private spinning = false;
    private currentAngle = 0;
    private lastLandedIndex = -1;
    private readonly wheelStartAngle = 45;

    create() {
      this.cameras.main.setBackgroundColor("#f0fdf4");
      this.buildWheel();
      this.scale.on("resize", this.handleResize, this);
      this.handleResize(this.scale.gameSize);
    }

    shutdownScene() {
      this.scale.off("resize", this.handleResize, this);
      this.tweens.killAll();
    }

    spin() {
      if (this.spinning) return;
      this.spinning = true;
      emit({ type: "spin-start" });
      if (this.spinGlow) {
        this.spinGlow.setVisible(true);
        this.spinGlow.setAlpha(0.25);
        this.spinGlow.setScale(0.92);
        this.tweens.add({
          targets: this.spinGlow,
          alpha: { from: 0.25, to: 0.62 },
          scale: { from: 0.92, to: 1.08 },
          duration: 260,
          yoyo: true,
          ease: "Sine.easeOut",
        });
      }
      this.tweens.add({
        targets: this.pointer,
        scaleX: { from: this.pointer.scaleX, to: this.pointer.scaleX * 1.08 },
        scaleY: { from: this.pointer.scaleY, to: this.pointer.scaleY * 1.08 },
        duration: 220,
        yoyo: true,
        ease: "Sine.easeOut",
      });
      this.tweens.add({
        targets: this.wheelContainer,
        scaleX: this.wheelContainer.scaleX * 1.04,
        scaleY: this.wheelContainer.scaleY * 1.04,
        duration: 180,
        yoyo: true,
        ease: "Sine.easeOut",
      });

      const segAngle = 360 / segments.length;
      let chosen = Phaser.Math.Between(0, segments.length - 1);
      if (segments.length > 1 && chosen === this.lastLandedIndex) {
        chosen = (chosen + Phaser.Math.Between(1, segments.length - 1)) % segments.length;
      }
      const rotations = 5 + Phaser.Math.Between(0, 3);
      const target = this.findLandingAngleForIndex(chosen, rotations);
      const duration = Phaser.Utils.Array.GetRandom([3800, 4500, 5200, 6200]);

      this.tweens.add({
        targets: this.wheelContainer,
        angle: target,
        duration,
        ease: "Quart.easeOut",
        onUpdate: () => {
          this.currentAngle = this.wheelContainer.angle;
        },
        onComplete: () => {
          this.currentAngle = target;
          this.spinning = false;
          const index = this.getLandedIndex(target);
          this.lastLandedIndex = index;
          this.cameras.main.flash(90, 255, 255, 255, false);
          this.cameras.main.shake(120, 0.004);
          this.tweens.add({
            targets: this.wheelContainer,
            scaleX: this.wheelContainer.scaleX * 1.05,
            scaleY: this.wheelContainer.scaleY * 1.05,
            duration: 220,
            yoyo: true,
            ease: "Back.out",
          });
          this.tweens.add({
            targets: this.pointer,
            y: this.pointer.y - 8,
            duration: 90,
            yoyo: true,
            ease: "Sine.easeOut",
          });
          if (this.spinGlow) {
            this.tweens.add({
              targets: this.spinGlow,
              alpha: { from: 0.62, to: 0 },
              scale: { from: 1.08, to: 1.28 },
              duration: 380,
              onComplete: () => {
                this.spinGlow?.setVisible(false);
              },
            });
          }
          emit({ type: "spin-landed", segment: segments[index] });
        },
      });
    }

    private buildWheel() {
      this.wheelContainer = this.add.container(0, 0);
      const radius = 178;
      const colors = [0xff6b6b, 0xffd166, 0x6bcb77, 0x7cc7ff];
      const segAngleRad = Phaser.Math.DegToRad(360 / segments.length);

      this.spinGlow = this.add.circle(0, 0, radius + 24, 0xffffff, 0).setStrokeStyle(16, 0x93c5fd, 0).setVisible(false);
      this.wheelContainer.add(this.spinGlow);
      this.wheelBase = this.add.circle(0, 0, radius, 0xffffff, 0.15).setStrokeStyle(2, 0xffffff, 0.9);
      this.wheelContainer.add(this.wheelBase);

      for (let i = 0; i < segments.length; i += 1) {
        const graphics = this.add.graphics();
        graphics.fillStyle(colors[i % colors.length], 1);
        graphics.slice(0, 0, radius, i * segAngleRad, (i + 1) * segAngleRad, false);
        graphics.fillPath();
        graphics.lineStyle(4, 0xffffff, 1);
        graphics.slice(0, 0, radius, i * segAngleRad, (i + 1) * segAngleRad, false);
        graphics.strokePath();
        this.wheelContainer.add(graphics);

        const angle = i * (360 / segments.length) + 45;
        const iconRadius = radius * 0.57;
        const x = Math.cos(Phaser.Math.DegToRad(angle)) * iconRadius;
        const y = Math.sin(Phaser.Math.DegToRad(angle)) * iconRadius;
        const iconGroup = this.add.container(x, y - 2);
        const badge = this.add.circle(0, 0, 34, 0xffffff, 0.93).setStrokeStyle(2, 0xffffff, 0.9);
        iconGroup.add(badge);

        const icon = this.add.graphics();
        icon.setPosition(0, 0);
        if (segments[i].id === "question") {
          this.drawQuestionIcon(icon);
          iconGroup.add(
            this.add.text(0, 0, "?", {
              fontFamily: PHASER_UI_FONT,
              fontSize: "22px",
              fontStyle: "bold",
              color: "#2563eb",
            }).setOrigin(0.5).setPosition(0, 1)
          );
        } else if (segments[i].id === "act") {
          this.drawActIcon(icon);
        } else if (segments[i].id === "sentence") {
          this.drawPencilIcon(icon);
        } else {
          this.drawReadIcon(icon);
        }
        iconGroup.add(icon);
        this.wheelContainer.add(iconGroup);

        const label = this.add
          .text(x, y + 34, segments[i].label.toUpperCase(), {
            fontFamily: PHASER_UI_FONT,
            fontSize: segments[i].label.length > 6 ? "19px" : "24px",
            fontStyle: "bold",
            color: "#0f172a",
            stroke: "#ffffff",
            strokeThickness: 5,
          })
          .setOrigin(0.5)
          .setShadow(0, 2, "rgba(255,255,255,0.7)", 0, false, true);
        this.wheelContainer.add(label);
      }

      const hub = this.add.circle(0, 0, 40, 0xffffff).setStrokeStyle(2, 0xe5e7eb);
      this.wheelContainer.add(hub);

      for (let n = 0; n < 36; n += 1) {
        const angle = Phaser.Math.DegToRad((n / 36) * 360);
        const x1 = Math.cos(angle) * (radius - 6);
        const y1 = Math.sin(angle) * (radius - 6);
        const x2 = Math.cos(angle) * (radius + 6);
        const y2 = Math.sin(angle) * (radius + 6);
        const line = this.add.line(0, 0, x1, y1, x2, y2, 0x334155).setLineWidth(2, 2).setAlpha(0.9);
        this.wheelContainer.add(line);
      }

      this.pointer = this.add.polygon(0, 0, [0, 0, 28, 0, 14, 24], 0xdc2626);
      this.pointer.setOrigin(0.5, 0);
      this.currentAngle = this.wheelStartAngle;
      this.wheelContainer.setAngle(this.currentAngle);
    }

    private getLandedIndex(angle: number) {
      const segAngle = 360 / segments.length;
      const pointerAngle = 270;
      const pointerLocal = this.normalizeAngle(pointerAngle - angle);
      let bestIndex = 0;
      let bestDistance = Infinity;
      for (let i = 0; i < segments.length; i += 1) {
        const center = i * segAngle + segAngle / 2;
        const distance = this.angularDistance(pointerLocal, center);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = i;
        }
      }
      return bestIndex;
    }

    private findLandingAngleForIndex(index: number, rotations: number) {
      const segAngle = 360 / segments.length;
      const pointerAngle = 270;
      const center = index * segAngle + segAngle / 2;
      const desired = this.normalizeAngle(pointerAngle - center);
      const minimum = this.currentAngle + rotations * 360;
      let target = desired;
      while (target < minimum) target += 360;
      return target;
    }

    private normalizeAngle(angle: number) {
      return ((angle % 360) + 360) % 360;
    }

    private angularDistance(a: number, b: number) {
      const diff = Math.abs(this.normalizeAngle(a) - this.normalizeAngle(b));
      return Math.min(diff, 360 - diff);
    }

    private drawQuestionIcon(g: Phaser.GameObjects.Graphics) {
      g.fillStyle(0xffffff, 1);
      g.lineStyle(4, 0x2563eb, 1);
      g.fillRoundedRect(-16, -12, 32, 24, 8);
      g.strokeRoundedRect(-16, -12, 32, 24, 8);
      g.fillTriangle(-4, 12, 2, 20, 8, 12);
      g.strokeTriangle(-4, 12, 2, 20, 8, 12);
      g.fillStyle(0x2563eb, 1);
      g.fillCircle(-6, -2, 2.6);
      g.fillCircle(0, -2, 2.6);
      g.fillCircle(6, -2, 2.6);
      g.lineStyle(3, 0x2563eb, 1);
      g.beginPath();
      g.moveTo(-5, 6);
      g.lineTo(5, 6);
      g.strokePath();
    }

    private drawActIcon(g: Phaser.GameObjects.Graphics) {
      g.fillStyle(0x60a5fa, 1);
      g.lineStyle(3, 0x1d4ed8, 1);
      g.fillEllipse(-11, -2, 24, 28);
      g.strokeEllipse(-11, -2, 24, 28);
      g.fillStyle(0xf43f5e, 1);
      g.fillEllipse(11, 2, 24, 28);
      g.strokeEllipse(11, 2, 24, 28);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(-16, -4, 2.2);
      g.fillCircle(-9, -4, 2.2);
      g.fillCircle(7, 0, 2.2);
      g.fillCircle(14, 0, 2.2);
      g.lineStyle(2.5, 0x1d4ed8, 1);
      g.beginPath();
      g.moveTo(-17, 9);
      g.lineTo(-4, 11);
      g.strokePath();
      g.beginPath();
      g.moveTo(6, 11);
      g.lineTo(18, 9);
      g.strokePath();
    }

    private drawPencilIcon(g: Phaser.GameObjects.Graphics) {
      g.fillStyle(0xfacc15, 1);
      g.lineStyle(3, 0xd97706, 1);
      g.fillRoundedRect(-14, -6, 28, 12, 4);
      g.strokeRoundedRect(-14, -6, 28, 12, 4);
      g.fillStyle(0xfca5a5, 1);
      g.fillRect(-18, -6, 6, 12);
      g.fillStyle(0xf8fafc, 1);
      g.fillTriangle(14, -6, 22, 0, 14, 6);
      g.lineStyle(2, 0x6b7280, 1);
      g.beginPath();
      g.moveTo(14, -6);
      g.lineTo(22, 0);
      g.lineTo(14, 6);
      g.strokePath();
    }

    private drawReadIcon(g: Phaser.GameObjects.Graphics) {
      g.fillStyle(0x7cc7ff, 1);
      g.lineStyle(3, 0x2563eb, 1);
      g.fillRoundedRect(-14, -12, 28, 24, 6);
      g.strokeRoundedRect(-14, -12, 28, 24, 6);
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, -12, 2, 24);
      g.lineStyle(2.5, 0x2563eb, 1);
      g.beginPath();
      g.moveTo(-20, -4);
      g.lineTo(-26, -8);
      g.strokePath();
      g.beginPath();
      g.moveTo(-20, 0);
      g.lineTo(-28, 0);
      g.strokePath();
      g.beginPath();
      g.moveTo(-20, 4);
      g.lineTo(-26, 8);
      g.strokePath();
    }

    private handleResize(size: Phaser.Structs.Size | { width: number; height: number }) {
      const centerX = size.width / 2;
      const centerY = size.height / 2 + 10;
      const scale = Math.min(size.width / 360, size.height / 360);
      this.wheelContainer.setPosition(centerX, centerY);
      this.wheelContainer.setScale(scale);
      this.wheelBase?.setScale(scale);
      this.pointer.setPosition(centerX, centerY - 196 * scale);
      this.pointer.setScale(scale);
    }
  }

  const scene = new SpinWheelScene();
  const gameConfig: Phaser.Types.Core.GameConfig & { resolution: number } = {
    type: Phaser.AUTO,
    parent,
    width,
    height,
    resolution: typeof window !== "undefined" ? Math.max(1, window.devicePixelRatio || 1) : 1,
    backgroundColor: "#f0fdf4",
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
  };
  const game = new Phaser.Game(gameConfig);

  exposeApi({
    spin: () => scene.spin(),
  });

  game.events.once("destroy", () => {
    scene.shutdownScene();
  });

  return { game };
}
