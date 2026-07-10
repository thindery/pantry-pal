"""Receipt OCR service using pytesseract + Pillow."""

from __future__ import annotations

import base64
import io
import re
from typing import Any

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "produce": ["apple", "banana", "lettuce", "tomato", "onion"],
    "dairy": ["milk", "cheese", "yogurt", "butter", "egg"],
    "meat": ["chicken", "beef", "pork", "turkey", "bacon"],
    "frozen": ["frozen", "ice cream", "pizza"],
    "beverages": ["water", "soda", "juice", "coffee", "tea"],
    "pantry": ["pasta", "rice", "bread", "cereal", "flour"],
    "snacks": ["chip", "cracker", "cookie", "candy"],
}


def detect_category(name: str) -> str:
    lower = name.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return category
    return "other"


def parse_receipt_lines(text: str) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for line in text.splitlines():
        line = line.strip()
        if not line or len(line) < 3:
            continue
        price_match = re.search(r"(\d+\.\d{2})\s*$", line)
        if price_match:
            name = line[: price_match.start()].strip(" -*")
            if name and len(name) > 2:
                items.append(
                    {
                        "name": name[:80],
                        "quantity": 1,
                        "unit": "units",
                        "category": detect_category(name),
                        "price": float(price_match.group(1)),
                        "confidence": 75,
                    }
                )
    return items


def scan_receipt_image(base64_image: str) -> dict[str, Any]:
    try:
        from PIL import Image, ImageEnhance, ImageFilter
        import pytesseract
    except ImportError as exc:
        raise RuntimeError(f"OCR dependencies not available: {exc}") from exc

    image_buffer = base64.b64decode(base64_image)
    image = Image.open(io.BytesIO(image_buffer)).convert("L")
    image = ImageEnhance.Contrast(image).enhance(1.5)
    image = image.filter(ImageFilter.SHARPEN)

    raw_text = pytesseract.image_to_string(image, lang="eng")
    items = parse_receipt_lines(raw_text)

    store = None
    for line in raw_text.splitlines()[:5]:
        if line.strip() and not re.search(r"\d+\.\d{2}", line):
            store = line.strip()[:50]
            break

    total_match = re.search(r"total[:\s]*\$?(\d+\.\d{2})", raw_text, re.I)
    total = float(total_match.group(1)) if total_match else None

    return {
        "items": items,
        "store": store,
        "total": total,
        "rawText": raw_text,
        "confidence": 80 if items else 40,
    }