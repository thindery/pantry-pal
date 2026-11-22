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
