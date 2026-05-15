from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path("/Users/Sean/Downloads/time")
SIZE = 1024
CENTER = SIZE // 2
RADIUS = 430

LEMMA_TO_TIME = {
    "eight_fifteen": (8, 15),
    "eight_forty-five": (8, 45),
    "eight_o'clock": (8, 0),
    "eight_thirty": (8, 30),
    "eleven_o'clock": (11, 0),
    "five_fifteen": (5, 15),
    "five_forty-five": (5, 45),
    "five_o'clock": (5, 0),
    "five_thirty": (5, 30),
    "four_o'clock": (4, 0),
    "nine_o'clock": (9, 0),
    "one_o'clock": (1, 0),
    "seven_o'clock": (7, 0),
    "six_o'clock": (6, 0),
    "ten_fifteen": (10, 15),
    "ten_forty-five": (10, 45),
    "ten_o'clock": (10, 0),
    "ten_thirty": (10, 30),
    "three_o'clock": (3, 0),
    "twelve_o'clock": (12, 0),
    "two_fifteen": (2, 15),
    "two_forty-five": (2, 45),
    "two_o'clock": (2, 0),
    "two_thirty": (2, 30),
}


def angle_from_top(unit: float, per_cycle: float) -> float:
    return (unit / per_cycle) * 2 * math.pi - math.pi / 2


def point_on_circle(angle: float, radius: float) -> tuple[float, float]:
    return CENTER + math.cos(angle) * radius, CENTER + math.sin(angle) * radius


def draw_clock(hour: int, minute: int) -> Image.Image:
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    # Clock ring
    draw.ellipse(
        (CENTER - RADIUS, CENTER - RADIUS, CENTER + RADIUS, CENTER + RADIUS),
        fill=(255, 255, 255, 0),
        outline=(30, 30, 30, 255),
        width=18,
    )

    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 56)
    except Exception:
        font = ImageFont.load_default()

    # Numbers 1-12
    for n in range(1, 13):
        a = angle_from_top(n, 12)
        x, y = point_on_circle(a, RADIUS - 70)
        text = str(n)
        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text((x - tw / 2, y - th / 2), text, fill=(20, 20, 20, 255), font=font)

    # Minute ticks
    for i in range(60):
        a = angle_from_top(i, 60)
        outer = point_on_circle(a, RADIUS - 8)
        inner_r = RADIUS - (42 if i % 5 == 0 else 24)
        inner = point_on_circle(a, inner_r)
        draw.line([inner, outer], fill=(70, 70, 70, 220), width=4 if i % 5 == 0 else 2)

    # Hands
    minute_angle = angle_from_top(minute, 60)
    hour_value = (hour % 12) + minute / 60
    hour_angle = angle_from_top(hour_value, 12)

    minute_end = point_on_circle(minute_angle, RADIUS - 120)
    hour_end = point_on_circle(hour_angle, RADIUS - 210)

    # Different colors and lengths as requested
    draw.line([(CENTER, CENTER), hour_end], fill=(42, 110, 215, 255), width=18)
    draw.line([(CENTER, CENTER), minute_end], fill=(220, 75, 75, 255), width=12)

    # Center cap
    draw.ellipse((CENTER - 18, CENTER - 18, CENTER + 18, CENTER + 18), fill=(30, 30, 30, 255))

    return image


def main() -> None:
    if not ROOT.exists():
        raise FileNotFoundError(f"Missing folder: {ROOT}")

    for folder_name, (hour, minute) in LEMMA_TO_TIME.items():
        folder = ROOT / folder_name
        folder.mkdir(parents=True, exist_ok=True)

        for existing in folder.glob("*.png"):
            existing.unlink()

        out_path = folder / f"{folder_name}_1.png"
        draw_clock(hour, minute).save(out_path, format="PNG")
        print(f"Saved {out_path}")


if __name__ == "__main__":
    main()

