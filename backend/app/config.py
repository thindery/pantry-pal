"""Application settings loaded from environment variables."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import List


class Settings:
    APP_NAME = "Pantry Hub API"
    APP_VERSION = "1.0.0"
    PORT = int(os.getenv("PORT", "8000"))
    ENVIRONMENT = os.getenv("NODE_ENV", os.getenv("ENVIRONMENT", "development"))

    # Rate limits (requests per minute) — PP-030
    RATE_LIMIT_GENERAL = int(os.getenv("RATE_LIMIT_GENERAL", "100"))
    RATE_LIMIT_RECEIPT_SCAN = int(os.getenv("RATE_LIMIT_RECEIPT_SCAN", "10"))
    RATE_LIMIT_BARCODE = int(os.getenv("RATE_LIMIT_BARCODE", "30"))
    RATE_LIMIT_CLIENT_ERRORS = int(os.getenv("RATE_LIMIT_CLIENT_ERRORS", "10"))

    @property
    def cors_origins(self) -> List[str]:
        raw = os.getenv("CORS_ORIGINS", "") or os.getenv("ALLOWED_ORIGINS", "")
        if raw.strip():
            return [o.strip() for o in raw.split(",") if o.strip()]
        if self.ENVIRONMENT == "production":
            frontend = os.getenv("FRONTEND_URL", "").strip()
            return [frontend] if frontend else []
        return ["*"]

    @property
    def allow_credentials(self) -> bool:
        return "*" not in self.cors_origins


@lru_cache
def get_settings() -> Settings:
    return Settings()