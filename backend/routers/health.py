"""Health check endpoints."""

from __future__ import annotations

import os
import time
from datetime import datetime, timezone

from fastapi import APIRouter

from database.db import ping_database

router = APIRouter(tags=["Health"])

_start_time = time.time()


@router.get("/")
async def root():
    return {
        "name": "Pantry Hub API",
        "version": "1.0.0",
        "status": "operational",
        "environment": os.getenv("NODE_ENV", os.getenv("ENVIRONMENT", "development")),
        "documentation": "/docs",
        "health": "/health",
    }


@router.get("/health")
async def health():
    db_ok = ping_database()
    body = {
        "status": "healthy" if db_ok else "unhealthy",
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "uptime": time.time() - _start_time,
        "environment": os.getenv("NODE_ENV", os.getenv("ENVIRONMENT", "development")),
        "version": "1.0.0",
    }
    if not db_ok:
        body["error"] = "Database connection failed"
        from fastapi.responses import JSONResponse

        return JSONResponse(status_code=503, content=body)
    return body