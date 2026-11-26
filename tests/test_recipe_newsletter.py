"""PP-193: capture-only recipe newsletter signup. Never sends email."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from backend.services.recipe_newsletter_service import (
    InvalidNewsletterEmail,
    normalize_email,
    normalize_slug,
    normalize_source,
    subscribe,
)


def test_normalize_email_accepts_and_lowercases():
    assert normalize_email("  Alex@Example.COM ") == "alex@example.com"


@pytest.mark.parametrize("raw", ["", "not-an-email", "a@b", "a@b.", "@x.com", "a b@x.com", "a" * 250 + "@x.com"])
def test_normalize_email_rejects_invalid(raw):
    with pytest.raises(InvalidNewsletterEmail):
        normalize_email(raw)


def test_normalize_source_and_slug():
    assert normalize_source("recipe_page") == "recipe_page"
    assert normalize_source("garbage") == "recipes_index"
    assert normalize_slug("lasagna-soup") == "lasagna-soup"
    assert normalize_slug("No pe!") is None
    assert normalize_slug("") is None


def test_subscribe_inserts_normalized_row_and_sends_no_mail():
    cursor = MagicMock()
    conn = MagicMock()
    conn.cursor.return_value.__enter__.return_value = cursor
    with (
        patch("backend.services.recipe_newsletter_service.db_connection") as db,
        patch("backend.services.email_service.send_welcome", create=True) as send_welcome,
        patch("backend.services.email_service.send", create=True) as send,
    ):
        db.return_value.__enter__.return_value = conn
        subscribe(email="Pat@Example.com", source="recipe_page", recipe_slug="lasagna-soup")
        args = cursor.execute.call_args[0]
        assert "INSERT INTO recipe_newsletter_subscribers" in args[0]
        assert args[1] == ("pat@example.com", "recipe_page", "lasagna-soup")
        send_welcome.assert_not_called()
        send.assert_not_called()


def test_subscribe_on_index_clears_slug():
    cursor = MagicMock()
    conn = MagicMock()
    conn.cursor.return_value.__enter__.return_value = cursor
    with patch("backend.services.recipe_newsletter_service.db_connection") as db:
        db.return_value.__enter__.return_value = conn
        subscribe(email="a@example.com", source="recipes_index", recipe_slug="lasagna-soup")
        assert cursor.execute.call_args[0][1] == ("a@example.com", "recipes_index", None)


def test_endpoint_stores_valid_signup(client):
    with patch("backend.routers.recipe_newsletter.recipe_newsletter_service.subscribe") as sub:
        res = client.post(
            "/api/public/recipe-newsletter",
            json={"email": "cook@example.com", "source": "recipes_index"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["subscribed"] is True
        sub.assert_called_once()
        assert sub.call_args.kwargs["email"] == "cook@example.com"


def test_endpoint_rejects_invalid_email(client):
    with patch("backend.routers.recipe_newsletter.recipe_newsletter_service.subscribe") as sub:
        sub.side_effect = InvalidNewsletterEmail("Enter a valid email address.")
        res = client.post("/api/public/recipe-newsletter", json={"email": "nope"})
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "INVALID_EMAIL"
        # The service is called; it raises. Router must not 200.


def test_endpoint_honeypot_returns_success_without_storing(client):
    with patch("backend.routers.recipe_newsletter.recipe_newsletter_service.subscribe") as sub:
        res = client.post(
            "/api/public/recipe-newsletter",
            json={"email": "bot@example.com", "website": "http://spam.example"},
        )
        assert res.status_code == 200
        assert res.json()["data"]["subscribed"] is True
        sub.assert_not_called()


def test_endpoint_is_rate_limited(client, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_NEWSLETTER", "2")
    monkeypatch.setenv("RATE_LIMIT_STORE", "memory")
    from backend.app.config import get_settings

    get_settings.cache_clear()
    with patch("backend.routers.recipe_newsletter.recipe_newsletter_service.subscribe"):
        assert client.post("/api/public/recipe-newsletter", json={"email": "a@example.com"}).status_code == 200
        assert client.post("/api/public/recipe-newsletter", json={"email": "b@example.com"}).status_code == 200
        limited = client.post("/api/public/recipe-newsletter", json={"email": "c@example.com"})
        assert limited.status_code == 429
        assert limited.json()["error"]["code"] == "RATE_LIMITED"
    get_settings.cache_clear()


def test_endpoint_does_not_call_resend_or_email_service(client):
    with (
        patch("backend.routers.recipe_newsletter.recipe_newsletter_service.subscribe"),
        patch("backend.services.email_service.send_welcome", create=True) as welcome,
    ):
        res = client.post("/api/public/recipe-newsletter", json={"email": "quiet@example.com"})
        assert res.status_code == 200
        welcome.assert_not_called()
