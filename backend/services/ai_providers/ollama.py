"""Ollama Cloud receipt reader. Server-side only; the key never leaves the backend."""

from __future__ import annotations

import json
import os
from typing import Any

import httpx

from .base import (
    KIND_ERROR,
    KIND_NOT_CONFIGURED,
    KIND_TIMEOUT,
    PROVIDER_OLLAMA,
    RECEIPT_JSON_SCHEMA,
    RECEIPT_PROMPT,
    ProviderError,
    classify_http_failure,
    normalize_receipt,
)

DEFAULT_HOST = "https://ollama.com"
# Ollama Cloud, model gemma4:cloud (32B, vision). Override with OLLAMA_RECEIPT_MODEL.
# On a machine with the Ollama app signed in, "gemma4:cloud" is a local alias that the
# daemon forwards to Ollama Cloud. Calling https://ollama.com directly (the server, which
# has no daemon) uses the catalog name for the same model, so aliases are mapped below.
DEFAULT_MODEL = "gemma4:cloud"
_DIRECT_CLOUD_NAMES = {"gemma4:cloud": "gemma4:31b"}


def _host() -> str:
    return os.getenv("OLLAMA_HOST", DEFAULT_HOST).strip().rstrip("/") or DEFAULT_HOST


def resolve_model(host: str) -> str:
    model = os.getenv("OLLAMA_RECEIPT_MODEL", "").strip() or DEFAULT_MODEL
    if host == DEFAULT_HOST:
        if model in _DIRECT_CLOUD_NAMES:
            return _DIRECT_CLOUD_NAMES[model]
        if model.endswith("-cloud"):
            return model[: -len("-cloud")]
    return model


def is_configured() -> bool:
    has_key = bool(os.getenv("OLLAMA_API_KEY", "").strip())
    # Ollama Cloud needs a key. A different host (signed-in local daemon, self-hosted) may not.
    return has_key or _host() != DEFAULT_HOST


def scan_receipt(image_b64: str, timeout: float) -> dict[str, Any]:
    if not is_configured():
        raise ProviderError(PROVIDER_OLLAMA, KIND_NOT_CONFIGURED, "no_key")
    host = _host()
    headers = {"Content-Type": "application/json"}
    key = os.getenv("OLLAMA_API_KEY", "").strip()
    if key:
        headers["Authorization"] = f"Bearer {key}"
    payload: dict[str, Any] = {
        "model": resolve_model(host),
        "stream": False,
        "format": RECEIPT_JSON_SCHEMA,
        "options": {"temperature": 0, "num_predict": 2048},
        "messages": [{"role": "user", "content": RECEIPT_PROMPT, "images": [image_b64]}],
    }
    # gemma4 supports a thinking switch; off keeps answers short and inside num_predict.
    # Set OLLAMA_RECEIPT_THINK=unset for a model that rejects the field.
    if os.getenv("OLLAMA_RECEIPT_THINK", "off").strip() != "unset":
        payload["think"] = False
    try:
        resp = httpx.post(f"{host}/api/chat", headers=headers, json=payload, timeout=timeout)
    except httpx.TimeoutException as exc:
        raise ProviderError(PROVIDER_OLLAMA, KIND_TIMEOUT, "timeout") from exc
    except httpx.HTTPError as exc:
        raise ProviderError(PROVIDER_OLLAMA, KIND_ERROR, type(exc).__name__) from exc
    if resp.status_code >= 400:
        raise classify_http_failure(PROVIDER_OLLAMA, resp.status_code, resp.text)
    try:
        content = resp.json()["message"]["content"]
        data = json.loads(content)
    except (ValueError, KeyError, TypeError) as exc:
        raise ProviderError(PROVIDER_OLLAMA, KIND_ERROR, "bad_json") from exc
    return normalize_receipt(PROVIDER_OLLAMA, data)
