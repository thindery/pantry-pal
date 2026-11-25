"""Gemini Flash receipt reader. Server-side only; the key never leaves the backend."""

from __future__ import annotations

import json
import os
import time
from typing import Any

import httpx

from .base import (
    KIND_ERROR,
    KIND_NOT_CONFIGURED,
    KIND_TIMEOUT,
    PROVIDER_GEMINI,
    RECEIPT_PROMPT,
    ProviderError,
    classify_http_failure,
    normalize_receipt,
    sniff_mime,
)

# Pinned stable id (not a -latest alias). 2.5-flash / 2.5-flash-lite return 404 for new keys.
DEFAULT_MODEL = "gemini-3.1-flash-lite"
_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

# Gemini's responseSchema is an OpenAPI subset: no union types.
_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "store": {"type": "STRING", "nullable": True},
        "total": {"type": "NUMBER", "nullable": True},
        "items": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "name": {"type": "STRING"},
                    "quantity": {"type": "NUMBER"},
                    "unit": {"type": "STRING"},
                    "category": {"type": "STRING"},
                    "price": {"type": "NUMBER", "nullable": True},
                },
                "required": ["name"],
            },
        },
    },
    "required": ["items"],
}


def is_configured() -> bool:
    return bool(os.getenv("GEMINI_API_KEY", "").strip())


def scan_receipt(image_b64: str, timeout: float) -> dict[str, Any]:
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key:
        raise ProviderError(PROVIDER_GEMINI, KIND_NOT_CONFIGURED, "no_key")
    model = os.getenv("GEMINI_RECEIPT_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": RECEIPT_PROMPT},
                    {"inline_data": {"mime_type": sniff_mime(image_b64), "data": image_b64}},
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0,
            "maxOutputTokens": 2048,
            "responseMimeType": "application/json",
            "responseSchema": _SCHEMA,
        },
    }
    resp = None
    for attempt in (1, 2):
        try:
            # Key goes in a header, never in the URL, so it can't land in access logs.
            resp = httpx.post(
                _ENDPOINT.format(model=model),
                headers={"x-goog-api-key": key, "Content-Type": "application/json"},
                json=payload,
                timeout=timeout,
            )
        except httpx.TimeoutException as exc:
            raise ProviderError(PROVIDER_GEMINI, KIND_TIMEOUT, "timeout") from exc
        except httpx.HTTPError as exc:
            raise ProviderError(PROVIDER_GEMINI, KIND_ERROR, type(exc).__name__) from exc
        # Gemini answers 503 "high demand" in short spikes: one quick retry, never on quota.
        if resp.status_code == 503 and attempt == 1:
            time.sleep(1.5)
            continue
        break
    if resp.status_code >= 400:
        raise classify_http_failure(PROVIDER_GEMINI, resp.status_code, resp.text)
    try:
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        data = json.loads(text)
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise ProviderError(PROVIDER_GEMINI, KIND_ERROR, "bad_json") from exc
    return normalize_receipt(PROVIDER_GEMINI, data)
