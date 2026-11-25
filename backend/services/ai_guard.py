"""Guardrails for every Pro AI call (PP-183). Fail closed.

Nothing may call a provider without `reserve()` succeeding first. `reserve()`:

1. honors the kill switch (AI_FEATURES_ENABLED) and the auto-trip pause,
2. under a Postgres advisory lock, sums this user's rolling-7-day tokens and the
   global tokens for the current weekly window, adds a reserve estimate (prompt
   estimate + max output tokens), and refuses if either cap would be crossed,
3. inserts a 'reserved' llm_usage row holding that estimate, so concurrent
   requests can't both slip under a cap.

Any DB error while checking = blocked (no call). After the call, `finalize()`
replaces the estimate with the real counts and `trip_if_needed()` pauses AI until
the next weekly window once global usage reaches AI_AUTO_TRIP_RATIO (0.9) of the cap.

User-facing messages say "AI" only (PP-185): no model or vendor names.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import threading
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from database.db import db_connection

logger = logging.getLogger("pantry.ai_guard")

FEATURE_RECIPE_BUILDER = "recipe_builder"
PAID_TIERS = ("pro", "family")

_ADVISORY_LOCK_KEY = 183_000_183  # one global lock for budget check + reserve
_PAUSE_KEY = "paused_until"


class GuardBlocked(Exception):
    """The call must not happen. Carries an HTTP status, code and friendly message."""

    def __init__(self, status: int, code: str, message: str, details: Optional[dict[str, Any]] = None) -> None:
        super().__init__(code)
        self.status = status
        self.code = code
        self.message = message
        self.details = details or {}


# ---------- config ----------

def _int_env(name: str, default: int) -> int:
    try:
        return int(str(os.getenv(name, str(default))).strip().replace("_", ""))
    except ValueError:
        return default


def features_enabled() -> bool:
    return os.getenv("AI_FEATURES_ENABLED", "").strip().lower() in ("1", "true", "yes", "on")


def user_weekly_cap(tier: str) -> int:
    if tier not in PAID_TIERS:
        return 0  # Pro-only
    return max(0, _int_env("AI_USER_WEEKLY_TOKENS", 50_000))


def global_weekly_cap() -> int:
    return max(0, _int_env("AI_GLOBAL_WEEKLY_TOKENS", 300_000))


def hourly_request_limit() -> int:
    return max(0, _int_env("AI_USER_HOURLY_REQUESTS", 10))


def auto_trip_ratio() -> float:
    try:
        return min(1.0, max(0.1, float(os.getenv("AI_AUTO_TRIP_RATIO", "0.9"))))
    except ValueError:
        return 0.9


def cache_ttl_hours() -> int:
    return max(0, _int_env("AI_CACHE_TTL_HOURS", 24))


def window_start(now: Optional[datetime] = None) -> datetime:
    """Start of the global weekly window, aligned to the provider's weekly reset.

    AI_WEEK_RESET_DOW: 0=Monday .. 6=Sunday (UTC), default 0.
    AI_WEEK_RESET_HOUR_UTC: default 0.
    """
    now = now or datetime.now(timezone.utc)
    dow = min(6, max(0, _int_env("AI_WEEK_RESET_DOW", 0)))
    hour = min(23, max(0, _int_env("AI_WEEK_RESET_HOUR_UTC", 0)))
    start = now.replace(hour=hour, minute=0, second=0, microsecond=0) - timedelta(days=(now.weekday() - dow) % 7)
    if start > now:
        start -= timedelta(days=7)
    return start


def next_window_start(now: Optional[datetime] = None) -> datetime:
    return window_start(now) + timedelta(days=7)


def _day_label(when: datetime) -> str:
    return when.strftime("%A")


# ---------- messages (generic "AI" only) ----------

def msg_user_cap(resets: Optional[datetime]) -> str:
    when = f" They refresh by {_day_label(resets)}." if resets else " They refresh within 7 days."
    return f"You've used this week's AI recipe ideas.{when} Your pantry, lists and saved recipes still work as usual."


def msg_global_pause(until: datetime) -> str:
    return (
        f"AI recipe ideas are taking a break until {_day_label(until)}. "
        "Your pantry, lists and saved recipes still work as usual."
    )


MSG_UNAVAILABLE = "AI recipe ideas aren't available right now. Your pantry, lists and saved recipes still work as usual."
MSG_RATE = "That's a lot of recipe ideas in one hour. Give it a little while and try again."
MSG_IN_FLIGHT = "Still working on your last request. Give it a moment."
MSG_PRO_ONLY = "AI recipe ideas are part of Pro. Upgrade to get recipes built from what's in your pantry."


# ---------- pure budget check ----------

def evaluate_budget(
    *,
    user_used: int,
    global_used: int,
    estimate: int,
    user_cap: int,
    global_cap: int,
    user_resets: Optional[datetime] = None,
    now: Optional[datetime] = None,
) -> None:
    """Raise GuardBlocked if used + estimate would cross either cap. Caps of 0 block everything."""
    if global_cap <= 0 or global_used + estimate > global_cap:
        raise GuardBlocked(
            503,
            "AI_PAUSED",
            msg_global_pause(next_window_start(now)),
            {"resetsAt": next_window_start(now).isoformat()},
        )
    if user_cap <= 0 or user_used + estimate > user_cap:
        raise GuardBlocked(
            429,
            "AI_WEEKLY_LIMIT",
            msg_user_cap(user_resets),
            {
                "usedTokens": user_used,
                "limitTokens": user_cap,
                "resetsAt": user_resets.isoformat() if user_resets else None,
            },
        )


# ---------- DB helpers (each is small so tests can mock it) ----------

def get_paused_until() -> Optional[datetime]:
    """Raises on DB error (callers treat that as blocked)."""
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT value FROM ai_guard_state WHERE key = %s", (_PAUSE_KEY,))
            row = cur.fetchone()
    if not row:
        return None
    try:
        until = datetime.fromisoformat(str(row["value"]))
    except ValueError:
        return None
    if until.tzinfo is None:
        until = until.replace(tzinfo=timezone.utc)
    return until if until > datetime.now(timezone.utc) else None


def set_paused_until(until: datetime) -> None:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ai_guard_state (key, value, updated_at) VALUES (%s, %s, NOW())
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
                """,
                (_PAUSE_KEY, until.isoformat()),
            )


