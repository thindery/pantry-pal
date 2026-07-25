"""Trusted client IP extraction (PP-071 / SEC-207)."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from backend.lib.client_ip import get_client_ip, trust_proxy_headers


def _request(
    *,
    host: str | None = "10.0.0.5",
    headers: dict[str, str] | None = None,
):
    req = MagicMock()
    req.headers = headers or {}
    if host is None:
        req.client = None
    else:
        req.client = MagicMock()
        req.client.host = host
    return req


@pytest.fixture(autouse=True)
def clear_trust(monkeypatch):
    monkeypatch.delenv("TRUST_PROXY", raising=False)
    monkeypatch.delenv("TRUST_PROXY_HEADERS", raising=False)


def test_trust_disabled_by_default():
    assert trust_proxy_headers() is False


def test_trust_enabled_via_trust_proxy(monkeypatch):
    monkeypatch.setenv("TRUST_PROXY", "1")
    assert trust_proxy_headers() is True


def test_ignores_spoofed_headers_when_trust_off():
    req = _request(
        host="10.0.0.5",
        headers={
            "cf-connecting-ip": "1.2.3.4",
            "x-forwarded-for": "9.9.9.9, 8.8.8.8",
            "x-real-ip": "7.7.7.7",
        },
    )
    assert get_client_ip(req) == "10.0.0.5"


def test_prefers_cf_connecting_ip_when_trust_on(monkeypatch):
    monkeypatch.setenv("TRUST_PROXY", "1")
    req = _request(
        host="10.0.0.5",
        headers={
            "cf-connecting-ip": "1.2.3.4",
            "x-forwarded-for": "9.9.9.9",
            "x-real-ip": "7.7.7.7",
        },
    )
    assert get_client_ip(req) == "1.2.3.4"


def test_uses_first_x_forwarded_for_hop_when_no_cf(monkeypatch):
    monkeypatch.setenv("TRUST_PROXY_HEADERS", "true")
    req = _request(
        host="10.0.0.5",
        headers={"x-forwarded-for": " 9.9.9.9 , 8.8.8.8"},
    )
    assert get_client_ip(req) == "9.9.9.9"


def test_uses_x_real_ip_when_no_forwarded(monkeypatch):
    monkeypatch.setenv("TRUST_PROXY", "yes")
    req = _request(host="10.0.0.5", headers={"x-real-ip": "7.7.7.7"})
    assert get_client_ip(req) == "7.7.7.7"


def test_falls_back_to_client_host_when_headers_empty(monkeypatch):
    monkeypatch.setenv("TRUST_PROXY", "1")
    req = _request(host="10.0.0.5", headers={})
    assert get_client_ip(req) == "10.0.0.5"


def test_unknown_when_no_client():
    req = _request(host=None, headers={})
    assert get_client_ip(req) == "unknown"
