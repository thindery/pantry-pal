#!/usr/bin/env python3
"""Convert barcode fixture PNGs into raw luma files for the Node decoder."""
from pathlib import Path
import sys
from PIL import Image

folder = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "barcodes")
for png in sorted(folder.glob("*.png")):
    im = Image.open(png).convert("L")
    dest = png.with_suffix(".luma")
    dest.write_bytes(f"{im.width} {im.height}\n".encode("ascii") + im.tobytes())
    print(f"wrote {dest.name} ({im.width}x{im.height})")