def clear_pause() -> None:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM ai_guard_state WHERE key = %s", (_PAUSE_KEY,))


_TOKENS_SQL = "CASE WHEN status = 'reserved' THEN reserved_tokens ELSE prompt_tokens + completion_tokens END"


def usage_snapshot(cur, user_id: str, feature: str, now: datetime) -> dict[str, Any]:
    cur.execute(
        f"""
        SELECT
          COALESCE(SUM({_TOKENS_SQL}) FILTER (WHERE user_id = %s AND created_at >= %s), 0) AS user_week,
          MIN(created_at) FILTER (WHERE user_id = %s AND created_at >= %s) AS user_oldest,
          COALESCE(SUM({_TOKENS_SQL}) FILTER (WHERE created_at >= %s), 0) AS global_week,
          COUNT(DISTINCT request_id) FILTER (
            WHERE user_id = %s AND feature = %s AND created_at >= %s
          ) AS user_hour_requests
        FROM llm_usage
        WHERE created_at >= %s
        """,
        (
            user_id,
            now - timedelta(days=7),
            user_id,
            now - timedelta(days=7),
            window_start(now),
            user_id,
            feature,
            now - timedelta(hours=1),
            min(now - timedelta(days=7), window_start(now)),
        ),
    )
    row = cur.fetchone() or {}
    oldest = row.get("user_oldest")
    if isinstance(oldest, datetime) and oldest.tzinfo is None:
        oldest = oldest.replace(tzinfo=timezone.utc)
    return {
        "user_week": int(row.get("user_week") or 0),
        "global_week": int(row.get("global_week") or 0),
        "user_hour_requests": int(row.get("user_hour_requests") or 0),
        "user_resets": (oldest + timedelta(days=7)) if isinstance(oldest, datetime) else None,
    }


