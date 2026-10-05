"""Make MMPS logo background transparent via corner flood-fill.

Preserves black icons inside colored circles (bolt / livestock).
"""

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(
    r"c:\Users\KCT\OneDrive\Documents\Mogadishu Market Prices System\mmps"
)
SRC = ROOT / "public" / "images" / "brand" / "mmps-logo.png"
COPIES = [
    ROOT / "src" / "app" / "icon.png",
    ROOT / "public" / "favicon.png",
]


def is_backdrop(r: int, g: int, b: int, a: int) -> bool:
    if a < 20:
        return True
    # Near white / light gray
    if r >= 210 and g >= 210 and b >= 210:
        return True
    # Near black / dark charcoal (footer/header backdrops)
    if r <= 35 and g <= 35 and b <= 35:
        return True
    # Very dark green-black edges sometimes
    if r <= 25 and g <= 40 and b <= 30 and max(r, g, b) - min(r, g, b) < 20:
        return True
    return False


def main() -> None:
    img = Image.open(SRC).convert("RGBA")
    w, h = img.size
    px = img.load()

    visited = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        r, g, b, a = px[x, y]
        if is_backdrop(r, g, b, a):
            q.append((x, y))
            visited[y][x] = True

    # Also seed along edges
    for x in range(w):
        for y in (0, h - 1):
            if not visited[y][x]:
                r, g, b, a = px[x, y]
                if is_backdrop(r, g, b, a):
                    q.append((x, y))
                    visited[y][x] = True
    for y in range(h):
        for x in (0, w - 1):
            if not visited[y][x]:
                r, g, b, a = px[x, y]
                if is_backdrop(r, g, b, a):
                    q.append((x, y))
                    visited[y][x] = True

    while q:
        x, y = q.popleft()
        r, g, b, a = px[x, y]
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                nr, ng, nb, na = px[nx, ny]
                if is_backdrop(nr, ng, nb, na):
                    visited[ny][nx] = True
                    q.append((nx, ny))

    # Soften remaining near-backdrop fringe
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if r >= 230 and g >= 230 and b >= 230:
                px[x, y] = (r, g, b, 0)

    # Crop to opaque content with small padding
    bbox = img.getbbox()
    if bbox:
        left, top, right, bottom = bbox
        pad = 8
        left = max(0, left - pad)
        top = max(0, top - pad)
        right = min(w, right + pad)
        bottom = min(h, bottom + pad)
        img = img.crop((left, top, right, bottom))

    img.save(SRC, "PNG")
    for dest in COPIES:
        img.save(dest, "PNG")

    print(f"transparent logo saved {img.size[0]}x{img.size[1]}")


if __name__ == "__main__":
    main()
