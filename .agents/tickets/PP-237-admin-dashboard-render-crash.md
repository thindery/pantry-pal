# PP-237: /admin crashes ("This page couldn't load") once the API returns data

**Status:** 🔨 In progress (2026-11-26)
**Priority:** P0
**Phase:** Admin
**Created:** 2026-11-26

---

## Problem

After PP-236 (build `8962809`) fixed the 401, `/api/admin/dashboard` returned 200 and Tylor's phone showed the Next.js error page.

## Root cause

Latent bug exposed by PP-236, not caused by it. The dashboard had never rendered real data: the backend payload (`backend/services/admin_service.get_dashboard_metrics`) does not match the `DashboardMetrics` type the UI uses. There is no `alerts` object (the UI read `metrics.alerts.failedPayments` and threw), no `logins.data` or `products.growth`/`sparkline`, transactions use `amountCents`/`createdAt`/`status: succeeded|refunded` with no email or description, and revenue is in cents (the card showed $499 for $4.99). Reproduced in vitest with the live payload.

## Fix

- `adminService.normalizeDashboardMetrics` maps the backend payload to the UI shape with safe defaults (cents to dollars, status mapping, ISO timestamps, empty arrays).
- Test `frontend/tests/admin-dashboard-prod-shape.test.tsx` renders `AdminDashboard` and every tab against anonymised live payloads (`frontend/tests/fixtures/admin-prod-shape/`).

## Rules

No backend change. No secrets in git.
