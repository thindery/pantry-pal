# PP-180: Item Details modal title hidden under the desktop navbar

**Status:** ✅ Done (live 2026-11-25, 5:03 PM CT, build `5fec893`, [PR #125](https://github.com/thindery/pantry-pal/pull/125), merge `5fec893`)
**Priority:** P2
**Phase:** UI polish
**Created:** 2026-11-25, 3:05 PM America/Chicago
**Source:** Tylor (screenshot "Screenshot 2026-11-25 at 2.59.00 PM.png", voice request)

---

## Problem

On desktop (`/dashboard/`), opening a pantry item shows the **Item Details** modal (`EditItemModal`), but the top navbar (Home / Pantry / Recipes / Shopping / Account) draws **on top of** the modal. The modal's sticky header ("Item Details" plus the close X) is cut off at the top, and the navbar isn't dimmed by the backdrop while the rest of the page is. The bottom "Remove from pantry" button is also cut off at the bottom of the viewport.

## Root cause (verified in code)

- `frontend/app/dashboard/dashboard-client-layout.tsx` renders `<DashboardModals />` **inside** a wrapper `div` with `relative z-0`. That creates a stacking context, so the modal overlay's `z-[10000]` (`edit-item-modal.tsx` line ~407) only applies inside that context. Overall it sits at z 0.
- `<DashboardNavbar />` is a **sibling outside** that wrapper and uses `fixed top-0 ... z-[9999]` (`frontend/components/dashboard/navbar.tsx` line ~34), so it paints above every dashboard modal.
- The modal is centered with `items-center` and `max-h-[90vh]` and doesn't account for the 4rem (64px) navbar, so its top 10% falls under the bar.

## Fix

1. Render `<DashboardModals />` (and any other dashboard modals inside the `z-0` wrapper, e.g. ThresholdSettingsModal if affected) **outside** the `relative z-0` wrapper, after `<DashboardNavbar />`. Alternatively, portal the modal overlays to `document.body` with `createPortal`. Prefer moving it in the layout, which is the smaller change.
2. Once the modal is above the navbar, check that the backdrop covers the navbar too and the full modal (header with close X, and "Remove from pantry" at the bottom) is visible and scrollable inside `max-h-[90vh]` at 1280×720 and 1024×768.
3. Check other modals opened from the dashboard (Group with…, threshold settings, scan modals) for the same issue.
4. Don't change the navbar's look or the mobile bottom nav.

## Tests

- Add or extend a frontend test that the modal root is not rendered inside the `z-0` wrapper (or renders via a portal).
- Manual check: desktop, open any pantry item, then confirm the "Item Details" title and X are fully visible, the navbar is dimmed, and Esc and Cancel close it.
- Frontend tests, `tsc` and `next build` all pass.

## Allowed paths

- `frontend/app/dashboard/dashboard-client-layout.tsx`
- `frontend/components/dashboard/dashboard-modals.tsx`
- `frontend/components/dashboard/edit-item-modal.tsx` (only if spacing tweaks are needed)
- `frontend/tests/` (new or updated test for this)
- This ticket file and its `.agents/TICKET_STATUS.md` row

## Rules for the coding agent

- No dependency changes unless truly needed. If one is, stop and explain why.
- **No commits, no pushes, no secrets.** Leave changes in the working tree for review.
- Don't touch the stray `2026-07-30` file or `.agents/email-previews/`.

## Resolution (2026-11-25)

- `<DashboardModals />` moved out of the `relative z-0` wrapper to render after `<DashboardNavbar />`, so the Item Details (`EditItemModal`, z-[10000]) and Link Barcode overlays paint above the z-[9999] navbar and the backdrop dims it.
- Scan confirm overlay in `dashboard-modals.tsx` raised from `z-50` to `z-[10000]`.
- New test `frontend/tests/dashboard-modals-stacking.test.tsx`.
- Checks: vitest 47 files / 264 tests, `tsc`, eslint (0 errors), `next build`, CI green, pre-deploy Playwright smoke 30 passed. Smoke after deploy: `/`, `/pricing/`, `/auth/signin/` 200; `/dashboard/` 307 to sign-in.
- Not changed (outside allowed paths): `ThresholdSettingsModal` overlay is `z-[100]`, still below the navbar on desktop. Follow-up if it matters.
