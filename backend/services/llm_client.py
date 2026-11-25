"""Text/JSON chat client for Pro AI features (PP-183). Server-side only.

Provider order matches PP-186 (receipt AI): Ollama Cloud (`gemma4:cloud`) first,
Gemini (`gemini-3.1-flash-lite`) only when Ollama errors, times out, is not
configured, or hits a cap/quota. A valid answer is final.

This module never decides *whether* a call may happen. Every call must go
through `backend.services.ai_guard`, which checks the kill switch and both
weekly token caps (with a reserve estimate) before each provider attempt,
including the fallback. Keys come from the server env only (OLLAMA_API_KEY,
GEMINI_API_KEY); they are never logged, returned, or put in a URL.

Built on the PP-186 provider layer (`backend/services/ai_providers/`): provider
ids, failure kinds, cap detection, host/key config and model defaults come from
there. The receipt modules send an image prompt; this module adds the text/JSON
chat call and token counts that metering needs.
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from typing import Any

import httpx

# Shared PP-186 provider layer: same provider ids, failure kinds, cap detection,
# host/key configuration and model defaults as receipt scanning.
from backend.services.ai_providers import gemini as _gemini_receipt
from backend.services.ai_providers import ollama as _ollama_receipt
from backend.services.ai_providers.base import (
    KIND_CAP,
    KIND_ERROR,
    KIND_NOT_CONFIGURED,
    KIND_TIMEOUT,
    PROVIDER_GEMINI,
    PROVIDER_OLLAMA,
    PROVIDERS,
)
from backend.services.ai_providers.base import ProviderError as _BaseProviderError
from backend.services.ai_providers.base import classify_http_failure as _classify

KIND_BAD_JSON = "bad_json"

OLLAMA_DEFAULT_HOST = _ollama_receipt.DEFAULT_HOST
OLLAMA_DEFAULT_MODEL = _ollama_receipt.DEFAULT_MODEL
GEMINI_DEFAULT_MODEL = _gemini_receipt.DEFAULT_MODEL
_GEMINI_ENDPOINT = _gemini_receipt._ENDPOINT


class ProviderError(_BaseProviderError):
    """PP-186 ProviderError plus the tokens a failed call still reported (for metering)."""

    def __init__(self, provider: str, kind: str, detail: str = "", prompt_tokens: int = 0, completion_tokens: int = 0) -> None:
        super().__init__(provider, kind, detail)
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens


def classify_http_failure(provider: str, status: int, body_text: str) -> ProviderError:
    base = _classify(provider, status, body_text)
    return ProviderError(base.provider, base.kind, base.detail)


@dataclass
class ChatResult:
    data: Any
    provider: str
    model: str
    prompt_tokens: int
    completion_tokens: int


def estimate_tokens(text: str) -> int:
    """chars / 4, rounded up (same fallback Agent Paige uses)."""
    return (len(text) + 3) // 4


def timeout_seconds() -> float:
    try:
        return max(1.0, float(os.getenv("AI_PROVIDER_TIMEOUT_SECONDS", "25")))
    except ValueError:
        return 25.0


def _post(url: str, headers: dict[str, str], payload: dict[str, Any], timeout: float) -> httpx.Response:
    """Single choke point for provider HTTP. Tests patch this to count calls."""
    return httpx.post(url, headers=headers, json=payload, timeout=timeout)


# ---------- Ollama ----------

def _ollama_host() -> str:
    return _ollama_receipt._host()


def ollama_model() -> str:
    """OLLAMA_TEXT_MODEL, else the receipt model setting, mapped like PP-186 for direct cloud calls."""
    host = _ollama_host()
    model = os.getenv("OLLAMA_TEXT_MODEL", "").strip() or os.getenv("OLLAMA_RECEIPT_MODEL", "").strip() or OLLAMA_DEFAULT_MODEL
    if host == OLLAMA_DEFAULT_HOST:
        if model in _ollama_receipt._DIRECT_CLOUD_NAMES:
            return _ollama_receipt._DIRECT_CLOUD_NAMES[model]
        if model.endswith("-cloud"):
            return model[: -len("-cloud")]
    return model


def ollama_configured() -> bool:
    return _ollama_receipt.is_configured()


def ollama_chat_json(prompt: str, schema: dict[str, Any], max_output_tokens: int) -> ChatResult:
    if not ollama_configured():
        raise ProviderError(PROVIDER_OLLAMA, KIND_NOT_CONFIGURED, "no_key")
    host = _ollama_host()
    model = ollama_model()
    headers = {"Content-Type": "application/json"}
    key = os.getenv("OLLAMA_API_KEY", "").strip()
    if key:
        headers["Authorization"] = f"Bearer {key}"
    payload: dict[str, Any] = {
        "model": model,
        "stream": False,
        "format": schema,
        "think": False,
        "options": {"temperature": 0.6, "num_predict": max_output_tokens},
        "messages": [{"role": "user", "content": prompt}],
    }
    try:
        resp = _post(f"{host}/api/chat", headers, payload, timeout_seconds())
    except httpx.TimeoutException as exc:
        raise ProviderError(PROVIDER_OLLAMA, KIND_TIMEOUT, "timeout") from exc
    except httpx.HTTPError as exc:
        raise ProviderError(PROVIDER_OLLAMA, KIND_ERROR, type(exc).__name__) from exc
    if resp.status_code >= 400:
        raise classify_http_failure(PROVIDER_OLLAMA, resp.status_code, resp.text)
    try:
        body = resp.json()
        content = body["message"]["content"]
    except (ValueError, KeyError, TypeError) as exc:
        raise ProviderError(PROVIDER_OLLAMA, KIND_BAD_JSON, "bad_body") from exc
    p_tok = int(body.get("prompt_eval_count") or estimate_tokens(prompt))
    c_tok = int(body.get("eval_count") or estimate_tokens(content or ""))
    try:
        data = json.loads(content)
    except (ValueError, TypeError) as exc:
        raise ProviderError(PROVIDER_OLLAMA, KIND_BAD_JSON, "bad_json", p_tok, c_tok) from exc
    return ChatResult(data, PROVIDER_OLLAMA, model, p_tok, c_tok)


# ---------- Gemini (fallback only) ----------

def gemini_model() -> str:
    return os.getenv("GEMINI_TEXT_MODEL", "").strip() or os.getenv("GEMINI_RECEIPT_MODEL", "").strip() or GEMINI_DEFAULT_MODEL


def gemini_configured() -> bool:
    return _gemini_receipt.is_configured()


def _to_gemini_schema(schema: Any) -> Any:
    """JSON Schema subset -> Gemini OpenAPI subset (upper-case types, no unions)."""
    if isinstance(schema, dict):
        out: dict[str, Any] = {}
        for k, v in schema.items():
            if k == "type":
                if isinstance(v, list):
                    non_null = [t for t in v if t != "null"]
                    out["type"] = (non_null[0] if non_null else "string").upper()
                    if "null" in v:
                        out["nullable"] = True
                else:
                    out["type"] = str(v).upper()
            elif k in ("properties",):
                out[k] = {pk: _to_gemini_schema(pv) for pk, pv in v.items()}
            elif k in ("items",):
                out[k] = _to_gemini_schema(v)
            elif k in ("required", "enum", "description"):
                out[k] = v
        return out
    return schema


def gemini_chat_json(prompt: str, schema: dict[str, Any], max_output_tokens: int) -> ChatResult:
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key:
        raise ProviderError(PROVIDER_GEMINI, KIND_NOT_CONFIGURED, "no_key")
    model = gemini_model()
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.6,
            "maxOutputTokens": max_output_tokens,
            "responseMimeType": "application/json",
            "responseSchema": _to_gemini_schema(schema),
        },
    }
    try:
        # Key in a header, never in the URL, so it can't land in access logs.
        resp = _post(
            _GEMINI_ENDPOINT.format(model=model),
            {"x-goog-api-key": key, "Content-Type": "application/json"},
            payload,
            timeout_seconds(),
        )
    except httpx.TimeoutException as exc:
        raise ProviderError(PROVIDER_GEMINI, KIND_TIMEOUT, "timeout") from exc
    except httpx.HTTPError as exc:
        raise ProviderError(PROVIDER_GEMINI, KIND_ERROR, type(exc).__name__) from exc
    if resp.status_code >= 400:
        raise classify_http_failure(PROVIDER_GEMINI, resp.status_code, resp.text)
    try:
        body = resp.json()
        text = body["candidates"][0]["content"]["parts"][0]["text"]
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise ProviderError(PROVIDER_GEMINI, KIND_BAD_JSON, "bad_body") from exc
    usage = body.get("usageMetadata") or {}
    p_tok = int(usage.get("promptTokenCount") or estimate_tokens(prompt))
    c_tok = int(usage.get("candidatesTokenCount") or estimate_tokens(text or ""))
    try:
        data = json.loads(text)
    except (ValueError, TypeError) as exc:
        raise ProviderError(PROVIDER_GEMINI, KIND_BAD_JSON, "bad_json", p_tok, c_tok) from exc
    return ChatResult(data, PROVIDER_GEMINI, model, p_tok, c_tok)


_CALLERS = {PROVIDER_OLLAMA: ollama_chat_json, PROVIDER_GEMINI: gemini_chat_json}
_MODELS = {PROVIDER_OLLAMA: ollama_model, PROVIDER_GEMINI: gemini_model}


def call_provider(provider: str, prompt: str, schema: dict[str, Any], max_output_tokens: int) -> ChatResult:
    return _CALLERS[provider](prompt, schema, max_output_tokens)


def model_for(provider: str) -> str:
    return _MODELS[provider]()


# Per-process cooldown after a provider cap/quota so a weekly cap isn't hammered.
_capped_until: dict[str, float] = {}


def cap_cooldown_seconds() -> float:
    try:
        return max(0.0, float(os.getenv("AI_CAP_COOLDOWN_SECONDS", "600")))
    except ValueError:
        return 600.0


def in_cooldown(provider: str) -> bool:
    return _capped_until.get(provider, 0.0) > time.monotonic()


def mark_capped(provider: str) -> None:
    _capped_until[provider] = time.monotonic() + cap_cooldown_seconds()


def reset_state() -> None:
    _capped_until.clear()
