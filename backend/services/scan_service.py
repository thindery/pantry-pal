"""Receipt scan parsing and visual usage detection."""

from __future__ import annotations

import re
from typing import Any, Optional

from backend.services import pantry_service

_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "produce": ["apple", "banana", "orange", "lettuce", "tomato", "onion", "carrot"],
    "dairy": ["milk", "cheese", "yogurt", "butter", "cream", "egg"],
    "meat": ["chicken", "beef", "pork", "fish", "salmon", "turkey"],
    "bakery": ["bread", "bagel", "muffin", "cake", "roll"],
    "pantry": ["rice", "pasta", "flour", "sugar", "oil", "sauce"],
    "beverages": ["water", "soda", "juice", "coffee", "tea"],
    "frozen": ["frozen", "ice cream", "pizza"],
}

_SUPPORTED_ITEMS = [
    {"name": "apple", "category": "produce", "typicalUnit": "pieces"},
    {"name": "banana", "category": "produce", "typicalUnit": "pieces"},
    {"name": "milk", "category": "dairy", "typicalUnit": "gallons"},
    {"name": "eggs", "category": "dairy", "typicalUnit": "pieces"},
    {"name": "bread", "category": "bakery", "typicalUnit": "loaves"},
    {"name": "chicken", "category": "meat", "typicalUnit": "lbs"},
    {"name": "rice", "category": "pantry", "typicalUnit": "cups"},
    {"name": "pasta", "category": "pantry", "typicalUnit": "lbs"},
    {"name": "tomato", "category": "produce", "typicalUnit": "pieces"},
    {"name": "onion", "category": "produce", "typicalUnit": "pieces"},
    {"name": "cheese", "category": "dairy", "typicalUnit": "lbs"},
    {"name": "yogurt", "category": "dairy", "typicalUnit": "cups"},
    {"name": "carrot", "category": "produce", "typicalUnit": "pieces"},
    {"name": "lettuce", "category": "produce", "typicalUnit": "heads"},
    {"name": "potato", "category": "produce", "typicalUnit": "pieces"},
]


def _infer_category(name: str) -> str:
    lower_name = name.lower()
    for category, keywords in _CATEGORY_KEYWORDS.items():
        if any(keyword in lower_name for keyword in keywords):
            return category
    return "general"


def _parse_receipt_text(text: str) -> list[dict[str, Any]]:
    lines = [line for line in text.split("\n") if line.strip()]
    results: list[dict[str, Any]] = []

    for line in lines:
        match = re.match(r"(.+?)\s+(?:\$?\d+\.\d+|\d+)\s*(\w+)?", line, re.I)
        if not match:
            continue
        name = match.group(1).strip()
        results.append(
            {
                "name": name,
                "quantity": 1,
                "unit": match.group(2) or "pieces",
                "category": _infer_category(name),
            }
        )

    return results


def process_receipt_scan(raw_data: str | list[dict[str, Any]]) -> list[dict[str, Any]]:
    if isinstance(raw_data, list):
        return [
            item
            for item in raw_data
            if item.get("name") and float(item.get("quantity", -1)) >= 0
        ]

    return _parse_receipt_text(raw_data)


def process_visual_usage(
    user_id: str,
    detections: list[dict[str, Any]],
    source: str = "VISUAL_USAGE",
) -> dict[str, Any]:
    processed: list[dict[str, Any]] = []
    activities: list[dict[str, Any]] = []
    errors: list[str] = []

    for detection in detections:
        item = pantry_service.get_item_by_name(user_id, detection["name"])
        if not item:
            errors.append(f"Item not found: {detection['name']}")
            continue

        activity = pantry_service.log_activity(
            user_id,
            item["id"],
            "REMOVE",
            detection["quantityUsed"],
            source,
        )
        if activity:
            processed.append(detection)
            activities.append(activity)
        else:
            errors.append(f"Failed to log usage for: {detection['name']}")

    return {
        "processed": processed,
        "activities": activities,
        "errors": errors,
    }


def get_supported_items() -> list[dict[str, str]]:
    return list(_SUPPORTED_ITEMS)