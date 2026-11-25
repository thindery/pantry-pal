import fs from "fs";
import path from "path";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DesignSystemLayout from "@/app/design-system/layout";

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

describe("PP-072 /design-system gate", () => {
  beforeEach(() => {
    mockRedirect.mockReset();
    mockAuth.mockReset();
  });

  it("is no longer in the middleware public allowlist and is protected", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../middleware.ts"), "utf-8");
    const publicPaths = src.match(/PUBLIC_PATHS\s*=\s*new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? "";
    const protectedPrefixes = src.match(/PROTECTED_PREFIXES\s*=\s*\[([\s\S]*?)\];/)?.[1] ?? "";
    expect(publicPaths).not.toContain('"/design-system"');
    expect(protectedPrefixes).toContain('"/design-system"');
  });

  it("redirects signed-out visitors to sign in", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(DesignSystemLayout({ children: <div /> })).rejects.toThrow("NEXT_REDIRECT:/auth/signin/");
  });

  it("redirects signed-in non-admins to the dashboard", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", isAdmin: false } });
    await expect(DesignSystemLayout({ children: <div /> })).rejects.toThrow("NEXT_REDIRECT:/dashboard/");
  });

  it("renders for admins", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", isAdmin: true } });
    const child = <div>ok</div>;
    await expect(DesignSystemLayout({ children: child })).resolves.toBe(child);
  });
});
