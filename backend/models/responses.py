"""Standard API response helpers matching Express format."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def success_response(data: Any, meta: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "meta": {"timestamp": _timestamp(), **(meta or {})},
    }


def error_response(
    code: str,
    message: str,
    details: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "success": False,
        "error": {"code": code, "message": message},
        "meta": {"timestamp": _timestamp()},
    }
    if details is not None:
        body["error"]["details"] = details
    return body