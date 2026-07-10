#!/usr/bin/env python3
"""PantryPal FastAPI entrypoint (uvicorn app:app)."""

from backend.app.main import app

if __name__ == "__main__":
    import uvicorn

    port = int(__import__("os").getenv("PORT", "8000"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)