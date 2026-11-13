"""Download MIT open-device-frame WebPs and measure the transparent screen hole."""

from __future__ import annotations

import json
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "public" / "simulator" / "frames"
BASE = "https://raw.githubusercontent.com/SinaKarimi7/open-device-frame/main/public/devices"

# Source path inside open-device-frame -> local filename
ASSETS: dict[str, str] = {
    "apple/iphone-14.webp": "iphone-14.webp",
    "apple/iphone-15.webp": "iphone-15.webp",
    "apple/iphone-15-plus.webp": "iphone-15-plus.webp",
    "apple/iphone-15-pro.webp": "iphone-15-pro.webp",
    "apple/iphone-15-pro-max.webp": "iphone-15-pro-max.webp",
    "apple/iphone-16.webp": "iphone-16.webp",
    "apple/iphone-16-plus.webp": "iphone-16-plus.webp",
    "apple/iphone-16-pro.webp": "iphone-16-pro.webp",
    "apple/iphone-16-pro-max.webp": "iphone-16-pro-max.webp",
    "google/pixel-8.webp": "pixel-8.webp",
    "google/pixel-8-pro.webp": "pixel-8-pro.webp",
    "google/pixel-9.webp": "pixel-9.webp",
    "google/pixel-9-pro.webp": "pixel-9-pro.webp",
    "google/pixel-9-pro-xl.webp": "pixel-9-pro-xl.webp",
    "xiaomi/15-ultra.webp": "xiaomi-15-ultra.webp",
}


def download(src: str, dest: Path) -> None:
    url = f"{BASE}/{src}"
    print(f"GET {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "browser-toolbox-mockup-vendor"})
    with urllib.request.urlopen(req, timeout=60) as res:
        data = res.read()
        if res.status != 200:
            raise RuntimeError(f"{url} -> {res.status}")
        if len(data) < 1000 or data[:15].startswith(b"404") or data[:15].startswith(b"Not Found"):
            raise RuntimeError(f"{url} looks empty ({len(data)} bytes)")
    dest.write_bytes(data)
    print(f"  {dest.name} {len(data)} bytes")


def measure_hole(path: Path) -> dict[str, float | int]:
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    # Downsample so a Python flood-fill of the screen hole stays fast.
    step = 4
    small = image.getchannel("A").resize((max(1, width // step), max(1, height // step)), Image.NEAREST)
    sw, sh = small.size
    pixels = small.load()
    threshold = 12
    seeds = [
        (sw // 2, int(sh * 0.52)),
        (sw // 2, int(sh * 0.62)),
        (sw // 2, int(sh * 0.4)),
    ]
    stack: list[tuple[int, int]] = []
    for x, y in seeds:
        if 0 <= x < sw and 0 <= y < sh and pixels[x, y] <= threshold:
            stack.append((x, y))
            break
    if not stack:
        raise RuntimeError(f"no transparent screen seed in {path.name}")

    seen = bytearray(sw * sh)
    min_x = min_y = 10**9
    max_x = max_y = -1
    filled = 0
    while stack:
        x, y = stack.pop()
        idx = y * sw + x
        if seen[idx]:
            continue
        if pixels[x, y] > threshold:
            continue
        seen[idx] = 1
        filled += 1
        if x < min_x:
            min_x = x
        if y < min_y:
            min_y = y
        if x > max_x:
            max_x = x
        if y > max_y:
            max_y = y
        if x + 1 < sw:
            stack.append((x + 1, y))
        if x > 0:
            stack.append((x - 1, y))
        if y + 1 < sh:
            stack.append((x, y + 1))
        if y > 0:
            stack.append((x, y - 1))

    if max_x < 0 or filled < sw * sh * 0.08:
        raise RuntimeError(f"screen hole too small in {path.name} ({filled} px)")

    px_left = min_x * step
    px_top = min_y * step
    px_right = width - (max_x + 1) * step
    px_bottom = height - (max_y + 1) * step
    px_right = max(0, px_right)
    px_bottom = max(0, px_bottom)
    hole_w = width - px_left - px_right
    hole_h = height - px_top - px_bottom
    return {
        "width": width,
        "height": height,
        "left": round(px_left / width, 6),
        "top": round(px_top / height, 6),
        "right": round(px_right / width, 6),
        "bottom": round(px_bottom / height, 6),
        "holeWidth": hole_w,
        "holeHeight": hole_h,
        "pxLeft": px_left,
        "pxTop": px_top,
        "pxRight": px_right,
        "pxBottom": px_bottom,
    }


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    frames: dict[str, dict] = {}
    for src, name in ASSETS.items():
        dest = DEST / name
        if not dest.exists() or dest.stat().st_size < 1000:
            try:
                download(src, dest)
            except Exception as exc:
                print(f"SKIP {src}: {exc}")
                if dest.exists():
                    dest.unlink()
                continue
        frames[name] = measure_hole(dest)
        print(f"  hole {frames[name]}")
    (DEST / "insets.json").write_text(json.dumps(frames, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {DEST / 'insets.json'} ({len(frames)} frames)")


if __name__ == "__main__":
    main()
