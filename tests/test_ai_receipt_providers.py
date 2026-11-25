"""PP-186: receipt AI provider selection and fallback (all providers mocked)."""

from __future__ import annotations

import base64
import json
import logging
from unittest.mock import MagicMock, patch

import httpx
import pytest

from backend.services import ai_providers
from backend.services.ai_providers import gemini, ollama
from backend.services.ai_providers.base import (
    KIND_CAP,
    KIND_ERROR,
    KIND_TIMEOUT,
    ProviderError,
)

IMG = base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"0" * 64).decode()
AI_ITEMS = {"store": "Test Mart", "total": 5.5, "items": [{"name": "Whole Milk", "quantity": 1, "unit": "gal", "category": "dairy", "price": 3.99}]}
OCR_RESULT = {"items": [{"name": "OCR Item", "quantity": 1, "unit": "units", "category": "other", "price": 1.0, "confidence": 75}], "store": "ocr", "total": 1.0, "rawText": "x", "confidence": 80}
SECRET = "sk-test-SECRET-VALUE-123"


def _result(provider: str) -> dict:
    return {"items": [{"name": f"{provider} item"}], "store": None, "total": None, "rawText": "", "confidence": 85}


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv("AI_RECEIPT_SCAN_ENABLED", "1")
    monkeypatch.setenv("OLLAMA_API_KEY", SECRET)
    monkeypatch.setenv("GEMINI_API_KEY", SECRET)
    monkeypatch.delenv("OLLAMA_HOST", raising=False)
    ai_providers.reset_state()
    yield
    ai_providers.reset_state()


@pytest.fixture
def selected(monkeypatch):
    """Set the stored provider choice. Default (None) = nothing stored."""

    def _set(value: str | None):
        def fake():
            from backend.services.app_settings import DEFAULT_PROVIDER, PROVIDERS

            return value if value in PROVIDERS else DEFAULT_PROVIDER

        monkeypatch.setattr("backend.services.app_settings.get_ai_provider", fake)

    _set(None)
    return _set


@pytest.fixture
def calls(monkeypatch):
    log: list[str] = []
    behavior = {"ollama": lambda: _result("ollama"), "gemini": lambda: _result("gemini")}

    def make(name):
        def fake(image, timeout):
            log.append(name)
            out = behavior[name]()
            if isinstance(out, Exception):
                raise out
            return out

        return fake

    monkeypatch.setattr(ollama, "scan_receipt", make("ollama"))
    monkeypatch.setattr(gemini, "scan_receipt", make("gemini"))
    log_obj = type("Calls", (), {"log": log, "behavior": behavior})
    return log_obj


# ── Selection ────────────────────────────────────────────────────────────────


def test_default_provider_is_ollama_when_nothing_stored(selected):
    selected(None)
    assert ai_providers.provider_order("anything-else")[0] == "ollama"
    from backend.services.app_settings import get_ai_provider

    assert get_ai_provider() == "ollama"


def test_get_ai_provider_defaults_to_ollama_on_missing_row_bad_value_or_db_error():
    from backend.services import app_settings

    with patch.object(app_settings, "get_setting", return_value=None):
        assert app_settings.get_ai_provider() == "ollama"
    with patch.object(app_settings, "get_setting", return_value="gpt-9"):
        assert app_settings.get_ai_provider() == "ollama"
    with patch.object(app_settings, "get_setting", return_value="gemini"):
        assert app_settings.get_ai_provider() == "gemini"
    with patch.object(app_settings, "get_setting", side_effect=RuntimeError("db down")):
        assert app_settings.get_ai_provider() == "ollama"


def test_ollama_success_never_calls_gemini(calls, selected):
    result = ai_providers.scan_receipt_with_ai(IMG)
    assert result["provider"] == "ollama"
    assert calls.log == ["ollama"]


def test_selected_gemini_is_used_first(calls, selected):
    selected("gemini")
    result = ai_providers.scan_receipt_with_ai(IMG)
    assert result["provider"] == "gemini"
    assert calls.log == ["gemini"]


def test_zero_items_from_ollama_is_a_success_not_a_failure(calls):
    calls.behavior["ollama"] = lambda: {"items": [], "store": None, "total": None, "rawText": "", "confidence": 40}
    result = ai_providers.scan_receipt_with_ai(IMG)
    assert result["provider"] == "ollama" and result["items"] == []
    assert calls.log == ["ollama"]


# ── Fallback ─────────────────────────────────────────────────────────────────


@pytest.mark.parametrize("kind", [KIND_ERROR, KIND_TIMEOUT, KIND_CAP, "not_configured"])
def test_ollama_failure_or_cap_falls_over_to_gemini(calls, kind):
    calls.behavior["ollama"] = lambda: ProviderError("ollama", kind, "x")
    result = ai_providers.scan_receipt_with_ai(IMG)
    assert result["provider"] == "gemini"
    assert calls.log == ["ollama", "gemini"]


