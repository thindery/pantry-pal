#!/usr/bin/env python3
"""PP-156: Merge duplicate pantry items by exact normalized name.

Scans pantry_items for rows sharing the same user and exact normalized name
(lower(btrim(name)) with collapsed whitespace).

Usage:
    # Dry run (default, safe, read-only):
    python scripts/merge_duplicate_pantry_items_by_name.py
    python scripts/merge_duplicate_pantry_items_by_name.py --user-id <uuid>
    python scripts/merge_duplicate_pantry_items_by_name.py --email user@example.com

    # Apply changes (requires --apply AND --backup-confirmed):
    python scripts/merge_duplicate_pantry_items_by_name.py --apply --backup-confirmed
    python scripts/merge_duplicate_pantry_items_by_name.py --apply --backup-confirmed --include-review
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from collections import defaultdict
from typing import Any

from database.db import db_connection


def normalize_name(name: str | None) -> str:
    if not name:
        return ""
    return re.sub(r"\s+", " ", name.strip().lower())


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Merge duplicate pantry items sharing the same normalized name."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply changes to the database. Requires --backup-confirmed.",
    )
    parser.add_argument(
        "--backup-confirmed",
        action="store_true",
        help="Confirm that a database backup has been taken before writing.",
    )
    parser.add_argument(
        "--include-review",
        action="store_true",
        help="Also merge 'review' groups (items with different barcodes) during --apply.",
    )
    parser.add_argument(
        "--user-id",
        type=str,
        default=None,
        help="Filter to a specific user ID.",
    )
    parser.add_argument(
        "--email",
        type=str,
        default=None,
        help="Filter to a specific user email.",
    )
    return parser.parse_args()


def classify_group(items: list[dict[str, Any]]) -> str:
    """Classify a duplicate group as 'safe' or 'review'.

    'safe': At most one distinct barcode across all items (one barcoded + unbarcoded,
            or multiple unbarcoded).
    'review': Two or more different barcodes across the items.
    """
    barcodes = {i["barcode"] for i in items if i.get("barcode")}
    if len(barcodes) > 1:
        return "review"
    return "safe"


def main() -> None:
    args = parse_args()

    if args.apply and not args.backup_confirmed:
        sys.stderr.write(
            "ERROR: --apply requires --backup-confirmed to guarantee a database backup exists.\n"
        )
        sys.exit(1)

    is_dry_run = not args.apply

    mode_label = "DRY RUN (read-only)" if is_dry_run else "APPLY (live writes)"
    print(f"=== Pantry Hub Duplicate Items Merger [{mode_label}] ===")

    with db_connection() as conn:
        with conn.cursor() as cur:
            if is_dry_run:
                cur.execute("SET TRANSACTION READ ONLY")
            target_user_id: str | None = None
            if args.email:
                cur.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(%s)", (args.email,))
                user_row = cur.fetchone()
                if not user_row:
                    sys.stderr.write(f"User with specified email not found.\n")
                    sys.exit(1)
                target_user_id = str(user_row["id"])
            elif args.user_id:
                target_user_id = args.user_id

            if target_user_id:
                cur.execute(
                    """
                    SELECT id, user_id, name, barcode, quantity, unit, category, target_quantity, created_at, last_updated
                    FROM pantry_items
                    WHERE user_id = %s
                    ORDER BY user_id, created_at ASC, id ASC
                    """,
                    (target_user_id,),
                )
            else:
                cur.execute(
                    """
                    SELECT id, user_id, name, barcode, quantity, unit, category, target_quantity, created_at, last_updated
                    FROM pantry_items
                    ORDER BY user_id, created_at ASC, id ASC
                    """
                )

            all_rows = cur.fetchall()

    user_groups: dict[str, dict[str, list[dict[str, Any]]]] = defaultdict(lambda: defaultdict(list))
    for row in all_rows:
        u_id = str(row["user_id"])
        norm = normalize_name(row["name"])
        user_groups[u_id][norm].append(dict(row))

    total_dup_groups = 0
    safe_groups_count = 0
    review_groups_count = 0
    merged_groups_count = 0

    for u_id, norm_map in user_groups.items():
        dup_groups_for_user = [
            (norm, items) for norm, items in norm_map.items() if len(items) > 1
        ]
        if not dup_groups_for_user:
            continue

        print(f"\nUser: {u_id[:8]}... ({len(dup_groups_for_user)} duplicate name groups)")

        for norm_name, items in dup_groups_for_user:
            total_dup_groups += 1
            classification = classify_group(items)
            if classification == "safe":
                safe_groups_count += 1
            else:
                review_groups_count += 1

            total_qty = sum(float(i.get("quantity") or 0) for i in items)
            print(
                f"  Group: \"{norm_name}\" | Classification: {classification.upper()} | "
                f"Count: {len(items)} | Total Qty: {total_qty}"
            )
            for item in items:
                bcode = item.get("barcode") or "(none)"
                print(
                    f"    - id: {str(item['id'])[:8]} | barcode: {bcode} | "
                    f"cat: {item.get('category')} | qty: {item.get('quantity')} {item.get('unit')}"
                )

            if not is_dry_run:
                if classification == "review" and not args.include_review:
                    print(f"    -> SKIPPED (review group, pass --include-review to merge)")
                    continue

                # Oldest item is the keeper
                oldest = min(items, key=lambda x: (x.get("created_at") or "", str(x["id"])))
                keep_id = oldest["id"]
                dup_ids = [x["id"] for x in items if x["id"] != keep_id]
                barcode_to_keep = oldest.get("barcode") or next(
                    (x["barcode"] for x in items if x.get("barcode")), None
                )
                target_to_keep = next(
                    (x["target_quantity"] for x in items if x.get("target_quantity") is not None),
                    None,
                )

                # Execute merge in one transaction per group
                with db_connection() as conn:
                    with conn.cursor() as cur:
                        # 1. Repoint activities onto keeper (activities cascade on item delete)
                        cur.execute(
                            "UPDATE activities SET item_id = %s WHERE item_id = ANY(%s)",
                            (keep_id, dup_ids),
                        )
                        # 2. Delete duplicate rows first so the keeper can take a barcode
                        #    without violating the unique canonical-barcode index
                        cur.execute(
                            "DELETE FROM pantry_items WHERE id = ANY(%s)",
                            (dup_ids,),
                        )
                        # 3. Sum quantity onto the keeper; keep any barcode and target
                        cur.execute(
                            """
                            UPDATE pantry_items
                            SET quantity = %s,
                                barcode = COALESCE(NULLIF(barcode, ''), %s),
                                target_quantity = COALESCE(target_quantity, %s),
                                last_updated = NOW()
                            WHERE id = %s
                            """,
                            (total_qty, barcode_to_keep, target_to_keep, keep_id),
                        )
                    conn.commit()

                merged_groups_count += 1
                print(f"    -> MERGED: Kept {str(keep_id)[:8]}, deleted {len(dup_ids)} duplicates, new qty {total_qty}")

    print("\n=== Summary ===")
    print(f"Total duplicate groups found: {total_dup_groups}")
    print(f"  - Safe (unbarcoded/single barcode): {safe_groups_count}")
    print(f"  - Review (different barcodes):      {review_groups_count}")
    if not is_dry_run:
        print(f"Total groups merged: {merged_groups_count}")
    else:
        print("Dry run complete. No database changes were made.")


if __name__ == "__main__":
    main()
