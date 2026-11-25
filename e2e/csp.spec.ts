import { test, expect } from "@playwright/test";

/**
 * PP-067: production CSP drops 'unsafe-eval'. Runs against the production
 * build the harness starts (next build + next start), never against prod.
 * Third-party analytics requests are aborted so no real traffic is sent.
 */

const PAGES = ["/", "/pricing/", "/auth/signin/", "/privacy/", "/checkout/success/", "/checkout/cancel/"];

test.describe("Content-Security-Policy @smoke", () => {
  for (const path of PAGES) {
    test(`no CSP violations on ${path}`, async ({ page }) => {
      await page.route(/googletagmanager\.com|google-analytics\.com|cloudflareinsights\.com/, (route) => route.abort());
      const violations: string[] = [];
      page.on("console", (msg) => {
        if (/Content Security Policy|Content-Security-Policy|unsafe-eval/i.test(msg.text())) {
          violations.push(msg.text());
        }
      });
      await page.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (e) => {
          (window as unknown as { __cspViolations: string[] }).__cspViolations ??= [];
          (window as unknown as { __cspViolations: string[] }).__cspViolations.push(
            `${e.violatedDirective} ${e.blockedURI}`,
          );
        });
      });

      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(400);
      const csp = response?.headers()["content-security-policy"] ?? "";
      expect(csp).toContain("script-src 'self'");
      expect(csp).not.toContain("'unsafe-eval'");
      expect(csp).toContain("object-src 'none'");

      await page.waitForLoadState("networkidle");
      const fromEvents = await page.evaluate(
        () => (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? [],
      );
      expect([...fromEvents, ...violations]).toEqual([]);
    });
  }
});

test("PP-072: /design-system is not public @smoke", async ({ page }) => {
  await page.route(/googletagmanager\.com|google-analytics\.com|cloudflareinsights\.com/, (route) => route.abort());
  await page.goto("/design-system/");
  await expect(page).toHaveURL(/\/auth\/signin/);
  await expect(page.getByText("Shipped UI reference")).toHaveCount(0);
});
