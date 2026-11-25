import { test, expect } from "@playwright/test";

/**
 * AdSense: verification meta + auto-ads script on public marketing pages only;
 * never on auth, checkout, or the logged-in app. The ad network is aborted so
 * tests never hit Google.
 */
const CLIENT = "ca-pub-5710716295420357";
const MARKETING = ["/", "/pricing/", "/privacy/", "/terms/", "/guides/barcode-scanning/", "/guides/pantry-hub-vs-grocy/"];
const NON_MARKETING = ["/auth/signin/", "/checkout/success/", "/checkout/cancel/"];

test.beforeEach(async ({ page }) => {
  await page.route(/googletagmanager\.com|google-analytics\.com|cloudflareinsights\.com|googlesyndication\.com|adtrafficquality\.google/, (r) => r.abort());
});

test("ads.txt is served verbatim @smoke", async ({ request }) => {
  const res = await request.get("/ads.txt");
  expect(res.status()).toBe(200);
  expect((await res.text()).trim()).toBe("google.com, pub-5710716295420357, DIRECT, f08c47fec0942fa0");
});

for (const path of MARKETING) {
  test(`AdSense meta + script on ${path} @smoke`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('meta[name="google-adsense-account"]')).toHaveAttribute("content", CLIENT);
    await expect(page.locator(`script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}"]`)).toHaveCount(1);
  });
}

for (const path of NON_MARKETING) {
  test(`no AdSense on ${path} @smoke`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('meta[name="google-adsense-account"]')).toHaveCount(0);
    await expect(page.locator('script[src*="googlesyndication.com"]')).toHaveCount(0);
  });
}

test("no AdSense on the protected app (redirects to sign-in) @smoke", async ({ page }) => {
  await page.goto("/dashboard/");
  await expect(page.locator('meta[name="google-adsense-account"]')).toHaveCount(0);
  await expect(page.locator('script[src*="googlesyndication.com"]')).toHaveCount(0);
});
