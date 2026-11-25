import { describe, expect, it } from "vitest";
import { isUsableProductName } from "@/lib/product-name";

describe("isUsableProductName", () => {
  it("rejects empty, whitespace, and 1–2 character names", () => {
    expect(isUsableProductName(undefined)).toBe(false);
    expect(isUsableProductName(null)).toBe(false);
    expect(isUsableProductName("")).toBe(false);
    expect(isUsableProductName("  ")).toBe(false);
    expect(isUsableProductName("P")).toBe(false);
    expect(isUsableProductName(" F ")).toBe(false);
    expect(isUsableProductName("AB")).toBe(false);
  });

  it("accepts real product names of 3+ characters", () => {
    expect(isUsableProductName("Oil")).toBe(true);
    expect(isUsableProductName("Flour")).toBe(true);
    expect(
      isUsableProductName(
        "Two Men and a Garden Sweet Heat Pickling Pouch 3.8oz"
      )
    ).toBe(true);
  });
});
