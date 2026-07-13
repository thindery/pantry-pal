import { describe, expect, it } from "vitest";
import {
  getCategoryThreshold,
  getItemThreshold,
  isItemLowStock,
} from "@/lib/threshold-utils";
import { DEFAULT_THRESHOLDS } from "@/lib/constants";
import type { PantryItem } from "@/types";

const milk: PantryItem = {
  id: "milk-1",
  name: "Milk",
  quantity: 2,
  unit: "bottles",
  category: "dairy",
  lastUpdated: new Date().toISOString(),
};

describe("threshold-utils", () => {
  it("uses category default when no item override exists", () => {
    expect(getCategoryThreshold("dairy", DEFAULT_THRESHOLDS)).toBe(2);
    expect(getItemThreshold(milk, DEFAULT_THRESHOLDS, {})).toBe(2);
    expect(isItemLowStock(milk, DEFAULT_THRESHOLDS, {})).toBe(true);
  });

  it("respects per-item overrides", () => {
    const overrides = { "milk-1": 0 };
    expect(getItemThreshold(milk, DEFAULT_THRESHOLDS, overrides)).toBe(0);
    expect(isItemLowStock({ ...milk, quantity: 1 }, DEFAULT_THRESHOLDS, overrides)).toBe(
      false,
    );
  });

  it("does not treat out-of-stock as low stock", () => {
    expect(isItemLowStock({ ...milk, quantity: 0 }, DEFAULT_THRESHOLDS, {})).toBe(
      false,
    );
  });
});