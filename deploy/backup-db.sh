#!/bin/bash
# PP-233: nightly Postgres backup for Pantry Hub (runs on the OVH server, from cron).
# Writes /opt/pantry-pal/backups/nightly-YYYYMMDD-HHMMSS.sql.gz, checks the file, and
# deletes nightly-* files older than KEEP_DAYS. Manual pre-migration dumps (pre-*) are never touched.
# No credentials here: pg_dump runs inside the DB container using its own POSTGRES_USER/POSTGRES_DB.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/pantry-pal/backups}"
DB_CONTAINER="${DB_CONTAINER:-pantry-pal-db}"
KEEP_DAYS="${KEEP_DAYS:-14}"
MIN_BYTES="${MIN_BYTES:-10000}"

umask 077
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/nightly-$STAMP.sql.gz"
TMP="$OUT.partial"
trap 'rm -f "$TMP"' EXIT

docker exec "$DB_CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' | gzip -9 > "$TMP"

gzip -t "$TMP"
SIZE=$(wc -c < "$TMP" | tr -d ' ')
if [ "$SIZE" -lt "$MIN_BYTES" ]; then
  echo "backup too small ($SIZE bytes); keeping nothing" >&2
  exit 1
fi
mv "$TMP" "$OUT"
trap - EXIT

find "$BACKUP_DIR" -maxdepth 1 -name 'nightly-*.sql.gz' -type f -mtime +"$KEEP_DAYS" -delete
echo "$(date -u +%FT%TZ) backup ok $OUT ${SIZE} bytes; kept $(find "$BACKUP_DIR" -maxdepth 1 -name 'nightly-*.sql.gz' | wc -l | tr -d ' ') nightly files"
