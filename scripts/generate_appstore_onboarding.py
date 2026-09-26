#!/usr/bin/env python3
"""Génère les 3 aperçus App Store à partir de l'onboarding AllOn."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ONBOARD = ROOT / "assets" / "images" / "onboarding"
OUT_DIR = ROOT / "assets" / "appstore" / "onboarding"
FONT_PATH = ROOT / "assets" / "fonts" / "Ubuntu-Bold.ttf"

# Tailles App Store portrait
SIZES = [
    (1284, 2778),  # iPhone 6.5"
    (1242, 2688),  # iPhone 6.5" alt
    (2064, 2752),  # iPad 13"
    (2048, 2732),  # iPad 12.9"
]

# Base design ~390×844 (iPhone logique) — scale depuis styles onboard
BASE_W = 390.0
BASE_H = 844.0

SLIDES = [
    {
        "id": 1,
        "person": "person_travel_1.png",
        "text_1": "Voyagez malin",
        "text_2": "Payez moins !",
        "show_cta": False,
        "active_dot": 0,
    },
    {
        "id": 2,
        "person": "person_travel_2.png",
        "text_1": "Voyagez en toute",
        "text_2": "Sécurité !",
        "show_cta": False,
        "active_dot": 1,
    },
    {
        "id": 3,
        "person": "person_travel_3.png",
        "text_1": "Partez loin sans",
        "text_2": "Casser votre tirelire !",
        "show_cta": True,
        "active_dot": 2,
    },
]

WHITE = (255, 255, 255, 255)
HIGHLIGHT = (239, 228, 210, 255)  # #EFE4D2
DOT_ACTIVE = (239, 228, 210, 255)
DOT_IDLE = (206, 206, 206, 255)
CTA_BG = (23, 118, 186, 255)  # #1776BA


def cover_resize(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Resize en cover (comme resizeMode cover)."""
    src_w, src_h = img.size
    scale = max(target_w / src_w, target_h / src_h)
    new_w = int(src_w * scale + 0.5)
    new_h = int(src_h * scale + 0.5)
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    left = (new_w - target_w) // 2
    top = (new_h - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h))


def wrap_rich_lines(
    draw: ImageDraw.ImageDraw,
    text_1: str,
    text_2: str,
    font: ImageFont.FreeTypeFont,
    max_width: int,
) -> list[list[tuple[str, tuple]]]:
    """Retourne des lignes de segments (texte, couleur)."""
    words: list[tuple[str, tuple]] = []
    for w in text_1.split():
        words.append((w, WHITE))
    for w in text_2.split():
        words.append((w, HIGHLIGHT))

    lines: list[list[tuple[str, tuple]]] = []
    current: list[tuple[str, tuple]] = []

    def line_width(segs: list[tuple[str, tuple]]) -> int:
        if not segs:
            return 0
        s = " ".join(t for t, _ in segs)
        return int(draw.textlength(s, font=font))

    for word, color in words:
        trial = current + [(word, color)]
        if line_width(trial) <= max_width or not current:
            current = trial
        else:
            lines.append(current)
            current = [(word, color)]
    if current:
        lines.append(current)
    return lines


def draw_rich_text(
    canvas: Image.Image,
    text_1: str,
    text_2: str,
    font: ImageFont.FreeTypeFont,
    x: int,
    y: int,
    max_width: int,
    line_gap: int,
) -> None:
    draw = ImageDraw.Draw(canvas)
    lines = wrap_rich_lines(draw, text_1, text_2, font, max_width)
    cy = y
    for segs in lines:
        cx = x
        for i, (word, color) in enumerate(segs):
            draw.text((cx, cy), word, font=font, fill=color)
            cx += int(draw.textlength(word, font=font))
            if i < len(segs) - 1:
                space = int(draw.textlength(" ", font=font))
                cx += space
        bbox = font.getbbox("Ay")
        cy += (bbox[3] - bbox[1]) + line_gap


