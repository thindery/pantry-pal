# PP-178: Send to Instacart (Beta) on the shopping list

**Status:** 🟡 Built; button hidden until Tylor adds `INSTACART_API_KEY`
**Priority:** P2
**Phase:** Growth / shopping
**Created:** 2026-11-25, 2:05 PM America/Chicago
**Source:** Tylor (approved "yeah let's try instacart and call it like beta")

---

## Problem

Shopping list users have to retype their list in a grocery app. Instacart's Developer Platform turns a list into an Instacart page where the user picks a store that delivers to their address and checks out, so it works in every zip code.

## What shipped

- `POST /api/instacart/shopping-list` (auth) calls Instacart `POST /idp/v1/products/products_link` with `line_items` (name, `upcs` when the linked pantry item has a valid 12/14 digit UPC, `line_item_measurements` with supported units only), `link_type: shopping_list`, title "My Pantry Hub list", and a link back to mypantryhub.com. Returns `products_link_url`.
- Links are cached 24h per hash of the list contents (plus API host).
- `GET /api/instacart/status` (auth) lets the page hide the button.
- Env, server only: `INSTACART_API_KEY` (unset = feature off, POST returns 404) and `INSTACART_API_BASE` (default `https://connect.dev.instacart.tools`; prod `https://connect.instacart.com`). No affiliate params in code; Instacart adds them.
- Shopping list page: "Send to Instacart" with a Beta badge, opens the link in a new tab, loading and error states, GA4 event `instacart_handoff` (`status`, `item_count`).
- Tests: `tests/test_instacart.py` (HTTP mocked) and `frontend/tests/instacart-button.test.tsx`.

## Tylor still has to

1. Sign up at the Instacart Developer Platform (free) and create a **development** key. Add it to the server env as `INSTACART_API_KEY` through a secret field, never chat. Test the button.
2. Ask Instacart for a **production** key, then set `INSTACART_API_KEY` to it and `INSTACART_API_BASE=https://connect.instacart.com`.
3. Affiliate: join through Instacart's Impact program if he wants referral pay (no code change; Instacart adds params to the link).
