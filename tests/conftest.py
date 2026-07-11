"""Pytest fixtures for PantryPal API contract tests."""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("ALLOW_TEST_AUTH", "1")
os.environ.setdefault("RATE_LIMIT_STORE", "memory")
os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/pantry_pal_test")

from app import app  # noqa: E402


@pytest.fixture(autouse=True)
def clear_rate_limits():
    from backend.services.rate_limit_service import (
        clear_memory_buckets,
        clear_rate_limit_events,
    )

    clear_memory_buckets()
    clear_rate_limit_events()
    yield
    clear_memory_buckets()
    clear_rate_limit_events()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {
        "Authorization": "Bearer test-token",
        "x-user-id": "test_user_contract_001",
    }