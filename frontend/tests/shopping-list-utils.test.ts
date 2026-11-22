import { describe, expect, it } from "vitest";
import {
  calculateSuggestedQuantity,
  getShoppingItemReason,
  getSuggestedQuantityCap,
  groupShoppingListByCategory,
  mergePreservedQuantity,
  normalizeShoppingListSort,
  sortShoppingListItems,
} from "@/lib/shopping-list-utils";
import type { Activity, ShoppingListItem } from "@/types";

describe("calculateSuggestedQuantity", () => {
  const now = 1774000000000; // fixed timestamp for tests

  it("returns fallback max(threshold * 2, 1) when there is no usage history", () => {
    const suggested = calculateSuggestedQuantity([], "item-1", 2, now);
    expect(suggested).toBe(4); // 2 * 2 = 4

    const suggestedZeroThreshold = calculateSuggestedQuantity([], "item-1", 0, now);
    expect(suggestedZeroThreshold).toBe(1); // max(0 * 2, 1) = 1
  });

  it("Milk case: 2 REMOVE events of amount 1 with recent timestamps must NOT return 28", () => {
    // Both activities happened within the last 2 hours
    const activities: Pick<Activity, "itemId" | "type" | "amount" | "timestamp">[] = [
      {
        itemId: "milk-1",
        type: "REMOVE",
        amount: 1,
        timestamp: new Date(now - 2 * 3600 * 1000).toISOString(),
      },
      {
        itemId: "milk-1",
        type: "REMOVE",
        amount: 1,
        timestamp: new Date(now - 1 * 3600 * 1000).toISOString(),
      },
    ];

    const threshold = 2; // typical dairy threshold
    const suggested = calculateSuggestedQuantity(activities, "milk-1", threshold, now);

    // Old formula gave ceil(2 * 14 / 1) * 1 = 28.
    // Short window (< 7 days) falls back to max(threshold * 2, 1) = 4, capped.
    expect(suggested).not.toBe(28);
    expect(suggested).toBe(4);
  });

  it("uses the oldest activity timestamp for the history window even if array is unsorted", () => {
    const fourteenDaysAgo = now - 14 * 24 * 3600 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;

    const activities: Pick<Activity, "itemId" | "type" | "amount" | "timestamp">[] = [
      {
        itemId: "item-1",
        type: "REMOVE",
        amount: 1,
        timestamp: new Date(sevenDaysAgo).toISOString(),
      },
      {
        itemId: "item-1",
        type: "REMOVE",
        amount: 1,
        timestamp: new Date(fourteenDaysAgo).toISOString(),
      },
    ];

    // totalUsed = 2, history = 14 days, dailyUsage = 2 / 14, suggested = ceil(2/14 * 14) = 2
    const suggested = calculateSuggestedQuantity(activities, "item-1", 2, now);
    expect(suggested).toBe(2);
  });

  it("counts REMOVE activities and ignores ADJUST / ADD / non-positive amounts", () => {
    const fourteenDaysAgo = now - 14 * 24 * 3600 * 1000;

    const activities: Pick<Activity, "itemId" | "type" | "amount" | "timestamp">[] = [
      {
        itemId: "item-1",
        type: "ADJUST",
        amount: 10, // Should be ignored!
        timestamp: new Date(fourteenDaysAgo).toISOString(),
      },
      {
        itemId: "item-1",
        type: "REMOVE",
        amount: 2,
        timestamp: new Date(fourteenDaysAgo).toISOString(),
      },
      {
        itemId: "other-item",
        type: "REMOVE",
        amount: 5,
        timestamp: new Date(fourteenDaysAgo).toISOString(),
      },
    ];

    // Only 2 units from item-1 REMOVE over 14 days -> suggested = 2
    const suggested = calculateSuggestedQuantity(activities, "item-1", 2, now);
    expect(suggested).toBe(2);
  });

  it("caps suggested quantity at max(12, threshold * 4)", () => {
    const capLow = getSuggestedQuantityCap(1);
    expect(capLow).toBe(12); // max(12, 4) = 12

    const capHigh = getSuggestedQuantityCap(5);
    expect(capHigh).toBe(20); // max(12, 20) = 20

    // High usage over at least 7 days (e.g. 7-day window) caps at max(12, threshold * 4) = 12
    const activities: Pick<Activity, "itemId" | "type" | "amount" | "timestamp">[] = [
      {
        itemId: "item-1",
        type: "REMOVE",
        amount: 50,
        timestamp: new Date(now - 7 * 24 * 3600 * 1000).toISOString(),
      },
    ];
    const suggested = calculateSuggestedQuantity(activities, "item-1", 2, now);
    expect(suggested).toBe(12);
  });
});

