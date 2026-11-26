"""PP-194: the single gate every non-transactional email passes before it can leave.

Modes (read from the environment on every call, so a restart is the only deploy step):

* ``off``  (default): nothing non-transactional is sent.
* ``test``: ``EMAIL_JOURNEYS_TEST_RECIPIENTS`` (comma list) is set but ``EMAIL_JOURNEYS_ENABLED`` is not:
  only those addresses can receive journey mail.
* ``on``: ``EMAIL_JOURNEYS_ENABLED`` is truthy. Everyone eligible can receive mail, but commercial
  mail still needs ``EMAIL_MAILING_ADDRESS`` (CAN-SPAM) or it is held.
"""

from __future__ import annotations

import os
from typing import Optional

TRUTHY = {"1", "true", "yes", "on"}
# Confirmation emails are the one thing a brand-new subscriber must get, but they are still held
# in ``off`` mode so nothing reaches a real address before Tylor approves.
COMMERCIAL_CATEGORIES = {"lifecycle", "marketing"}


def mode() -> str:
    if (os.getenv("EMAIL_JOURNEYS_ENABLED") or "").strip().lower() in TRUTHY:
        return "on"
    if test_recipients():
        return "test"
    return "off"


def test_recipients() -> set[str]:
    raw = os.getenv("EMAIL_JOURNEYS_TEST_RECIPIENTS") or ""
    return {part.strip().lower() for part in raw.split(",") if part.strip()}


def mailing_address() -> str:
    return (os.getenv("EMAIL_MAILING_ADDRESS") or "").strip()


def check(to: Optional[str], category: str) -> tuple[bool, str]:
    """Return (allowed, reason). ``reason`` is the skip reason when not allowed."""
    current = mode()
    address = (to or "").strip().lower()
    if current == "off":
        return False, "journeys_disabled"
    if current == "test" and address not in test_recipients():
        return False, "not_a_test_recipient"
    if current == "on" and category in COMMERCIAL_CATEGORIES and not mailing_address():
        return False, "missing_mailing_address"
    return True, "ok"


def unsubscribe_headers(url: str) -> dict[str, str]:
    """RFC 2369 + RFC 8058 one-click headers."""
    return {
        "List-Unsubscribe": f"<{url}>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    }
