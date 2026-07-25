"""Trusted client IP extraction for rate limiting (PP-071 / SEC-207)."""

from __future__ import annotations

import os
from typing import Optional

from starlette.requests import Request


def _truthy_env(*keys: str) -> bool:
    for key in keys:
        raw = os.getenv(key, "").strip().lower()
        if raw in {"1", "true", "yes", "on"}:
            return True
    return False


def trust_proxy_headers() -> bool:
    """
    Only trust CF-Connecting-IP / X-Forwarded-For / X-Real-IP when enabled.

    Set TRUST_PROXY=1 (or TRUST_PROXY_HEADERS=1) on hosts behind Cloudflare/nginx.
    Never enabled by default so spoofed headers are ignored in local/dev.
    """
    return _truthy_env("TRUST_PROXY", "TRUST_PROXY_HEADERS")


def get_client_ip(request: Request) -> str:
    """
    Resolve client IP for unauthenticated rate-limit keys.

    When trust is enabled (production behind CF/nginx):
      1. CF-Connecting-IP (set by Cloudflare edge)
      2. First hop of X-Forwarded-For
      3. X-Real-IP
      4. request.client.host

    When trust is disabled: only request.client.host (headers ignored).
    """
    if trust_proxy_headers():
        cf_ip = _header_ip(request, "cf-connecting-ip")
        if cf_ip:
            return cf_ip

        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            first = forwarded.split(",")[0].strip()
            if first:
                return first

        real_ip = _header_ip(request, "x-real-ip")
        if real_ip:
            return real_ip

    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _header_ip(request: Request, name: str) -> Optional[str]:
    value = request.headers.get(name)
    if not value:
        return None
    cleaned = value.strip()
    return cleaned or None
