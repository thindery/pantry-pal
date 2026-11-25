# PP-173: Scan page hydration error when Quick Scan is off

**Status:** 🔄 In review
**Priority:** P2
**Phase:** Bug (found by the PP-149 e2e work, 2026-11-25 overnight)
**Created:** 2026-11-25
**Related:** PP-149, PP-171

---

## Problem

`scan-barcode-view.tsx` read `localStorage["pantry-quick-scan"]` inside the `useState` initializer. The server always renders Quick Scan on, so anyone who had turned it off got a different first client render and React hydration error #418 on every visit to `/dashboard/scan-barcode/`. React recovers by re-rendering on the client, but it is a real console error and a wasted render.

## Fix

- Start from the server default (on), read the stored preference in a mount effect, and skip the write-back effect until the stored value has been read, so the default never overwrites a saved "off".
- New `e2e/scan-hydration.spec.ts`: no page errors and the stored value is kept, for both "false" and "true". The "false" case fails on the old code.

## Acceptance Criteria

- [x] No hydration error with Quick Scan stored off or on
- [x] The saved preference is not overwritten on load
- [x] Existing scan-barcode-view vitest still passes
