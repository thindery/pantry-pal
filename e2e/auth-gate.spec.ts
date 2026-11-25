import { test, expect } from "@playwright/test";

/**
 * PP-172: protected pages must fail closed for anonymous visitors, even when
 * the local harness has no AUTH_SECRET (Auth.js MissingSecret).
 */
for (const path of ["/dashboard/", "/admin/", "/design-system/", "/dashboard/account/"]) {
  test(`anonymous ${path} redirects to sign-in @smoke`, async ({ page }) => {
    await page.route(/googletagmanager\.com|google-analytics\.com|cloudflareinsights\.com/, (route) => route.abort());
    await page.goto(path);
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
}
