import { test, expect } from "@playwright/test";
import { signInAsTestUser } from "./support/auth";
import { installMockApi } from "./support/mock-api";
import { writeBarcodeY4m } from "./support/fake-camera";

/**
 * PP-149: Quick Scan with a fake camera showing EAN-13 0012345678905
 * (UPC-A 012345678905). A known product is added without a confirm step,
 * then shows in the session ledger and the image toast region.
 */
const VIDEO = writeBarcodeY4m("0012345678905");

test.use({
  permissions: ["camera"],
  launchOptions: {
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-video-capture=${VIDEO}`,
    ],
  },
});

test("Quick Scan adds a known product from the camera @camera", async ({ context, baseURL }) => {
  await signInAsTestUser(context, baseURL!);
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  await page.addInitScript(() => localStorage.setItem("pantry-quick-scan", "true"));
  const api = await installMockApi(page, []);
  const lookups: string[] = [];
  await page.route(/openfoodfacts\.org|upcitemdb\.com/, (route) => route.abort());
  await page.route("**/api/barcode/**", async (route) => {
    const request = route.request();
    const code = new URL(request.url()).pathname.replace(/\/$/, "").split("/").pop() ?? "";
    if (request.method() === "GET") {
      lookups.push(code);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, cached: true, product: { barcode: code, productName: "E2E Camera Crackers", category: "snacks", source: "cache" } }),
      });
    }
    const payload = request.postDataJSON() as { name: string; quantity: number; unit?: string; category: string };
    const existing = api.items.get("e2e-camera-item");
    const item = existing ?? { id: "e2e-camera-item", name: payload.name, quantity: 0, unit: payload.unit ?? "pieces", category: payload.category, lastUpdated: new Date().toISOString() };
    item.quantity += payload.quantity;
    api.items.set(item.id, item);
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, item: { ...item, barcode: code }, product: { barcode: code, name: payload.name } }) });
  });

  await page.goto("/dashboard/scan-barcode/");
  const start = page.getByRole("button", { name: "Start scanning" });
  if (await start.isVisible().catch(() => false)) await start.click();

  await expect.poll(() => lookups.length, { timeout: 20_000 }).toBeGreaterThan(0);
  expect(lookups[0]).toContain("12345678905");
  await expect(page.getByTestId("quick-scan-ledger")).toContainText("E2E Camera Crackers", { timeout: 10_000 });
  await expect(page.getByTestId("quick-scan-toast-region")).toBeAttached();
  await expect.poll(() => api.items.get("e2e-camera-item")?.quantity ?? 0).toBeGreaterThan(0);
  // No confirm detour in Quick Scan.
  await expect(page.getByRole("button", { name: /Add to Inventory/ })).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});
