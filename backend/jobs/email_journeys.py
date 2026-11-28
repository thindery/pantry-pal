"""PP-194 cron entry: ``python -m backend.jobs.email_journeys [--dry-run]``.

Sends nothing while ``EMAIL_JOURNEYS_ENABLED`` is off (only ``EMAIL_JOURNEYS_TEST_RECIPIENTS`` in test mode).
"""

from __future__ import annotations

import json
import logging
import sys

from backend.services import email_journeys, free_limit_emails


def main(argv: list[str]) -> int:
    logging.basicConfig(level=logging.INFO)
    dry_run = "--dry-run" in argv
    stats = email_journeys.run(dry_run=dry_run)
    print(json.dumps(stats))
    # PP-248: free-limit emails (off unless FREE_LIMIT_EMAILS_ENABLED and FREE_LIMIT_EMAILS_SINCE are set).
    try:
        print(json.dumps({"free_limit": free_limit_emails.run(dry_run=dry_run)}, default=str))
    except Exception:
        logging.exception("free-limit emails run failed")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
