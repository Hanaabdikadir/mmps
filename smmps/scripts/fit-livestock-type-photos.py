"""Crop livestock type photos to standard 16:9 (1920×1080)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "pictures"
OUT = ROOT / "public" / "images" / "livestock" / "types"
W, H = 1920, 1080
# 16:6 hero crop of a 16:9 file is 1920×720 — keep the animal inside this band.
SAFE_H = 720
BG = (247, 244, 238)

NAME_MAP = {
    "awr": "awr",
    "baarqab": "baarqab",
    "ceysaan": "caysan",
    "ceysan": "caysan",
    "dibi": "dibi",
    "g.qaalin": "qalin",
    "gqaalin": "qalin",
    "hal": "hal",
    "lax": "lax",
    "neyl": "neyl",
    "orgi": "orgi",
    "qurbac": "gurbac",
    "ri": "ri",
    "riyo": "ri",
    "rati": "rati",
    "sabeen": "sabeen",
    "sac": "sac",
    "sumal": "sumal",
    "wan": "wan",
    "waxar": "waxar",
    "wahar": "waxar",
}

# Prefer the canonical filename; do not let aliases overwrite it.
ALIAS_STEMS = {"qurbac", "riyo", "wahar", "ceysaan", "ceysan", "g.qaalin", "gqaalin"}


def slug_name(stem: str) -> str:
    key = stem.strip().lower().replace(" ", "")
    return NAME_MAP.get(key, key)


def trim_dark_edges(img: Image.Image, thresh: int = 38) -> Image.Image:
    """Crop baked-in black/dark bars from any side."""
    rgb = img.convert("RGB")
    w, h = rgb.size
    pix = rgb.load()
    step_x = max(1, w // 120)
    step_y = max(1, h // 120)

    def dark_col(x: int) -> bool:
        return all(
            (pix[x, y][0] < thresh and pix[x, y][1] < thresh and pix[x, y][2] < thresh)
            for y in range(0, h, step_y)
        )

    def dark_row(y: int) -> bool:
        return all(
            (pix[x, y][0] < thresh and pix[x, y][1] < thresh and pix[x, y][2] < thresh)
            for x in range(0, w, step_x)
        )

    left, right, top, bottom = 0, w - 1, 0, h - 1
    while left < right and dark_col(left):
        left += 1
    while right > left and dark_col(right):
        right -= 1
    while top < bottom and dark_row(top):
        top += 1
    while bottom > top and dark_row(bottom):
        bottom -= 1
    if left > 0 or top > 0 or right < w - 1 or bottom < h - 1:
        rgb = rgb.crop((left, top, right + 1, bottom + 1))
    return rgb


def trim_bg_bars(img: Image.Image, bg: tuple[int, int, int] = BG, tol: int = 22) -> Image.Image:
    """Crop cream/letterbox padding so cover-fit can fill 16:9."""
    rgb = img.convert("RGB")
    w, h = rgb.size
    pix = rgb.load()
    step_x = max(1, w // 120)
    step_y = max(1, h // 120)

    def near_bg(c: tuple[int, int, int]) -> bool:
        return (
            abs(c[0] - bg[0]) <= tol
            and abs(c[1] - bg[1]) <= tol
            and abs(c[2] - bg[2]) <= tol
        )

    def bg_col(x: int) -> bool:
        return all(near_bg(pix[x, y]) for y in range(0, h, step_y))

    def bg_row(y: int) -> bool:
        return all(near_bg(pix[x, y]) for x in range(0, w, step_x))

    left, right, top, bottom = 0, w - 1, 0, h - 1
    while left < right and bg_col(left):
        left += 1
    while right > left and bg_col(right):
        right -= 1
    while top < bottom and bg_row(top):
        top += 1
    while bottom > top and bg_row(bottom):
        bottom -= 1
    if left > 0 or top > 0 or right < w - 1 or bottom < h - 1:
        rgb = rgb.crop((left, top, right + 1, bottom + 1))
    return rgb


def pad_edge_extend(inner: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Fill 16:9 with continued sky/ground/sides — not cream letterbox."""
    tw, th = size
    canvas = Image.new("RGB", size)
    iw, ih = inner.size
    x = (tw - iw) // 2
    y = (th - ih) // 2
    canvas.paste(inner, (x, y))
    if y > 0:
        top = inner.crop((0, 0, iw, 1)).resize((iw, y), Image.Resampling.LANCZOS)
        canvas.paste(top, (x, 0))
    if y + ih < th:
        bot_h = th - (y + ih)
        bot = inner.crop((0, ih - 1, iw, ih)).resize((iw, bot_h), Image.Resampling.LANCZOS)
        canvas.paste(bot, (x, y + ih))
    if x > 0:
        strip = canvas.crop((x, 0, x + 1, th)).resize((x, th), Image.Resampling.LANCZOS)
        canvas.paste(strip, (0, 0))
    if x + iw < tw:
        right_w = tw - (x + iw)
        strip = canvas.crop((x + iw - 1, 0, x + iw, th)).resize((right_w, th), Image.Resampling.LANCZOS)
        canvas.paste(strip, (x + iw, 0))
    return canvas


def fit_hero_safe(src: Path, dest: Path) -> None:
    """Keep the whole animal inside the 16:6 hero band of a 16:9 file."""
    img = Image.open(src)
    img = ImageOps.exif_transpose(img)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGBA")
        canvas = Image.new("RGBA", img.size, (*BG, 255))
        canvas.alpha_composite(img)
        img = canvas.convert("RGB")
    else:
        img = img.convert("RGB")
    img = trim_dark_edges(img)
    img = trim_bg_bars(img)
    dest.parent.mkdir(parents=True, exist_ok=True)
    inner = ImageOps.contain(img, (W, SAFE_H - 48), Image.Resampling.LANCZOS)
    filled = pad_edge_extend(inner, (W, H))
    filled.save(dest, "JPEG", quality=92, optimize=True, progressive=True)


def fit(src: Path, dest: Path) -> None:
    img = Image.open(src)
    img = ImageOps.exif_transpose(img)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGBA")
        canvas = Image.new("RGBA", img.size, (*BG, 255))
        canvas.alpha_composite(img)
        img = canvas.convert("RGB")
    else:
        img = img.convert("RGB")

    img = trim_dark_edges(img)
    img = trim_bg_bars(img)
    dest.parent.mkdir(parents=True, exist_ok=True)
    # Fill the whole 1920×1080 16:9 file (no cream bars). Hero UI crops 16:6 with object-cover.
    filled = ImageOps.fit(
        img,
        (W, H),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )
    filled.save(dest, "JPEG", quality=92, optimize=True, progressive=True)


def main() -> None:
    n = 0
    for season in ("Birimo", "sugunto"):
        generated = SRC / "generated" / season
        original = SRC / season
        folder = generated if generated.is_dir() else original
        if not folder.is_dir():
            continue
        out_season = "birimo" if season.lower() == "birimo" else "sugunto"
        files = [
            path
            for path in sorted(folder.iterdir())
            if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
        ]
        primary = [p for p in files if p.stem.strip().lower() not in ALIAS_STEMS]
        aliases = [p for p in files if p.stem.strip().lower() in ALIAS_STEMS]
        written: set[str] = set()
        for path in primary + aliases:
            dest = OUT / out_season / f"{slug_name(path.stem)}.jpg"
            if dest.name in written:
                print(f"skip alias {path.name} (keep {dest.name})")
                continue
            fit(path, dest)
            written.add(dest.name)
            n += 1
            print(f"{path.name} -> {dest.relative_to(ROOT)}")
    print(f"fitted {n} photos")


if __name__ == "__main__":
    main()
