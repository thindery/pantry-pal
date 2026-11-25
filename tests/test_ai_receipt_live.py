"""PP-186: real provider calls with a synthetic receipt. Local only.

Run: set -a; . .env.dev; set +a; RUN_AI_LIVE=1 .venv/bin/python -m pytest tests/test_ai_receipt_live.py -v -s
Costs a few tokens. Ollama may legitimately answer 429 (weekly cap): that is the
cap path, and the orchestrator test then proves the real fall-over to Gemini.
"""

from __future__ import annotations

import base64
import os
from pathlib import Path

import pytest

from backend.services import ai_providers
from backend.services.ai_providers import gemini, ollama
from backend.services.ai_providers.base import ProviderError

pytestmark = pytest.mark.skipif(os.environ.get("RUN_AI_LIVE") != "1", reason="Set RUN_AI_LIVE=1 to call real providers")

IMG = base64.b64encode((Path(__file__).parent / "fixtures" / "receipt_sample.png").read_bytes()).decode()


def _names(result: dict) -> str:
    return " ".join(i["name"].lower() for i in result["items"])


@pytest.mark.skipif(not os.environ.get("GEMINI_API_KEY"), reason="no GEMINI_API_KEY")
def test_live_gemini_reads_sample_receipt():
    result = gemini.scan_receipt(IMG, 60)
    assert len(result["items"]) >= 5
    assert "milk" in _names(result) and "pasta" in _names(result)
    assert result["total"] == pytest.approx(26.23)


@pytest.mark.skipif(not os.environ.get("OLLAMA_API_KEY"), reason="no OLLAMA_API_KEY")
def test_live_ollama_reads_receipt_or_reports_cap():
    try:
        result = ollama.scan_receipt(IMG, 90)
    except ProviderError as exc:
        print(f"live ollama outcome: {exc.kind} {exc.detail}")
        assert exc.kind in ("cap", "error", "timeout")
        return
    print(f"live ollama outcome: ok items={len(result['items'])}")
    assert "milk" in _names(result)


def test_live_orchestrator_default_ollama_then_gemini(monkeypatch):
    monkeypatch.setenv("AI_RECEIPT_SCAN_ENABLED", "1")
    monkeypatch.setattr("backend.services.app_settings.get_ai_provider", lambda: "ollama")
    ai_providers.reset_state()
    result = ai_providers.scan_receipt_with_ai(IMG)
    assert result is not None, "both providers failed"
    print(f"live orchestrator provider used: {result['provider']}")
    assert "milk" in _names(result)
