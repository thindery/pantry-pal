"""In-memory rate limiting middleware (PP-030)."""

from __future__ import annotations

import time
from collections import defaultdict
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from backend.app.config import get_settings
from backend.models.responses import error_response

_buckets: dict[str, list[float]] = defaultdict(list)


def _window_key(identifier: str, window_start: int) -> str:
    return f"{identifier}:{window_start}"


def _prune(bucket: list[float], now: float, window: int = 60) -> list[float]:
    cutoff = now - window
    return [t for t in bucket if t > cutoff]


def check_rate_limit(identifier: str, limit: int, window: int = 60) -> tuple[bool, int]:
    now = time.time()
    bucket = _prune(_buckets[identifier], now, window)
    if len(bucket) >= limit:
        _buckets[identifier] = bucket
        retry_after = int(window - (now - bucket[0])) if bucket else window
        return False, max(1, retry_after)
    bucket.append(now)
    _buckets[identifier] = bucket
    return True, limit - len(bucket)


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        settings = get_settings()
        path = request.url.path

        if path in ("/health", "/api/webhooks/stripe"):
            return await call_next(request)

        if path == "/api/client-errors" and request.method == "POST":
            limit = settings.RATE_LIMIT_CLIENT_ERRORS
        elif path.startswith("/api/receipts/scan"):
            limit = settings.RATE_LIMIT_RECEIPT_SCAN
        elif path.startswith("/api/barcode"):
            limit = settings.RATE_LIMIT_BARCODE
        elif path.startswith("/api/"):
            limit = settings.RATE_LIMIT_GENERAL
        else:
            return await call_next(request)

        user_id = request.headers.get("x-user-id")
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            identifier = f"user:{auth[7:20]}"
        elif user_id:
            identifier = f"user:{user_id}"
        else:
            host = request.client.host if request.client else "unknown"
            identifier = f"ip:{host}"

        allowed, remaining_or_retry = check_rate_limit(identifier, limit)
        if not allowed:
            from fastapi.responses import JSONResponse

            return JSONResponse(
                status_code=429,
                content=error_response(
                    "RATE_LIMITED",
                    f"Rate limit exceeded. Try again in {remaining_or_retry} seconds.",
                    {"retry_after": remaining_or_retry},
                ),
                headers={
                    "Retry-After": str(remaining_or_retry),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining_or_retry)
        return response