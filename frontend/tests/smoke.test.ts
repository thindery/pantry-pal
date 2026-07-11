import { describe, expect, it } from "vitest";
import { CATEGORIES, DEFAULT_THRESHOLDS, UNITS } from "@/lib/constants";

describe("constants", () => {
  it("exports pantry categories and units", () => {
    expect(CATEGORIES).toContain("pantry");
    expect(UNITS).toContain("units");
    expect(DEFAULT_THRESHOLDS.pantry).toBe(2);
  });
});