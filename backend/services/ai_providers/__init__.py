"""Receipt AI with a selectable provider and automatic fallback (PP-186).

Flow (only when AI_RECEIPT_SCAN_ENABLED is on; off = today's pytesseract-only path):

1. Try the selected provider. Default is Ollama (also when nothing is stored).
2. If it fails (error, timeout, not configured, bad response) or hits a cap/quota
   (HTTP 402/429, quota text), try the other provider. A provider that succeeds,
   even with zero items, is final: the fallback is never called "just in case".
3. If both fail, return None and the caller runs pytesseract as before.

Logs carry provider names, outcome kinds and HTTP status only. Never keys, URLs
with keys, response bodies or image data.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any

from . import gemini, ollama
from .base import (
    DEFAULT_PROVIDER,
    KIND_CAP,
    PROVIDER_GEMINI,
    PROVIDER_OLLAMA,
    PROVIDERS,
    ProviderError,
)

logger = logging.getLogger("pantry.ai_receipt")

_MODULES = {PROVIDER_OLLAMA: ollama, PROVIDER_GEMINI: gemini}
_capped_until: dict[str, float] = {}


def is_enabled() -> bool:
    return os.getenv("AI_RECEIPT_SCAN_ENABLED", "").strip().lower() in ("1", "true", "yes", "on")


def _timeout() -> float:
    try:
        return max(1.0, float(os.getenv("AI_PROVIDER_TIMEOUT_SECONDS", "25")))
    except ValueError:
        return 25.0


def _cap_cooldown() -> float:
    try:
        return max(0.0, float(os.getenv("AI_CAP_COOLDOWN_SECONDS", "600")))
    except ValueError:
        return 600.0


def _max_image_bytes() -> int:
    try:
        return int(os.getenv("AI_RECEIPT_MAX_IMAGE_BYTES", str(6 * 1024 * 1024)))
    except ValueError:
        return 6 * 1024 * 1024


def reset_state() -> None:
    """Clear cap cooldowns (tests, admin tooling)."""
    _capped_until.clear()


def provider_status() -> dict[str, Any]:
    """Booleans only. Safe to show to admins."""
    return {
        "enabled": is_enabled(),
        "ollamaConfigured": ollama.is_configured(),
        "geminiConfigured": gemini.is_configured(),
    }


def provider_order(selected: str) -> list[str]:
    selected = selected if selected in PROVIDERS else DEFAULT_PROVIDER
    return [selected] + [p for p in PROVIDERS if p != selected]


def scan_receipt_with_ai(image_b64: str) -> dict[str, Any] | None:
    """Return a parsed receipt, or None when AI is off, skipped or both providers failed."""
    if not is_enabled():
        return None
    if (len(image_b64) * 3) // 4 > _max_image_bytes():
        logger.info("ai_receipt skipped reason=image_too_large")
        return None

    from backend.services.app_settings import get_ai_provider

    order = provider_order(get_ai_provider())
    for index, name in enumerate(order):
        nxt = order[index + 1] if index + 1 < len(order) else None
        until = _capped_until.get(name, 0.0)
        if until > time.monotonic():
            logger.info("ai_receipt provider=%s outcome=skipped_cap_cooldown fallback=%s", name, nxt)
            continue
        try:
            result = _MODULES[name].scan_receipt(image_b64, _timeout())
        except ProviderError as exc:
            if exc.kind == KIND_CAP:
                _capped_until[name] = time.monotonic() + _cap_cooldown()
            logger.warning(
                "ai_receipt provider=%s outcome=%s detail=%s fallback=%s",
                name,
                exc.kind,
                exc.detail,
                nxt or "pytesseract",
            )
            continue
        except Exception as exc:  # never let a provider bug break scanning
            logger.warning(
                "ai_receipt provider=%s outcome=error detail=%s fallback=%s",
                name,
                type(exc).__name__,
                nxt or "pytesseract",
            )
            continue
        logger.info("ai_receipt provider=%s outcome=ok items=%d", name, len(result["items"]))
        result["provider"] = name
        return result
    logger.warning("ai_receipt outcome=all_providers_failed fallback=pytesseract")
    return None
