"""PP-186: app_settings persistence against real Postgres. RUN_POSTGRES_TESTS=1."""

from __future__ import annotations

import os

import pytest

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_POSTGRES_TESTS") != "1",
    reason="Set RUN_POSTGRES_TESTS=1 and DATABASE_URL to run",
)


@pytest.fixture(scope="module", autouse=True)
def _migrated():
    from database.migrate import migrate

    migrate()


@pytest.fixture(autouse=True)
def _clean():
    from database.db import db_connection

    def wipe():
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM app_settings WHERE key = 'ai_receipt_provider'")

    wipe()
    yield
    wipe()


def test_default_is_ollama_then_choice_persists_and_can_flip_back():
    from backend.services import app_settings

    assert app_settings.get_ai_provider() == "ollama"
    app_settings.set_ai_provider("gemini", "admin_1")
    assert app_settings.get_ai_provider() == "gemini"
    app_settings.set_ai_provider("ollama", "admin_1")
    assert app_settings.get_ai_provider() == "ollama"


def test_unknown_provider_is_rejected_and_nothing_stored():
    from backend.services import app_settings

    with pytest.raises(ValueError):
        app_settings.set_ai_provider("nope")
    assert app_settings.get_setting("ai_receipt_provider") is None
