"""PP-125: Admin marketing email visibility metrics and admin route tests."""

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


class EmailFixtureDB:
    def __init__(self, email_sends=None, email_events=None, email_suppressions=None):
        self.email_sends = email_sends or []
        self.email_events = email_events or []
        self.email_suppressions = email_suppressions or []
        self.executed_queries: list[tuple[str, tuple]] = []

    def cursor(self):
        return EmailFixtureCursor(self)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class EmailFixtureCursor:
    def __init__(self, db: EmailFixtureDB):
        self.db = db
        self.last_result = None
        self.last_results = []

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def execute(self, sql: str, params: tuple = ()):
        self.db.executed_queries.append((sql, params))
        clean_sql = " ".join(sql.split())

        # 1. sends_by_template
        if "GROUP BY template" in clean_sql:
            cutoff = params[0]
            counts = {}
            for row in self.db.email_sends:
                if row.get("status") != "backfill" and row.get("created_at") >= cutoff:
                    tmpl = row.get("template")
                    counts[tmpl] = counts.get(tmpl, 0) + 1
            self.last_results = [
                {"template": tmpl, "count": cnt}
                for tmpl, cnt in sorted(counts.items(), key=lambda x: x[1], reverse=True)
            ]

        # 2. sends_by_day
        elif "GROUP BY DATE(created_at)" in clean_sql:
            cutoff = params[0]
            counts = {}
            for row in self.db.email_sends:
                if row.get("status") != "backfill" and row.get("created_at") >= cutoff:
                    day_str = row.get("created_at")[:10]
                    counts[day_str] = counts.get(day_str, 0) + 1
            self.last_results = [
                {"day": day, "count": cnt}
                for day, cnt in sorted(counts.items())
            ]

        # 3. status counts
        elif "GROUP BY status" in clean_sql:
            cutoff = params[0]
            counts = {}
            for row in self.db.email_sends:
                if row.get("status") != "backfill" and row.get("created_at") >= cutoff:
                    st = row.get("status")
                    counts[st] = counts.get(st, 0) + 1
            self.last_results = [{"status": st, "count": cnt} for st, cnt in counts.items()]

        # 4. Check email_events limit 1
        elif "SELECT 1 FROM email_events LIMIT 1" in clean_sql:
            self.last_result = {"?column?": 1} if len(self.db.email_events) > 0 else None

        # 5. Check email_sends delivered/bounced/complained limit 1
        elif "FROM email_sends WHERE status IN ('delivered', 'bounced', 'complained') LIMIT 1" in clean_sql:
            found = any(r.get("status") in ("delivered", "bounced", "complained") for r in self.db.email_sends)
            self.last_result = {"?column?": 1} if found else None

        # 6. Rates query
        elif "COALESCE(SUM(CASE WHEN status = 'delivered'" in clean_sql:
            cutoff = params[0]
            valid_rows = [
                r for r in self.db.email_sends
                if r.get("status") in ("sent", "delivered", "bounced", "complained")
                and r.get("created_at") >= cutoff
            ]
            tot = len(valid_rows)
            deliv = sum(1 for r in valid_rows if r.get("status") == "delivered")
            bounc = sum(1 for r in valid_rows if r.get("status") == "bounced")
            compl = sum(1 for r in valid_rows if r.get("status") == "complained")
            self.last_result = {
                "total_sent": tot,
                "delivered": deliv,
                "bounced": bounc,
                "complained": compl,
            }

        # 7. Recent failures (limit 20)
        elif "WHERE status = 'failed'" in clean_sql:
            failed_rows = [
                r for r in self.db.email_sends if r.get("status") == "failed"
            ]
            failed_rows.sort(key=lambda r: r["created_at"], reverse=True)
            self.last_results = [
                {
                    "created_at": r["created_at"],
                    "template": r["template"],
                    "to_email": r["to_email"],
                    "error_message": r["error_message"],
                }
                for r in failed_rows[:20]
            ]

        # 8. Suppressions count
        elif clean_sql == "SELECT COUNT(*) AS count FROM email_suppressions":
            self.last_result = {"count": len(self.db.email_suppressions)}

        # 9. Suppressions items
        elif "FROM email_suppressions ORDER BY created_at DESC LIMIT 20" in clean_sql:
            items = list(self.db.email_suppressions)
            items.sort(key=lambda r: r["created_at"], reverse=True)
            self.last_results = [
                {
                    "email": r["email"],
                    "reason": r["reason"],
                    "created_at": r["created_at"],
                }
                for r in items[:20]
            ]

        # 10. Recent sends (limit 50)
        elif "FROM email_sends WHERE status <> 'backfill' ORDER BY created_at DESC LIMIT 50" in clean_sql:
            sends = [r for r in self.db.email_sends if r.get("status") != "backfill"]
            sends.sort(key=lambda r: r["created_at"], reverse=True)
            self.last_results = [
                {
                    "created_at": r["created_at"],
                    "to_email": r["to_email"],
                    "template": r["template"],
                    "subject": r.get("subject", ""),
                    "status": r["status"],
                    "resend_id": r.get("resend_id"),
                }
                for r in sends[:50]
            ]

    def fetchone(self):
        return self.last_result

    def fetchall(self):
        return self.last_results


