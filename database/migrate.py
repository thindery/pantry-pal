#!/usr/bin/env python3
"""
Database Migration System for PantryPal (Postgres).

Usage:
    python database/migrate.py migrate
    python database/migrate.py rollback
    python database/migrate.py status
    python database/migrate.py version
"""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from database.db import db_connection, init_pool, close_pool

MIGRATIONS_DIR = Path(__file__).parent / "migrations"


def get_migration_files():
    migrations = []
    for file in sorted(MIGRATIONS_DIR.glob("*.sql")):
        if file.name.startswith("TEMPLATE"):
            continue
        version = file.stem  # full filename stem avoids duplicate numeric prefixes
        migrations.append(
            {
                "version": version,
                "filename": file.name,
                "path": file,
                "checksum": compute_checksum(file),
            }
        )
    return migrations


def compute_checksum(filepath: Path) -> str:
    with open(filepath, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()


def ensure_migrations_table(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                version TEXT UNIQUE NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                checksum TEXT
            )
            """
        )


def get_applied_migrations(conn) -> dict[str, str]:
    with conn.cursor() as cur:
        cur.execute("SELECT version, checksum FROM schema_migrations ORDER BY version")
        return {row["version"]: row["checksum"] for row in cur.fetchall()}


def apply_migration(conn, migration: dict) -> bool:
    sql = migration["path"].read_text()
    print(f"Applying migration {migration['version']}: {migration['filename']}...")
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
            cur.execute(
                "INSERT INTO schema_migrations (version, checksum) VALUES (%s, %s)",
                (migration["version"], migration["checksum"]),
            )
        conn.commit()
        print(f"  ✓ Migration {migration['version']} applied successfully")
        return True
    except Exception as exc:
        conn.rollback()
        print(f"  ✗ Migration {migration['version']} failed: {exc}")
        return False


def rollback_migration(conn, migration: dict) -> bool:
    rollback_file = migration["path"].with_suffix(".rollback.sql")
    if not rollback_file.exists():
        print(f"Warning: No rollback file for {migration['filename']}, skipping")
        return True
    print(f"Rolling back migration {migration['version']}...")
    try:
        with conn.cursor() as cur:
            cur.execute(rollback_file.read_text())
            cur.execute(
                "DELETE FROM schema_migrations WHERE version = %s",
                (migration["version"],),
            )
        conn.commit()
        print(f"  ✓ Migration {migration['version']} rolled back")
        return True
    except Exception as exc:
        conn.rollback()
        print(f"  ✗ Rollback {migration['version']} failed: {exc}")
        return False


def migrate() -> int:
    init_pool()
    try:
        with db_connection() as conn:
            ensure_migrations_table(conn)
            applied = get_applied_migrations(conn)
            migrations = get_migration_files()
            pending = [m for m in migrations if m["version"] not in applied]
            if not pending:
                print("No pending migrations")
                return 0
            print(f"Found {len(pending)} pending migration(s)\n")
            for migration in pending:
                if not apply_migration(conn, migration):
                    return 1
            print(f"\nApplied {len(pending)} migration(s) successfully")
            return 0
    finally:
        close_pool()


def rollback() -> int:
    init_pool()
    try:
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1"
                )
                row = cur.fetchone()
            if not row:
                print("No migrations to rollback")
                return 0
            last_version = row["version"]
            migrations = get_migration_files()
            migration = next((m for m in migrations if m["version"] == last_version), None)
            if not migration:
                print(f"Cannot find migration file for version {last_version}")
                return 1
            if rollback_migration(conn, migration):
                print(f"Rolled back {last_version}")
                return 0
            return 1
    finally:
        close_pool()


def status() -> int:
    init_pool()
    try:
        with db_connection() as conn:
            ensure_migrations_table(conn)
            applied = get_applied_migrations(conn)
            migrations = get_migration_files()
            print(f"{'Version':<10} {'Status':<14} {'Filename':<40}")
            print("-" * 66)
            for m in migrations:
                if m["version"] in applied:
                    ok = "✓" if applied[m["version"]] == m["checksum"] else "changed"
                    status_str = f"applied ({ok})"
                else:
                    status_str = "pending"
                print(f"{m['version']:<10} {status_str:<14} {m['filename']:<40}")
            pending = len([m for m in migrations if m["version"] not in applied])
            print(f"\nTotal: {len(migrations)} migration(s), {pending} pending")
            return 0
    finally:
        close_pool()


def version() -> int:
    init_pool()
    try:
        with db_connection() as conn:
            ensure_migrations_table(conn)
            applied = get_applied_migrations(conn)
            if applied:
                versions = sorted(applied.keys())
                print(f"Current schema version: {versions[-1]}")
                print(f"Applied migrations: {len(versions)}")
            else:
                print("No migrations applied")
            return 0
    finally:
        close_pool()


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    commands = {
        "migrate": migrate,
        "rollback": rollback,
        "status": status,
        "version": version,
    }
    cmd = sys.argv[1].lower()
    if cmd not in commands:
        print(f"Unknown command: {cmd}")
        return 1
    return commands[cmd]()


if __name__ == "__main__":
    sys.exit(main())