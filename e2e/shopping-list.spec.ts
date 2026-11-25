import { test, expect } from "@playwright/test";
import { signInAsTestUser } from "./support/auth";
import { installMockApi } from "./support/mock-api";

/**
 * PP-151: signed-in shopping list on /dashboard/shopping-list/. The list is
 * client state (localStorage `pantry_shopping_list`) built from pantry items;
 * "Mark bought" writes back to the pantry through the API stand-in.
 */
test.describe("Shopping list", () => {
  test("generate, add manual, adjust, check, remove, mark bought", async ({ context, baseURL }) => {
    await signInAsTestUser(context, baseURL!);
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    const api = await installMockApi(page, [
      { id: "e2e-item-rice", name: "E2E Rice", quantity: 0, unit: "bags", category: "pantry", lastUpdated: "2026-11-24T12:00:00.000Z" },
      { id: "e2e-item-milk", name: "E2E Milk", quantity: 9, unit: "cartons", category: "dairy", lastUpdated: "2026-11-24T12:00:00.000Z" },
    ]);

    await page.goto("/dashboard/shopping-list/");
    await page.getByRole("button", { name: "Regenerate" }).click();

    const list = page.getByTestId("shopping-list");
    await expect(list).toBeVisible();
    await expect(list).toContainText("E2E Rice");
    await expect(list).not.toContainText("E2E Milk");

    // Manual add
    await page.getByRole("button", { name: "Add item" }).click();
    await page.getByPlaceholder("Item name").fill("E2E Coffee filters");
    await page.getByRole("button", { name: "Add to list" }).click();
    await expect(list).toContainText("E2E Coffee filters");

    const manualRow = list.locator('[data-testid^="shopping-row-"]', { hasText: "E2E Coffee filters" });
    await expect(manualRow.getByLabel("Quantity 1")).toBeVisible();
    await manualRow.getByRole("button", { name: "Increase quantity" }).click();
    await expect(manualRow.getByLabel("Quantity 2")).toBeVisible();
    await manualRow.getByRole("button", { name: "Decrease quantity" }).click();
    await expect(manualRow.getByLabel("Quantity 1")).toBeVisible();

    // Check / uncheck
    await manualRow.getByRole("button", { name: "Check item" }).click();
    await expect(manualRow.getByRole("button", { name: "Uncheck item" })).toBeVisible();
    await manualRow.getByRole("button", { name: "Uncheck item" }).click();
    await expect(manualRow.getByRole("button", { name: "Check item" })).toBeVisible();

    // List survives reload (localStorage)
    await page.reload();
    await expect(page.getByTestId("shopping-list")).toContainText("E2E Coffee filters");

    // Remove the manual item
    const manualAfter = page.getByTestId("shopping-list").locator('[data-testid^="shopping-row-"]', { hasText: "E2E Coffee filters" });
    await manualAfter.getByRole("button", { name: "Actions for E2E Coffee filters" }).click();
    await page.getByRole("menuitem", { name: "Remove" }).click();
    await expect(page.getByTestId("shopping-list")).not.toContainText("E2E Coffee filters");

    // Mark the generated item bought -> pantry quantity goes up, row leaves the list
    const riceRow = page.getByTestId("shopping-list").locator('[data-testid^="shopping-row-"]', { hasText: "E2E Rice" });
    const needLabel = await riceRow.getByLabel(/^Quantity \d+(\.\d+)?$/).getAttribute("aria-label");
    const need = Number(needLabel?.replace("Quantity ", ""));
    expect(need).toBeGreaterThan(0);
    await riceRow.getByRole("button", { name: "Actions for E2E Rice" }).click();
    await page.getByRole("menuitem", { name: "Mark bought" }).click();
    await expect.poll(() => api.items.get("e2e-item-rice")?.quantity).toBe(need);
    await expect(page.getByText("E2E Rice")).toHaveCount(0);

    // Share does not crash
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Share" }).click();

    expect(pageErrors).toEqual([]);
  });
});
