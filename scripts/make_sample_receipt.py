"""Generate tests/fixtures/receipt_sample.png (synthetic receipt, no real data). PP-186."""
from PIL import Image, ImageDraw, ImageFont

LINES = [
    "GREEN VALLEY MARKET", "123 Main St", "", "BANANAS ORGANIC        2.49",
    "WHOLE MILK 1 GAL         3.99", "CHEDDAR CHEESE BLOCK    4.79", "SPAGHETTI PASTA 16OZ     1.69",
    "CHICKEN BREAST 2LB       8.98", "ORANGE JUICE 52OZ       4.29", "", "SUBTOTAL                26.23",
    "TAX                      0.00", "TOTAL                  $26.23",
]
font = None
for path in ("/System/Library/Fonts/Menlo.ttc", "/System/Library/Fonts/Monaco.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"):
    try:
        font = ImageFont.truetype(path, 28)
        break
    except OSError:
        continue
font = font or ImageFont.load_default()
img = Image.new("RGB", (640, 80 + 44 * len(LINES)), "white")
d = ImageDraw.Draw(img)
for i, line in enumerate(LINES):
    d.text((30, 30 + 44 * i), line, fill="black", font=font)
img.save("tests/fixtures/receipt_sample.png")
