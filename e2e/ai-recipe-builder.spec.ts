import { test, expect } from "@playwright/test";
import { signInAsTestUser } from "./support/auth";
import { installMockApi } from "./support/mock-api";

/**
 * PP-183: AI recipe builder on /dashboard/recipes/. The AI endpoints and the
 * recipes API are stand-ins (no backend, no provider calls); backend guardrails
 * are covered by pytest. Flow: suggest -> adjust -> save recipe -> add missing.
 */
const IDEA = {
  title: "E2E Spinach Omelet",
  minutes: 10,
  servings: "2",
  ingredients: [
    { raw: "4 eggs", name: "eggs" },
    { raw: "1 cup spinach", name: "spinach" },
    { raw: "1/4 cup feta", name: "feta" },
  ],
  instructions: ["Whisk the eggs.", "Cook with the spinach.", "Top with feta."],
  usesSoon: ["Spinach"],
};

test.describe("AI recipe builder", () => {
  test("suggest, adjust, save recipe, add missing to list @smoke", async ({ context, baseURL }) => {
    test.setTimeout(90_000); // several page loads; slow under parallel workers
    await signInAsTestUser(context, baseURL!);
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    await installMockApi(page, [
      { id: "e2e-eggs", name: "Eggs", quantity: 12, unit: "units", category: "dairy", lastUpdated: "2026-11-20T12:00:00.000Z" },
      { id: "e2e-spinach", name: "Spinach", quantity: 1, unit: "bags", category: "produce", lastUpdated: "2026-11-10T12:00:00.000Z" },
    ]);

    const suggestBodies: Array<Record<string, unknown>> = [];
    const savedRecipes: Array<Record<string, unknown>> = [];
    const ok = (data: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });

    // Registered after installMockApi, so these win for their paths.
    await page.route("**/api/ai/recipes/status*", (route) =>
      route.fulfill(ok({ enabled: true, eligible: true, usage: { usedTokens: 5000, limitTokens: 50000, resetsAt: null }, pausedUntil: null })),
    );
    await page.route("**/api/ai/recipes/suggest*", (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      suggestBodies.push(body);
      const servings = String(body.servings);
      return route.fulfill(ok({ recipes: [{ ...IDEA, servings }], cached: false, usage: { usedTokens: 8000, limitTokens: 50000, resetsAt: null } }));
    });
    await page.route(/\/api\/recipes\/?(\?.*)?$/, (route) => {
      const req = route.request();
      if (req.method() === "POST") {
        const body = req.postDataJSON() as Record<string, unknown>;
        const created = { id: "e2e-recipe-1", userId: "e2e", isComplete: true, createdAt: "2026-11-25T00:00:00Z", sourceUrl: null, imageUrl: null, ...body };
        savedRecipes.push(created);
        return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: created }) });
      }
      return route.fulfill(ok(savedRecipes));
    });

    await page.goto("/dashboard/recipes/");
    const builder = page.getByTestId("ai-recipe-builder");
    // The status call waits for the session token on a cold start.
    await expect(builder).toBeVisible({ timeout: 20_000 });
    await expect(builder.getByTestId("ai-usage-meter")).toContainText("10%");

    // First suggestion with defaults
    await builder.getByRole("button", { name: "Suggest recipes" }).click();
    await expect(builder.getByTestId("ai-recipe-idea")).toHaveCount(1);
    expect(suggestBodies[0]).toMatchObject({ servings: 2, diet: "none", maxMinutes: null, mustUse: [] });

    // Adjust and ask again
    await builder.getByLabel("Servings").selectOption("4");
    await builder.getByLabel("Diet").selectOption("vegetarian");
    await builder.getByLabel("Time").selectOption("30");
    await builder.getByLabel("Add a must-use item").selectOption("Spinach");
    await builder.getByLabel("Note").fill("one pan");
    await builder.getByRole("button", { name: "Suggest again" }).click();
    await expect.poll(() => suggestBodies.length).toBe(2);
    expect(suggestBodies[1]).toEqual({ servings: 4, diet: "vegetarian", maxMinutes: 30, mustUse: ["Spinach"], note: "one pan" });

    const idea = builder.getByTestId("ai-recipe-idea").first();
    await expect(idea).toContainText("E2E Spinach Omelet");
    await expect(idea).toContainText("Serves 4");
    await expect(idea).toContainText("Uses up: Spinach");
    await expect(idea).toContainText("2/3 in pantry");
    await page.screenshot({ path: "test-results/pp183-ai-recipe-builder.png", fullPage: true });

    // Save into the existing recipes model
    await idea.getByRole("button", { name: "Save recipe" }).click();
    await expect(idea.getByRole("link", { name: /Saved. Open recipe/ })).toHaveAttribute("href", "/dashboard/recipes/e2e-recipe-1/");
    expect(savedRecipes[0]).toMatchObject({ title: "E2E Spinach Omelet", servings: "4", instructions: IDEA.instructions });

    // Add missing ingredients to the shopping list
    await idea.getByRole("button", { name: "Add 1 missing to list" }).click();
    await expect(builder.getByRole("status")).toContainText("Added 1 missing ingredient");
    await page.screenshot({ path: "test-results/pp183-ai-recipe-saved.png", fullPage: true });

    await page.goto("/dashboard/shopping-list/");
    await expect(page.getByTestId("shopping-list")).toContainText("feta");

    const text = (await page.content()).toLowerCase();
    for (const banned of ["gemini", "ollama", "gemma"]) expect(text).not.toContain(banned);
    expect(pageErrors).toEqual([]);
  });

  test("hidden when the server has AI off @smoke", async ({ context, baseURL }) => {
    await signInAsTestUser(context, baseURL!);
    const page = await context.newPage();
    await installMockApi(page, []);
    let statusCalls = 0;
    await page.route("**/api/ai/recipes/status*", (route) => {
      statusCalls += 1;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { enabled: false } }) });
    });
    await page.goto("/dashboard/recipes/");
    await expect(page.getByRole("heading", { name: "Saved Recipes" })).toBeVisible();
    await expect.poll(() => statusCalls, { timeout: 20_000 }).toBeGreaterThan(0);
    await expect(page.getByTestId("ai-recipe-builder")).toHaveCount(0);
  });

  test("does not overflow horizontally at 390px with long pantry names @smoke", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await signInAsTestUser(context, baseURL!);
    const page = await context.newPage();
    const longName = "Great Value Organic Extra Virgin Olive Oil Cold Pressed 16.9 fl oz";
    await installMockApi(page, [
      { id: "e2e-eggs", name: "Eggs", quantity: 12, unit: "units", category: "dairy", lastUpdated: "2026-11-20T12:00:00.000Z" },
      { id: "e2e-spinach", name: "Spinach", quantity: 1, unit: "bags", category: "produce", lastUpdated: "2026-11-10T12:00:00.000Z" },
      { id: "e2e-oil", name: longName, quantity: 1, unit: "bottles", category: "pantry", lastUpdated: "2026-11-01T12:00:00.000Z" },
    ]);
    const ok = (data: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
    await page.route("**/api/ai/recipes/status*", (route) =>
      route.fulfill(ok({ enabled: true, eligible: true, usage: { usedTokens: 5000, limitTokens: 50000, resetsAt: null }, pausedUntil: null })),
    );
    await page.route("**/api/ai/recipes/suggest*", (route) =>
      route.fulfill(ok({
        recipes: [{
          title: "E2E Spinach Omelet with Extra Virgin Olive Oil",
          minutes: 10,
          servings: "2",
          ingredients: [
            { raw: "4 eggs", name: "eggs" },
            { raw: "1 cup spinach", name: "spinach" },
            { raw: `2 tbsp ${longName}`, name: longName },
          ],
          instructions: ["Whisk the eggs.", "Cook with the spinach."],
          usesSoon: ["Spinach", longName],
        }],
        cached: false,
        usage: { usedTokens: 8000, limitTokens: 50000, resetsAt: null },
      })),
    );
    await page.route(/\/api\/recipes\/?(\?.*)?$/, (route) => route.fulfill(ok([])));

    await page.goto("/dashboard/recipes/");
    const builder = page.getByTestId("ai-recipe-builder");
    await expect(builder).toBeVisible({ timeout: 20_000 });
    const pick = builder.getByLabel("Add a must-use item");
    await expect(pick).toBeVisible();
    // The option value stays the full name; the visible label is shortened.
    await expect(pick.locator("option").filter({ hasText: "Great Value Organic Extra Virgin" })).toHaveCount(1);
    await pick.selectOption(longName);
    await builder.getByRole("button", { name: "Suggest recipes" }).click();
    await expect(builder.getByTestId("ai-recipe-idea")).toBeVisible();
    await expect(builder.getByText(/Uses up:/)).toBeVisible();

    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
    });
    expect(overflow.scrollWidth, `page is ${overflow.scrollWidth}px wide at ${overflow.clientWidth}px viewport`).toBeLessThanOrEqual(overflow.clientWidth);
    await page.screenshot({ path: "test-results/pp183-mobile-fixed.png", fullPage: true });
    await context.close();
  });

});
