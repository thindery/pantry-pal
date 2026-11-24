import { describe, expect, it } from "vitest";
import { findGroupSuggestion, productMatchKey } from "@/lib/item-group-match";
import type { ItemGroup, PantryItem } from "@/types";

describe("productMatchKey", () => {
  it("matches Campbell's Cream of Chicken 10.5 oz and Great Value Cream of Chicken", () => {
    const key1 = productMatchKey("Campbell's Cream of Chicken 10.5 oz");
    const key2 = productMatchKey("Great Value Cream of Chicken");
    expect(key1).toBe("cream of chicken");
    expect(key2).toBe("cream of chicken");
    expect(key1).toBe(key2);
  });

  it("does NOT match Cream of Chicken and Cream of Mushroom", () => {
    const key1 = productMatchKey("Cream of Chicken");
    const key2 = productMatchKey("Cream of Mushroom");
    expect(key1).toBe("cream of chicken");
    expect(key2).toBe("cream of mushroom");
    expect(key1).not.toBe(key2);
  });

  it("does NOT match Chicken Noodle Soup and Cream of Chicken Soup", () => {
    const key1 = productMatchKey("Chicken Noodle Soup");
    const key2 = productMatchKey("Cream of Chicken Soup");
    expect(key1).toBe("chicken noodle soup");
    expect(key2).toBe("cream of chicken soup");
    expect(key1).not.toBe(key2);
  });

  it("does NOT match Low Sodium Chicken Broth and Chicken Broth", () => {
    const key1 = productMatchKey("Low Sodium Chicken Broth");
    const key2 = productMatchKey("Chicken Broth");
    expect(key1).toBe("low sodium chicken broth");
    expect(key2).toBe("chicken broth");
    expect(key1).not.toBe(key2);
  });

  it("treats size-only differences as equal keys", () => {
    const keySmall = productMatchKey("Campbell's Cream of Chicken 10.5 oz");
    const keyLarge = productMatchKey("Campbell's Cream of Chicken 22 oz");
    expect(keySmall).toBe(keyLarge);
  });
});

describe("findGroupSuggestion", () => {
  const itemA: PantryItem = {
    id: "item-1",
    name: "Campbell's Cream of Chicken 10.5 oz",
    quantity: 2,
    unit: "can",
    category: "canned goods",
    lastUpdated: "2026-11-23T12:00:00Z",
  };

  const itemB: PantryItem = {
    id: "item-2",
    name: "Great Value Cream of Chicken",
    quantity: 1,
    unit: "can",
    category: "canned goods",
    lastUpdated: "2026-11-23T12:00:00Z",
  };

  const groupA: ItemGroup = {
    id: "group-1",
    name: "Cream of Chicken Soup",
    itemIds: ["item-1"],
    targetQuantity: 4,
  };

  it("excludes self from suggestion", () => {
    const suggestion = findGroupSuggestion(itemA, [itemA]);
    expect(suggestion).toBeNull();
  });

  it("excludes same-group items from suggestion", () => {
    const groupedItemA = { ...itemA, groupId: "group-1" };
    const groupedItemB = { ...itemB, groupId: "group-1" };
    const suggestion = findGroupSuggestion(groupedItemA, [groupedItemA, groupedItemB], [groupA]);
    expect(suggestion).toBeNull();
  });

  it("suggests existing ungrouped matching item", () => {
    const suggestion = findGroupSuggestion(itemB, [itemA]);
    expect(suggestion).toEqual(itemA);
  });

  it("suggests the group if matching item is already in a group", () => {
    const groupedItemA = { ...itemA, groupId: "group-1" };
    const suggestion = findGroupSuggestion(itemB, [groupedItemA], [groupA]);
    expect(suggestion).toEqual(groupA);
  });
});
