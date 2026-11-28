import { test, expect, type Page } from "./support/fixtures";
import { signInAsTestUser } from "./support/auth";
import { installMockApi, type MockApi } from "./support/mock-api";

/**
 * PP-149: barcode lookup and add, normal mode, via the "Type Barcode" path
 * (no webcam in CI). `GET /api/barcode/{code}` is mocked per backend outcome:
 * product_cache hit, Open Food Facts hit, UPCitemdb fallback, and a total
 * miss. The backend's own fallback order is covered by tests/test_barcode.py.
 * Direct calls to Open Food Facts / UPCitemdb are blocked and must not happen.
 */

type Lookup = { source: "cache" | "live"; name: string; brand?: string; category: string } | null;

const LOOKUPS: Record<string, Lookup> = {
  "012345678905": { source: "cache", name: "E2E Cached Oats", brand: "Cache Co", category: "pantry" },
  "036000291452": { source: "live", name: "E2E OFF Yogurt", brand: "Open Food Facts mock", category: "dairy" },
  "042100005264": { source: "live", name: "E2E UPC Batteries", brand: "UPCitemdb mock", category: "household" },
  "099999999993": null,
};

async function installBarcodeMock(page: Page, api: MockApi, providerCalls: string[]) {
  await page.route(/openfoodfacts\.org|upcitemdb\.com/, (route) => {
    providerCalls.push(route.request().url());
    return route.abort();
  });
  // Registered after installMockApi, so it takes precedence for /api/barcode.
  await page.route("**/api/barcode/**", async (route) => {
    const request = route.request();
    const code = new URL(request.url()).pathname.replace(/\/$/, "").split("/").pop() ?? "";
    api.calls.push(`${request.method()} /api/barcode/${code}`);
    if (request.method() === "GET") {
      const hit = LOOKUPS[code];
      const body = hit
        ? { success: true, cached: hit.source === "cache", product: { barcode: code, productName: hit.name, brand: hit.brand, category: hit.category, source: hit.source } }
        : { success: false, cached: false, error: "Product not found" };
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    }
    const payload = request.postDataJSON() as { name: string; quantity: number; unit?: string; category: string };
    const existing = [...api.items.values()].find((i) => i.name.toLowerCase() === payload.name.toLowerCase());
    const item = existing ?? { id: `e2e-scan-${code}`, name: payload.name, quantity: 0, unit: payload.unit ?? "pieces", category: payload.category, lastUpdated: new Date().toISOString() };
    item.quantity += payload.quantity;
    api.items.set(item.id, item);
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, item: { ...item, barcode: code }, product: { barcode: code, name: payload.name } }) });
  });
}

async function lookUp(page: Page, code: string) {
  await page.getByRole("button", { name: /Type Barcode/ }).click();
  await page.getByPlaceholder("e.g., 012345678905").fill(code);
  await page.getByRole("button", { name: "Look Up Product" }).click();
}

test.describe("Barcode scan (normal mode)", () => {
  for (const [code, hit] of Object.entries(LOOKUPS)) {
    const label = hit ? `${hit.source} hit ${hit.name}` : "total miss with manual name";
    test(`${label} is added to the pantry`, async ({ context, baseURL }) => {
      await signInAsTestUser(context, baseURL!);
      const page = await context.newPage();
      const pageErrors: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));
      await page.addInitScript(() => localStorage.setItem("pantry-quick-scan", "false"));
      const api = await installMockApi(page, []);
      const providerCalls: string[] = [];
      await installBarcodeMock(page, api, providerCalls);

      await page.goto("/dashboard/scan-barcode/");
      await lookUp(page, code);

      const name = hit?.name ?? "E2E Mystery Snack";
      if (hit) {
        await expect(page.getByRole("heading", { name: hit.name })).toBeVisible();
        await expect(page.getByText(hit.source === "cache" ? "Cached" : "Live", { exact: false }).first()).toBeVisible();
      } else {
        await expect(page.getByText("We couldn't find this product", { exact: false })).toBeVisible();
        const addButton = page.getByRole("button", { name: /Add to Inventory/ });
        await expect(addButton).toBeDisabled();
        await page.getByPlaceholder("Enter product name").fill(name);
      }
      await page.getByRole("button", { name: /Add to Inventory/ }).click();

      await expect.poll(() => api.calls.includes(`POST /api/barcode/${code}`)).toBe(true);
      await expect.poll(() => [...api.items.values()].find((i) => i.name === name)?.quantity).toBe(1);

      await page.goto("/dashboard/");
      await expect(page.getByText(name)).toBeVisible();

      expect(providerCalls).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }

  test("Quick Scan hides the manual and image fallbacks", async ({ context, baseURL }) => {
    await signInAsTestUser(context, baseURL!);
    const page = await context.newPage();
    const api = await installMockApi(page, []);
    await installBarcodeMock(page, api, []);
    await page.addInitScript(() => localStorage.setItem("pantry-quick-scan", "false"));
    await page.goto("/dashboard/scan-barcode/");
    await expect(page.getByRole("button", { name: /Type Barcode/ })).toBeVisible();
    await page.getByLabel("Toggle Quick Scan").check({ force: true });
    await expect(page.getByRole("button", { name: /Type Barcode/ })).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => localStorage.getItem("pantry-quick-scan"))).toBe("true");
  });
});
