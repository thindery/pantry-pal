"""Redirect and URL validation helpers."""

from __future__ import annotations

import os
from urllib.parse import urlparse


def _allowed_redirect_origins() -> list[str]:
    origins: list[str] = []
    for key in ("AUTH_URL", "FRONTEND_URL", "NEXT_PUBLIC_SITE_URL"):
        raw = os.getenv(key, "").strip().rstrip("/")
        if not raw:
            continue
        parsed = urlparse(raw)
        if parsed.scheme in ("http", "https") and parsed.netloc:
            origins.append(f"{parsed.scheme}://{parsed.netloc}")
    return list(dict.fromkeys(origins))


def validate_redirect_url(url: str) -> str:
    """Ensure checkout/portal redirect URLs stay on an allowed site origin."""
    trimmed = url.strip()
    parsed = urlparse(trimmed)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("Redirect URL must use HTTPS with a valid host")
    origin = f"{parsed.scheme}://{parsed.netloc}"
    allowed = _allowed_redirect_origins()
    if not allowed:
        raise ValueError("Redirect URL validation is not configured")
    if origin not in allowed:
        raise ValueError("Redirect URL origin is not allowed")
    return trimmed


def validate_receipt_url(url: str) -> str:
    """Allow only HTTPS receipt URLs from allowed origins."""
    trimmed = url.strip()
    parsed = urlparse(trimmed)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("Receipt URL must use HTTPS")
    origin = f"{parsed.scheme}://{parsed.netloc}"
    allowed = _allowed_redirect_origins()
    if allowed and origin not in allowed:
        raise ValueError("Receipt URL origin is not allowed")
    return trimmed