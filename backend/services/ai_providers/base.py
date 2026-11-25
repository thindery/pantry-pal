"""Shared types for the receipt AI providers (PP-186)."""

from __future__ import annotations

import base64
import re
from typing import Any

# Failure kinds. "cap" = quota / rate limit / weekly cap (HTTP 402/429 or a
# quota-style message). Anything else that goes wrong is "error" or "timeout".
KIND_ERROR = "error"
KIND_TIMEOUT = "timeout"
KIND_CAP = "cap"
KIND_NOT_CONFIGURED = "not_configured"

PROVIDER_OLLAMA = "ollama"
PROVIDER_GEMINI = "gemini"
PROVIDERS = (PROVIDER_OLLAMA, PROVIDER_GEMINI)
DEFAULT_PROVIDER = PROVIDER_OLLAMA

RECEIPT_PROMPT = (
    "Read this grocery receipt photo. Return JSON only, with: "
    '"store" (string or null), "total" (number or null), and "items" '
    "(array). Each item has: name (string, cleaned product name), quantity "
    "(number, default 1), unit (string, default \"units\"), category "
    "(one of produce, dairy, meat, frozen, beverages, pantry, snacks, other) "
    "and price (number or null). Only include purchased products, not tax, "
    "totals, discounts or payment lines. Do not invent items."
)

RECEIPT_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "store": {"type": ["string", "null"]},
        "total": {"type": ["number", "null"]},
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "quantity": {"type": "number"},
                    "unit": {"type": "string"},
                    "category": {"type": "string"},
                    "price": {"type": ["number", "null"]},
                },
                "required": ["name"],
            },
        },
    },
    "required": ["items"],
}

_CAP_WORDS = re.compile(
    r"quota|rate.?limit|usage.?limit|weekly|too many requests|exceeded|resource_exhausted|credits|upgrade",
    re.I,
)


class ProviderError(Exception):
    """A provider failed. `kind` drives the fallback decision; message never holds secrets."""

    def __init__(self, provider: str, kind: str, detail: str = "") -> None:
        super().__init__(f"{provider}:{kind}:{detail}")
        self.provider = provider
        self.kind = kind
        self.detail = detail


def classify_http_failure(provider: str, status: int, body_text: str) -> ProviderError:
    """Turn a non-2xx response into a ProviderError. 402/429 and quota-style text are caps."""
    if status in (402, 429):
        return ProviderError(provider, KIND_CAP, f"http_{status}")
    if status in (403, 503) and _CAP_WORDS.search(body_text[:500]):
        return ProviderError(provider, KIND_CAP, f"http_{status}")
    return ProviderError(provider, KIND_ERROR, f"http_{status}")


def sniff_mime(image_b64: str) -> str:
    head = base64.b64decode(image_b64[:48] + "=" * (-len(image_b64[:48]) % 4))[:12]
    if head.startswith(b"\x89PNG"):
        return "image/png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


_CATEGORIES = {"produce", "dairy", "meat", "frozen", "beverages", "pantry", "snacks", "other"}


def _num(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.replace("$", "").strip())
        except ValueError:
            return None
    return None


def normalize_receipt(provider: str, data: Any) -> dict[str, Any]:
    """Validate model JSON and map it to the same shape the OCR path returns.

    Anything that is not an object with an `items` list is a provider failure,
    so the caller can fall back. An empty `items` list is a valid answer.
    """
    if not isinstance(data, dict) or not isinstance(data.get("items"), list):
        raise ProviderError(provider, KIND_ERROR, "bad_shape")
    from backend.services.receipt_ocr import detect_category

    items: list[dict[str, Any]] = []
    for raw in data["items"][:100]:
        if not isinstance(raw, dict):
            continue
        name = str(raw.get("name") or "").strip()[:80]
        if len(name) < 2:
            continue
        category = str(raw.get("category") or "").strip().lower()
        if category not in _CATEGORIES:
            category = detect_category(name)
        qty = _num(raw.get("quantity"))
        items.append(
            {
                "name": name,
                "quantity": qty if qty and 0 < qty <= 1000 else 1,
                "unit": (str(raw.get("unit") or "units").strip()[:20]) or "units",
                "category": category,
                "price": _num(raw.get("price")),
                "confidence": 85,
            }
        )
    store = data.get("store")
    return {
        "items": items,
        "store": str(store).strip()[:50] if isinstance(store, str) and store.strip() else None,
        "total": _num(data.get("total")),
        "rawText": "",
        "confidence": 85 if items else 40,
    }
