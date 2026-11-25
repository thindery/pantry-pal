"""PP-178: "Send to Instacart (Beta)" handoff.

Turns the user's shopping list into an Instacart shopping list page through the
Instacart Developer Platform (``POST /idp/v1/products/products_link``) and returns
the link. Instacart adds affiliate parameters itself, so none are set here.

Config (server env only, never committed, never sent to the browser):
  INSTACART_API_KEY   bearer key from the Instacart Developer Platform. Unset or
                      blank turns the feature off.
  INSTACART_API_BASE  default https://connect.dev.instacart.tools (dev);
                      production is https://connect.instacart.com.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import threading
import time
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

ENV_API_KEY = "INSTACART_API_KEY"
ENV_API_BASE = "INSTACART_API_BASE"
DEFAULT_API_BASE = "https://connect.dev.instacart.tools"
PRODUCTS_LINK_PATH = "/idp/v1/products/products_link"

LIST_TITLE = "My Pantry Hub list"
LINKBACK_URL = "https://www.mypantryhub.com/dashboard/shopping-list"
LINK_EXPIRES_IN_DAYS = 30
REQUEST_TIMEOUT_SECONDS = 10.0
MAX_ITEMS = 100
MAX_NAME_LENGTH = 200

CACHE_TTL_SECONDS = 24 * 60 * 60
CACHE_MAX_ENTRIES = 500

# Pantry Hub units -> units Instacart documents as supported. "bottles" and
# "other" have no supported match, so they fall back to "each".
UNIT_MAP = {
    "units": "each",
    "each": "each",
    "lbs": "lb",
    "lb": "lb",
    "oz": "ounce",
    "grams": "gram",
    "g": "gram",
    "kg": "kilogram",
    "cups": "cup",
    "cans": "can",
    "boxes": "package",
    "bottles": "each",
    "other": "each",
}
FALLBACK_UNIT = "each"

_cache: dict[str, tuple[float, str]] = {}
_cache_lock = threading.Lock()


class InstacartError(Exception):
    """The Instacart call failed. The message is safe to show to the user."""


def api_key() -> Optional[str]:
    value = (os.getenv(ENV_API_KEY) or "").strip()
    return value or None


def is_enabled() -> bool:
    return api_key() is not None


def api_base() -> str:
    value = (os.getenv(ENV_API_BASE) or "").strip().rstrip("/")
    return value or DEFAULT_API_BASE


def normalize_unit(unit: Optional[str]) -> str:
    return UNIT_MAP.get((unit or "").strip().lower(), FALLBACK_UNIT)


def normalize_upc(raw: Optional[str]) -> Optional[str]:
    """Return a 12 or 14 digit UPC, or None. A 13 digit code that starts with 0 is a UPC-A."""
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 13 and digits.startswith("0"):
        digits = digits[1:]
    if len(digits) in (12, 14):
        return digits
    return None


def build_line_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Map shopping list rows to Instacart line items.

    Rows without a name are dropped. A UPC is only sent when valid, and only the
    first row for a UPC keeps it (Instacart rejects duplicate UPCs in one request).
    """
    line_items: list[dict[str, Any]] = []
    seen_upcs: set[str] = set()
    for item in items[:MAX_ITEMS]:
        name = " ".join(str(item.get("name") or "").split())[:MAX_NAME_LENGTH]
        if not name:
            continue
        try:
            quantity = float(item.get("quantity") or 1)
        except (TypeError, ValueError):
            quantity = 1.0
        if not quantity > 0:
            quantity = 1.0
        quantity = round(min(quantity, 999), 2)
        line: dict[str, Any] = {
            "name": name,
            "line_item_measurements": [
                {"quantity": quantity, "unit": normalize_unit(item.get("unit"))}
            ],
        }
        upc = normalize_upc(item.get("upc"))
        if upc and upc not in seen_upcs:
            seen_upcs.add(upc)
            line["upcs"] = [upc]
        line_items.append(line)
    return line_items


def build_payload(line_items: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "title": LIST_TITLE,
        "link_type": "shopping_list",
        "expires_in": LINK_EXPIRES_IN_DAYS,
        "line_items": line_items,
        "landing_page_configuration": {"partner_linkback_url": LINKBACK_URL},
    }


def list_hash(line_items: list[dict[str, Any]]) -> str:
    """Stable hash of the list contents plus the target API host (dev and prod links differ)."""
    canonical = json.dumps(
        {"base": api_base(), "title": LIST_TITLE, "items": line_items},
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _cache_get(key: str) -> Optional[str]:
    with _cache_lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        stored_at, url = entry
        if time.time() - stored_at > CACHE_TTL_SECONDS:
            _cache.pop(key, None)
            return None
        return url


def _cache_set(key: str, url: str) -> None:
    with _cache_lock:
        if len(_cache) >= CACHE_MAX_ENTRIES:
            oldest = min(_cache, key=lambda k: _cache[k][0])
            _cache.pop(oldest, None)
        _cache[key] = (time.time(), url)


def clear_cache() -> None:
    with _cache_lock:
        _cache.clear()


async def create_shopping_list_link(items: list[dict[str, Any]]) -> dict[str, Any]:
    """Return ``{"url": str, "itemCount": int, "cached": bool}`` or raise InstacartError."""
    key = api_key()
    if key is None:
        raise InstacartError("Instacart is not available right now.")
    line_items = build_line_items(items)
    if not line_items:
        raise InstacartError("Add at least one item to send to Instacart.")

    cache_key = list_hash(line_items)
    cached = _cache_get(cache_key)
    if cached:
        return {"url": cached, "itemCount": len(line_items), "cached": True}

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{api_base()}{PRODUCTS_LINK_PATH}",
                json=build_payload(line_items),
                headers={
                    "Authorization": f"Bearer {key}",
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
            )
    except httpx.HTTPError as exc:
        logger.warning("Instacart request failed: %s", type(exc).__name__)
        raise InstacartError("Instacart did not respond. Try again in a moment.") from exc

    if response.status_code != 200:
        # Status only: never log the key, and the body can echo the list.
        logger.warning("Instacart returned HTTP %s", response.status_code)
        raise InstacartError("Instacart could not build your list. Try again in a moment.")

    try:
        url = response.json().get("products_link_url")
    except (ValueError, AttributeError):
        url = None
    if not isinstance(url, str) or not url.startswith("https://"):
        logger.warning("Instacart response had no usable products_link_url")
        raise InstacartError("Instacart could not build your list. Try again in a moment.")

    _cache_set(cache_key, url)
    return {"url": url, "itemCount": len(line_items), "cached": False}
