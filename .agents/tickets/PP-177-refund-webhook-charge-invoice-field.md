# PP-177: Refund webhook relies on `charge.invoice`, which newer Stripe API versions drop

**Status:** 📋 Open (needs a read-only check of the live webhook endpoint's API version first)
**Priority:** P2 (billing data accuracy; entitlement is still handled by `customer.subscription.deleted`)
**Phase:** Billing
**Created:** 2026-11-25, 3:10 AM America/Chicago (overnight sweep, code review)
**Source:** Pantry Hub Lead

---

## Problem

`_handle_charge_refunded` (`backend/services/stripe_service.py`) finds the subscription through `charge.invoice`. Stripe removed `Charge.invoice` in API version 2025-03-31.basil; the installed SDK pins 2026-06-24.dahlia. Webhook payloads use the endpoint's API version, so if the live endpoint is on basil or later:

- the refund is still recorded in `admin_transactions` (user found by customer id), but `stripeSubscriptionId` / `stripeInvoiceId` are empty;
- the "full refund of the linked subscription downgrades to Free" branch never runs.

Today this is mostly harmless: refunds of the Nov 21 duplicates were paired with cancellations, and `customer.subscription.deleted` handles entitlement. `charge.refund.updated` carries a Refund object (no `refunded` / `amount_refunded`), so it is a no-op in this handler.

## Plan

1. Read-only: check the live webhook endpoint's `api_version` in the Stripe dashboard (or via API) and look at one real `charge.refunded` payload.
2. If `invoice` is missing, resolve the invoice through the charge's payment intent (`InvoicePayment` list by `payment.payment_intent`) and keep the current fallbacks.
3. Postgres test with the billing harness (signed `charge.refunded` without `invoice`).
4. Decide with Tylor whether a full refund alone (subscription still active) should drop Pro; today the code says yes when it can find the subscription.

No live Stripe change, refund or charge is needed for steps 1–3.
