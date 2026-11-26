"""PP-194 cron entry: ``python -m backend.jobs.email_journeys [--dry-run]``.

Sends nothing while ``EMAIL_JOURNEYS_ENABLED`` is off (only ``EMAIL_JOURNEYS_TEST_RECIPIENTS`` in test mode).
"""

from __future__ import annotations

import json
import logging
import sys

from backend.services import email_journeys


def main(argv: list[str]) -> int:
    logging.basicConfig(level=logging.INFO)
    stats = email_journeys.run(dry_run="--dry-run" in argv)
    print(json.dumps(stats))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
