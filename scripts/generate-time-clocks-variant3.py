from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path("/Users/Sean/Downloads/time")
SIZE = 1024
TOP_BOX = (120, 130, 904, 430)
BOTTOM_BOX = (120, 590, 904, 890)

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


def to_24h_am(hour12: int) -> int:
    return 0 if hour12 == 12 else hour12


def to_24h_pm(hour12: int) -> int:
    return 12 if hour12 == 12 else hour12 + 12


def format_24(h: int, m: int) -> str:
    return f"{h:02d}:{m:02d}"


def draw_digital_clock(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    digital_text: str,
    suffix: str,
) -> None:
    try:
        digits = ImageFont.truetype("/System/Library/Fonts/Supplemental/Courier New Bold.ttf", 142)
        small = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 40)
    except Exception:
        digits = ImageFont.load_default()
        small = ImageFont.load_default()

    x1, y1, x2, y2 = box

    # Casio-like body + LCD panel
    draw.rounded_rectangle(box, radius=34, fill=(42, 46, 54, 255), outline=(18, 20, 25, 255), width=6)
    inner = (x1 + 24, y1 + 24, x2 - 24, y2 - 24)
    draw.rounded_rectangle(inner, radius=24, fill=(196, 214, 180, 255), outline=(114, 130, 101, 255), width=4)

    tbox = draw.textbbox((0, 0), digital_text, font=digits)
    tw, th = tbox[2] - tbox[0], tbox[3] - tbox[1]
    tx = (x1 + x2 - tw) / 2
    ty = (y1 + y2 - th) / 2 - 20
    draw.text((tx, ty), digital_text, fill=(28, 46, 32, 255), font=digits)

    sbox = draw.textbbox((0, 0), suffix.upper(), font=small)
    sw, sh = sbox[2] - sbox[0], sbox[3] - sbox[1]
    draw.text((x2 - sw - 40, y2 - sh - 30), suffix.upper(), fill=(36, 54, 40, 255), font=small)


def make_image(hour12: int, minute: int) -> Image.Image:
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    am24 = to_24h_am(hour12)
    pm24 = to_24h_pm(hour12)

    draw_digital_clock(draw, TOP_BOX, format_24(am24, minute), "am")
    draw_digital_clock(draw, BOTTOM_BOX, format_24(pm24, minute), "pm")

    return image


def main() -> None:
    if not ROOT.exists():
        raise FileNotFoundError(f"Missing folder: {ROOT}")

    for lemma, (hour12, minute) in LEMMA_TO_TIME.items():
        folder = ROOT / lemma
        folder.mkdir(parents=True, exist_ok=True)
        out_file = folder / f"{lemma}_3.png"
        make_image(hour12, minute).save(out_file, format="PNG")
        print(f"Saved {out_file}")


if __name__ == "__main__":
    main()
