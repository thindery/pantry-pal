"""PP-244: user_active_days writes and honest signup counts."""

from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

import pytest

from backend.services import activity_service, admin_service


class _Cur:
    def __init__(self, log, fail=False):
        self.log, self.fail = log, fail

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def execute(self, sql, params=()):
        if self.fail:
            raise RuntimeError("db down")
        self.log.append((" ".join(sql.split()), params))


def _fake_db(log, fail=False):
    @contextmanager
    def _conn():
        class C:
            def cursor(self_inner):
                return _Cur(log, fail)

        yield C()

    return _conn


@pytest.fixture(autouse=True)
def _enabled(monkeypatch):
    monkeypatch.setenv("ACTIVITY_TRACKING_DISABLED", "0")
    activity_service._reset_cache_for_tests()
    yield
    activity_service._reset_cache_for_tests()


def test_touch_writes_once_per_user_per_day(monkeypatch):
    log = []
    monkeypatch.setattr(activity_service, "db_connection", _fake_db(log))
    now = datetime(2026, 11, 27, 23, 0, tzinfo=timezone.utc)
    assert activity_service.touch("u1", now) is True
    assert activity_service.touch("u1", now) is False  # cached
    assert activity_service.touch("u1", now + timedelta(days=1)) is True
    assert len(log) == 2
    assert log[0][0].startswith("INSERT INTO user_active_days")
    assert "ON CONFLICT DO NOTHING" in log[0][0]
    assert log[0][1] == ("u1", "2026-11-27")


def test_touch_never_raises_and_retries_after_failure(monkeypatch):
    monkeypatch.setattr(activity_service, "db_connection", _fake_db([], fail=True))
    assert activity_service.touch("u2") is False
    log = []
    monkeypatch.setattr(activity_service, "db_connection", _fake_db(log))
    assert activity_service.touch("u2") is True
    assert len(log) == 1


def test_touch_disabled_or_blank(monkeypatch):
    log = []
    monkeypatch.setattr(activity_service, "db_connection", _fake_db(log))
    assert activity_service.touch("") is False
    monkeypatch.setenv("ACTIVITY_TRACKING_DISABLED", "1")
    assert activity_service.touch("u3") is False
    assert log == []


def test_funnel_excludes_backfilled_signups(monkeypatch):
    from tests.test_admin_funnel import FixtureDB

    now = datetime.now(timezone.utc)
    t2 = (now - timedelta(days=2)).isoformat()
    db = FixtureDB(
        users=[
            {"id": "a", "created_at": t2, "estimated": True},
            {"id": "b", "created_at": t2, "estimated": True},
            {"id": "c", "created_at": (now - timedelta(days=1)).isoformat()},
        ]
    )
    monkeypatch.setattr(admin_service, "db_connection", lambda: db)
    out = admin_service.get_funnel_metrics("7d")
    assert out["signups"]["allTime"] == 3
    assert out["signups"]["period"] == 1
    assert out["signups"]["preTracking"] == 2
