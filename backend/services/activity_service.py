"""PP-244: record one user_active_days row per user per UTC day.

Called from the authenticated-request dependency. Best effort: a failure never
blocks the request, and an in-process cache keeps it to one write per user per
day per worker.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

from database.db import db_connection

logger = logging.getLogger(__name__)

_MAX_CACHE = 50_000
_seen: set[tuple[str, str]] = set()


def _disabled() -> bool:
    return os.getenv("ACTIVITY_TRACKING_DISABLED", "").strip().lower() in {"1", "true", "yes"}


def touch(user_id: str, now: datetime | None = None) -> bool:
    """Record that user_id was active today. Returns True when a write was attempted."""
    if not user_id or _disabled():
        return False
    day = (now or datetime.now(timezone.utc)).date().isoformat()
    key = (user_id, day)
    if key in _seen:
        return False
    if len(_seen) > _MAX_CACHE:
        _seen.clear()
    _seen.add(key)
    try:
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO user_active_days (user_id, day) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (user_id, day),
                )
        return True
    except Exception:  # noqa: BLE001 - tracking must never break a request
        _seen.discard(key)
        logger.warning("user_active_days write failed")
        return False


def _reset_cache_for_tests() -> None:
    _seen.clear()
