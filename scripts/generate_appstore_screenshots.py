#!/usr/bin/env python3
"""
Génère les captures App Store iPhone + iPad à partir :
- des 3 slides onboarding AllOn
- des screenshots simulateur iPhone fournis
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CURSOR_ASSETS = Path(
    "/Users/b2btechomcimpro/.cursor/projects/"
    "Users-b2btechomcimpro-Documents-PROJETS-AUTRES-AllOn-allons-mobile-app/assets"
)
OUT = ROOT / "assets" / "appstore"
ONBOARD_SRC = OUT / "onboarding"
FONT_BOLD = ROOT / "assets" / "fonts" / "Ubuntu-Bold.ttf"
FONT_REG = ROOT / "assets" / "fonts" / "Ubuntu-Regular.ttf"

IPHONE_SIZES = [(1284, 2778), (1242, 2688)]
IPAD_SIZES = [(2064, 2752), (2048, 2732)]

BG = (243, 243, 247)  # #F3F3F7
ACCENT = (23, 118, 186)  # #1776BA
SHADOW = (0, 0, 0, 55)

# Ordre marketing App Store (max 10 captures)
SCREENSHOTS = [
    {
        "slug": "01-accueil",
        "title": "Trouvez votre trajet",
        "file": "Simulator_Screenshot_-_iPhone_17_-_2026-09-26_at_20.01.52-62204362-8bbe-494e-874a-46c7f86f802a.jpg",
    },
    {
        "slug": "02-recherche",
        "title": "Recherchez en un clin d'œil",
        "file": "Simulator_Screenshot_-_iPhone_17_-_2026-09-26_at_20.02.08-51aa632e-d3dd-4818-951b-82814aa01205.png",
    },
    {
        "slug": "03-resultats",
        "title": "Comparez les départs",
        "file": "Simulator_Screenshot_-_iPhone_17_-_2026-09-26_at_20.02.26-b78604cb-4b21-4d72-8948-30c2e91ab207.png",
    },
    {
        "slug": "04-resume",
        "title": "Vérifiez votre voyage",
        "file": "Simulator_Screenshot_-_iPhone_17_-_2026-09-26_at_20.02.31-0c9fb227-27dd-4207-8453-e79fdad3a777.png",
    },
    {
        "slug": "05-paiement",
        "title": "Confirmez et payez",
        "file": "Simulator_Screenshot_-_iPhone_17_-_2026-09-26_at_20.02.36-705713cb-1721-45ab-b679-416b0befc66a.png",
    },
    {
        "slug": "06-sieges",
        "title": "Choisissez vos sièges",
        "file": "Simulator_Screenshot_-_iPhone_17_-_2026-09-26_at_20.02.47-e9cab0ed-9f11-4ba9-97e4-ff580f6c8f6b.png",
    },
    {
        "slug": "07-passagers",
        "title": "Renseignez les voyageurs",
        "file": "Simulator_Screenshot_-_iPhone_17_-_2026-09-26_at_20.02.42-cecf6a88-6e2a-40a8-83bb-e2fad5102352.png",
    },
    {
        "slug": "08-connexion",
        "title": "Connectez-vous simplement",
        "file": "Simulator_Screenshot_-_iPhone_17_-_2026-09-26_at_20.02.00-f83fb34a-7bce-412c-86f9-a77a2d727d4a.png",
    },
]

ONBOARDING = [
    ("01-onboarding-voyagez-malin", "allon-onboarding-01"),
    ("02-onboarding-securite", "allon-onboarding-02"),
    ("03-onboarding-tirelire", "allon-onboarding-03"),
]


def cover(img: Image.Image, tw: int, th: int) -> Image.Image:
    img = img.convert("RGB")
    sw, sh = img.size
    scale = max(tw / sw, th / sh)
    nw, nh = int(sw * scale + 0.5), int(sh * scale + 0.5)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left, top = (nw - tw) // 2, (nh - th) // 2
    return resized.crop((left, top, left + tw, top + th))


def contain(img: Image.Image, tw: int, th: int, bg=BG) -> Image.Image:
    img = img.convert("RGB")
    sw, sh = img.size
    scale = min(tw / sw, th / sh)
    nw, nh = int(sw * scale + 0.5), int(sh * scale + 0.5)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (tw, th), bg)
    canvas.paste(resized, ((tw - nw) // 2, (th - nh) // 2))
    return canvas


def rounded_shadow(img: Image.Image, radius: int, pad: int = 28) -> Image.Image:
    """Carte arrondie + ombre douce pour mise en page iPad."""
    w, h = img.size
    # masque arrondi
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=255)
    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    card.paste(img.convert("RGBA"), (0, 0))
    card.putalpha(mask)

    canvas_w, canvas_h = w + pad * 2, h + pad * 2
    shadow = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        [pad + 6, pad + 10, pad + w + 6, pad + h + 10],
        radius=radius,
        fill=SHADOW,
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    shadow.paste(card, (pad, pad), card)
    return shadow


def iphone_export(src: Image.Image, tw: int, th: int) -> Image.Image:
    """Plein écran cover — ratio proche iPhone."""
    return cover(src, tw, th)


def ipad_export(src: Image.Image, tw: int, th: int, title: str) -> Image.Image:
    """
    iPad portrait : fond AllOn + capture iPhone centrée (même contenu),
    titre marketing au-dessus.
    """
    canvas = Image.new("RGB", (tw, th), BG)
    draw = ImageDraw.Draw(canvas)

    # bandeau accent haut
    draw.rectangle([0, 0, tw, int(th * 0.18)], fill=ACCENT)

    title_font = ImageFont.truetype(str(FONT_BOLD), size=max(48, tw // 22))
    brand_font = ImageFont.truetype(str(FONT_REG), size=max(28, tw // 40))

    brand = "AllOn"
    bw = int(draw.textlength(brand, font=brand_font))
    draw.text(((tw - bw) // 2, int(th * 0.035)), brand, font=brand_font, fill=(255, 255, 255))

    # wrap title
    max_title_w = int(tw * 0.86)
    words = title.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if draw.textlength(trial, font=title_font) <= max_title_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)

    y = int(th * 0.07)
    for line in lines[:2]:
        lw = int(draw.textlength(line, font=title_font))
        draw.text(((tw - lw) // 2, y), line, font=title_font, fill=(255, 255, 255))
        bbox = title_font.getbbox("Ay")
        y += (bbox[3] - bbox[1]) + 10

    # zone téléphone
    phone_max_h = int(th * 0.72)
    phone_max_w = int(tw * 0.52)
    phone = contain(src, phone_max_w, phone_max_h, bg=BG)
    # trim letterbox: re-cover inside phone frame proportions
    phone = cover(src, phone_max_w, phone_max_h)

    framed = rounded_shadow(phone, radius=max(36, phone_max_w // 18), pad=36)
    fx, fy = framed.size
    px = (tw - fx) // 2
    py = int(th * 0.22)
    # si dépasse, recentrer verticalement dans zone basse
    if py + fy > th - 40:
        py = th - fy - 40
    canvas.paste(framed, (px, py), framed)
    return canvas


def save(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG", optimize=True)
    print(f"OK {path.name} {img.size[0]}x{img.size[1]}")


def main() -> None:
    # Les aperçus onboarding sont générés par generate_appstore_onboarding.py
    # --- Captures UI ---
    for item in SCREENSHOTS:
        path = CURSOR_ASSETS / item["file"]
        if not path.exists():
            print(f"SKIP {item['slug']}: {path.name} introuvable")
            continue
        src = Image.open(path)

        for w, h in IPHONE_SIZES:
            out = OUT / "iphone" / f"{w}x{h}" / f"screen-{item['slug']}-{w}x{h}.png"
            save(iphone_export(src, w, h), out)

        for w, h in IPAD_SIZES:
            out = OUT / "ipad" / f"{w}x{h}" / f"screen-{item['slug']}-{w}x{h}.png"
            save(ipad_export(src, w, h, item["title"]), out)

    # README
    readme = OUT / "README.md"
    readme.write_text(
        """# Captures App Store — AllOn

## iPhone (6.5\")
Dossiers : `iphone/1284x2778/` et `iphone/1242x2688/`

- **Aperçus d'app (3)** : `preview-01-onboarding-…` → `preview-03-…`
- **Captures (8)** : `screen-01-accueil-…` → `screen-08-connexion-…`

## iPad 12,9\" / 13\"
Dossiers : `ipad/2064x2752/` et `ipad/2048x2732/`

Mêmes fichiers (mêmes écrans), mise en page adaptée iPad.

## Régénération
```bash
python3 scripts/generate_appstore_onboarding.py
python3 scripts/generate_appstore_screenshots.py
```
""",
        encoding="utf-8",
    )
    print(f"\nDone → {OUT}")


if __name__ == "__main__":
    main()
