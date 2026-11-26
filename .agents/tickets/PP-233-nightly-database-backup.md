# PP-233: Nightly database backup with a tested restore

**Status:** ✅ Live (2026-11-26, about 1:50 PM CT)
**Priority:** P0 (data loss)
**Phase:** Reliability
**Created:** 2026-11-26
**Depends on:** —
**Blocks:** —

---

## Problem

Triage found no scheduled backup of the Pantry Hub database on OVH. The only dumps in `/opt/pantry-pal/backups/` were the manual `pg_dump` runs taken before migrations. A bad deploy, disk loss or a mistaken delete would lose paying customers' pantries.

## What shipped

- `deploy/backup-db.sh`: runs `pg_dump` inside `pantry-pal-db` (no credentials in the script), gzips to `/opt/pantry-pal/backups/nightly-YYYYMMDD-HHMMSS.sql.gz`, runs `gzip -t`, refuses files under 10 KB, and deletes `nightly-*` files older than 14 days. Manual `pre-*` dumps are never touched.
- Installed on the server as `/home/thindery/pantry-pal-backup-db.sh` (outside the repo, so deploys cannot collide with it). Cron on OVH: `30 8 * * *` UTC (2:30 AM CT), log `/var/tmp/pantry-pal-backup.log`.
- Verified: a first run wrote a 74 KB dump. Restore test in a throwaway `postgres:16-alpine` container with no network: 0 errors, 35 public tables, 3 users.
- If the script changes in git, copy it again: `scp deploy/backup-db.sh ovh:/home/thindery/pantry-pal-backup-db.sh`.

## Restore

`gunzip -c nightly-<stamp>.sql.gz | docker exec -i pantry-pal-db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'` into an empty database. Take a fresh dump first.

## Not covered (Tylor's call)

Backups live on the same server as the database. An off-server copy (for example the Mac Mini pulling the folder over `ssh ovh`, or OVH snapshots) would survive losing the server. The dumps hold customer emails, so this is Tylor's choice.
