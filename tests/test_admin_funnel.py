"""PP-126: Subscription funnel metrics and admin route tests."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app import app
from backend.services import admin_service


@pytest.fixture
def admin_headers(auth_headers, monkeypatch):
    monkeypatch.setenv("ADMIN_USER_IDS", auth_headers["x-user-id"])
    return auth_headers


class FixtureDB:
    def __init__(self, users=None, subscriptions=None, transactions=None):
        self.users = users or []
        self.subscriptions = subscriptions or []
        self.transactions = transactions or []
        self.executed_queries: list[tuple[str, tuple]] = []

    def cursor(self):
        return FixtureCursor(self)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class FixtureCursor:
    def __init__(self, db: FixtureDB):
        self.db = db
        self.last_result = None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def execute(self, sql: str, params: tuple = ()):
        self.db.executed_queries.append((sql, params))
        clean_sql = " ".join(sql.split())

        # 1. Signups
        if clean_sql == "SELECT COUNT(*) AS count FROM users":
            self.last_result = {"count": len(self.db.users)}
        elif clean_sql == "SELECT COUNT(*) AS count FROM users WHERE created_at_estimated":
            self.last_result = {"count": sum(1 for u in self.db.users if u.get("estimated"))}
        elif "FROM users WHERE created_at >= %s" in clean_sql:
            cutoff = params[0]
            count = sum(
                1 for u in self.db.users if u["created_at"] >= cutoff and not u.get("estimated")
            )
            self.last_result = {"count": count}

        # 2. Trials
        elif clean_sql == "SELECT COUNT(*) AS count FROM user_subscriptions WHERE subscription_status = 'trialing'":
            count = sum(1 for s in self.db.subscriptions if s.get("subscription_status") == "trialing")
            self.last_result = {"count": count}
        elif "FROM user_subscriptions WHERE subscription_status = 'trialing' AND created_at >= %s" in clean_sql:
            cutoff = params[0]
            count = sum(
                1
                for s in self.db.subscriptions
                if s.get("subscription_status") == "trialing" and s.get("created_at") >= cutoff
            )
            self.last_result = {"count": count}

        # 3. Paid Conversions (WITH first_paid AS ...)
        elif "WITH first_paid AS" in clean_sql:
            cutoff = params[0]
            # Exclude refunds, failed, pending, and $0 invoices
            valid_txns = [
                t
                for t in self.db.transactions
                if t.get("status") == "succeeded" and t.get("amount_cents", 0) > 0
            ]
            # Group by user_id, pick first by created_at, then id
            valid_txns.sort(key=lambda t: (t["created_at"], t.get("id", "")))
            first_by_user = {}
            for t in valid_txns:
                uid = t["user_id"]
                if uid not in first_by_user:
                    first_by_user[uid] = t

            total_all_time = len(first_by_user)
            pro_all_time = sum(
                1 for t in first_by_user.values() if (t.get("tier") or "").lower() == "pro"
            )
            family_all_time = sum(
                1 for t in first_by_user.values() if (t.get("tier") or "").lower() == "family"
            )

            period_first = [t for t in first_by_user.values() if t["created_at"] >= cutoff]
            total_period = len(period_first)
            pro_period = sum(
                1 for t in period_first if (t.get("tier") or "").lower() == "pro"
            )
            family_period = sum(
                1 for t in period_first if (t.get("tier") or "").lower() == "family"
            )

            self.last_result = {
                "total_all_time": total_all_time,
                "pro_all_time": pro_all_time,
                "family_all_time": family_all_time,
                "total_period": total_period,
                "pro_period": pro_period,
                "family_period": family_period,
            }

        # 4. Churned
        elif clean_sql == "SELECT COUNT(*) AS count FROM user_subscriptions WHERE subscription_status IN ('canceled', 'ended')":
            count = sum(
                1 for s in self.db.subscriptions if s.get("subscription_status") in ("canceled", "ended")
            )
            self.last_result = {"count": count}
        elif "FROM user_subscriptions WHERE subscription_status IN ('canceled', 'ended') AND updated_at >= %s" in clean_sql:
            cutoff = params[0]
            count = sum(
                1
                for s in self.db.subscriptions
                if s.get("subscription_status") in ("canceled", "ended")
                and s.get("updated_at") >= cutoff
            )
            self.last_result = {"count": count}

        # 5. Cancel Scheduled
        elif clean_sql == "SELECT COUNT(*) AS count FROM user_subscriptions WHERE cancel_at_period_end = TRUE AND subscription_status IN ('active', 'trialing')":
            count = sum(
                1
                for s in self.db.subscriptions
                if s.get("cancel_at_period_end") is True
                and s.get("subscription_status") in ("active", "trialing")
            )
            self.last_result = {"count": count}
        elif "FROM user_subscriptions WHERE cancel_at_period_end = TRUE AND subscription_status IN ('active', 'trialing') AND updated_at >= %s" in clean_sql:
            cutoff = params[0]
            count = sum(
                1
                for s in self.db.subscriptions
                if s.get("cancel_at_period_end") is True
                and s.get("subscription_status") in ("active", "trialing")
                and s.get("updated_at") >= cutoff
            )
            self.last_result = {"count": count}

    def fetchone(self):
        return self.last_result

    def fetchall(self):
        return [self.last_result] if self.last_result else []


def test_funnel_metrics_conversions_and_churn():
    now = datetime.now(timezone.utc)
    t_3d = (now - timedelta(days=3)).isoformat()
    t_10d = (now - timedelta(days=10)).isoformat()
    t_40d = (now - timedelta(days=40)).isoformat()

    # Users fixture
    users = [
        {"id": "u1", "created_at": t_3d},   # In 7d
        {"id": "u2", "created_at": t_10d},  # In 30d, not 7d
        {"id": "u3", "created_at": t_40d},  # In 90d, not 30d
    ]

    # Subscriptions fixture
    subscriptions = [
        # u1: active with cancel_at_period_end (cancel scheduled, NOT churned)
        {
            "user_id": "u1",
            "subscription_status": "active",
            "cancel_at_period_end": True,
            "created_at": t_10d,
            "updated_at": t_3d,
        },
        # u2: actually churned (canceled 3d ago)
        {
            "user_id": "u2",
            "subscription_status": "canceled",
            "cancel_at_period_end": False,
            "created_at": t_40d,
            "updated_at": t_3d,
        },
        # u3: trialing
        {
            "user_id": "u3",
            "subscription_status": "trialing",
            "cancel_at_period_end": False,
            "created_at": t_3d,
            "updated_at": t_3d,
        },
    ]

    # Transactions fixture:
    # - u1: first succeeded paid txn (pro, $4.99) at 3d -> counts in 7d
    # - u2: 1st succeeded paid txn (family, $9.99) at 40d, 2nd paid txn at 3d ($9.99)
    #       -> 2nd paid invoice must NOT double-count; u2's first paid invoice was 40d ago!
    # - u3: failed txn ($4.99) at 10d, $0 invoice at 5d, refunded txn at 3d
    #       -> refunds, failed, and $0 invoices excluded from conversions
    transactions = [
        # u1
        {"id": "tx1", "user_id": "u1", "amount_cents": 499, "status": "succeeded", "tier": "pro", "created_at": t_3d},
        # u2 (first paid invoice at 40d, second at 3d)
        {"id": "tx2_old", "user_id": "u2", "amount_cents": 999, "status": "succeeded", "tier": "family", "created_at": t_40d},
        {"id": "tx2_new", "user_id": "u2", "amount_cents": 999, "status": "succeeded", "tier": "family", "created_at": t_3d},
        # u3 (refunds, failed, $0 invoice)
        {"id": "tx3_failed", "user_id": "u3", "amount_cents": 499, "status": "failed", "tier": "pro", "created_at": t_10d},
        {"id": "tx3_zero", "user_id": "u3", "amount_cents": 0, "status": "succeeded", "tier": "pro", "created_at": (now - timedelta(days=5)).isoformat()},
        {"id": "tx3_refunded", "user_id": "u3", "amount_cents": 499, "status": "refunded", "tier": "pro", "created_at": t_3d},
    ]

    fake_db = FixtureDB(users=users, subscriptions=subscriptions, transactions=transactions)

    with patch("backend.services.admin_service.db_connection", return_value=fake_db):
        res_7d = admin_service.get_funnel_metrics("7d")

    # 1. Signups
    assert res_7d["signups"]["period"] == 1  # only u1 in 7d
    assert res_7d["signups"]["allTime"] == 3

    # 2. Trials
    assert res_7d["trials"]["period"] == 1   # u3 in 7d
    assert res_7d["trials"]["allTime"] == 1

    # 3. Conversions
    # In 7d: ONLY u1 is a first-time paid conversion (pro).
    # u2's second paid invoice at 3d does NOT double count because first was 40d ago.
    # u3's failed, $0, and refunded txns are NOT conversions.
    assert res_7d["paidConversions"]["period"] == 1
    assert res_7d["paidConversions"]["pro"]["period"] == 1
    assert res_7d["paidConversions"]["family"]["period"] == 0

    # All-time conversions: u1 (pro) and u2 (family) = 2 distinct users
    assert res_7d["paidConversions"]["allTime"] == 2
    assert res_7d["paidConversions"]["pro"]["allTime"] == 1
    assert res_7d["paidConversions"]["family"]["allTime"] == 1

    # 4. Churn
    # u2 was canceled 3d ago -> counted as churned
    # u1 has cancel_at_period_end=True but active status -> NOT counted as churn!
    assert res_7d["churned"]["period"] == 1
    assert res_7d["churned"]["allTime"] == 1

    # 5. Cancel scheduled
    # u1 is active with cancel_at_period_end -> counted in cancelScheduled
    assert res_7d["cancelScheduled"]["period"] == 1
    assert res_7d["cancelScheduled"]["allTime"] == 1

    # Verify parameterized SQL was used (every query with a cutoff has %s and params passed)
    for sql, params in fake_db.executed_queries:
        # PP-244: the pre-tracking count filters on a boolean flag, not a cutoff.
        if sql.endswith("WHERE created_at_estimated"):
            continue
        if "WHERE" in sql and ("created_at" in sql or "updated_at" in sql):
            assert "%s" in sql
            assert len(params) > 0


def test_funnel_route_requires_auth_and_admin(client: TestClient, auth_headers: dict[str, str], monkeypatch):
    monkeypatch.delenv("ADMIN_USER_IDS", raising=False)
    monkeypatch.delenv("ADMIN_EMAILS", raising=False)

    # 1. Unauthenticated -> 401
    res_unauth = client.get("/api/admin/funnel?period=7d")
    assert res_unauth.status_code == 401

    # 2. Non-admin user -> 403
    res_forbidden = client.get("/api/admin/funnel?period=7d", headers=auth_headers)
    assert res_forbidden.status_code == 403


def test_funnel_route_validation_and_success(client: TestClient, admin_headers: dict[str, str]):
    # 3. Invalid period -> 422
    res_invalid_period = client.get("/api/admin/funnel?period=365d", headers=admin_headers)
    assert res_invalid_period.status_code == 422

    # 4. Valid admin request -> 200 with funnel data
    fake_db = FixtureDB()
    with patch("backend.services.admin_service.db_connection", return_value=fake_db):
        res_ok = client.get("/api/admin/funnel?period=30d", headers=admin_headers)
        assert res_ok.status_code == 200
        data = res_ok.json()
        assert data["success"] is True
        assert data["data"]["period"] == "30d"
        assert "signups" in data["data"]
        assert "trials" in data["data"]
        assert "paidConversions" in data["data"]
        assert "churned" in data["data"]
        assert "cancelScheduled" in data["data"]

