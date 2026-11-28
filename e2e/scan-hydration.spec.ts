import { test, expect } from "./support/fixtures";
import { signInAsTestUser } from "./support/auth";
import { installMockApi } from "./support/mock-api";

/** PP-173: a stored Quick Scan "off" must not cause a hydration error. */
for (const stored of ["false", "true"]) {
  test(`scan page hydrates cleanly with Quick Scan stored ${stored}`, async ({ context, baseURL }) => {
    await signInAsTestUser(context, baseURL!);
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    await page.addInitScript((value) => localStorage.setItem("pantry-quick-scan", value), stored);
    await installMockApi(page, []);
    await page.goto("/dashboard/scan-barcode/");
    await expect(page.getByLabel("Toggle Quick Scan")).toBeAttached();
    if (stored === "false") {
      await expect(page.getByLabel("Toggle Quick Scan")).not.toBeChecked();
    } else {
      await expect(page.getByLabel("Toggle Quick Scan")).toBeChecked();
    }
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(() => localStorage.getItem("pantry-quick-scan"))).toBe(stored);
    expect(pageErrors).toEqual([]);
  });
}
