"""Client error logging for admin diagnostics."""

from __future__ import annotations

import uuid
from typing import Any, Optional

from database.db import db_connection


def save_client_error(
    *,
    user_id: Optional[str] = None,
    error_type: str,
    error_message: str,
    error_stack: Optional[str] = None,
    component: Optional[str] = None,
    url: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> dict[str, str]:
    error_id = str(uuid.uuid4())
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO client_errors (
                    id, user_id, error_type, error_message, error_stack,
                    component, url, user_agent
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    error_id,
                    user_id,
                    error_type,
                    error_message,
                    error_stack,
                    component,
                    url,
                    user_agent,
                ),
            )
    return {"id": error_id}


def get_client_errors(
    *,
    resolved: Optional[bool] = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    clauses = ["1=1"]
    params: list[Any] = []

    if resolved is not None:
        clauses.append("resolved = %s")
        params.append(resolved)

    params.append(limit)
    query = (
        f"SELECT * FROM client_errors WHERE {' AND '.join(clauses)} "
        f"ORDER BY created_at DESC LIMIT %s"
    )

    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            rows = cur.fetchall()

    return [
        {
            "id": row["id"],
            "user_id": row.get("user_id"),
            "error_type": row["error_type"],
            "error_message": row["error_message"],
            "error_stack": row.get("error_stack"),
            "component": row.get("component"),
            "url": row.get("url"),
            "user_agent": row.get("user_agent"),
            "resolved": bool(row.get("resolved")),
            "created_at": row["created_at"].isoformat()
            if hasattr(row["created_at"], "isoformat")
            else str(row["created_at"]),
        }
        for row in rows
    ]


def mark_error_resolved(error_id: str) -> bool:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE client_errors SET resolved = TRUE WHERE id = %s",
                (error_id,),
            )
            return cur.rowcount > 0