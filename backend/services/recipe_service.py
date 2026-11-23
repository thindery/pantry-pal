"""Service for managing saved recipes and URL imports."""

from __future__ import annotations

import json
import uuid
from typing import Any, Optional

import logging

from backend.lib.recipe_import import (
    ContentTooLargeError,
    RecipeNotFoundError,
    SSRFError,
    SiteBlockedError,
    clean_ingredient_name,
    extract_og_title,
    fetch_url_html,
    parse_pasted_recipe as parse_pasted_recipe_lib,
    parse_recipe_json_ld,
    sanitize_stored_url,
    strip_tracking_params,
    title_from_source_url,
)
from backend.services import subscription_service
from database.db import db_connection

logger = logging.getLogger(__name__)


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
        "isComplete": bool(row["is_complete"]) if row.get("is_complete") is not None else True,
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
    if "isComplete" in payload or "is_complete" in payload:
        is_complete = bool(payload.get("isComplete") if "isComplete" in payload else payload.get("is_complete"))
    else:
        is_complete = True

    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO recipes (id, user_id, title, source_url, image_url, servings, ingredients, instructions, is_complete, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
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
                    is_complete,
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
        "isComplete": is_complete,
        "createdAt": "",
    }


def _save_link_only_recipe(user_id: str, source_url: str, title: Optional[str] = None) -> dict[str, Any]:
    """Save a private link-only recipe when page details could not be imported."""
    resolved_title = (title or "").strip() or title_from_source_url(source_url)
    return create_recipe(
        user_id,
        {
            "title": resolved_title,
            "sourceUrl": source_url,
            "ingredients": [],
            "instructions": [],
            "isComplete": False,
        },
    )


def import_recipe_from_url(user_id: str, url: str) -> dict[str, Any]:
    """Fetch URL, parse JSON-LD Recipe, and save after verifying tier limit.

    If the site blocks the fetch or the page has no Recipe JSON-LD, still save a
    link-only recipe (title from og:title or the URL slug). Reasons stay in logs.
    """
    current_count = count_user_recipes(user_id)
    tier_check = subscription_service.can_save_recipe(user_id, current_count)
    if not tier_check["allowed"]:
        raise ValueError("TIER_LIMIT_EXCEEDED")

    clean_url = sanitize_stored_url(strip_tracking_params(url) or url)
    if not clean_url:
        raise SSRFError("URL cannot be empty")

    html_content = None
    try:
        html_content = fetch_url_html(clean_url)
    except SiteBlockedError as exc:
        logger.info("Recipe import incomplete (site blocked) url=%s: %s", clean_url, exc)
    except ContentTooLargeError as exc:
        logger.info("Recipe import incomplete (too large) url=%s: %s", clean_url, exc)
    except SSRFError as exc:
        # The URL itself already passed sanitize_stored_url. Fetch/status/redirect
        # failures should not surface to the user; save the link only.
        logger.info("Recipe import incomplete (fetch failed) url=%s: %s", clean_url, exc)
    except Exception as exc:
        logger.warning("Recipe import incomplete (unexpected) url=%s: %s", clean_url, exc)

    if html_content:
        try:
            parsed = parse_recipe_json_ld(html_content, source_url=clean_url)
            parsed["imageUrl"] = None
            parsed["sourceUrl"] = clean_url
            parsed["isComplete"] = True
            return create_recipe(user_id, parsed)
        except RecipeNotFoundError as exc:
            logger.info("Recipe import incomplete (no JSON-LD) url=%s: %s", clean_url, exc)
            return _save_link_only_recipe(user_id, clean_url, title=extract_og_title(html_content))

    return _save_link_only_recipe(user_id, clean_url)


def parse_pasted_recipe(text: str, source_url: Optional[str] = None) -> dict[str, Any]:
    """Parse recipe text or HTML without saving or checking tier limits."""
    clean_url = sanitize_stored_url(source_url) if source_url else None
    return parse_pasted_recipe_lib(text, source_url=clean_url)


def update_recipe(user_id: str, recipe_id: str, payload: dict[str, Any]) -> Optional[dict[str, Any]]:
    """Update a recipe belonging to this user. Adding details marks it complete."""
    existing = get_recipe_by_id(user_id, recipe_id)
    if not existing:
        return None

    title = payload.get("title")
    if title is not None:
        title = str(title).strip()
        if not title:
            raise ValueError("Title is required")
    else:
        title = existing["title"]

    if "sourceUrl" in payload or "source_url" in payload:
        source_url = sanitize_stored_url(payload.get("sourceUrl") or payload.get("source_url"))
    else:
        source_url = existing.get("sourceUrl")

    servings = existing.get("servings")
    if "servings" in payload:
        raw_servings = payload.get("servings")
        servings = (str(raw_servings).strip() or None) if raw_servings is not None else None

    if "ingredients" in payload:
        ingredients = normalize_ingredients_input(payload.get("ingredients") or [])
    else:
        ingredients = existing.get("ingredients") or []

    if "instructions" in payload:
        instructions = [str(step).strip() for step in (payload.get("instructions") or []) if str(step).strip()]
    else:
        instructions = existing.get("instructions") or []

    # User-submitted details mark the recipe complete when ingredients or steps are present.
    is_complete = True if (ingredients or instructions) else bool(existing.get("isComplete"))

    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE recipes
                SET title = %s, source_url = %s, servings = %s, ingredients = %s, instructions = %s, is_complete = %s
                WHERE user_id = %s AND id = %s
                RETURNING *
                """,
                (
                    title,
                    source_url,
                    servings,
                    json.dumps(ingredients),
                    json.dumps(instructions),
                    is_complete,
                    user_id,
                    recipe_id,
                ),
            )
            row = cur.fetchone()
            return _map_recipe(row) if row else None


def delete_recipe(user_id: str, recipe_id: str) -> bool:
    """Delete a recipe belonging to the specified user."""
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM recipes WHERE user_id = %s AND id = %s",
                (user_id, recipe_id),
            )
            return cur.rowcount > 0
