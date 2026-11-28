import { test, expect } from "./support/fixtures";

test.describe("Smoke suite", () => {
  test(
    "marketing homepage renders h1 and brand name @smoke",
    async ({ page }) => {
      const response = await page.goto("/");
      expect(response?.status()).toBe(200);

      const h1 = page.locator("h1");
      await expect(h1).toBeVisible();

      await expect(page.getByText("Pantry Hub", { exact: false }).first()).toBeVisible();
    }
  );

  test("pricing page renders @smoke", async ({ page }) => {
    const response = await page.goto("/pricing");
    expect(response?.status()).toBe(200);

    // Assert what renders without backend
    await expect(page.getByText("Pricing", { exact: false }).first()).toBeVisible();
  });
});
