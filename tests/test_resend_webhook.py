"""Tests for Resend webhook signature verification, idempotency, and suppressions (PP-124)."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any, Optional
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from backend.services import email_service, resend_webhook

FAKE_SECRET = "whsec_" + base64.b64encode(b"12345678901234567890123456789012").decode("utf-8")


def _generate_svix_headers(
    payload: bytes,
    secret: str = FAKE_SECRET,
    msg_id: str = "msg_test_123",
    timestamp: Optional[int] = None,
) -> dict[str, str]:
    if timestamp is None:
        timestamp = int(time.time())
    raw_b64 = secret[len("whsec_"):] if secret.startswith("whsec_") else secret
    key_bytes = base64.b64decode(raw_b64)
    to_sign = f"{msg_id}.{timestamp}.".encode("utf-8") + payload
    sig = base64.b64encode(hmac.new(key_bytes, to_sign, hashlib.sha256).digest()).decode("utf-8")
    return {
        "svix-id": msg_id,
        "svix-timestamp": str(timestamp),
        "svix-signature": f"v1,{sig}",
    }


def test_missing_secret_returns_503(monkeypatch, client: TestClient):
    monkeypatch.delenv("RESEND_WEBHOOK_SECRET", raising=False)
    payload = b'{"type":"email.delivered"}'
    response = client.post(
        "/api/webhooks/resend",
        content=payload,
        headers={"svix-id": "id1", "svix-timestamp": "123", "svix-signature": "v1,abc"},
    )
    assert response.status_code == 503
    assert response.json()["detail"]["received"] is False


def test_bad_signature_returns_400_and_writes_nothing(monkeypatch, client: TestClient):
    monkeypatch.setenv("RESEND_WEBHOOK_SECRET", FAKE_SECRET)
    payload = b'{"type":"email.delivered"}'
    headers = {
        "svix-id": "msg_bad",
        "svix-timestamp": str(int(time.time())),
        "svix-signature": "v1,badsignature==",
    }
    with patch("backend.services.resend_webhook.db_connection") as mock_db:
        response = client.post("/api/webhooks/resend", content=payload, headers=headers)
        assert response.status_code == 400
        assert response.json()["detail"]["received"] is False
        # Nothing should be written to the database
        mock_db.assert_not_called()


def test_stale_timestamp_returns_400(monkeypatch, client: TestClient):
    monkeypatch.setenv("RESEND_WEBHOOK_SECRET", FAKE_SECRET)
    payload = b'{"type":"email.delivered"}'
    # Timestamp from 10 minutes ago (> 300 seconds)
    stale_ts = int(time.time()) - 600
    headers = _generate_svix_headers(payload, secret=FAKE_SECRET, msg_id="msg_stale", timestamp=stale_ts)

    with patch("backend.services.resend_webhook.db_connection") as mock_db:
        response = client.post("/api/webhooks/resend", content=payload, headers=headers)
        assert response.status_code == 400
        assert response.json()["detail"]["received"] is False
        mock_db.assert_not_called()


def test_valid_signature_processed_once_and_replay_is_noop_200(monkeypatch, client: TestClient):
    monkeypatch.setenv("RESEND_WEBHOOK_SECRET", FAKE_SECRET)
    event_data = {
        "type": "email.delivered",
        "created_at": "2026-11-25T00:00:00.000Z",
        "data": {
            "email_id": "resend_msg_001",
            "to": ["user@example.com"],
            "subject": "Welcome",
        },
    }
    payload = json.dumps(event_data).encode("utf-8")
    headers = _generate_svix_headers(payload, secret=FAKE_SECRET, msg_id="svix_evt_001")

    call_count = 0

    class MockCursor:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def execute(self, query, params=None):
            pass

        def fetchone(self):
            nonlocal call_count
            # First call is SELECT from email_sends (returns matching send row)
            # Second call is INSERT into email_events
            # For first run: inserted = {'id': 'svix_evt_001'}
            # For second run (replay): inserted = None
            if call_count == 0:
                # First run - SELECT email_sends
                call_count += 1
                return {"id": "send-1", "status": "sent", "opened_at": None, "clicked_at": None, "to_email": "user@example.com"}
            elif call_count == 1:
                # First run - INSERT email_events
                call_count += 1
                return {"id": "svix_evt_001"}
            elif call_count == 2:
                # Second run (replay) - SELECT email_sends
                call_count += 1
                return {"id": "send-1", "status": "delivered", "opened_at": None, "clicked_at": None, "to_email": "user@example.com"}
            else:
                # Second run (replay) - INSERT email_events conflict -> returns None
                return None

    class MockConn:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def cursor(self):
            return MockCursor()

    with patch("backend.services.resend_webhook.db_connection", return_value=MockConn()):
        # First attempt: processed successfully
        res1 = client.post("/api/webhooks/resend", content=payload, headers=headers)
        assert res1.status_code == 200
        assert res1.json()["received"] is True

        # Replay attempt: same svix-id -> no-op 200
        res2 = client.post("/api/webhooks/resend", content=payload, headers=headers)
        assert res2.status_code == 200
        assert res2.json()["received"] is True


def test_delivered_does_not_overwrite_bounced():
    executed_queries = []

    class MockCursor:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def execute(self, query, params=None):
            executed_queries.append((query.strip(), params))

        def fetchone(self):
            # Return matching email_sends row with status='bounced'
            if executed_queries and "SELECT id" in executed_queries[-1][0]:
                return {"id": "send-bounced-1", "status": "bounced", "opened_at": None, "clicked_at": None, "to_email": "bounced@example.com"}
            # Return new email_events id
            return {"id": "evt-delivered-1"}

    class MockConn:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def cursor(self):
            return MockCursor()

    event = {
        "type": "email.delivered",
        "created_at": "2026-11-25T00:00:00.000Z",
        "data": {
            "email_id": "resend_msg_bounced",
            "to": ["bounced@example.com"],
        },
    }

    with patch("backend.services.resend_webhook.db_connection", return_value=MockConn()):
        result = resend_webhook.process_event(event, event_id="evt-delivered-1")

    assert result["duplicate"] is False
    # Verify the UPDATE query explicitly guards against overwriting bounced or complained
    update_call = next((q, p) for q, p in executed_queries if "UPDATE email_sends" in q and "SET status = 'delivered'" in q)
    assert "status NOT IN ('bounced', 'complained')" in update_call[0]
    assert update_call[1] == ("send-bounced-1",)


def test_complaint_creates_suppression():
    executed_queries = []

    class MockCursor:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def execute(self, query, params=None):
            executed_queries.append((query.strip(), params))

        def fetchone(self):
            if executed_queries and "SELECT id" in executed_queries[-1][0]:
                return {"id": "send-complaint-1", "status": "sent", "opened_at": None, "clicked_at": None, "to_email": "victim@example.com"}
            return {"id": "evt-complained-1"}

    class MockConn:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def cursor(self):
            return MockCursor()

    event = {
        "type": "email.complained",
        "created_at": "2026-11-25T00:00:00.000Z",
        "data": {
            "email_id": "resend_msg_complaint",
            "to": ["Victim@Example.Com"],
            "subject": "Spam complaint test",
        },
    }

    with patch("backend.services.resend_webhook.db_connection", return_value=MockConn()):
        result = resend_webhook.process_event(event, event_id="evt-complained-1")

    assert result["duplicate"] is False

    # Check status updated to complained
    update_send = next((q, p) for q, p in executed_queries if "UPDATE email_sends" in q and "SET status = 'complained'" in q)
    assert update_send[1] == ("send-complaint-1",)

    # Check email_suppressions upsert with reason='complained' and lowercased email
    suppress_call = next((q, p) for q, p in executed_queries if "INSERT INTO email_suppressions" in q)
    assert "reason" in suppress_call[0]
    assert suppress_call[1] == ("victim@example.com", "evt-complained-1")


def test_permanent_bounce_creates_suppression_and_transient_does_not():
    executed_queries = []

    class MockCursor:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def execute(self, query, params=None):
            executed_queries.append((query.strip(), params))

        def fetchone(self):
            return {"id": "send-1"}

    class MockConn:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def cursor(self):
            return MockCursor()

    # 1. Transient bounce: updates status to bounced, but does NOT insert suppression
    transient_event = {
        "type": "email.bounced",
        "data": {
            "email_id": "resend_transient",
            "to": ["mailboxfull@example.com"],
            "bounce_type": "Transient",
        },
    }
    with patch("backend.services.resend_webhook.db_connection", return_value=MockConn()):
        resend_webhook.process_event(transient_event, event_id="evt-transient-1")
    assert not any("INSERT INTO email_suppressions" in q for q, _ in executed_queries)

    # 2. Hard / Permanent bounce: updates status AND inserts suppression
    executed_queries.clear()
    hard_event = {
        "type": "email.bounced",
        "data": {
            "email_id": "resend_hard",
            "to": ["doesnotexist@example.com"],
            "bounce_type": "Permanent",
        },
    }
    with patch("backend.services.resend_webhook.db_connection", return_value=MockConn()):
        resend_webhook.process_event(hard_event, event_id="evt-hard-1")
    assert any("INSERT INTO email_suppressions" in q for q, _ in executed_queries)


def test_suppressed_recipient_skips_welcome_but_sends_payment_confirmation(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    monkeypatch.setenv("RESEND_FROM_EMAIL", "Pantry Hub <noreply@mypantryhub.com>")

    fake_resend = type(
        "R",
        (),
        {
            "api_key": None,
            "Emails": type("E", (), {"send": staticmethod(lambda p: {"id": "re_payment_ok"})}),
        },
    )

    class MockCursor:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def execute(self, query, params=None):
            pass

        def fetchone(self):
            return {"id": "claim-id"}

    class MockConn:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def cursor(self):
            return MockCursor()

    with patch("backend.services.email_service.is_suppressed", return_value=True), patch(
        "backend.services.email_service.already_sent", return_value=False
    ), patch("backend.services.email_service.db_connection", return_value=MockConn()), patch.dict(
        "sys.modules", {"resend": fake_resend}
    ):
        # 1. Welcome (non-billing) should be skipped with reason 'suppressed'
        welcome_result = email_service.send_welcome("user-1", "complainer@example.com", "Complainer")
        assert welcome_result["skipped"] is True
        assert welcome_result["reason"] == "suppressed"

        # 2. Payment confirmation (billing-critical) must still send
        payment_result = email_service.send_payment_confirmation(
            user_id="user-1",
            email="complainer@example.com",
            invoice_id="in_suppressed_user",
            tier="pro",
            amount_cents=499,
        )
        assert payment_result["skipped"] is False
        assert payment_result["id"] == "re_payment_ok"
