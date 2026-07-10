"""Database connection helpers for PantryPal (Postgres via DATABASE_URL)."""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Any, Generator, Optional

import psycopg2
import psycopg2.extras
from psycopg2.pool import SimpleConnectionPool

_pool: Optional[SimpleConnectionPool] = None


def get_database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if url:
        return url
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    name = os.getenv("DB_NAME", "pantry_pal")
    user = os.getenv("DB_USER", "postgres")
    password = os.getenv("DB_PASSWORD", "postgres")
    return f"postgresql://{user}:{password}@{host}:{port}/{name}"


def init_pool(minconn: int = 1, maxconn: int = 10) -> None:
    global _pool
    if _pool is not None:
        return
    dsn = get_database_url()
    sslmode = "require" if os.getenv("DB_SSL", "").lower() == "true" else "prefer"
    _pool = SimpleConnectionPool(
        minconn,
        maxconn,
        dsn=dsn,
        sslmode=sslmode,
        cursor_factory=psycopg2.extras.RealDictCursor,
    )


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.closeall()
        _pool = None


def get_connection():
    if _pool is None:
        init_pool()
    assert _pool is not None
    return _pool.getconn()


def put_connection(conn) -> None:
    if _pool is not None:
        _pool.putconn(conn)


@contextmanager
def db_connection() -> Generator[Any, None, None]:
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        put_connection(conn)


def ping_database() -> bool:
    try:
        if _pool is None:
            init_pool()
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        return True
    except Exception:
        return False