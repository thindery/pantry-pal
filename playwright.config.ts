import { defineConfig, devices } from "@playwright/test";

const rawBaseUrl = process.env.E2E_BASE_URL;
const baseURL = rawBaseUrl || "http://127.0.0.1:3100";

// Guard: refuse to run if E2E_BASE_URL points at mypantryhub.com unless E2E_ALLOW_PROD_READONLY=1
if (rawBaseUrl) {
  try {
    const parsed = new URL(rawBaseUrl);
    const hostname = parsed.hostname.toLowerCase();
    const isProd =
      hostname === "mypantryhub.com" ||
      hostname.endsWith(".mypantryhub.com");

    if (isProd && process.env.E2E_ALLOW_PROD_READONLY !== "1") {
      throw new Error(
        `Refusing to run E2E against production (${hostname}) without E2E_ALLOW_PROD_READONLY=1`
      );
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("Refusing to run E2E")) {
      throw err;
    }
    // If invalid URL string, let Playwright handle invalid baseURL or re-throw
    throw err;
  }
}

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  ...(!rawBaseUrl && {
    webServer: {
      command:
        "npm run build:frontend && npm run start -w @pantry-pal/frontend -- -p 3100",
      url: "http://127.0.0.1:3100",
      timeout: 240000,
      // Never silently reuse a stale server (the deploy gate must test this checkout).
      reuseExistingServer: !process.env.CI && process.env.E2E_REUSE_SERVER === "1",
    },
  }),
});
