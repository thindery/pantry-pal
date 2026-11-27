"""PP-235 cron entry for the weekly recipe newsletter.

    python -m backend.jobs.weekly_recipes build [--date YYYY-MM-DD] [--no-test] [--only-at-hour N]   # Wednesday 9 AM CT
    python -m backend.jobs.weekly_recipes send                                    # every 15 minutes
    python -m backend.jobs.weekly_recipes test <issue_key>                        # email another [TEST] copy

The server cron runs in UTC, so Wednesday 9 AM Central is two crontab lines (14:00 and 15:00 UTC) and
``--only-at-hour 9`` lets only the one that is 9 AM in Chicago do anything. That stays right across daylight saving.

``build`` stores a draft and emails a [TEST] copy to the owner only. It never mails the list.
``send`` mails approved issues (after "Approve & send" in the admin Marketing view, or automatically
when EMAIL_WEEKLY_AUTO_SEND is on). With the email gate closed it sends nothing.
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import date

from backend.services import weekly_recipes


def main(argv: list[str]) -> int:
    logging.basicConfig(level=logging.INFO)
    cmd = argv[0] if argv else ""
    rest = argv[1:]
    if cmd == "build":
        if "--only-at-hour" in rest:
            want = int(rest[rest.index("--only-at-hour") + 1])
            now_hour = weekly_recipes.chicago_hour()
            if now_hour != want:
                print(json.dumps({"skipped": "not_the_hour", "chicago_hour": now_hour, "wanted": want}))
                return 0
        day = None
        if "--date" in rest:
            day = date.fromisoformat(rest[rest.index("--date") + 1])
        out = weekly_recipes.build_issue(day=day, send_test="--no-test" not in rest)
    elif cmd == "send":
        out = weekly_recipes.process_sends()
    elif cmd == "test" and rest:
        issue = weekly_recipes._get_by_key(rest[0])
        if not issue:
            print(json.dumps({"error": "no such issue", "issue_key": rest[0]}))
            return 1
        out = weekly_recipes.send_test_copy(issue["id"], again=True)
    else:
        print(__doc__)
        return 2
    print(json.dumps(out, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
