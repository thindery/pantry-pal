"""Pytest fixtures for PantryPal API contract tests."""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("ALLOW_TEST_AUTH", "1")
os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/pantry_pal_test")

from app import app  # noqa: E402


@pytest.fixture(autouse=True)
def clear_rate_limits():
    from backend.middleware.rate_limit import _buckets

    _buckets.clear()
    yield
    _buckets.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {
        "Authorization": "Bearer test-token",
        "x-user-id": "test_user_contract_001",
    }