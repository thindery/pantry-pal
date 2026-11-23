"""PP-088: increment existing pantry items instead of inserting a new row."""

from unittest.mock import MagicMock
from backend.services.pantry_service import _advisory_lock_key, _clean_barcode, _find_existing_item


def test_clean_barcode_strips_non_digits():
    assert _clean_barcode(" 0743-0500-1161 ") == "074305001161"
    assert _clean_barcode("") is None
    assert _clean_barcode(None) is None


def test_advisory_lock_key_is_stable_across_upc_ean_variants():
    user = "user-1"
    twelve = _advisory_lock_key(user, "074305001161", "Vinegar", "pantry")
    thirteen = _advisory_lock_key(user, "0074305001161", "Vinegar", "pantry")
    other = _advisory_lock_key(user, "074305001162", "Vinegar", "pantry")
    assert twelve == thirteen
    assert twelve != other


def test_find_existing_item_milk_unbarcoded_attach():
    """PP-156: When an add has a barcode and no row matches that barcode,
    attach to an existing UNBARCODED row with the same normalized name.
    """
    cur = MagicMock()
    # First query for barcode returns None; second query for unbarcoded same-name returns item
    cur.fetchone.side_effect = [
        None,
        {
            "id": "milk-unbarcoded-id",
            "user_id": "user-1",
            "name": "Milk",
            "quantity": 1.0,
            "unit": "gallons",
            "category": "dairy",
            "last_updated": "2026-07-11T00:00:00Z",
            "barcode": None,
            "image_url": None,
            "target_quantity": None,
        },
    ]

    item = _find_existing_item(
        cur,
        "user-1",
        barcode="4099100151299",
        name="Milk",
        category="dairy",
    )

    assert item is not None
    assert item["id"] == "milk-unbarcoded-id"
    assert item["name"] == "Milk"
    assert item["barcode"] is None
    assert cur.execute.call_count == 2
    # Verify the second query searched for unbarcoded item with lower(btrim(name))
    second_query = cur.execute.call_args_list[1][0][0]
    assert "barcode IS NULL OR i.barcode = ''" in second_query
    assert "LOWER(BTRIM(i.name)) = LOWER(BTRIM(%s))" in second_query