def read_usage(user_id: str, feature: str = FEATURE_RECIPE_BUILDER) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    with db_connection() as conn:
        with conn.cursor() as cur:
            return usage_snapshot(cur, user_id, feature, now)


def check_request_allowed(user_id: str, feature: str = FEATURE_RECIPE_BUILDER) -> dict[str, Any]:
    """Gate before any work: kill switch, pause, hourly limit. Fail closed on DB error."""
    if not features_enabled():
        raise GuardBlocked(404, "AI_DISABLED", MSG_UNAVAILABLE)
    try:
        paused = get_paused_until()
        usage = read_usage(user_id, feature)
    except GuardBlocked:
        raise
    except Exception as exc:
        logger.warning("ai_guard outcome=blocked reason=usage_read_failed detail=%s", type(exc).__name__)
        raise GuardBlocked(503, "AI_UNAVAILABLE", MSG_UNAVAILABLE) from exc
    if paused:
        raise GuardBlocked(503, "AI_PAUSED", msg_global_pause(paused), {"resetsAt": paused.isoformat()})
    limit = hourly_request_limit()
    if usage["user_hour_requests"] >= limit:
        raise GuardBlocked(429, "AI_RATE_LIMITED", MSG_RATE, {"limit": limit})
    return usage


def reserve(
    *,
    user_id: str,
    tier: str,
    request_id: str,
    feature: str,
    provider: str,
    model: str,
    estimate: int,
) -> str:
    """Check both caps with the estimate and insert a reservation row. Returns its id.

    Raises GuardBlocked when blocked or when anything goes wrong reading usage.
    Called again before a fallback attempt, so the fallback counts against the caps too.
    """
    if not features_enabled():
        raise GuardBlocked(404, "AI_DISABLED", MSG_UNAVAILABLE)
    now = datetime.now(timezone.utc)
    reservation_id = str(uuid.uuid4())
    try:
        paused = get_paused_until()
        if paused:
            raise GuardBlocked(503, "AI_PAUSED", msg_global_pause(paused), {"resetsAt": paused.isoformat()})
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT pg_advisory_xact_lock(%s)", (_ADVISORY_LOCK_KEY,))
                usage = usage_snapshot(cur, user_id, feature, now)
                evaluate_budget(
                    user_used=usage["user_week"],
                    global_used=usage["global_week"],
                    estimate=estimate,
                    user_cap=user_weekly_cap(tier),
                    global_cap=global_weekly_cap(),
                    user_resets=usage["user_resets"],
                    now=now,
                )
                cur.execute(
                    """
                    INSERT INTO llm_usage (id, user_id, request_id, feature, provider, model, status, reserved_tokens, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, 'reserved', %s, %s)
                    """,
                    (reservation_id, user_id, request_id, feature, provider, model, int(estimate), now),
                )
    except GuardBlocked as blocked:
        logger.info("ai_guard outcome=blocked reason=%s provider=%s", blocked.code, provider)
        raise
    except Exception as exc:
        logger.warning("ai_guard outcome=blocked reason=reserve_failed detail=%s", type(exc).__name__)
        raise GuardBlocked(503, "AI_UNAVAILABLE", MSG_UNAVAILABLE) from exc
    return reservation_id


