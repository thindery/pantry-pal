"""Migration file discovery should not treat rollback SQL as a forward migration."""

from __future__ import annotations

from database.migrate import get_migration_files


def test_get_migration_files_skips_rollback_sql():
    files = get_migration_files()
    names = [m["filename"] for m in files]
    versions = [m["version"] for m in files]
    assert "021_saved_recipes.sql" in names
    assert "021_saved_recipes.rollback.sql" not in names
    assert "021_saved_recipes.rollback" not in versions
    assert all(not name.endswith(".rollback.sql") for name in names)
