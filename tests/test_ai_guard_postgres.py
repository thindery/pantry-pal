"""PP-183: the AI guard's real SQL against Postgres (RUN_POSTGRES_TESTS=1).

Unit tests replace the DB, so this checks the reservation rows, the sums that
the caps read, the auto-trip pause and the 24h cache on a migrated database.
No provider is ever called here.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_POSTGRES_TESTS") != "1",
    reason="Set RUN_POSTGRES_TESTS=1 and DATABASE_URL to run",
)


@pytest.fixture(scope="module", autouse=True)
def _migrated():
    from database.migrate import migrate

    migrate()


@pytest.fixture
def guard(monkeypatch):
    from backend.services import ai_guard
    from database.db import db_connection

    monkeypatch.setenv("AI_FEATURES_ENABLED", "1")
    monkeypatch.setenv("AI_USER_WEEKLY_TOKENS", "10000")
    monkeypatch.setenv("AI_GLOBAL_WEEKLY_TOKENS", "1000000000")
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM ai_guard_state")
    yield ai_guard
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM ai_guard_state")


def _reserve(guard, user, estimate, request_id=None):
    return guard.reserve(
        user_id=user,
        tier="pro",
        request_id=request_id or str(uuid.uuid4()),
        feature=guard.FEATURE_RECIPE_BUILDER,
        provider="ollama",
        model="test-model",
        estimate=estimate,
    )


def test_reserve_counts_estimate_then_real_tokens(guard):
    user = f"pp183-{uuid.uuid4()}"
    rid = _reserve(guard, user, 4000)
    assert guard.read_usage(user)["user_week"] == 4000
    guard.finalize(rid, "ok", 300, 700)
    usage = guard.read_usage(user)
    assert usage["user_week"] == 1000
    assert usage["user_hour_requests"] == 1
    assert usage["user_resets"] is not None


def test_reserve_blocks_when_estimate_crosses_user_cap(guard):
    user = f"pp183-{uuid.uuid4()}"
    _reserve(guard, user, 8000)
    with pytest.raises(guard.GuardBlocked) as exc:
        _reserve(guard, user, 2500)
    assert exc.value.code == "AI_WEEKLY_LIMIT"
    assert guard.read_usage(user)["user_week"] == 8000  # blocked attempt wrote nothing


def test_two_attempts_same_request_count_as_one_hourly_request(guard):
    user = f"pp183-{uuid.uuid4()}"
    req = str(uuid.uuid4())
    a = _reserve(guard, user, 100, req)
    guard.finalize(a, "failed", 0, 0)
    _reserve(guard, user, 100, req)
    assert guard.read_usage(user)["user_hour_requests"] == 1


def test_pause_round_trip_and_auto_trip(guard, monkeypatch):
    until = datetime.now(timezone.utc) + timedelta(days=1)
    guard.set_paused_until(until)
    assert guard.get_paused_until() is not None
    with pytest.raises(guard.GuardBlocked):
        _reserve(guard, f"pp183-{uuid.uuid4()}", 10)
    guard.clear_pause()
    assert guard.get_paused_until() is None
    # auto-trip: global cap at or below current usage trips the pause
    user = f"pp183-{uuid.uuid4()}"
    rid = _reserve(guard, user, 10)
    guard.finalize(rid, "ok", 5, 5)
    monkeypatch.setenv("AI_GLOBAL_WEEKLY_TOKENS", "1")
    assert guard.trip_if_needed() is True
    assert guard.get_paused_until() == guard.next_window_start()


def test_cache_round_trip(guard):
    key = guard.cache_key("u", "f", {"x": uuid.uuid4().hex})
    assert guard.cache_get(key) is None
    guard.cache_put(key, "u", "f", [{"title": "A"}])
    assert guard.cache_get(key) == [{"title": "A"}]