def finalize(reservation_id: str, status: str, prompt_tokens: int, completion_tokens: int) -> None:
    """Replace the estimate with real counts. On failure the estimate stays (conservative)."""
    try:
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE llm_usage
                    SET status = %s, prompt_tokens = %s, completion_tokens = %s, finished_at = NOW()
                    WHERE id = %s
                    """,
                    (status, int(prompt_tokens), int(completion_tokens), reservation_id),
                )
    except Exception as exc:
        logger.warning("ai_guard finalize_failed detail=%s", type(exc).__name__)


def trip_if_needed() -> bool:
    """Pause AI until the next window once global usage reaches the trip ratio. Returns True if tripped."""
    cap = global_weekly_cap()
    now = datetime.now(timezone.utc)
    try:
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"SELECT COALESCE(SUM({_TOKENS_SQL}), 0) AS used FROM llm_usage WHERE created_at >= %s",
                    (window_start(now),),
                )
                row = cur.fetchone() or {}
        used = int(row.get("used") or 0)
    except Exception as exc:
        logger.warning("ai_guard trip_check_failed detail=%s", type(exc).__name__)
        return False
    if cap <= 0 or used >= cap * auto_trip_ratio():
        try:
            set_paused_until(next_window_start(now))
            logger.warning("ai_guard outcome=auto_trip used=%d cap=%d", used, cap)
            return True
        except Exception as exc:
            logger.warning("ai_guard trip_set_failed detail=%s", type(exc).__name__)
    return False


def admin_summary() -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT provider, COUNT(*) AS calls, COALESCE(SUM({_TOKENS_SQL}), 0) AS tokens
                FROM llm_usage WHERE created_at >= %s GROUP BY provider
                """,
                (window_start(now),),
            )
            rows = cur.fetchall()
    used = sum(int(r["tokens"]) for r in rows)
    paused = get_paused_until()
    # Admin-only page: provider keys are internal ids, not shown to customers.
    return {
        "enabled": features_enabled(),
        "pausedUntil": paused.isoformat() if paused else None,
        "windowStart": window_start(now).isoformat(),
        "windowEnd": next_window_start(now).isoformat(),
        "globalUsedTokens": used,
        "globalLimitTokens": global_weekly_cap(),
        "byProvider": [{"provider": r["provider"], "calls": int(r["calls"]), "tokens": int(r["tokens"])} for r in rows],
    }


# ---------- in-flight (1 per user, per process) ----------

_in_flight: set[str] = set()
_in_flight_lock = threading.Lock()


def acquire_in_flight(user_id: str) -> None:
    with _in_flight_lock:
        if user_id in _in_flight:
            raise GuardBlocked(409, "AI_IN_FLIGHT", MSG_IN_FLIGHT)
        _in_flight.add(user_id)


def release_in_flight(user_id: str) -> None:
    with _in_flight_lock:
        _in_flight.discard(user_id)


# ---------- 24h cache ----------

def cache_key(user_id: str, feature: str, payload: Any) -> str:
    raw = json.dumps({"u": user_id, "f": feature, "p": payload}, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def cache_get(key: str) -> Optional[Any]:
    ttl = cache_ttl_hours()
    if ttl <= 0:
        return None
    try:
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT response FROM ai_response_cache WHERE cache_key = %s AND created_at >= NOW() - (%s * INTERVAL '1 hour')",
                    (key, ttl),
                )
                row = cur.fetchone()
    except Exception:
        return None
    if not row:
        return None
    value = row["response"]
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except ValueError:
            return None
    return value


def cache_put(key: str, user_id: str, feature: str, response: Any) -> None:
    if cache_ttl_hours() <= 0:
        return
    try:
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM ai_response_cache WHERE created_at < NOW() - INTERVAL '2 days'")
                cur.execute(
                    """
                    INSERT INTO ai_response_cache (cache_key, user_id, feature, response, created_at)
                    VALUES (%s, %s, %s, %s, NOW())
                    ON CONFLICT (cache_key) DO UPDATE SET response = EXCLUDED.response, created_at = NOW()
                    """,
                    (key, user_id, feature, json.dumps(response)),
                )
    except Exception as exc:
        logger.warning("ai_guard cache_put_failed detail=%s", type(exc).__name__)
