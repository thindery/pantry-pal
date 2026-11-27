import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/get-bearer-token", () => ({
  getBearerToken: vi.fn(async () => "tok-123"),
  clearCachedBearerToken: vi.fn(),
}));

import { getBearerToken, clearCachedBearerToken } from "@/lib/get-bearer-token";
import { getDashboardMetrics, authedFetch } from "@/services/adminService";

function jsonResponse(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 401 ? "Unauthorized" : "OK",
    headers: { "Content-Type": "application/json" },
  });
}

describe("adminService auth (PP-236)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(getBearerToken).mockResolvedValue("tok-123");
    vi.mocked(clearCachedBearerToken).mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the bearer token on admin dashboard requests", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: { ok: true } }));
    await getDashboardMetrics("7d");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/admin/dashboard?period=7d");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-123");
  });

  it("refreshes the token and retries once on a 401", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(200, { data: { ok: true } }));
    await getDashboardMetrics("7d");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(clearCachedBearerToken).toHaveBeenCalledTimes(1);
  });

  it("still surfaces the 401 if the retry also fails", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401));
    await expect(getDashboardMetrics("7d")).rejects.toThrow("API error: 401");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("authedFetch is usable for non-admin-service endpoints like client-errors", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { errors: [] }));
    await authedFetch("/api/client-errors?resolved=false");
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-123");
  });
});
