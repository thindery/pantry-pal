"""Sliding-window rate limiting — Postgres-backed with in-memory fallback."""

from __future__ import annotations

import os
import time
from collections import defaultdict
from typing import Callable

from database.db import db_connection, ping_database

_memory_buckets: dict[str, list[float]] = defaultdict(list)
_WINDOW_SECONDS = 60


def _use_postgres() -> bool:
    store = os.getenv("RATE_LIMIT_STORE", "postgres").strip().lower()
    if store == "memory":
        return False
    return ping_database()


def _prune_memory(bucket: list[float], now: float) -> list[float]:
    cutoff = now - _WINDOW_SECONDS
    return [t for t in bucket if t > cutoff]


def _check_memory(identifier: str, limit: int) -> tuple[bool, int]:
    now = time.time()
    bucket = _prune_memory(_memory_buckets[identifier], now)
    if len(bucket) >= limit:
        _memory_buckets[identifier] = bucket
        retry_after = int(_WINDOW_SECONDS - (now - bucket[0])) if bucket else _WINDOW_SECONDS
        return False, max(1, retry_after)
    bucket.append(now)
    _memory_buckets[identifier] = bucket
    return True, limit - len(bucket)


def _check_postgres(identifier: str, endpoint: str, limit: int) -> tuple[bool, int]:
    now = time.time()
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM rate_limit_events
                WHERE created_at < NOW() - INTERVAL '60 seconds'
                """
            )
            cur.execute(
                """
                SELECT COUNT(*) AS hits, MIN(created_at) AS oldest
                FROM rate_limit_events
                WHERE identifier = %s AND endpoint = %s
                  AND created_at >= NOW() - INTERVAL '60 seconds'
                """,
                (identifier, endpoint),
            )
            row = cur.fetchone()
            hits = int(row["hits"] if row else 0)
            if hits >= limit:
                oldest = row["oldest"] if row else None
                if oldest is not None:
                    retry_after = max(
                        1,
                        int(_WINDOW_SECONDS - (now - oldest.timestamp())),
                    )
                else:
                    retry_after = _WINDOW_SECONDS
                return False, retry_after
            cur.execute(
                """
                INSERT INTO rate_limit_events (identifier, endpoint)
                VALUES (%s, %s)
                """,
                (identifier, endpoint),
            )
    return True, limit - (hits + 1)


def check_rate_limit(identifier: str, endpoint: str, limit: int) -> tuple[bool, int]:
    """Return (allowed, remaining_or_retry_after_seconds)."""
    if _use_postgres():
        try:
            return _check_postgres(identifier, endpoint, limit)
        except Exception:
            pass
    return _check_memory(identifier, limit)


def clear_memory_buckets() -> None:
    """Test helper — in-memory fallback only."""
    _memory_buckets.clear()


def clear_rate_limit_events() -> None:
    """Test helper — clears Postgres events when available."""
    if not ping_database():
        return
    try:
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM rate_limit_events")
    except Exception:
        pass