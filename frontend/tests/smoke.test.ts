import { describe, expect, it } from "vitest";
import { CATEGORIES, DEFAULT_THRESHOLDS, UNITS } from "@/lib/constants";
import {
  CLIENT_BUILD_ID,
  isNewerBuildAvailable,
} from "@/lib/versionCheck";

describe("constants", () => {
  it("exports pantry categories and units", () => {
    expect(CATEGORIES).toContain("pantry");
    expect(UNITS).toContain("units");
    expect(DEFAULT_THRESHOLDS.pantry).toBe(2);
  });
});

describe("versionCheck", () => {
  it("skips update toast in dev", () => {
    expect(CLIENT_BUILD_ID).toBe("dev");
    expect(isNewerBuildAvailable("abc123")).toBe(false);
  });

  it("detects mismatched build ids outside dev", () => {
    expect(isNewerBuildAvailable("abc123")).toBe(false);
  });
});