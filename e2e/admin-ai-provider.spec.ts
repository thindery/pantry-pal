import { test, expect, type Page } from "./support/fixtures";
import { signInAsTestUser } from "./support/auth";

/**
 * PP-186: the admin "Receipt scan AI provider" toggle. Ollama is the default and the
 * initial selection; changing it saves through the admin API and survives a reload.
 * The harness has no backend, so /api/admin/* is an in-memory stand-in whose state
 * lives for one test. Backend behavior (fallback, persistence) is covered by pytest.
 */
const METRICS = {
  users: { total: 3, growth: 0, sparkline: [1, 2, 3] },
  products: { total: 5, growth: 0, sparkline: [1, 2, 3] },
  revenue: { lifetime: 0, momGrowth: 0, trend: [0, 0, 0] },
  logins: { data: [] },
  transactions: [],
  alerts: { failedPayments: 0 },
};

async function installAdminApi(page: Page, initial: "ollama" | "gemini" | null) {
  const state = { stored: initial as string | null, puts: [] as string[] };
  await page.route(/googletagmanager\.com|google-analytics\.com|cloudflareinsights\.com/, (route) => route.abort());
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/\/$/, "");
    if (path.startsWith("/api/auth")) return route.fallback();
    const ok = (data: unknown) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
    if (path === "/api/admin/ai-provider") {
      if (request.method() === "PUT") {
        const body = request.postDataJSON() as { provider: string };
        state.puts.push(body.provider);
        state.stored = body.provider;
      }
      return ok({
        provider: state.stored ?? "ollama",
        options: ["ollama", "gemini"],
        enabled: true,
        ollamaConfigured: true,
        geminiConfigured: true,
      });
    }
    if (path === "/api/admin/dashboard") return ok(METRICS);
    return ok([]);
  });
  return state;
}

test.describe("Admin AI provider toggle", () => {
  test("shows Ollama first, saves a switch to Gemini, and keeps it after reload", async ({ context, baseURL }) => {
    await signInAsTestUser(context, baseURL!);
    const page = await context.newPage();
    const state = await installAdminApi(page, null);

    await page.goto("/admin/");
    await page.getByRole("button", { name: /Feature Flags/ }).click();

    const panel = page.getByTestId("ai-provider-panel");
    await expect(panel).toBeVisible();
    const ollama = panel.getByRole("radio", { name: "Ollama" });
    const gemini = panel.getByRole("radio", { name: "Gemini" });
    await expect(ollama).toHaveAttribute("aria-checked", "true");
    await expect(gemini).toHaveAttribute("aria-checked", "false");

    await gemini.click();
    await expect(gemini).toHaveAttribute("aria-checked", "true");
    await expect.poll(() => state.puts).toEqual(["gemini"]);

    await page.reload();
    await page.getByRole("button", { name: /Feature Flags/ }).click();
    await expect(page.getByTestId("ai-provider-panel").getByRole("radio", { name: "Gemini" })).toHaveAttribute(
      "aria-checked",
      "true"
    );

    await page.getByTestId("ai-provider-panel").getByRole("radio", { name: "Ollama" }).click();
    await expect.poll(() => state.puts).toEqual(["gemini", "ollama"]);
  });
});