def draw_dots(canvas: Image.Image, w: int, h: int, sx: float, active: int) -> None:
    draw = ImageDraw.Draw(canvas)
    bottom = int(35 * sx) if True else 30
    y = h - bottom - int(12 * sx)
    heights = int(12 * sx)
    gaps = int(5 * sx)
    widths = [int(15 * sx), int(15 * sx), int(15 * sx)]
    widths[active] = int(45 * sx)
    total = sum(widths) + gaps * 2
    x = (w - total) // 2
    for i, dw in enumerate(widths):
        color = DOT_ACTIVE if i == active else DOT_IDLE
        draw.rounded_rectangle([x, y, x + dw, y + heights], radius=heights // 2, fill=color)
        x += dw + gaps


def compose(slide: dict, width: int, height: int) -> Image.Image:
    sx = width / BASE_W
    sy = height / BASE_H
    # scale uniforme pour UI (proche de l'app)
    s = min(sx, sy) * (sx / min(sx, sy))  # privilégie largeur
    s = sx

    bg = Image.open(ONBOARD / "bg_voyage.png").convert("RGBA")
    person = Image.open(ONBOARD / slide["person"]).convert("RGBA")
    logo = Image.open(ONBOARD / "logo-allon-blanc.png").convert("RGBA")

    canvas = cover_resize(bg, width, height)

    person_h = int(height - 100 * s)
    person_layer = cover_resize(person, width, person_h)
    # collé en bas comme dans l'app
    canvas.paste(person_layer, (0, height - person_h), person_layer)

    # Logo
    logo_size = int(80 * s)
    logo_r = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    logo_top = int(55 * s)
    logo_x = (width - logo_size) // 2
    canvas.paste(logo_r, (logo_x, logo_top), logo_r)

    # Texte
    font_size = max(42, int(26 * s))
    font = ImageFont.truetype(str(FONT_PATH), font_size)
    text_top = int(height / 2 - 200 * s)
    text_x = int(30 * s)
    text_max_w = int(230 * s)
    draw_rich_text(
        canvas,
        slide["text_1"],
        slide["text_2"],
        font,
        text_x,
        text_top,
        text_max_w,
        line_gap=int(8 * s),
    )

    # CTA dernière slide
    if slide["show_cta"]:
        draw = ImageDraw.Draw(canvas)
        btn_w = int(150 * s)
        btn_h = int(45 * s)
        btn_top = int(height - 120 * s)
        btn_left = (width - btn_w) // 2
        draw.rounded_rectangle(
            [btn_left, btn_top, btn_left + btn_w, btn_top + btn_h],
            radius=int(10 * s),
            fill=CTA_BG,
        )
        cta_font = ImageFont.truetype(str(FONT_PATH), max(28, int(16 * s)))
        label = "Commencer"
        tw = int(draw.textlength(label, font=cta_font))
        th = cta_font.getbbox(label)[3] - cta_font.getbbox(label)[1]
        draw.text(
            (btn_left + (btn_w - tw) // 2, btn_top + (btn_h - th) // 2 - 2),
            label,
            font=cta_font,
            fill=WHITE,
        )

    draw_dots(canvas, width, height, s, slide["active_dot"])
    return canvas.convert("RGB")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1) Compose en résolution iPhone (référence visuelle)
    phone_comps: dict[int, Image.Image] = {}
    for slide in SLIDES:
        phone_comps[slide["id"]] = compose(slide, 1284, 2778)

    for w, h in SIZES:
        size_dir = OUT_DIR / f"{w}x{h}"
        size_dir.mkdir(parents=True, exist_ok=True)
        is_ipad = w >= 2000
        for slide in SLIDES:
            if is_ipad:
                # iPad : slide iPhone centrée sur fond bleu (évite étirement)
                phone = phone_comps[slide["id"]]
                canvas = Image.new("RGB", (w, h), (58, 141, 222))  # proche bg_voyage
                # hauteur max ~88% , largeur selon ratio téléphone
                max_h = int(h * 0.90)
                max_w = int(max_h * (1284 / 2778))
                if max_w > int(w * 0.55):
                    max_w = int(w * 0.55)
                    max_h = int(max_w * (2778 / 1284))
                scaled = phone.resize((max_w, max_h), Image.Resampling.LANCZOS)
                canvas.paste(scaled, ((w - max_w) // 2, (h - max_h) // 2))
                img = canvas
            else:
                img = compose(slide, w, h)

            name = f"allon-onboarding-{slide['id']:02d}-{w}x{h}.png"
            path = size_dir / name
            img.save(path, "PNG", optimize=True)
            print(f"OK {path} ({img.size[0]}x{img.size[1]})")

            device = "ipad" if is_ipad else "iphone"
            mirror = (
                ROOT
                / "assets"
                / "appstore"
                / device
                / f"{w}x{h}"
                / f"preview-0{slide['id']}-onboarding-{w}x{h}.png"
            )
            mirror.parent.mkdir(parents=True, exist_ok=True)
            img.save(mirror, "PNG", optimize=True)


if __name__ == "__main__":
    main()