def test_ollama_unexpected_exception_also_falls_over(calls):
    calls.behavior["ollama"] = lambda: RuntimeError("boom")
    assert ai_providers.scan_receipt_with_ai(IMG)["provider"] == "gemini"


def test_both_fail_returns_none_so_caller_uses_pytesseract(calls):
    calls.behavior["ollama"] = lambda: ProviderError("ollama", KIND_CAP, "http_429")
    calls.behavior["gemini"] = lambda: ProviderError("gemini", KIND_ERROR, "http_500")
    assert ai_providers.scan_receipt_with_ai(IMG) is None
    assert calls.log == ["ollama", "gemini"]


def test_manually_selected_gemini_falls_back_to_ollama(calls, selected):
    selected("gemini")
    calls.behavior["gemini"] = lambda: ProviderError("gemini", KIND_ERROR, "http_500")
    assert ai_providers.scan_receipt_with_ai(IMG)["provider"] == "ollama"
    assert calls.log == ["gemini", "ollama"]


def test_cap_sets_cooldown_so_ollama_is_not_hammered(calls):
    calls.behavior["ollama"] = lambda: ProviderError("ollama", KIND_CAP, "http_429")
    ai_providers.scan_receipt_with_ai(IMG)
    ai_providers.scan_receipt_with_ai(IMG)
    assert calls.log == ["ollama", "gemini", "gemini"]


def test_plain_error_has_no_cooldown(calls):
    calls.behavior["ollama"] = lambda: ProviderError("ollama", KIND_ERROR, "http_500")
    ai_providers.scan_receipt_with_ai(IMG)
    ai_providers.scan_receipt_with_ai(IMG)
    assert calls.log == ["ollama", "gemini", "ollama", "gemini"]


# ── Flag, size, logging ──────────────────────────────────────────────────────


def test_flag_off_calls_no_provider(calls, monkeypatch):
    monkeypatch.setenv("AI_RECEIPT_SCAN_ENABLED", "0")
    assert ai_providers.scan_receipt_with_ai(IMG) is None
    assert calls.log == []


def test_flag_unset_means_off(calls, monkeypatch):
    monkeypatch.delenv("AI_RECEIPT_SCAN_ENABLED")
    assert ai_providers.scan_receipt_with_ai(IMG) is None
    assert calls.log == []


def test_oversized_image_skips_ai(calls, monkeypatch):
    monkeypatch.setenv("AI_RECEIPT_MAX_IMAGE_BYTES", "10")
    assert ai_providers.scan_receipt_with_ai(IMG) is None
    assert calls.log == []


def test_fallback_log_line_names_providers_and_never_a_key(calls, caplog):
    calls.behavior["ollama"] = lambda: ProviderError("ollama", KIND_CAP, "http_429")
    with caplog.at_level(logging.INFO, logger="pantry.ai_receipt"):
        ai_providers.scan_receipt_with_ai(IMG)
    text = caplog.text
    assert "provider=ollama outcome=cap" in text and "fallback=gemini" in text
    assert "provider=gemini outcome=ok" in text
    assert SECRET not in text and IMG not in text


# ── Provider HTTP behavior (httpx mocked) ────────────────────────────────────


def _resp(status: int, body: dict | str = "") -> MagicMock:
    r = MagicMock()
    r.status_code = status
    r.text = body if isinstance(body, str) else json.dumps(body)
    r.json.return_value = body if isinstance(body, dict) else {}
    return r


def test_ollama_parses_response_and_sends_bearer_key_server_side():
    reply = _resp(200, {"message": {"content": json.dumps(AI_ITEMS)}})
    with patch("httpx.post", return_value=reply) as post:
        out = ollama.scan_receipt(IMG, 5)
    assert out["items"][0]["name"] == "Whole Milk" and out["store"] == "Test Mart" and out["total"] == 5.5
    kwargs = post.call_args.kwargs
    assert kwargs["headers"]["Authorization"] == f"Bearer {SECRET}"
    assert kwargs["json"]["messages"][0]["images"] == [IMG]
    assert kwargs["timeout"] == 5
    assert post.call_args.args[0] == "https://ollama.com/api/chat"


