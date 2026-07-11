"""Redirect URL validation tests."""

from __future__ import annotations

import pytest

from backend.lib.url_validation import validate_receipt_url, validate_redirect_url


@pytest.fixture(autouse=True)
def _redirect_env(monkeypatch):
    monkeypatch.setenv("AUTH_URL", "https://www.mypantryhub.com")
    monkeypatch.setenv("FRONTEND_URL", "https://www.mypantryhub.com")


def test_validate_redirect_url_allows_site_origin():
    assert (
        validate_redirect_url("https://www.mypantryhub.com/checkout/success/")
        == "https://www.mypantryhub.com/checkout/success/"
    )


def test_validate_redirect_url_rejects_off_origin():
    with pytest.raises(ValueError, match="not allowed"):
        validate_redirect_url("https://evil.com/phish")


def test_validate_receipt_url_requires_https():
    with pytest.raises(ValueError, match="HTTPS"):
        validate_receipt_url("http://www.mypantryhub.com/receipt.jpg")