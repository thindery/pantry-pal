"""PP-096–PP-100: Resend helper no-ops without keys and is idempotent."""

from __future__ import annotations

from unittest.mock import patch

from backend.services import email_service


def test_send_skips_when_resend_is_not_configured(monkeypatch):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.delenv("RESEND_FROM_EMAIL", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")
    with patch("backend.services.email_service.already_sent", return_value=False), patch(
        "backend.services.email_service._record_send"
    ) as mock_record:
        result = email_service.send_email(
            to="tylor@example.com",
            subject="Test",
            html="<p>Hi</p>",
            text="Hi",
            template="welcome",
            idempotency_key="welcome:user-1",
            user_id="user-1",
        )
    assert result["skipped"] is True
    assert result["reason"] == "not_configured"
    mock_record.assert_not_called()


def test_send_is_idempotent_per_key(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    monkeypatch.setenv("RESEND_FROM_EMAIL", "Pantry Hub <noreply@mypantryhub.com>")
    with patch("backend.services.email_service.already_sent", return_value=True), patch(
        "backend.services.email_service._record_send"
    ) as mock_record:
        result = email_service.send_payment_confirmation(
            user_id="user-1",
            email="tylor@example.com",
            invoice_id="in_1",
            tier="pro",
            amount_cents=499,
        )
    assert result == {"skipped": True, "reason": "already_sent"}
    mock_record.assert_not_called()


def test_send_calls_resend_when_configured(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    monkeypatch.setenv("RESEND_FROM_EMAIL", "Pantry Hub <noreply@mypantryhub.com>")
    fake_resend = type("R", (), {"api_key": None, "Emails": type("E", (), {"send": staticmethod(lambda payload: {"id": "msg_1"})})})
    with patch("backend.services.email_service.already_sent", return_value=False), patch(
        "backend.services.email_service._record_send",
        return_value=True,
    ), patch("backend.services.email_service.db_connection") as mock_db, patch.dict(
        "sys.modules", {"resend": fake_resend}
    ):
        mock_db.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = type(
            "C",
            (),
            {"execute": lambda *a, **k: None, "fetchone": lambda *a, **k: None},
        )()
        result = email_service.send_welcome("user-1", "tylor@example.com", "Tylor")
    assert result.get("skipped") is False
    assert result.get("id") == "msg_1"


def _rendered_welcome():
    # Patch send_email to capture html/text without hitting Resend or the DB.
    captured = {}

    def fake_send_email(**kwargs):
        captured.update(kwargs)
        return {"skipped": False, "id": "preview"}

    with patch("backend.services.email_service.send_email", side_effect=fake_send_email):
        email_service.send_welcome("user-1", "tylor@example.com", "Tylor")
    return captured


def _rendered_payment(tier="pro", amount_cents=499, is_free_invoice=False):
    captured = {}

    def fake_send_email(**kwargs):
        captured.update(kwargs)
        return {"skipped": False, "id": "preview"}

    with patch("backend.services.email_service.send_email", side_effect=fake_send_email):
        email_service.send_payment_confirmation(
            user_id="user-1",
            email="tylor@example.com",
            invoice_id="in_test",
            tier=tier,
            amount_cents=amount_cents,
            period_end="2026-12-21T23:04:21+00:00",
            is_free_invoice=is_free_invoice,
        )
    return captured


def _rendered_cancellation_scheduled(period_end="2026-12-21T23:04:21+00:00", tier=None):
    captured = {}

    def fake_send_email(**kwargs):
        captured.update(kwargs)
        return {"skipped": False, "id": "preview"}

    with patch("backend.services.email_service.send_email", side_effect=fake_send_email):
        email_service.send_cancellation_scheduled(
            user_id="user-1",
            email="tylor@example.com",
            subscription_id="sub_test_123",
            period_end=period_end,
            tier=tier,
        )
    return captured


def _rendered_subscription_ended():
    captured = {}

    def fake_send_email(**kwargs):
        captured.update(kwargs)
        return {"skipped": False, "id": "preview"}

    with patch("backend.services.email_service.send_email", side_effect=fake_send_email):
        email_service.send_subscription_ended(
            user_id="user-1",
            email="tylor@example.com",
            subscription_id="sub_test_456",
        )
    return captured


def test_branded_layout_includes_wordmark_and_hello_contact():
    captured = _rendered_welcome()
    html = captured["html"]
    text = captured["text"]
    assert "Pantry Hub" in html
    assert 'name="color-scheme" content="light dark"' in html
    assert "hello@mypantryhub.com" in html
    assert "hello@mypantryhub.com" in text
    assert "info@mypantryhub.com" not in html
    assert "Open your pantry" in html
    assert "www.mypantryhub.com/dashboard/" in html


def test_welcome_includes_first_scan_tips():
    captured = _rendered_welcome()
    assert "Quick Scan" in captured["html"]
    assert "5 AI receipt scans per month" in captured["html"]
    assert "Welcome to Pantry Hub — scan your first item" == captured["subject"]
    assert "Quick Scan" in captured["text"]


def test_payment_confirmation_lists_pricing_page_pro_features_only():
    captured = _rendered_payment(tier="pro", amount_cents=499)
    html = captured["html"]
    for feature in email_service.PRO_FEATURES:
        assert feature in html
        assert feature in captured["text"]
    assert "Household sharing" not in html  # Family-only on the pricing page
    assert "join" not in html.lower() or "joining" not in captured["subject"].lower()
    assert "testimonial" not in html.lower()
    assert "rated" not in html.lower()
    assert "4.99 USD" in html
    assert "December 21, 2026" in html
    assert "Go to your pantry" in html
    assert "manage billing" in html


def test_payment_confirmation_zero_dollar_uses_active_wording():
    captured = _rendered_payment(tier="pro", amount_cents=0, is_free_invoice=True)
    assert captured["subject"] == "Your Pantry Hub Pro plan is active"
    assert "now active" in captured["html"]


def test_payment_failed_has_single_update_card_cta():
    captured = {}

    def fake_send_email(**kwargs):
        captured.update(kwargs)
        return {"skipped": False, "id": "preview"}

    with patch("backend.services.email_service.send_email", side_effect=fake_send_email):
        email_service.send_payment_failed(
            user_id="user-1",
            email="tylor@example.com",
            invoice_id="in_fail",
            amount_cents=499,
        )
    assert "Action needed" in captured["html"]
    assert "Update payment method" in captured["html"]
    assert "hello@mypantryhub.com" in captured["html"]
    assert "card_declined" not in captured["html"]


def test_cancellation_scheduled_renders_branded_shell_and_keep_my_plan_cta():
    captured = _rendered_cancellation_scheduled(period_end="2026-12-21T23:04:21+00:00")
    html = captured["html"]
    text = captured["text"]

    # Branded shell assertions (PP-131)
    assert "Pantry Hub" in html
    assert 'name="color-scheme" content="light dark"' in html
    assert "hello@mypantryhub.com" in html
    assert "hello@mypantryhub.com" in text
    assert "info@mypantryhub.com" not in html

    # Subject and honest copy assertions
    assert captured["subject"] == "Your Pantry Hub cancellation is scheduled"
    assert "December 21, 2026" in html
    assert "December 21, 2026" in text
    # Tier unknown -> no guessed plan name.
    assert "Your access continues through December 21, 2026" in html
    assert "Your access continues through December 21, 2026" in text
    assert "Pro access" not in html

    # Primary CTA and URL assertions
    assert "Keep my plan" in html
    assert "Keep my plan" in text
    assert "/dashboard/account/" in html
    assert "/dashboard/account/" in text

    # Idempotency and template assertions
    assert captured["idempotency_key"] == "cancel.scheduled:sub_test_123"
    assert captured["template"] == "cancellation_scheduled"

    # No guilt copy or fake social proof
    assert "we're sorry to see you go" not in html.lower()
    assert "testimonial" not in html.lower()
    assert "rated" not in html.lower()


def test_cancellation_scheduled_unknown_period_end():
    captured = _rendered_cancellation_scheduled(period_end=None)
    html = captured["html"]
    text = captured["text"]

    assert "until the end of your current billing period" in html
    assert "until the end of your current billing period" in text
    assert "Keep my plan" in html
    assert "/dashboard/account/" in html


def test_cancellation_scheduled_family_tier():
    captured = _rendered_cancellation_scheduled(period_end="2026-12-21T23:04:21+00:00", tier="family")
    html = captured["html"]
    text = captured["text"]

    assert "Your Family access continues through December 21, 2026" in html
    assert "Your Family access continues through December 21, 2026" in text
    assert "Keep my plan" in html
    assert "/dashboard/account/" in html


def test_subscription_ended_renders_branded_shell_and_free_limits():
    captured = _rendered_subscription_ended()
    html = captured["html"]
    text = captured["text"]

    # Branded shell assertions (PP-131)
    assert "Pantry Hub" in html
    assert 'name="color-scheme" content="light dark"' in html
    assert "hello@mypantryhub.com" in html
    assert "hello@mypantryhub.com" in text
    assert "info@mypantryhub.com" not in html

    # Subject and honest status notice
    assert captured["subject"] == "Your Pantry Hub subscription has ended"
    assert "You're now on the Free plan" in html
    assert "You're now on the Free plan" in text

    # List ONLY Free limits from the pricing page (PricingPage.tsx)
    for feature in email_service.FREE_FEATURES:
        assert feature in html
        assert feature in text

    # Ensure paid-only features are NOT included
    assert "Unlimited pantry items" not in html
    assert "Cloud sync across devices" not in html
    assert "Household sharing" not in html

    # CTA and URL assertions
    assert "Resubscribe" in html
    assert "Resubscribe" in text
    assert "/pricing/" in html
    assert "/pricing/" in text

    # Idempotency and template assertions
    assert captured["idempotency_key"] == "cancel.ended:sub_test_456"
    assert captured["template"] == "subscription_ended"


def test_cancellation_and_ended_idempotency_keys_unchanged():
    captured_sched = _rendered_cancellation_scheduled(period_end="2026-12-21T23:04:21+00:00")
    captured_ended = _rendered_subscription_ended()

    assert captured_sched["idempotency_key"].startswith("cancel.scheduled:")
    assert captured_ended["idempotency_key"].startswith("cancel.ended:")


def test_send_success_writes_sent_and_resend_id(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    monkeypatch.setenv("RESEND_FROM_EMAIL", "Pantry Hub <noreply@mypantryhub.com>")
    fake_resend = type("R", (), {"api_key": None, "Emails": type("E", (), {"send": staticmethod(lambda payload: {"id": "re_msg_123"})})})

    executed_queries = []

    class MockCursor:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def execute(self, query, params=None):
            executed_queries.append((query.strip(), params))

        def fetchone(self):
            last_q = executed_queries[-1][0] if executed_queries else ""
            if "email_suppressions" in last_q:
                return None
            return {"id": "new-claim-id"}

    class MockConn:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def cursor(self):
            return MockCursor()

    with patch("backend.services.email_service.already_sent", return_value=False), patch(
        "backend.services.email_service.db_connection", return_value=MockConn()
    ), patch.dict("sys.modules", {"resend": fake_resend}):
        result = email_service.send_email(
            to="user@example.com",
            subject="Welcome!",
            html="<p>Hi</p>",
            text="Hi",
            template="welcome",
            idempotency_key="welcome:user-1",
            user_id="user-1",
        )

    assert result == {"skipped": False, "id": "re_msg_123"}
    # Verify insert pending claim was executed with recipient, subject, and status 'pending'
    insert_call = next((q, p) for q, p in executed_queries if "INSERT INTO email_sends" in q)
    assert "status" in insert_call[0]
    assert insert_call[1][1] == "user-1"
    assert insert_call[1][2] == "welcome"
    assert insert_call[1][3] == "welcome:user-1"
    assert insert_call[1][5] == "user@example.com"
    assert insert_call[1][6] == "Welcome!"
    assert insert_call[1][7] == "pending"

    # Verify update on success sets status='sent', resend_id, and updated_at
    update_call = next((q, p) for q, p in executed_queries if "UPDATE email_sends" in q and "SET status = 'sent'" in q)
    assert update_call[1] == ("re_msg_123", "welcome:user-1")


def test_send_failure_leaves_failed_row_with_error_and_does_not_delete(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_secret_key_12345")
    monkeypatch.setenv("RESEND_FROM_EMAIL", "Pantry Hub <noreply@mypantryhub.com>")

    def failing_send(payload):
        raise RuntimeError("Resend error with sensitive re_secret_key_12345: " + ("x" * 600))

    fake_resend = type("R", (), {"api_key": None, "Emails": type("E", (), {"send": staticmethod(failing_send)})})

    executed_queries = []

    class MockCursor:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def execute(self, query, params=None):
            executed_queries.append((query.strip(), params))

        def fetchone(self):
            return {"id": "claim-id"}

    class MockConn:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def cursor(self):
            return MockCursor()

    with patch("backend.services.email_service.already_sent", return_value=False), patch(
        "backend.services.email_service.db_connection", return_value=MockConn()
    ), patch.dict("sys.modules", {"resend": fake_resend}):
        result = email_service.send_email(
            to="user@example.com",
            subject="Test Fail",
            html="<p>Sensitive body</p>",
            text="Sensitive body",
            template="payment_failed",
            idempotency_key="invoice.failed:in_123",
            user_id="user-1",
        )

    assert result == {"skipped": True, "reason": "send_failed"}
    # Assert NO DELETE query occurred
    assert not any("DELETE" in q for q, _ in executed_queries)
    # Assert UPDATE status = 'failed' occurred
    failed_update = next((q, p) for q, p in executed_queries if "SET status = 'failed'" in q)
    err_stored = failed_update[1][0]
    assert len(err_stored) <= 500
    assert "re_secret_key_12345" not in err_stored
    assert "[REDACTED]" in err_stored
    assert "Sensitive body" not in err_stored
    assert failed_update[1][1] == "invoice.failed:in_123"


def test_already_sent_skips_successful_key(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    monkeypatch.setenv("RESEND_FROM_EMAIL", "Pantry Hub <noreply@mypantryhub.com>")

    executed_queries = []

    class MockCursor:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def execute(self, query, params=None):
            executed_queries.append((query.strip(), params))

        def fetchone(self):
            return {"?column?": 1}

    class MockConn:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def cursor(self):
            return MockCursor()

    with patch("backend.services.email_service.db_connection", return_value=MockConn()):
        assert email_service.already_sent("welcome:user-1") is True
        query_executed, params = executed_queries[0]
        assert "WHERE idempotency_key = %s" in query_executed
        assert "status != 'failed'" in query_executed
        assert params == ("welcome:user-1",)

        # send_email with an already sent key skips before touching Resend or _record_send
        result = email_service.send_email(
            to="user@example.com",
            subject="Welcome!",
            html="<p>Hi</p>",
            text="Hi",
            template="welcome",
            idempotency_key="welcome:user-1",
        )
        assert result == {"skipped": True, "reason": "already_sent"}


def test_retry_after_failure_works_and_does_not_duplicate(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    monkeypatch.setenv("RESEND_FROM_EMAIL", "Pantry Hub <noreply@mypantryhub.com>")
    fake_resend = type("R", (), {"api_key": None, "Emails": type("E", (), {"send": staticmethod(lambda payload: {"id": "re_retry_ok"})})})

    executed_queries = []

    class MockCursor:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def execute(self, query, params=None):
            executed_queries.append((query.strip(), params))

        def fetchone(self):
            last_q = executed_queries[-1][0]
            if "SELECT 1 FROM email_sends" in last_q:
                return None
            if "INSERT INTO email_sends" in last_q:
                return {"id": "existing-claimed-id"}
            return None

    class MockConn:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def cursor(self):
            return MockCursor()

    with patch("backend.services.email_service.db_connection", return_value=MockConn()), patch.dict(
        "sys.modules", {"resend": fake_resend}
    ):
        result = email_service.send_email(
            to="user@example.com",
            subject="Welcome!",
            html="<p>Hi</p>",
            text="Hi",
            template="welcome",
            idempotency_key="welcome:retry-user",
            user_id="retry-user",
        )

    assert result == {"skipped": False, "id": "re_retry_ok"}
    # Check that _record_send attempted to re-claim failed row via ON CONFLICT ... WHERE email_sends.status = 'failed'
    insert_call = next((q, p) for q, p in executed_queries if "INSERT INTO email_sends" in q)
    assert "ON CONFLICT (idempotency_key) DO UPDATE" in insert_call[0]
    assert "WHERE email_sends.status = 'failed'" in insert_call[0]
    assert "SET status = EXCLUDED.status" in insert_call[0]
    # And then set status = 'sent'
    update_call = next((q, p) for q, p in executed_queries if "SET status = 'sent'" in q)
    assert update_call[1] == ("re_retry_ok", "welcome:retry-user")


def test_backfill_rows_excluded_from_counts_and_block_welcome(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    monkeypatch.setenv("RESEND_FROM_EMAIL", "Pantry Hub <noreply@mypantryhub.com>")

    executed_queries = []

    class MockCursor:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def execute(self, query, params=None):
            executed_queries.append((query.strip(), params))

        def fetchone(self):
            last_q = executed_queries[-1][0]
            if "SELECT 1 FROM email_sends" in last_q:
                return {"?column?": 1}
            if "SELECT COUNT(*)" in last_q:
                return {"cnt": 5}
            return None

    class MockConn:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def cursor(self):
            return MockCursor()

    with patch("backend.services.email_service.db_connection", return_value=MockConn()):
        # 1. Backfill row blocks welcome email
        result = email_service.send_welcome("legacy-user-1", "legacy@example.com", "Legacy")
        assert result == {"skipped": True, "reason": "already_sent"}

        # 2. count_sent excludes backfill rows
        count = email_service.count_sent()
        assert count == 5
        count_query, params = executed_queries[-1]
        assert "status <> 'backfill'" in count_query

        # Also test with filters
        count_sent_filtered = email_service.count_sent(template="welcome", user_id="user-1", status="sent")
        assert count_sent_filtered == 5
        filtered_query, filtered_params = executed_queries[-1]
        assert "status <> 'backfill'" in filtered_query
        assert "status = %s" in filtered_query
        assert "template = %s" in filtered_query
        assert "user_id = %s" in filtered_query
        assert filtered_params == ("sent", "welcome", "user-1")


def test_is_suppressed_and_mask_email():
    executed_queries = []

    class MockCursor:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def execute(self, query, params=None):
            executed_queries.append((query.strip(), params))

        def fetchone(self):
            last_p = executed_queries[-1][1]
            if last_p == ("suppressed@example.com",):
                return {"?column?": 1}
            return None

    class MockConn:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def cursor(self):
            return MockCursor()

    with patch("backend.services.email_service.db_connection", return_value=MockConn()):
        assert email_service.is_suppressed("suppressed@example.com") is True
        assert email_service.is_suppressed("clean@example.com") is False
        assert email_service.is_suppressed("") is False

    assert email_service._mask_email("user@example.com") == "u***r@example.com"
    assert email_service._mask_email("ab@example.com") == "a***@example.com"
    assert email_service._mask_email(None) == "[EMPTY]"


def test_cancellation_scheduled_pro_tier_named():
    captured = _rendered_cancellation_scheduled(tier="pro")
    assert "Your Pro access continues through December 21, 2026" in captured["text"]
