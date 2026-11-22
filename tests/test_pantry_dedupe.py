"""PP-088: increment existing pantry items instead of inserting a new row."""

from backend.services.pantry_service import _advisory_lock_key, _clean_barcode


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
