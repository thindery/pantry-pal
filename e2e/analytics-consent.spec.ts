import { test, expect, type Page, type Request } from "@playwright/test";

/**
 * E2E test suite for analytics consent, GA4 gating, GPC, and Cloudflare beacon.
 * Ticket: PP-155
 *
 * NOTE: Not tagged with @smoke so the fast deploy gate stays unaffected.
 * Fresh context per test ensures zero leaked cookies or localStorage.
 */

interface DataLayerGtagCall {
  0: string; // command, e.g. "consent", "config", "js"
  1: string; // action or target, e.g. "default", "update"
  2?: Record<string, string>; // params
  length: number;
}

/**
 * Route interception helper: blocks third-party analytics and records attempted URLs.
 */
function interceptAnalyticsRequests(page: Page) {
  const interceptedUrls: string[] = [];

  // Match googletagmanager, google-analytics, and cloudflareinsights
  const analyticsPattern =
    /https?:\/\/(www\.)?(googletagmanager\.com|google-analytics\.com|static\.cloudflareinsights\.com)\/.*/;

  page.route(analyticsPattern, async (route) => {
    interceptedUrls.push(route.request().url());
    await route.abort();
  });

  return interceptedUrls;
}

/**
 * Read window.dataLayer entries.
 */
async function getDataLayer(page: Page): Promise<unknown[]> {
  return page.evaluate(() => {
    return window.dataLayer ? Array.from(window.dataLayer) : [];
  });
}

/**
 * Find the initial consent default command from window.dataLayer.
 */
async function getConsentDefault(page: Page): Promise<Record<string, string> | null> {
  return page.evaluate(() => {
    if (!window.dataLayer) return null;
    for (const item of window.dataLayer) {
      // gtag('consent', 'default', { ... }) pushed arguments
      const args = Array.from(item as unknown as ArrayLike<unknown>);
      if (args[0] === "consent" && args[1] === "default") {
        return (args[2] as Record<string, string>) ?? null;
      }
    }
    return null;
  });
}

/**
 * Find the latest consent update command from window.dataLayer.
 */
async function getLatestConsentUpdate(page: Page): Promise<Record<string, string> | null> {
  return page.evaluate(() => {
    if (!window.dataLayer) return null;
    let latest: Record<string, string> | null = null;
    for (const item of window.dataLayer) {
      const args = Array.from(item as unknown as ArrayLike<unknown>);
      if (args[0] === "consent" && args[1] === "update") {
        latest = (args[2] as Record<string, string>) ?? null;
      }
    }
    return latest;
  });
}

