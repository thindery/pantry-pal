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
