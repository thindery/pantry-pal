"""FastAPI application factory for PantryPal."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.config import get_settings
from backend.middleware.rate_limit import RateLimitMiddleware
from backend.models.responses import error_response
from backend.routers import (
    activities,
    admin,
    barcode,
    client_errors,
    health,
    items,
    receipts,
    scan,
    shopping_sessions,
    subscription,
    webhooks,
)
from database.db import close_pool, init_pool, ping_database


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    try:
        init_pool()
        if ping_database():
            print("✓ Database connected")
        else:
            print("⚠ Database connection failed at startup")
    except Exception as exc:
        print(f"⚠ Database pool init skipped: {exc}")
    yield
    close_pool()


def create_app() -> FastAPI:
    settings = get_settings()
    docs_enabled = os.getenv("ENABLE_API_DOCS", "1").lower() not in ("0", "false", "no")

    app = FastAPI(
        title=settings.APP_NAME,
        description="PantryPal inventory management API",
        version=settings.APP_VERSION,
        docs_url="/docs" if docs_enabled else None,
        redoc_url="/redoc" if docs_enabled else None,
        openapi_url="/openapi.json" if docs_enabled else None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=settings.allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RateLimitMiddleware)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_request: Request, exc: HTTPException):
        if isinstance(exc.detail, dict) and "success" in exc.detail:
            return JSONResponse(status_code=exc.status_code, content=exc.detail)
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, _exc: Exception):
        return JSONResponse(
            status_code=500,
            content=error_response("INTERNAL_ERROR", "An internal error occurred"),
        )

    app.include_router(health.router)
    app.include_router(items.router)
    app.include_router(activities.router)
    app.include_router(shopping_sessions.router)
    app.include_router(barcode.router)
    app.include_router(receipts.router)
    app.include_router(subscription.router)
    app.include_router(webhooks.router)
    app.include_router(admin.router)
    app.include_router(client_errors.router)
    app.include_router(scan.router)

    return app


app = create_app()