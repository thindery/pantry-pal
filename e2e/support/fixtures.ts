import { test as base, expect } from "@playwright/test";

/** Production GA4 must not receive Playwright traffic (PP-253). */
export const BLOCKED_ANALYTICS_URL =
  /https?:\/\/(www\.)?(googletagmanager\.com|google-analytics\.com)(\/|$)/i;

/**
 * Shared Playwright test that aborts GA/gtag requests on every page and context.
 * Import `{ test, expect }` from this module instead of `@playwright/test`.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route(BLOCKED_ANALYTICS_URL, (route) => route.abort());
    await use(context);
  },
});

export { expect };
export type { Page, Request, BrowserContext, Route } from "@playwright/test";