describe("mergePreservedQuantity", () => {
  it("preserves reasonable user-edited quantity within cap", () => {
    const threshold = 2; // cap = 12
    const userEditedQuantity = 4;
    const calculated = 2;

    const result = mergePreservedQuantity(userEditedQuantity, calculated, threshold);
    expect(result).toBe(4);
  });

  it("replaces obviously wild preserved quantity (> cap) with calculated value", () => {
    const threshold = 2; // cap = 12
    const wildQuantity = 28; // legacy buggy Milk quantity
    const calculated = 2;

    const result = mergePreservedQuantity(wildQuantity, calculated, threshold);
    expect(result).toBe(2);
  });
});

describe("getShoppingItemReason", () => {
  it("returns Added manually for manual items", () => {
    const item: ShoppingListItem = {
      id: "1",
      name: "Snacks",
      category: "snacks",
      currentQuantity: 0,
      suggestedQuantity: 2,
      unit: "pack",
      isManual: true,
      isChecked: false,
      addedAt: new Date().toISOString(),
      reason: "manual",
    };
    expect(getShoppingItemReason(item)).toBe("Added manually");
  });

  it("returns short Have N · need M subline without alert text", () => {
    const item: ShoppingListItem = {
      id: "2",
      name: "Milk",
      category: "dairy",
      currentQuantity: 1,
      suggestedQuantity: 3,
      unit: "gallons",
      isManual: false,
      isChecked: false,
      addedAt: new Date().toISOString(),
      reason: "low_stock",
      lowStockThreshold: 2,
    };
    const reason = getShoppingItemReason(item);
    expect(reason).toBe("Have 1 · need 3");
    expect(reason).not.toContain("warn at or below");
    expect(reason).not.toContain("alert");
  });

  it("formats 0 quantity as Have 0 · need M", () => {
    const item: ShoppingListItem = {
      id: "3",
      name: "Eggs",
      category: "dairy",
      currentQuantity: 0,
      suggestedQuantity: 2,
      unit: "carton",
      isManual: false,
      isChecked: false,
      addedAt: new Date().toISOString(),
      reason: "low_stock",
    };
    expect(getShoppingItemReason(item)).toBe("Have 0 · need 2");
  });
});

describe("sortShoppingListItems & groupShoppingListByCategory", () => {
  const items: ShoppingListItem[] = [
    {
      id: "1",
      name: "Milk",
      category: "dairy",
      currentQuantity: 1,
      suggestedQuantity: 2,
      unit: "jug",
      isManual: false,
      isChecked: false,
      addedAt: "2026-01-01T00:00:00Z",
      reason: "low_stock",
    },
    {
      id: "2",
      name: "Apples",
      category: "produce",
      currentQuantity: 0,
      suggestedQuantity: 6,
      unit: "lbs",
      isManual: false,
      isChecked: false,
      addedAt: "2026-01-02T00:00:00Z",
      reason: "low_stock",
    },
    {
      id: "3",
      name: "Butter",
      category: "dairy",
      currentQuantity: 1,
      suggestedQuantity: 1,
      unit: "pack",
      isManual: false,
      isChecked: false,
      addedAt: "2026-01-03T00:00:00Z",
      reason: "low_stock",
    },
  ];

  it("normalizes invalid sort keys to category", () => {
    expect(normalizeShoppingListSort("unknown")).toBe("category");
    expect(normalizeShoppingListSort(null)).toBe("category");
    expect(normalizeShoppingListSort("name-asc")).toBe("name-asc");
  });

  it("sorts by category and name", () => {
    const sorted = sortShoppingListItems(items, "category");
    expect(sorted.map((i) => i.name)).toEqual(["Butter", "Milk", "Apples"]);
  });

  it("sorts by name A-Z", () => {
    const sorted = sortShoppingListItems(items, "name-asc");
    expect(sorted.map((i) => i.name)).toEqual(["Apples", "Butter", "Milk"]);
  });

  it("sorts by quantity high to low", () => {
    const sorted = sortShoppingListItems(items, "qty-desc");
    expect(sorted.map((i) => i.name)).toEqual(["Apples", "Milk", "Butter"]);
  });

  it("groups items by category", () => {
    const sorted = sortShoppingListItems(items, "category");
    const grouped = groupShoppingListByCategory(sorted);
    expect(grouped.length).toBe(2);
    expect(grouped[0].category).toBe("dairy");
    expect(grouped[0].items.map((i) => i.name)).toEqual(["Butter", "Milk"]);
    expect(grouped[1].category).toBe("produce");
    expect(grouped[1].items.map((i) => i.name)).toEqual(["Apples"]);
  });
});
