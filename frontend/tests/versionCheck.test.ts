import { afterEach, describe, expect, it, vi } from "vitest";

describe("versionCheck", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    sessionStorage.clear();
  });

  it("skips update toast when client build id is dev", async () => {
    vi.stubEnv("NEXT_PUBLIC_BUILD_ID", "dev");
    const { CLIENT_BUILD_ID, isNewerBuildAvailable } = await import(
      "@/lib/versionCheck"
    );
    expect(CLIENT_BUILD_ID).toBe("dev");
    expect(isNewerBuildAvailable("abc123")).toBe(false);
  });

  it("detects mismatched production build ids", async () => {
    vi.stubEnv("NEXT_PUBLIC_BUILD_ID", "abc123");
    const { isNewerBuildAvailable } = await import("@/lib/versionCheck");
    expect(isNewerBuildAvailable("def456")).toBe(true);
    expect(isNewerBuildAvailable("abc123")).toBe(false);
  });

  it("respects sessionStorage dismiss for the same live build", async () => {
    vi.stubEnv("NEXT_PUBLIC_BUILD_ID", "abc123");
    const { dismissBuildUpdate, isNewerBuildAvailable } = await import(
      "@/lib/versionCheck"
    );
    expect(isNewerBuildAvailable("def456")).toBe(true);
    dismissBuildUpdate("def456");
    expect(isNewerBuildAvailable("def456")).toBe(false);
  });
});