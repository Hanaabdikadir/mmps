"""Fit only Ri and Waxar generated photos to 1920×1080 catalog slots (cover, no letterbox)."""
from __future__ import annotations

from pathlib import Path
import importlib.util

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
FIT = ROOT / "scripts" / "fit-livestock-type-photos.py"

spec = importlib.util.spec_from_file_location("fit_photos", FIT)
mod = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(mod)

SOURCES = {
    ("Birimo", "ri"): ROOT / "pictures" / "generated" / "Birimo" / "riyo.jpg",
    ("Birimo", "waxar"): ROOT / "pictures" / "generated" / "Birimo" / "Waxar.jpg",
    ("sugunto", "ri"): ROOT / "pictures" / "generated" / "sugunto" / "riyo.jpg",
    ("sugunto", "waxar"): ROOT / "pictures" / "generated" / "sugunto" / "wahar.jpg",
}


def cover_fit(src: Path, dest: Path) -> None:
    img = Image.open(src)
    img = ImageOps.exif_transpose(img)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGBA")
        canvas = Image.new("RGBA", img.size, (*mod.BG, 255))
        canvas.alpha_composite(img)
        img = canvas.convert("RGB")
    else:
        img = img.convert("RGB")
    img = mod.trim_dark_edges(img)
    dest.parent.mkdir(parents=True, exist_ok=True)
    filled = ImageOps.fit(
        img,
        (mod.W, mod.H),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.45),
    )
    filled.save(dest, "JPEG", quality=92, optimize=True, progressive=True)


def main() -> None:
    for (season, key), src in SOURCES.items():
        if not src.is_file():
            print(f"MISSING {src}")
            continue
        out_season = "birimo" if season.lower() == "birimo" else "sugunto"
        dest = ROOT / "public" / "images" / "livestock" / "types" / out_season / f"{key}.jpg"
        cover_fit(src, dest)
        print(f"{src.relative_to(ROOT)} -> {dest.relative_to(ROOT)} {Image.open(dest).size}")


if __name__ == "__main__":
    main()
