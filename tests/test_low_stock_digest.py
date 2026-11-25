"""PP-137: opt-in low-stock digest (off by default)."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import patch

import pytest

from backend.services import low_stock_digest as d

ITEMS = [
    {"id": "a", "name": "Milk", "quantity": 1, "unit": "gal", "category": "dairy", "target_quantity": None},
    {"id": "b", "name": "Rice", "quantity": 5, "unit": "lb", "category": "pantry", "target_quantity": None},
    {"id": "c", "name": "Eggs", "quantity": 0, "unit": "", "category": "dairy", "target_quantity": None},
    {"id": "d", "name": "Beans", "quantity": 3, "unit": "can", "category": "pantry", "target_quantity": 4},
    {"id": "e", "name": "Salsa", "quantity": 2, "unit": "jar", "category": "pantry", "target_quantity": None},
]


def test_low_items_uses_override_then_target_then_category_then_one():
    picked = d.low_items(ITEMS, {"pantry": 1, "dairy": 1}, {"e": 2})
    names = [i["name"] for i in picked]
    assert names == ["Eggs", "Beans", "Milk", "Salsa"]  # out first, then A-Z
    assert "Rice" not in names


def test_clean_numbers_drops_junk():
    assert d._clean_numbers({"a": 1, "b": "x", "c": -1, "d": True, 5: 2, "e": 2.5}) == {"a": 1.0, "e": 2.5}


def test_render_has_unsubscribe_and_no_invented_counts():
    picked = d.low_items(ITEMS, {"pantry": 1, "dairy": 1}, {})
    subject, html, text = d.render(picked, "https://www.mypantryhub.com/api/public/email/unsubscribe?token=t")
    assert subject == f"Pantry Hub: {len(picked)} items running low this week"
    assert "Unsubscribe" in html and "token=t" in text
    assert "- Eggs: Out" in text and "- Milk: 1 gal left" in text
    assert "expir" not in (html + text).lower()


def test_run_is_a_noop_while_flag_off(monkeypatch):
    monkeypatch.delenv(d.ENV_FLAG, raising=False)
    with patch.object(d, "_opted_in_users") as users, patch.object(d.email_service, "send_email") as send:
        stats = d.run()
    assert stats["enabled"] == 0
    users.assert_not_called()
    send.assert_not_called()


def test_run_sends_only_opted_in_users_with_low_items(monkeypatch):
    monkeypatch.setenv(d.ENV_FLAG, "1")
    users = [
        {"user_id": "u1", "threshold_config": {"pantry": 1, "dairy": 1}, "item_threshold_overrides": {}, "unsubscribe_token": "tok1", "email": "one@example.com"},
        {"user_id": "u2", "threshold_config": {}, "item_threshold_overrides": {}, "unsubscribe_token": "tok2", "email": "two@example.com"},
    ]
    stock = {"u1": ITEMS, "u2": [{"id": "z", "name": "Flour", "quantity": 9, "unit": "lb", "category": "pantry", "target_quantity": None}]}
    with patch.object(d, "_opted_in_users", return_value=users), patch.object(
        d, "_user_items", side_effect=lambda uid: stock[uid]
    ), patch.object(d.email_service, "send_email", return_value={"skipped": False}) as send:
        stats = d.run(datetime(2026, 11, 29, 15, tzinfo=timezone.utc))
    assert stats == {"enabled": 1, "users": 2, "sent": 1, "skipped_empty": 1, "skipped_other": 0}
    kwargs = send.call_args.kwargs
    assert kwargs["to"] == "one@example.com"
    assert kwargs["template"] == "low_stock_digest"
    assert kwargs["idempotency_key"] == "digest.low_stock:u1:2026-W48"
    assert kwargs["headers"]["List-Unsubscribe"].endswith("token=tok1>")
    assert kwargs["headers"]["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"


def test_digest_is_not_billing_critical_so_suppression_applies():
    assert d.email_service._is_billing_critical_template(d.TEMPLATE) is False


def test_preferences_endpoint_requires_auth(client):
    assert client.get("/api/email-preferences").status_code == 401


def test_cannot_opt_in_while_flag_off(client, auth_headers, monkeypatch):
    monkeypatch.delenv(d.ENV_FLAG, raising=False)
    r = client.put("/api/email-preferences", json={"lowStockDigest": True}, headers=auth_headers)
    assert r.status_code == 409


@pytest.mark.parametrize("ok,status", [(True, 200), (False, 404)])
def test_unsubscribe_link(client, ok, status):
    with patch.object(d, "unsubscribe", return_value=ok) as unsub:
        r = client.get("/api/public/email/unsubscribe?token=abc")
        r2 = client.post("/api/public/email/unsubscribe?token=abc")
    assert r.status_code == status and r2.status_code == status
    assert unsub.call_count == 2
    assert ("unsubscribed" in r.text) is ok
