import fs from "fs";
import path from "path";
import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminLayout from "@/app/admin/layout";
import { authConfig } from "@/lib/auth.config";

// Mock next/navigation redirect
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

// Mock @/lib/auth
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

describe("Middleware public prefixes (PP-128)", () => {
  it("includes stripe and resend webhooks as public prefixes without auth", () => {
    const middlewareSource = fs.readFileSync(
      path.resolve(__dirname, "../middleware.ts"),
      "utf-8"
    );
    // Parse PUBLIC_PREFIXES array from middleware source
    const match = middlewareSource.match(/PUBLIC_PREFIXES\s*=\s*\[([\s\S]*?)\];/);
    expect(match).toBeTruthy();
    const prefixes = match ? match[1] : "";

    expect(prefixes).toContain('"/api/webhooks/stripe"');
    expect(prefixes).toContain('"/api/webhooks/resend"');
  });
});

describe("AdminLayout server gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /auth/signin/ when there is no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(
      AdminLayout({ children: React.createElement("div", null, "Admin Content") })
    ).rejects.toThrow("NEXT_REDIRECT:/auth/signin/");

    expect(mockRedirect).toHaveBeenCalledWith("/auth/signin/");
  });

  it("redirects to /auth/signin/ when session user is missing", async () => {
    mockAuth.mockResolvedValue({});

    await expect(
      AdminLayout({ children: React.createElement("div", null, "Admin Content") })
    ).rejects.toThrow("NEXT_REDIRECT:/auth/signin/");

    expect(mockRedirect).toHaveBeenCalledWith("/auth/signin/");
  });

  it("redirects to /dashboard/ when session user is not an admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "usr_1", email: "user@example.com", isAdmin: false },
    });

    await expect(
      AdminLayout({ children: React.createElement("div", null, "Admin Content") })
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard/");

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard/");
  });

  it("renders children when session user is an admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "usr_1", email: "admin@example.com", isAdmin: true },
    });

    const child = React.createElement("div", { "data-testid": "admin-content" }, "Admin Content");
    const result = await AdminLayout({ children: child });

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result).toBe(child);
  });
});

describe("Auth config admin alignment (PP-128)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.ADMIN_EMAILS = "admin@example.com,super@mypantryhub.com";
    process.env.ADMIN_USER_IDS = "usr_admin_1,usr_admin_2";
  });

  it("marks admin by email in jwt callback", async () => {
    const jwtCallback = authConfig.callbacks?.jwt;
    if (!jwtCallback) throw new Error("jwt callback missing");

    const token = await jwtCallback({
      token: {},
      user: { id: "usr_regular", email: "admin@example.com" },
      account: null,
    });
    expect(token.isAdmin).toBe(true);

    const nonAdminToken = await jwtCallback({
      token: {},
      user: { id: "usr_regular", email: "regular@example.com" },
      account: null,
    });
    expect(nonAdminToken.isAdmin).toBe(false);
  });

  it("marks admin by user id in jwt callback (PP-128 alignment)", async () => {
    const jwtCallback = authConfig.callbacks?.jwt;
    if (!jwtCallback) throw new Error("jwt callback missing");

    const token = await jwtCallback({
      token: {},
      user: { id: "usr_admin_1", email: "different@example.com" },
      account: null,
    });
    expect(token.isAdmin).toBe(true);
  });

  it("marks admin in session callback by token isAdmin or email or user id", async () => {
    type SessionRunner = (params: {
      session: {
        user: { id?: string; email?: string | null; isAdmin?: boolean };
        expires: Date;
      };
      token: { sub?: string; id?: string; isAdmin?: boolean };
    }) => Promise<{ user?: { id?: string; email?: string | null; isAdmin?: boolean } }>;

    const runSession = authConfig.callbacks?.session as unknown as SessionRunner;
    if (!runSession) throw new Error("session callback missing");

    const session = await runSession({
      session: {
        user: { email: "super@mypantryhub.com" },
        expires: new Date(),
      },
      token: { sub: "usr_any" },
    });
    expect(session.user?.isAdmin).toBe(true);

    const idSession = await runSession({
      session: {
        user: { email: "other@example.com" },
        expires: new Date(),
      },
      token: { sub: "usr_admin_2" },
    });
    expect(idSession.user?.isAdmin).toBe(true);

    const nonAdminSession = await runSession({
      session: {
        user: { email: "nobody@example.com" },
        expires: new Date(),
      },
      token: { sub: "usr_other" },
    });
    expect(nonAdminSession.user?.isAdmin).toBe(false);
  });
});
