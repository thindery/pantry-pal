import { createHash } from "node:crypto";
import type { BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";

/**
 * PP-150: a signed-in browser for the local harness without Google OAuth.
 *
 * The harness server gets a throwaway AUTH_SECRET derived here (never a real
 * one), and tests mint a matching Auth.js JWT session cookie. Only for the
 * local production build on 127.0.0.1 — playwright.config.ts refuses to aim
 * at production.
 */
export function e2eAuthSecret(): string {
  return process.env.E2E_AUTH_SECRET || createHash("sha256").update("pantry-hub-local-e2e-harness").digest("hex");
}

export const E2E_USER = {
  id: "e2e-user-0001",
  email: "e2e-user@example.test",
  name: "E2E Tester",
};

const COOKIE_NAME = "authjs.session-token"; // http://127.0.0.1 (no __Secure- prefix)

export async function signInAsTestUser(context: BrowserContext, baseURL: string): Promise<void> {
  const token = await encode({
    token: { sub: E2E_USER.id, id: E2E_USER.id, email: E2E_USER.email, name: E2E_USER.name },
    secret: e2eAuthSecret(),
    salt: COOKIE_NAME,
    maxAge: 60 * 60,
  });
  const url = new URL(baseURL);
  await context.addCookies([
    { name: COOKIE_NAME, value: token, domain: url.hostname, path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
}
