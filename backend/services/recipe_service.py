"""Service for managing saved recipes and URL imports."""

from __future__ import annotations

import json
import uuid
from typing import Any, Optional

from backend.lib.recipe_import import clean_ingredient_name, fetch_url_html, parse_recipe_json_ld, sanitize_stored_url
from backend.services import subscription_service
from database.db import db_connection


def _map_recipe(row: dict[str, Any]) -> dict[str, Any]:
    raw_ingredients = row.get("ingredients")
    if isinstance(raw_ingredients, str):
        try:
            ingredients = json.loads(raw_ingredients)
        except Exception:
            ingredients = []
    elif isinstance(raw_ingredients, list):
        ingredients = raw_ingredients
    else:
        ingredients = []

    raw_instructions = row.get("instructions")
    if isinstance(raw_instructions, str):
        try:
            instructions = json.loads(raw_instructions)
        except Exception:
            instructions = []
    elif isinstance(raw_instructions, list):
        instructions = raw_instructions
    else:
        instructions = []

    return {
        "id": row["id"],
        "userId": row["user_id"],
        "title": row["title"],
        "sourceUrl": row.get("source_url"),
        "imageUrl": row.get("image_url"),
        "servings": row.get("servings"),
        "ingredients": ingredients,
        "instructions": instructions,
        "createdAt": str(row.get("created_at", "")),
    }


def count_user_recipes(user_id: str) -> int:
    """Return total number of saved recipes for this user."""
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS count FROM recipes WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            if row:
                return int(row["count"]) if isinstance(row, dict) else int(row[0])
            return 0


def get_user_recipes(user_id: str) -> list[dict[str, Any]]:
    """List all saved recipes for this user."""
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM recipes WHERE user_id = %s ORDER BY created_at DESC",
                (user_id,),
            )
            rows = cur.fetchall()
            return [_map_recipe(r) for r in rows]


def get_recipe_by_id(user_id: str, recipe_id: str) -> Optional[dict[str, Any]]:
    """Retrieve a single saved recipe for this user."""
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM recipes WHERE user_id = %s AND id = %s",
                (user_id, recipe_id),
            )
            row = cur.fetchone()
            return _map_recipe(row) if row else None


def normalize_ingredients_input(items: list[Any]) -> list[dict[str, str]]:
    """Normalize input ingredients into list of {'raw': str, 'name': str}."""
    normalized: list[dict[str, str]] = []
    for item in items:
        if isinstance(item, dict):
            raw = str(item.get("raw") or item.get("name") or "").strip()
            name = str(item.get("name") or "").strip()
            if not name:
                name = clean_ingredient_name(raw) or raw
            if raw:
                normalized.append({"raw": raw, "name": name or raw})
        elif isinstance(item, str):
            line = item.strip()
            if line:
                name = clean_ingredient_name(line) or line
                normalized.append({"raw": line, "name": name})
    return normalized


def create_recipe(user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Create a new recipe after verifying user's subscription tier limit."""
    current_count = count_user_recipes(user_id)
    tier_check = subscription_service.can_save_recipe(user_id, current_count)
    if not tier_check["allowed"]:
        raise ValueError("TIER_LIMIT_EXCEEDED")

    recipe_id = str(uuid.uuid4())
    title = str(payload.get("title", "")).strip()
    if not title:
        raise ValueError("Title is required")
    # Store a source link only; never fetch it here. v1 does not persist third-party image URLs.
    source_url = sanitize_stored_url(payload.get("sourceUrl") or payload.get("source_url"))
    image_url = None
    servings = payload.get("servings")
    ingredients = normalize_ingredients_input(payload.get("ingredients") or [])
    instructions = [str(step).strip() for step in (payload.get("instructions") or []) if str(step).strip()]

    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO recipes (id, user_id, title, source_url, image_url, servings, ingredients, instructions, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                RETURNING *
                """,
                (
                    recipe_id,
                    user_id,
                    title,
                    source_url,
                    image_url,
                    servings,
                    json.dumps(ingredients),
                    json.dumps(instructions),
                ),
            )
            row = cur.fetchone()
            if row:
                return _map_recipe(row)

    return {
        "id": recipe_id,
        "userId": user_id,
        "title": title,
        "sourceUrl": source_url,
        "imageUrl": image_url,
        "servings": servings,
        "ingredients": ingredients,
        "instructions": instructions,
        "createdAt": "",
    }


def import_recipe_from_url(user_id: str, url: str) -> dict[str, Any]:
    """Fetch URL, parse JSON-LD Recipe, and save after verifying tier limit."""
    current_count = count_user_recipes(user_id)
    tier_check = subscription_service.can_save_recipe(user_id, current_count)
    if not tier_check["allowed"]:
        raise ValueError("TIER_LIMIT_EXCEEDED")

    html_content = fetch_url_html(url)
    # Keep the user-supplied URL as the source link (already SSRF-validated by the fetch).
    parsed = parse_recipe_json_ld(html_content, source_url=url)
    parsed["imageUrl"] = None
    parsed["sourceUrl"] = url
    return create_recipe(user_id, parsed)


def delete_recipe(user_id: str, recipe_id: str) -> bool:
    """Delete a recipe belonging to the specified user."""
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM recipes WHERE user_id = %s AND id = %s",
                (user_id, recipe_id),
            )
            return cur.rowcount > 0
