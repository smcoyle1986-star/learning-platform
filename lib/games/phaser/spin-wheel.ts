import type Phaser from "phaser";

export type SpinSegment = {
  id: string;
  emoji: string;
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
  class SpinWheelScene extends Phaser.Scene {
    private wheelContainer!: Phaser.GameObjects.Container;
    private pointer!: Phaser.GameObjects.Polygon;
    private spinning = false;
    private currentAngle = 0;

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

      const segAngle = 360 / segments.length;
      const chosen = Phaser.Math.Between(0, segments.length - 1);
      const rotations = 4 + Phaser.Math.Between(0, 3);
      const offset = chosen * segAngle + segAngle / 2;
      const target = this.currentAngle + rotations * 360 + offset;
      const duration = Phaser.Utils.Array.GetRandom([3000, 4000, 5000, 6000]);

      this.tweens.add({
        targets: this.wheelContainer,
        angle: target,
        duration,
        ease: "Cubic.easeOut",
        onUpdate: () => {
          this.currentAngle = this.wheelContainer.angle;
        },
        onComplete: () => {
          this.currentAngle = target;
          this.spinning = false;
          let normalized = 360 - (target % 360);
          normalized = ((normalized % 360) + 360) % 360;
          const index = Math.floor(normalized / segAngle) % segments.length;
          emit({ type: "spin-landed", segment: segments[index] });
        },
      });
    }

    private buildWheel() {
      this.wheelContainer = this.add.container(0, 0);
      const radius = 140;
      const colors = [0xff6b6b, 0xffd166, 0x6bcb77, 0x7cc7ff];
      const segAngleRad = Phaser.Math.DegToRad(360 / segments.length);

      for (let i = 0; i < segments.length; i += 1) {
        const graphics = this.add.graphics();
        graphics.fillStyle(colors[i % colors.length], 1);
        graphics.slice(0, 0, radius, i * segAngleRad, (i + 1) * segAngleRad, false);
        graphics.fillPath();
        graphics.lineStyle(2, 0xffffff, 1);
        graphics.slice(0, 0, radius, i * segAngleRad, (i + 1) * segAngleRad, false);
        graphics.strokePath();
        this.wheelContainer.add(graphics);

        const angle = i * (360 / segments.length) + 45;
        const pos = Phaser.Math.RotateAround(
          { x: 0, y: 0 },
          0,
          0,
          Phaser.Math.DegToRad(angle)
        );
        const emojiRadius = radius * 0.55;
        const emoji = this.add
          .text(pos.x + Math.cos(Phaser.Math.DegToRad(angle - 90)) * emojiRadius, pos.y + Math.sin(Phaser.Math.DegToRad(angle - 90)) * emojiRadius, segments[i].emoji, {
            fontSize: "34px",
          })
          .setOrigin(0.5);
        this.wheelContainer.add(emoji);
      }

      const hub = this.add.circle(0, 0, 48, 0xffffff).setStrokeStyle(2, 0xe5e7eb);
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
    }

    private handleResize(size: Phaser.Structs.Size | { width: number; height: number }) {
      const centerX = size.width / 2;
      const centerY = size.height / 2 + 10;
      const scale = Math.min(size.width / 360, size.height / 360);
      this.wheelContainer.setPosition(centerX, centerY);
      this.wheelContainer.setScale(scale);
      this.pointer.setPosition(centerX, centerY - 170 * scale);
      this.pointer.setScale(scale);
    }
  }

  const scene = new SpinWheelScene();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
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
  });

  exposeApi({
    spin: () => scene.spin(),
  });

  game.events.once("destroy", () => {
    scene.shutdownScene();
  });

  return { game };
}
