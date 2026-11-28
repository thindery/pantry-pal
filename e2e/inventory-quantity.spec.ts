import { test, expect } from "./support/fixtures";
import { signInAsTestUser } from "./support/auth";
import { installMockApi } from "./support/mock-api";

/**
 * PP-150: signed-in inventory +/- on /dashboard/. Uses a minted test session
 * (e2e/support/auth.ts) and the in-memory API stand-in, so no real account
 * or customer inventory is touched.
 */
test.describe("Inventory quantity +/-", () => {
  test("raise, lower, persist across reload, and stop at zero", async ({ context, baseURL }) => {
    await signInAsTestUser(context, baseURL!);
    const page = await context.newPage();
    const clientErrors: string[] = [];
    page.on("pageerror", (err) => clientErrors.push(err.message));
    const api = await installMockApi(page, [
      { id: "e2e-item-milk", name: "E2E Milk", quantity: 2, unit: "cartons", category: "dairy", lastUpdated: "2026-11-24T12:00:00.000Z" },
    ]);

    await page.goto("/dashboard/");
    const row = page.getByTestId("pantry-row-e2e-item-milk");
    await expect(row).toBeVisible();
    await expect(row).toContainText("E2E Milk");
    await expect(row).toContainText("2 cartons");

    await row.getByRole("button", { name: "Increase quantity" }).click();
    await expect(row).toContainText("3 cartons");
    await expect.poll(() => api.items.get("e2e-item-milk")?.quantity).toBe(3);

    await page.reload();
    await expect(page.getByTestId("pantry-row-e2e-item-milk")).toContainText("3 cartons");

    const rowAfter = page.getByTestId("pantry-row-e2e-item-milk");
    const minusAfter = rowAfter.getByRole("button", { name: "Decrease quantity" });
    await minusAfter.click();
    await expect.poll(() => api.items.get("e2e-item-milk")?.quantity).toBe(2);
    await expect(minusAfter).toBeEnabled();
    await minusAfter.click();
    await expect.poll(() => api.items.get("e2e-item-milk")?.quantity).toBe(1);
    await expect(minusAfter).toBeEnabled();
    await minusAfter.click();
    await expect.poll(() => api.items.get("e2e-item-milk")?.quantity).toBe(0);
    await expect(minusAfter).toBeDisabled();

    await page.reload();
    const rowZero = page.getByTestId("pantry-row-e2e-item-milk");
    await expect(rowZero.getByRole("button", { name: "Decrease quantity" })).toBeDisabled();
    // Out-of-stock treatment: danger left border.
    await expect(rowZero).toHaveClass(/border-l-\[var\(--danger\)\]/);

    await rowZero.getByRole("button", { name: "Increase quantity" }).click();
    await expect.poll(() => api.items.get("e2e-item-milk")?.quantity).toBe(1);

    expect(api.calls.filter((c) => c === "POST /api/activities")).toHaveLength(5);
    expect(clientErrors).toEqual([]);
  });
});
