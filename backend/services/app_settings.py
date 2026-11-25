"""Small server-side key/value settings (PP-186). Persisted in Postgres `app_settings`."""

from __future__ import annotations

import logging

from backend.services.ai_providers.base import DEFAULT_PROVIDER, PROVIDERS
from database.db import db_connection

logger = logging.getLogger("pantry.app_settings")

AI_PROVIDER_KEY = "ai_receipt_provider"


def get_setting(key: str) -> str | None:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT value FROM app_settings WHERE key = %s", (key,))
            row = cur.fetchone()
            return row["value"] if row else None


def set_setting(key: str, value: str, updated_by: str | None = None) -> None:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO app_settings (key, value, updated_by, updated_at)
                VALUES (%s, %s, %s, now())
                ON CONFLICT (key) DO UPDATE
                SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()
                """,
                (key, value, updated_by),
            )


def get_ai_provider() -> str:
    """Selected receipt AI provider. Ollama is the default for no row, a bad value, or any DB error."""
    try:
        value = get_setting(AI_PROVIDER_KEY)
    except Exception:
        logger.warning("ai provider setting unreadable, using default=%s", DEFAULT_PROVIDER)
        return DEFAULT_PROVIDER
    return value if value in PROVIDERS else DEFAULT_PROVIDER


def set_ai_provider(provider: str, updated_by: str | None = None) -> str:
    if provider not in PROVIDERS:
        raise ValueError("unknown provider")
    set_setting(AI_PROVIDER_KEY, provider, updated_by)
    return provider
