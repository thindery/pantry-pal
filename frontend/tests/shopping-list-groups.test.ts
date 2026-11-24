import { describe, expect, it } from "vitest";
import { buildAutoShoppingListItems } from "@/lib/shopping-list-utils";
import type { ItemGroup, PantryItem } from "@/types";

describe("buildAutoShoppingListItems with item groups", () => {
  const soup1: PantryItem = {
    id: "soup-1",
    name: "Campbell's Cream of Chicken",
    quantity: 1,
    unit: "can",
    category: "canned goods",
    lastUpdated: "2026-11-23T12:00:00Z",
    groupId: "group-soup",
  };

  const soup2: PantryItem = {
    id: "soup-2",
    name: "Great Value Cream of Chicken",
    quantity: 2,
    unit: "can",
    category: "canned goods",
    lastUpdated: "2026-11-23T12:00:00Z",
    groupId: "group-soup",
  };

  it("produces no row when have (1+2=3) meets or exceeds target 2", () => {
    const group: ItemGroup = {
      id: "group-soup",
      name: "Cream of Chicken Soup",
      itemIds: ["soup-1", "soup-2"],
      targetQuantity: 2,
    };

    const items = buildAutoShoppingListItems([soup1, soup2], undefined, undefined, [], [group]);
    expect(items).toHaveLength(0);
  });

  it("produces one row need 2 named after group when target is 5 (have 3)", () => {
    const group: ItemGroup = {
      id: "group-soup",
      name: "Cream of Chicken Soup",
      itemIds: ["soup-1", "soup-2"],
      targetQuantity: 5,
    };

    const items = buildAutoShoppingListItems([soup1, soup2], undefined, undefined, [], [group]);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Cream of Chicken Soup");
    expect(items[0].currentQuantity).toBe(3);
    expect(items[0].suggestedQuantity).toBe(2);
    expect(items[0].groupId).toBe("group-soup");
    expect(items[0].pantryItemId).toBe("soup-1");
  });

  it("ensures group members never produce separate rows", () => {
    const group: ItemGroup = {
      id: "group-soup",
      name: "Cream of Chicken Soup",
      itemIds: ["soup-1", "soup-2"],
      targetQuantity: 10,
    };

    const items = buildAutoShoppingListItems([soup1, soup2], undefined, undefined, [], [group]);
    expect(items).toHaveLength(1);
    expect(items.some((i) => i.name === "Campbell's Cream of Chicken")).toBe(false);
    expect(items.some((i) => i.name === "Great Value Cream of Chicken")).toBe(false);
  });

  it("falls back to default 1 when group target is null", () => {
    const emptySoup1: PantryItem = { ...soup1, quantity: 0 };
    const emptySoup2: PantryItem = { ...soup2, quantity: 0 };
    const group: ItemGroup = {
      id: "group-soup",
      name: "Cream of Chicken Soup",
      itemIds: ["soup-1", "soup-2"],
      targetQuantity: null,
    };

    const items = buildAutoShoppingListItems([emptySoup1, emptySoup2], undefined, undefined, [], [group]);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Cream of Chicken Soup");
    expect(items[0].currentQuantity).toBe(0);
    expect(items[0].suggestedQuantity).toBe(1);
  });

  it("leaves ungrouped items unchanged", () => {
    const ungroupedItem: PantryItem = {
      id: "beans-1",
      name: "Black Beans",
      quantity: 0,
      unit: "can",
      category: "canned goods",
      lastUpdated: "2026-11-23T12:00:00Z",
    };

    const items = buildAutoShoppingListItems([ungroupedItem], undefined, undefined, [], []);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Black Beans");
    expect(items[0].suggestedQuantity).toBe(1);
    expect(items[0].groupId).toBeUndefined();
  });

  it("treats unknown groupId as ungrouped", () => {
    const orphanItem: PantryItem = {
      id: "soup-orphan",
      name: "Orphan Soup",
      quantity: 0,
      unit: "can",
      category: "canned goods",
      lastUpdated: "2026-11-23T12:00:00Z",
      groupId: "non-existent-group-id",
    };

    // When groups list does not contain non-existent-group-id
    const items = buildAutoShoppingListItems([orphanItem], undefined, undefined, [], []);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Orphan Soup");
    expect(items[0].suggestedQuantity).toBe(1);
    expect(items[0].groupId).toBeUndefined();
  });
});
