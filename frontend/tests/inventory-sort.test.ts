import { describe, expect, it } from "vitest";
import {
  groupInventoryByCategory,
  normalizeInventorySort,
  sortInventoryItems,
} from "@/lib/inventory-sort";
import type { PantryItem } from "@/types";

function item(partial: Partial<PantryItem> & { name: string }): PantryItem {
  return {
    id: partial.id ?? partial.name,
    name: partial.name,
    quantity: partial.quantity ?? 1,
    unit: "units",
    category: partial.category ?? "pantry",
    lastUpdated: partial.lastUpdated ?? "2026-01-01T00:00:00Z",
    updatedAt: partial.updatedAt,
  };
}

describe("normalizeInventorySort", () => {
  it("accepts current values and maps legacy keys", () => {
    expect(normalizeInventorySort("name-asc")).toBe("name-asc");
    expect(normalizeInventorySort("alphabetical")).toBe("name-asc");
    expect(normalizeInventorySort("quantity")).toBe("qty-desc");
    expect(normalizeInventorySort("nope")).toBe("recent");
    expect(normalizeInventorySort(null)).toBe("recent");
  });
});

describe("sortInventoryItems", () => {
  const items = [
    item({ name: "Banana", quantity: 3, category: "produce", updatedAt: "2026-01-03T00:00:00Z" }),
    item({ name: "Apple", quantity: 1, category: "produce", updatedAt: "2026-01-01T00:00:00Z" }),
    item({ name: "Milk", quantity: 5, category: "dairy", updatedAt: "2026-01-02T00:00:00Z" }),
  ];

  it("sorts by name, qty, and category", () => {
    expect(sortInventoryItems(items, "name-asc").map((i) => i.name)).toEqual([
      "Apple",
      "Banana",
      "Milk",
    ]);
    expect(sortInventoryItems(items, "qty-asc").map((i) => i.name)).toEqual([
      "Apple",
      "Banana",
      "Milk",
    ]);
    expect(sortInventoryItems(items, "qty-desc").map((i) => i.name)).toEqual([
      "Milk",
      "Banana",
      "Apple",
    ]);
    expect(sortInventoryItems(items, "category").map((i) => i.category)).toEqual([
      "dairy",
      "produce",
      "produce",
    ]);
    expect(sortInventoryItems(items, "recent").map((i) => i.name)).toEqual([
      "Banana",
      "Milk",
      "Apple",
    ]);
  });
});

describe("groupInventoryByCategory", () => {
  it("groups consecutive category items", () => {
    const grouped = groupInventoryByCategory(
      sortInventoryItems(
        [
          item({ name: "Milk", category: "dairy" }),
          item({ name: "Apple", category: "produce" }),
          item({ name: "Banana", category: "produce" }),
        ],
        "category"
      )
    );
    expect(grouped.map((g) => [g.category, g.items.map((i) => i.name)])).toEqual([
      ["dairy", ["Milk"]],
      ["produce", ["Apple", "Banana"]],
    ]);
  });
});
