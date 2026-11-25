import { test, expect, type Page } from "@playwright/test";
import { signInAsTestUser } from "./support/auth";
import { installMockApi } from "./support/mock-api";

/**
 * PP-148 (local part): sign-in / sign-up routing and session behavior on the
 * production build. The Google round trip itself is not run: the harness has a
 * fake Google client id (playwright.config.ts), the request to Google is
 * intercepted, and signed-in states use a minted Auth.js session
 * (e2e/support/auth.ts). No real Google account, customer, or secret is used.
 */

async function blockThirdParty(page: Page) {
  await page.route(/googletagmanager\.com|google-analytics\.com|cloudflareinsights\.com/, (route) => route.abort());
}

test.describe("Auth paths", () => {
  for (const legacy of ["/sign-in", "/sign-up"]) {
    test(`${legacy} redirects to /auth/signin and keeps the callback @smoke`, async ({ page }) => {
      await blockThirdParty(page);
      await page.goto(`${legacy}?redirect_url=%2Fdashboard%2Fshopping-list%2F`);
      await expect(page).toHaveURL(/\/auth\/signin\/?\?callbackUrl=%2Fdashboard%2Fshopping-list%2F/);
      await expect(page.getByRole("heading", { name: /Welcome to Pantry Hub/ })).toBeVisible();
    });
  }

  test("logged-out sign-in page offers Google and starts the Google redirect @smoke", async ({ page }) => {
    await blockThirdParty(page);
    const googleRequests: string[] = [];
    await page.route(/accounts\.google\.com/, (route) => {
      googleRequests.push(route.request().url());
      return route.fulfill({ status: 200, contentType: "text/html", body: "<title>Google (stub)</title>" });
    });

    await page.goto("/auth/signin/");
    await expect(page).toHaveTitle(/Sign In — Pantry Hub/);
    const google = page.getByRole("button", { name: "Continue with Google" });
    await expect(google).toBeVisible();
    await expect(page.getByText(/not configured/i)).toHaveCount(0);

    await google.click();
    await expect.poll(() => googleRequests.length).toBeGreaterThan(0);
    const authorize = new URL(googleRequests[0]);
    expect(authorize.searchParams.get("client_id")).toBe("e2e-fake-google-client-id");
    expect(authorize.searchParams.get("redirect_uri")).toMatch(/\/api\/auth\/callback\/google$/);
  });

  test("signed-in user is sent from sign-in to the dashboard and the welcome request fires once", async ({
    context,
    baseURL,
  }) => {
    await signInAsTestUser(context, baseURL!);
    const page = await context.newPage();
    const clientErrors: string[] = [];
    page.on("pageerror", (err) => clientErrors.push(err.message));
    const api = await installMockApi(page, []);

    await page.goto("/auth/signin/");
    await expect(page).toHaveURL(/\/dashboard\/?$/);
    await expect.poll(() => api.calls.filter((c) => c === "POST /api/emails/welcome").length).toBe(1);

    await expect(page.getByRole("button", { name: "Increase quantity" })).toHaveCount(0); // empty pantry renders
    expect(clientErrors).toEqual([]);
  });

  test("sign out ends the session and the dashboard is protected again", async ({ context, baseURL }) => {
    await signInAsTestUser(context, baseURL!);
    const page = await context.newPage();
    await installMockApi(page, []);

    await page.setViewportSize({ width: 390, height: 844 }); // the account-page sign-out button is mobile-only
    await page.goto("/dashboard/account/");
    // PP-175: no networkidle wait on purpose. Sign out right away, while the page's own
    // session/token requests are still in flight, and it must still stick.
    const signedOut = page.waitForResponse((r) => r.url().includes("/api/auth/signout") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Sign out of Pantry Hub" }).click();
    expect((await signedOut).status()).toBe(200);
    await expect.poll(() => new URL(page.url()).pathname).toBe("/");
    await expect
      .poll(async () => (await context.cookies(baseURL!)).some((c) => c.name === "authjs.session-token"))
      .toBe(false);

    await page.goto(new URL("/dashboard/", baseURL!).toString());
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});
