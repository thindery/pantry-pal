#!/usr/bin/env python3
"""Generate clean and degraded UPC/EAN barcode PNGs for scanner tests."""

from __future__ import annotations

import json
import math
from pathlib import Path

from barcode import EAN13, EAN8, UPCA
from barcode.writer import ImageWriter
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "barcodes"

# Number system 0, body 123456, check 5 → UPC-A 012345000065
UPC_E = "01234565"

L_PATTERNS = {
    "0": "0001101",
    "1": "0011001",
    "2": "0010011",
    "3": "0111101",
    "4": "0100011",
    "5": "0110001",
    "6": "0101111",
    "7": "0111011",
    "8": "0110111",
    "9": "0001011",
}
G_PATTERNS = {
    "0": "0100111",
    "1": "0110011",
    "2": "0011011",
    "3": "0100001",
    "4": "0011101",
    "5": "0111001",
    "6": "0000101",
    "7": "0010001",
    "8": "0001001",
    "9": "0010111",
}
# UPC-E parity by check digit for number system 0 (E=even/G, O=odd/L)
UPCE_PARITY_NS0 = {
    "0": "EEEOOO",
    "1": "EEOEOO",
    "2": "EEOOEO",
    "3": "EEOOOE",
    "4": "EOEEOO",
    "5": "EOOEEO",
    "6": "EOOOEE",
    "7": "EOEOEO",
    "8": "EOEOOE",
    "9": "EOOEOE",
}

WRITER_OPTS = {
    "module_width": 0.4,
    "module_height": 22.0,
    "quiet_zone": 6.5,
    "font_size": 10,
    "text_distance": 4.0,
    "background": "white",
    "foreground": "black",
    "write_text": True,
    "dpi": 200,
}


def render_library(cls, code: str) -> Image.Image:
    # python-barcode appends the check digit; pass the body.
    body = code[:-1]
    bio = cls(body, writer=ImageWriter()).render(WRITER_OPTS)
    return bio.convert("RGB")