test.describe("Analytics consent path", () => {
  test.describe.configure({ mode: "parallel" });

  test("Non-EEA visitor without GPC: grants analytics by default, denies ad storage, no banner, requests GA4", async ({
    context,
  }) => {
    // 1. Clean context, set non-EEA region cookie (US / other)
    await context.addCookies([
      {
        name: "ph_region",
        value: "other",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    const page = await context.newPage();
    const interceptedUrls = interceptAnalyticsRequests(page);

    await page.goto("/");

    // 2. Ad storage, ad user data, ad personalization are denied in default consent
    const consentDefault = await getConsentDefault(page);
    expect(consentDefault).not.toBeNull();
    expect(consentDefault?.ad_storage).toBe("denied");
    expect(consentDefault?.ad_user_data).toBe("denied");
    expect(consentDefault?.ad_personalization).toBe("denied");
    expect(consentDefault?.analytics_storage).toBe("granted");

    // 3. Cookie consent banner is NOT shown for non-EEA
    const banner = page.locator('aside[aria-label="Cookie consent banner"]');
    await expect(banner).not.toBeVisible();

    // 4. Cloudflare beacon is requested (cookieless, always loaded)
    const cfRequest = interceptedUrls.some((url) =>
      url.includes("static.cloudflareinsights.com/beacon.min.js")
    );
    expect(cfRequest).toBe(true);

    // 5. GA4 script is requested because analytics_storage is granted and ID is valid
    const gaRequest = interceptedUrls.some((url) =>
      url.includes("googletagmanager.com/gtag/js?id=G-")
    );
    expect(gaRequest).toBe(true);
  });

  test("EEA/UK/CH visitor without prior choice: defaults to denied, shows banner, does not request GA4", async ({
    context,
  }) => {
    // Set EEA region
    await context.addCookies([
      {
        name: "ph_region",
        value: "eea",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    const page = await context.newPage();
    const interceptedUrls = interceptAnalyticsRequests(page);

    await page.goto("/");

    // 1. Consent default: ad storage AND analytics storage are denied
    const consentDefault = await getConsentDefault(page);
    expect(consentDefault).not.toBeNull();
    expect(consentDefault?.ad_storage).toBe("denied");
    expect(consentDefault?.ad_user_data).toBe("denied");
    expect(consentDefault?.ad_personalization).toBe("denied");
    expect(consentDefault?.analytics_storage).toBe("denied");

    // 2. Banner is visible
    const banner = page.locator('aside[aria-label="Cookie consent banner"]');
    await expect(banner).toBeVisible();

    // 3. GA4 script is NOT requested while unconsented
    const gaRequest = interceptedUrls.some((url) =>
      url.includes("googletagmanager.com/gtag/js")
    );
    expect(gaRequest).toBe(false);

    // 4. Cloudflare beacon IS requested (cookieless, independent of GA)
    const cfRequest = interceptedUrls.some((url) =>
      url.includes("static.cloudflareinsights.com/beacon.min.js")
    );
    expect(cfRequest).toBe(true);
  });

  test("EEA/UK/CH visitor: clicking Accept updates consent, requests GA4, and persists across reload", async ({
    context,
  }) => {
    await context.addCookies([
      {
        name: "ph_region",
        value: "eea",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    const page = await context.newPage();
    const interceptedUrls = interceptAnalyticsRequests(page);

    await page.goto("/");

    const banner = page.locator('aside[aria-label="Cookie consent banner"]');
    await expect(banner).toBeVisible();

    // Click Accept button
    const acceptBtn = banner.getByRole("button", { name: "Accept" });
    await acceptBtn.click();

    // Banner should disappear
    await expect(banner).not.toBeVisible();

    // Verify localStorage has ph_analytics_consent = "granted"
    const stored = await page.evaluate(() => localStorage.getItem("ph_analytics_consent"));
    expect(stored).toBe("granted");

    // Check gtag consent update was pushed
    const consentUpdate = await getLatestConsentUpdate(page);
    expect(consentUpdate).not.toBeNull();
    expect(consentUpdate?.analytics_storage).toBe("granted");

    // GA4 script is now requested
    await page.waitForTimeout(300); // allow script tag injection
    const gaRequest = interceptedUrls.some((url) =>
      url.includes("googletagmanager.com/gtag/js?id=G-")
    );
    expect(gaRequest).toBe(true);

    // Reload the page and verify consent persists without showing banner again
    interceptedUrls.length = 0; // clear intercepted list for reload
    await page.reload();

    // Banner must NOT appear after reload with granted consent
    await expect(banner).not.toBeVisible();

    // Initial consent on reload reflects granted analytics_storage
    const reloadConsentDefault = await getConsentDefault(page);
    expect(reloadConsentDefault?.analytics_storage).toBe("granted");
    expect(reloadConsentDefault?.ad_storage).toBe("denied");

    // GA4 script requested on reload
    const reloadGaRequest = interceptedUrls.some((url) =>
      url.includes("googletagmanager.com/gtag/js?id=G-")
    );
    expect(reloadGaRequest).toBe(true);
  });

  test("EEA/UK/CH visitor: clicking Decline updates consent, denies analytics, and persists across reload", async ({
    context,
  }) => {
    await context.addCookies([
      {
        name: "ph_region",
        value: "eea",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    const page = await context.newPage();
    const interceptedUrls = interceptAnalyticsRequests(page);

    await page.goto("/");

    const banner = page.locator('aside[aria-label="Cookie consent banner"]');
    await expect(banner).toBeVisible();

    // Click Decline button
    const declineBtn = banner.getByRole("button", { name: "Decline" });
    await declineBtn.click();

    // Banner should disappear
    await expect(banner).not.toBeVisible();

    // Verify localStorage has ph_analytics_consent = "denied"
    const stored = await page.evaluate(() => localStorage.getItem("ph_analytics_consent"));
    expect(stored).toBe("denied");

    // Check gtag consent update was pushed
    const consentUpdate = await getLatestConsentUpdate(page);
    expect(consentUpdate).not.toBeNull();
    expect(consentUpdate?.analytics_storage).toBe("denied");

    // GA4 script should NOT have been requested
    const gaRequest = interceptedUrls.some((url) =>
      url.includes("googletagmanager.com/gtag/js")
    );
    expect(gaRequest).toBe(false);

    // Reload page and verify banner stays hidden and GA4 is still not loaded
    interceptedUrls.length = 0;
    await page.reload();

    await expect(banner).not.toBeVisible();

    const reloadConsentDefault = await getConsentDefault(page);
    expect(reloadConsentDefault?.analytics_storage).toBe("denied");
    expect(reloadConsentDefault?.ad_storage).toBe("denied");

    const reloadGaRequest = interceptedUrls.some((url) =>
      url.includes("googletagmanager.com/gtag/js")
    );
    expect(reloadGaRequest).toBe(false);
  });

  test("Global Privacy Control (GPC): denies analytics and overrides stale grant, no banner, no GA4", async ({
    context,
  }) => {
    // Pre-populate stale grant in localStorage and set non-EEA (or EEA)
    const page = await context.newPage();

    // Inject GPC = true before scripts execute
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "globalPrivacyControl", {
        value: true,
        configurable: true,
      });
      // Simulate stale prior grant in localStorage
      localStorage.setItem("ph_analytics_consent", "granted");
    });

    const interceptedUrls = interceptAnalyticsRequests(page);

    await page.goto("/");

    // 1. Consent default: analytics_storage and ad_* are denied
    const consentDefault = await getConsentDefault(page);
    expect(consentDefault).not.toBeNull();
    expect(consentDefault?.analytics_storage).toBe("denied");
    expect(consentDefault?.ad_storage).toBe("denied");
    expect(consentDefault?.ad_user_data).toBe("denied");
    expect(consentDefault?.ad_personalization).toBe("denied");

    // 2. No banner shown (GPC signals immediate intent)
    const banner = page.locator('aside[aria-label="Cookie consent banner"]');
    await expect(banner).not.toBeVisible();

    // 3. GA4 is NOT requested even with stale "granted" in localStorage
    const gaRequest = interceptedUrls.some((url) =>
      url.includes("googletagmanager.com/gtag/js")
    );
    expect(gaRequest).toBe(false);

    // 4. Cloudflare beacon still requested (cookieless RUM)
    const cfRequest = interceptedUrls.some((url) =>
      url.includes("static.cloudflareinsights.com/beacon.min.js")
    );
    expect(cfRequest).toBe(true);
  });

  test("Privacy policy page (/privacy): renders analytics disclosure copy", async ({
    page,
  }) => {
    interceptAnalyticsRequests(page);
    const response = await page.goto("/privacy");
    expect(response?.status()).toBe(200);

    // Assert key analytics disclosure text
    const section = page.locator("#cookies");
    await expect(section).toBeVisible();

    await expect(page.getByText("Google Analytics 4 (GA4)", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Google AdSense", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Global Privacy Control (GPC)", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Cloudflare Web Analytics", { exact: false }).first()).toBeVisible();
    await expect(
      page.getByText("IP anonymization is permanently on", { exact: false }).first()
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "How Google uses information from sites that use our services" })).toBeVisible();
    await expect(page.locator("#cookies")).not.toContainText("We do not use third-party advertising cookies");
  });
});
