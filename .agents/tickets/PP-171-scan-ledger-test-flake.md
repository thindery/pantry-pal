# PP-171: Fix flaky "clears the session list" Quick Scan test

**Status:** ✅ Done (overnight 2026-11-25, PR #79, merge 5cfc003)
**Priority:** P2 (CI reliability)
**Phase:** Production follow-up
**Created:** 2026-11-25
**Source:** CI failure on PR #67 (2026-11-25, 12:06 AM CT): `ScanBarcodeView session ledger > clears the session list without changing inventory` failed once, passed on rerun.

---

## Problem

The test waited for `quick-scan-ledger`, which is always rendered (empty state), then immediately clicked `clear-session-ledger`, which only exists after the simulated scan's row lands. On a slow CI runner the click raced the scan.

## Behavior

Wait for `session-row-012345678905` before clearing. Test-only change; no app code.

## Acceptance Criteria

- [x] Test waits for the scanned row before clicking Clear
- [x] Passes repeatedly locally; CI green