def render_upc_e(code: str) -> Image.Image:
    assert len(code) == 8
    ns, body, check = code[0], code[1:7], code[7]
    parity = UPCE_PARITY_NS0[check]
    if ns == "1":
        parity = "".join("O" if p == "E" else "E" for p in parity)
    bits = "101"
    for digit, par in zip(body, parity):
        bits += G_PATTERNS[digit] if par == "E" else L_PATTERNS[digit]
    bits += "010101"
    module = 4
    quiet = 24
    bar_h = 160
    text_h = 36
    width = quiet * 2 + len(bits) * module
    height = bar_h + text_h + 16
    im = Image.new("RGB", (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(im)
    x = quiet
    for bit in bits:
        if bit == "1":
            draw.rectangle([x, 12, x + module - 1, 12 + bar_h], fill=(0, 0, 0))
        x += module
    draw.text((width // 2 - 28, 12 + bar_h + 6), code, fill=(0, 0, 0))
    return im


def add_shadow(im: Image.Image, right_factor: float = 0.40, start: float = 0.28) -> Image.Image:
    """Darken toward one side, like a package in uneven light. Keeps bar/space contrast."""
    im = im.convert("RGB").copy()
    w, h = im.size
    pixels = im.load()
    for x in range(w):
        t = max(0.0, (x - w * start) / (w * (1.0 - start)))
        factor = 1.0 - (1.0 - right_factor) * t
        for y in range(h):
            r, g, b = pixels[x, y]
            pixels[x, y] = (int(r * factor), int(g * factor), int(b * factor))
    return im


def add_blur(im: Image.Image) -> Image.Image:
    return im.convert("RGB").filter(ImageFilter.GaussianBlur(radius=1.35))


def add_low_contrast(im: Image.Image) -> Image.Image:
    im = im.convert("RGB")
    # Grey bars on a grey background — typical of faded ink / glare.
    im = ImageOps.colorize(ImageOps.grayscale(im), black="#6a6a6a", white="#d8d8d8")
    return ImageEnhance.Contrast(im).enhance(0.85)


def add_curve(im: Image.Image) -> Image.Image:
    im = im.convert("RGB")
    w, h = im.size
    out = Image.new("RGB", (w, h), (255, 255, 255))
    src = im.load()
    dst = out.load()
    amp = max(6, w // 28)
    for y in range(h):
        shift = int(amp * math.sin(2 * math.pi * y / max(1, h)))
        for x in range(w):
            xs = x + shift
            if 0 <= xs < w:
                dst[x, y] = src[xs, y]
    return out


def pad(im: Image.Image, px: int = 24) -> Image.Image:
    return ImageOps.expand(im.convert("RGB"), border=px, fill=(255, 255, 255))


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    for old in ROOT.glob("*"):
        if old.suffix.lower() in {".png", ".json"}:
            old.unlink()

    specs = [
        {
            "file": "upc-a-clean.png",
            "expected": "012345678905",
            "format": "UPC-A",
            "degraded": False,
            "render": lambda: render_library(UPCA, "012345678905"),
        },
        {
            "file": "ean-13-clean.png",
            "expected": "5901234123457",
            "format": "EAN-13",
            "degraded": False,
            "render": lambda: render_library(EAN13, "5901234123457"),
        },
        {
            "file": "ean-8-clean.png",
            "expected": "96385074",
            "format": "EAN-8",
            "degraded": False,
            "render": lambda: render_library(EAN8, "96385074"),
        },
        {
            "file": "upc-e-clean.png",
            "expected": UPC_E,
            "format": "UPC-E",
            "degraded": False,
            "render": lambda: render_upc_e(UPC_E),
        },
        {
            "file": "upc-a-shadow.png",
            "expected": "012345678905",
            "format": "UPC-A",
            "degraded": True,
            "degradation": "shadow",
            "render": lambda: add_shadow(pad(render_library(UPCA, "012345678905"))),
        },
        {
            "file": "ean-13-shadow.png",
            "expected": "5901234123457",
            "format": "EAN-13",
            "degraded": True,
            "degradation": "shadow",
            "render": lambda: add_shadow(pad(render_library(EAN13, "5901234123457")), 0.38),
        },
        {
            "file": "ean-13-blur.png",
            "expected": "5901234123457",
            "format": "EAN-13",
            "degraded": True,
            "degradation": "blur",
            "render": lambda: add_blur(pad(render_library(EAN13, "5901234123457"))),
        },
        {
            "file": "upc-a-low-contrast.png",
            "expected": "012345678905",
            "format": "UPC-A",
            "degraded": True,
            "degradation": "low-contrast",
            "render": lambda: add_low_contrast(pad(render_library(UPCA, "012345678905"))),
        },
        {
            "file": "upc-e-low-contrast.png",
            "expected": UPC_E,
            "format": "UPC-E",
            "degraded": True,
            "degradation": "low-contrast",
            "render": lambda: add_low_contrast(pad(render_upc_e(UPC_E))),
        },
        {
            "file": "ean-8-curved.png",
            "expected": "96385074",
            "format": "EAN-8",
            "degraded": True,
            "degradation": "curved",
            "render": lambda: add_curve(pad(render_library(EAN8, "96385074"))),
        },
        {
            "file": "upc-a-shadow-low-contrast.png",
            "expected": "012345678905",
            "format": "UPC-A",
            "degraded": True,
            "degradation": "shadow+low-contrast",
            "render": lambda: add_low_contrast(add_shadow(pad(render_library(UPCA, "012345678905")), 0.35)),
        },
    ]

    manifest = []
    for spec in specs:
        im = spec["render"]()
        if not spec.get("degraded"):
            im = pad(im)
        dest = ROOT / spec["file"]
        im.save(dest, "PNG")
        entry = {k: v for k, v in spec.items() if k != "render"}
        entry["width"], entry["height"] = im.size
        manifest.append(entry)
        print(f"wrote {dest} ({im.size[0]}x{im.size[1]})")

    (ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"wrote {ROOT / 'manifest.json'} ({len(manifest)} fixtures)")


if __name__ == "__main__":
    main()
