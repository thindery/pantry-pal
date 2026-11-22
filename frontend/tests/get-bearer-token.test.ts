import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCachedBearerToken, getBearerToken } from "@/lib/get-bearer-token";

function jwtWithExp(expSeconds: number): string {
  const payload = btoa(JSON.stringify({ exp: expSeconds }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `eyJhbGciOiJub25lIn0.${payload}.sig`;
}

describe("getBearerToken cache", () => {
  beforeEach(() => {
    clearCachedBearerToken();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: jwtWithExp(Math.floor(Date.now() / 1000) + 3600) }),
      })
    );
  });

  afterEach(() => {
    clearCachedBearerToken();
    vi.unstubAllGlobals();
  });

  it("reuses an in-memory token instead of refetching /api/auth/token", async () => {
    const first = await getBearerToken();
    const second = await getBearerToken();
    expect(first).toBeTruthy();
    expect(second).toBe(first);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/api/auth/token", { credentials: "include" });
  });

  it("refetches after the cache is cleared", async () => {
    await getBearerToken();
    clearCachedBearerToken();
    await getBearerToken();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