def test_ollama_cloud_default_model_is_gemma4_cloud_mapped_for_direct_api(monkeypatch):
    monkeypatch.delenv("OLLAMA_RECEIPT_MODEL", raising=False)
    reply = _resp(200, {"message": {"content": json.dumps(AI_ITEMS)}})
    with patch("httpx.post", return_value=reply) as post:
        ollama.scan_receipt(IMG, 5)
    assert post.call_args.kwargs["json"]["model"] == "gemma4:31b"
    assert post.call_args.kwargs["json"]["think"] is False
    # Through a signed-in local daemon the alias is passed as is.
    monkeypatch.setenv("OLLAMA_HOST", "http://localhost:11434")
    with patch("httpx.post", return_value=reply) as post:
        ollama.scan_receipt(IMG, 5)
    assert post.call_args.kwargs["json"]["model"] == "gemma4:cloud"
    # An explicit override wins.
    monkeypatch.setenv("OLLAMA_RECEIPT_MODEL", "gpt-oss:120b")
    assert ollama.resolve_model("https://ollama.com") == "gpt-oss:120b"


def test_gemini_default_model_is_pinned_flash_lite(monkeypatch):
    monkeypatch.delenv("GEMINI_RECEIPT_MODEL", raising=False)
    reply = _resp(200, {"candidates": [{"content": {"parts": [{"text": json.dumps(AI_ITEMS)}]}}]})
    with patch("httpx.post", return_value=reply) as post:
        gemini.scan_receipt(IMG, 5)
    assert "models/gemini-3.1-flash-lite:generateContent" in post.call_args.args[0]


def test_ollama_real_world_weekly_cap_message_is_a_cap():
    body = "you (someone) have reached your weekly usage limit, upgrade for higher limits"
    with patch("httpx.post", return_value=_resp(429, {"error": body})):
        with pytest.raises(ProviderError) as exc:
            ollama.scan_receipt(IMG, 5)
    assert exc.value.kind == KIND_CAP


def test_ollama_429_is_cap_and_timeout_is_timeout_and_500_is_error():
    with patch("httpx.post", return_value=_resp(429, "weekly limit")):
        with pytest.raises(ProviderError) as exc:
            ollama.scan_receipt(IMG, 5)
    assert exc.value.kind == KIND_CAP
    with patch("httpx.post", side_effect=httpx.ReadTimeout("slow")):
        with pytest.raises(ProviderError) as exc:
            ollama.scan_receipt(IMG, 5)
    assert exc.value.kind == KIND_TIMEOUT
    with patch("httpx.post", return_value=_resp(500, "oops")):
        with pytest.raises(ProviderError) as exc:
            ollama.scan_receipt(IMG, 5)
    assert exc.value.kind == KIND_ERROR


def test_ollama_403_with_quota_text_is_cap():
    with patch("httpx.post", return_value=_resp(403, "You have reached your weekly usage limit")):
        with pytest.raises(ProviderError) as exc:
            ollama.scan_receipt(IMG, 5)
    assert exc.value.kind == KIND_CAP


def test_ollama_garbage_json_is_an_error_not_a_crash():
    with patch("httpx.post", return_value=_resp(200, {"message": {"content": "not json"}})):
        with pytest.raises(ProviderError) as exc:
            ollama.scan_receipt(IMG, 5)
    assert exc.value.kind == KIND_ERROR
    with patch("httpx.post", return_value=_resp(200, {"message": {"content": json.dumps({"nope": 1})}})):
        with pytest.raises(ProviderError):
            ollama.scan_receipt(IMG, 5)


def test_ollama_without_key_on_cloud_host_is_not_configured_and_makes_no_call(monkeypatch):
    monkeypatch.delenv("OLLAMA_API_KEY")
    with patch("httpx.post") as post:
        with pytest.raises(ProviderError) as exc:
            ollama.scan_receipt(IMG, 5)
    assert exc.value.kind == "not_configured"
    post.assert_not_called()


def test_gemini_sends_key_in_header_not_url_and_parses():
    reply = _resp(200, {"candidates": [{"content": {"parts": [{"text": json.dumps(AI_ITEMS)}]}}]})
    with patch("httpx.post", return_value=reply) as post:
        out = gemini.scan_receipt(IMG, 5)
    assert out["items"][0]["category"] == "dairy"
    url = post.call_args.args[0]
    assert SECRET not in url
    assert post.call_args.kwargs["headers"]["x-goog-api-key"] == SECRET
    part = post.call_args.kwargs["json"]["contents"][0]["parts"][1]["inline_data"]
    assert part["mime_type"] == "image/png" and part["data"] == IMG


def test_gemini_failures_classified():
    for status, kind in ((429, KIND_CAP), (500, KIND_ERROR), (503, KIND_ERROR)):
        with patch("httpx.post", return_value=_resp(status, "x")):
            with pytest.raises(ProviderError) as exc:
                gemini.scan_receipt(IMG, 5)
        assert exc.value.kind == kind


def test_gemini_retries_one_503_then_succeeds_but_never_retries_429():
    ok = _resp(200, {"candidates": [{"content": {"parts": [{"text": json.dumps(AI_ITEMS)}]}}]})
    with patch("httpx.post", side_effect=[_resp(503, "busy"), ok]) as post, patch("time.sleep"):
        assert gemini.scan_receipt(IMG, 5)["items"]
    assert post.call_count == 2
    with patch("httpx.post", return_value=_resp(429, "quota")) as post:
        with pytest.raises(ProviderError):
            gemini.scan_receipt(IMG, 5)
    assert post.call_count == 1


