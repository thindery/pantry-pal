"""PP-137 cron entry: ``python -m backend.jobs.low_stock_digest [--dry-run]``.

Does nothing unless LOW_STOCK_DIGEST_ENABLED=1.
"""

from __future__ import annotations

import json
import logging
import sys

from backend.services import low_stock_digest


def main(argv: list[str]) -> int:
    logging.basicConfig(level=logging.INFO)
    stats = low_stock_digest.run(dry_run="--dry-run" in argv)
    print(json.dumps(stats))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