def test_email_metrics_service_rates_null_without_webhook(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "fake-resend-key-for-test")
    monkeypatch.setenv("RESEND_WEBHOOK_SECRET", "fake-webhook-value-for-test")
    monkeypatch.setenv("RESEND_FROM_EMAIL", "Pantry Hub <notifications@mypantryhub.com>")

    now = datetime.now(timezone.utc)
    t_2d = (now - timedelta(days=2)).isoformat()

    sends = [
        {
            "id": "s1",
            "to_email": "tylor@example.com",
            "template": "welcome",
            "subject": "Welcome!",
            "status": "sent",
            "resend_id": "res_111",
            "created_at": t_2d,
            "error_message": None,
        },
        {
            "id": "s2",
            "to_email": "fail@example.com",
            "template": "payment_receipt",
            "subject": "Receipt",
            "status": "failed",
            "resend_id": None,
            "created_at": t_2d,
            "error_message": "SMTP error",
        },
        {
            "id": "s_bf",
            "to_email": "bf@example.com",
            "template": "welcome",
            "subject": None,
            "status": "backfill",
            "resend_id": None,
            "created_at": t_2d,
            "error_message": None,
        },
    ]

    fake_db = EmailFixtureDB(email_sends=sends, email_events=[], email_suppressions=[])

    with patch("backend.services.admin_service.db_connection", return_value=fake_db):
        metrics = admin_service.get_email_metrics("7d")

    # Rates must be null and reason must be "pending webhook"
    assert metrics["rates"] is None
    assert metrics["rates_reason"] == "pending webhook"

    # Config values must NOT leak secrets
    assert metrics["config"]["resend_configured"] is True
    assert metrics["config"]["webhook_secret_present"] is True
    assert metrics["config"]["from_address"] == "Pantry Hub <notifications@mypantryhub.com>"
    assert "fake-resend-key-for-test" not in str(metrics)
    assert "fake-webhook-value-for-test" not in str(metrics)

    # Backfill excluded from sends_by_template
    templates = {item["template"]: item["count"] for item in metrics["sends_by_template"]}
    assert templates.get("welcome") == 1
    assert templates.get("payment_receipt") == 1
    assert "backfill" not in templates

    # Masking check
    assert metrics["recent_failures"][0]["to_email"] == "f***@example.com"
    assert "fail@example.com" not in str(metrics["recent_failures"])
    assert metrics["recent_sends"][0]["to_email"] in ("t***@example.com", "f***@example.com")


def test_email_metrics_service_rates_with_webhook_rows():
    now = datetime.now(timezone.utc)
    t_1d = (now - timedelta(days=1)).isoformat()

    sends = [
        {
            "id": "s1",
            "to_email": "user1@example.com",
            "template": "welcome",
            "subject": "Welcome!",
            "status": "delivered",
            "resend_id": "res_1",
            "created_at": t_1d,
            "error_message": None,
        },
        {
            "id": "s2",
            "to_email": "user2@example.com",
            "template": "welcome",
            "subject": "Welcome!",
            "status": "bounced",
            "resend_id": "res_2",
            "created_at": t_1d,
            "error_message": None,
        },
    ]
    events = [{"id": "ev1", "resend_id": "res_1", "event_type": "email.delivered"}]
    suppressions = [
        {"email": "bounced@example.com", "reason": "bounced", "created_at": t_1d}
    ]

    fake_db = EmailFixtureDB(email_sends=sends, email_events=events, email_suppressions=suppressions)

    with patch("backend.services.admin_service.db_connection", return_value=fake_db):
        metrics = admin_service.get_email_metrics("7d")

    assert metrics["rates"] is not None
    assert metrics["rates_reason"] is None
    assert metrics["rates"]["total_sent"] == 2
    assert metrics["rates"]["delivered"] == 0.5
    assert metrics["rates"]["bounced"] == 0.5
    assert metrics["rates"]["complained"] == 0.0

    assert metrics["suppressions"]["count"] == 1
    assert metrics["suppressions"]["items"][0]["email"] == "b***@example.com"


def test_email_metrics_route_permissions_and_validation(client: TestClient, auth_headers: dict[str, str], admin_headers: dict[str, str], monkeypatch):
    # 1. Unauthenticated -> 401
    res_unauth = client.get("/api/admin/email-metrics?period=7d")
    assert res_unauth.status_code == 401

    # 2. Non-admin user -> 403
    monkeypatch.delenv("ADMIN_USER_IDS", raising=False)
    monkeypatch.delenv("ADMIN_EMAILS", raising=False)
    res_forbidden = client.get("/api/admin/email-metrics?period=7d", headers=auth_headers)
    assert res_forbidden.status_code == 403

    # Re-enable admin for next checks
    monkeypatch.setenv("ADMIN_USER_IDS", admin_headers["x-user-id"])

    # 3. Invalid period -> 422
    res_invalid = client.get("/api/admin/email-metrics?period=365d", headers=admin_headers)
    assert res_invalid.status_code == 422
    assert res_invalid.status_code == 422

    # 4. Valid admin -> 200 with no secrets
    monkeypatch.setenv("RESEND_API_KEY", "super_secret_resend_key_9999")
    monkeypatch.setenv("RESEND_WEBHOOK_SECRET", "super_secret_webhook_secret_8888")

    fake_db = EmailFixtureDB()
    with patch("backend.services.admin_service.db_connection", return_value=fake_db):
        res_ok = client.get("/api/admin/email-metrics?period=30d", headers=admin_headers)
        assert res_ok.status_code == 200
        raw_text = res_ok.text
        assert "super_secret_resend_key_9999" not in raw_text
        assert "super_secret_webhook_secret_8888" not in raw_text

        data = res_ok.json()
        assert data["success"] is True
        assert data["data"]["config"]["resend_configured"] is True
        assert data["data"]["config"]["webhook_secret_present"] is True
        assert "recent_sends" in data["data"]
        assert "suppressions" in data["data"]
