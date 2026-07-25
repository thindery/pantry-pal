"""Rate limiting middleware — Postgres-backed sliding window (PP-052)."""

from __future__ import annotations

from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from backend.app.config import get_settings
from backend.auth_session import resolve_authenticated_user
from backend.lib.client_ip import get_client_ip
from backend.models.responses import error_response
from backend.services import rate_limit_service


def _endpoint_key(path: str) -> str:
    if path.startswith("/api/receipts/scan"):
        return "receipt_scan"
    if path.startswith("/api/barcode"):
        return "barcode"
    if path == "/api/client-errors":
        return "client_errors"
    if path.startswith("/api/"):
        return "general"
    return path


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

        endpoint = _endpoint_key(path)
        user_id, _ = await resolve_authenticated_user(request)
        if user_id:
            identifier = f"user:{user_id}"
        else:
            identifier = f"ip:{get_client_ip(request)}"

        allowed, remaining_or_retry = rate_limit_service.check_rate_limit(
            identifier,
            endpoint,
            limit,
        )
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