def test_gemini_without_key_makes_no_call(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY")
    with patch("httpx.post") as post:
        with pytest.raises(ProviderError) as exc:
            gemini.scan_receipt(IMG, 5)
    assert exc.value.kind == "not_configured"
    post.assert_not_called()


# ── Route: /api/receipts/scan ────────────────────────────────────────────────


@pytest.fixture
def route(client, auth_headers, calls, selected):
    with patch("backend.routers.receipts.subscription_service") as subs, patch(
        "backend.routers.receipts.receipt_ocr.scan_receipt_image", return_value=OCR_RESULT
    ) as ocr:
        subs.can_scan_receipt.return_value = {"allowed": True}
        yield type("R", (), {"post": lambda self: client.post("/api/receipts/scan", headers=auth_headers, json={"image": IMG}), "ocr": ocr, "subs": subs})()


def test_route_uses_ai_result_when_ollama_works_and_skips_ocr(route, calls):
    calls.behavior["ollama"] = lambda: {"items": [{"name": "AI Milk"}], "store": "S", "total": 2.0, "rawText": "", "confidence": 85}
    body = route.post().json()
    assert body["data"]["items"][0]["name"] == "AI Milk"
    assert body["meta"]["ocrEngine"] == "ai"
    assert calls.log == ["ollama"]
    route.ocr.assert_not_called()
    route.subs.increment_usage.assert_called_once()


def test_route_ollama_cap_uses_gemini(route, calls):
    calls.behavior["ollama"] = lambda: ProviderError("ollama", KIND_CAP, "http_429")
    body = route.post().json()
    assert body["data"]["items"][0]["name"] == "gemini item"
    assert calls.log == ["ollama", "gemini"]
    route.ocr.assert_not_called()


def test_route_both_fail_uses_pytesseract_as_today(route, calls):
    calls.behavior["ollama"] = lambda: ProviderError("ollama", KIND_ERROR, "http_500")
    calls.behavior["gemini"] = lambda: ProviderError("gemini", KIND_TIMEOUT, "timeout")
    body = route.post().json()
    assert body["data"]["items"][0]["name"] == "OCR Item"
    assert body["meta"]["ocrEngine"] == "pytesseract"
    route.ocr.assert_called_once()


def test_route_flag_off_is_pytesseract_only(route, calls, monkeypatch):
    monkeypatch.setenv("AI_RECEIPT_SCAN_ENABLED", "0")
    body = route.post().json()
    assert body["meta"]["ocrEngine"] == "pytesseract"
    assert calls.log == []


def test_route_ai_zero_items_falls_to_ocr_without_calling_gemini(route, calls):
    calls.behavior["ollama"] = lambda: {"items": [], "store": None, "total": None, "rawText": "", "confidence": 40}
    body = route.post().json()
    assert body["meta"]["ocrEngine"] == "pytesseract"
    assert calls.log == ["ollama"]


# ── Admin settings endpoints ─────────────────────────────────────────────────


@pytest.fixture
def admin_client(client):
    from app import app
    from backend.routers.admin import require_admin

    app.dependency_overrides[require_admin] = lambda: "admin_1"
    yield client
    app.dependency_overrides.pop(require_admin, None)


def test_admin_ai_provider_get_defaults_to_ollama_and_exposes_no_keys(admin_client):
    with patch("backend.services.app_settings.get_setting", return_value=None):
        body = admin_client.get("/api/admin/ai-provider").json()
    data = body["data"]
    assert data["provider"] == "ollama"
    assert data["options"] == ["ollama", "gemini"]
    assert data["ollamaConfigured"] is True and data["geminiConfigured"] is True
    assert SECRET not in json.dumps(body)


def test_admin_ai_provider_put_persists_and_rejects_unknown(admin_client):
    with patch("backend.services.app_settings.set_setting") as store, patch(
        "backend.services.app_settings.get_setting", return_value="gemini"
    ):
        ok = admin_client.put("/api/admin/ai-provider", json={"provider": "gemini"})
        bad = admin_client.put("/api/admin/ai-provider", json={"provider": "gpt"})
    assert ok.status_code == 200 and ok.json()["data"]["provider"] == "gemini"
    store.assert_called_once_with("ai_receipt_provider", "gemini", "admin_1")
    assert bad.status_code == 422


def test_admin_ai_provider_requires_admin(client, auth_headers):
    assert client.get("/api/admin/ai-provider").status_code in (401, 403)
    assert client.put("/api/admin/ai-provider", json={"provider": "gemini"}).status_code in (401, 403)
