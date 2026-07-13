import { describe, expect, it } from "vitest";
import type { ShoppingListItem } from "@/types";

interface TestItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

// Extracted merge function to test the logic we implemented in generateShoppingList
function mergeShoppingLists(
  existingList: ShoppingListItem[],
  lowStockItems: TestItem[],
  recommendationItems: TestItem[],
  getItemThreshold: (item: TestItem) => number
): ShoppingListItem[] {
  const existingByName = new Map<string, ShoppingListItem>();
  const existingById = new Map<string, ShoppingListItem>();
  
  existingList.forEach((item) => {
    existingByName.set(item.name.toLowerCase(), item);
    if (item.pantryItemId) {
      existingById.set(item.pantryItemId, item);
    }
  });

  const newItems: ShoppingListItem[] = [
    ...lowStockItems.map((item) => {
      const existing = existingById.get(item.id) || existingByName.get(item.name.toLowerCase());
      if (existing) {
        return {
          ...existing,
          currentQuantity: item.quantity,
          lowStockThreshold: getItemThreshold(item),
        };
      }
      return {
        id: `low-${item.id}-${Date.now()}`,
        name: item.name,
        category: item.category,
        currentQuantity: item.quantity,
        suggestedQuantity: 1,
        unit: item.unit,
        isManual: false,
        isChecked: false,
        addedAt: new Date().toISOString(),
        reason: 'low_stock' as const,
        pantryItemId: item.id,
        lowStockThreshold: getItemThreshold(item),
      };
    }),
    ...recommendationItems.map((item) => {
      const existing = existingById.get(item.id) || existingByName.get(item.name.toLowerCase());
      if (existing) {
        return {
          ...existing,
          currentQuantity: item.quantity,
        };
      }
      return {
        id: `rec-${item.id}-${Date.now()}`,
        name: item.name,
        category: item.category,
        currentQuantity: item.quantity,
        suggestedQuantity: 1,
        unit: item.unit,
        isManual: false,
        isChecked: false,
        addedAt: new Date().toISOString(),
        reason: 'recommendation' as const,
        pantryItemId: item.id,
      };
    }),
  ];

  const existingManualItems = existingList.filter((item) => item.isManual);
  const newItemsNames = new Set(newItems.map((i) => i.name.toLowerCase()));
  
  const mergedItems = [
    ...newItems,
    ...existingManualItems.filter((item) => !newItemsNames.has(item.name.toLowerCase())),
  ];

  return mergedItems.sort((a, b) => a.category.localeCompare(b.category));
}

describe("Shopping List Merging", () => {
  it("preserves checked state and custom quantity of existing items", () => {
    const existingList: ShoppingListItem[] = [
      {
        id: "low-milk-123",
        name: "Milk",
        category: "dairy",
        currentQuantity: 1,
        suggestedQuantity: 4, // Custom quantity adjusted by user
        unit: "bottles",
        isManual: false,
        isChecked: true, // Checked by user
        addedAt: new Date().toISOString(),
        reason: "low_stock",
        pantryItemId: "milk-id",
        lowStockThreshold: 2,
      },
    ];

    const lowStockItems = [
      {
        id: "milk-id",
        name: "Milk",
        quantity: 0, // Updated quantity in inventory
        unit: "bottles",
        category: "dairy",
      },
    ];

    const merged = mergeShoppingLists(existingList, lowStockItems, [], () => 2);

    expect(merged.length).toBe(1);
    expect(merged[0].isChecked).toBe(true); // Should preserve checked state!
    expect(merged[0].suggestedQuantity).toBe(4); // Should preserve custom quantity!
    expect(merged[0].currentQuantity).toBe(0); // Should update current quantity from inventory!
  });

  it("adds new low stock items while keeping existing ones", () => {
    const existingList: ShoppingListItem[] = [
      {
        id: "low-milk-123",
        name: "Milk",
        category: "dairy",
        currentQuantity: 1,
        suggestedQuantity: 2,
        unit: "bottles",
        isManual: false,
        isChecked: false,
        addedAt: new Date().toISOString(),
        reason: "low_stock",
        pantryItemId: "milk-id",
        lowStockThreshold: 2,
      },
    ];

    const lowStockItems = [
      {
        id: "milk-id",
        name: "Milk",
        quantity: 1,
        unit: "bottles",
        category: "dairy",
      },
      {
        id: "eggs-id",
        name: "Eggs",
        quantity: 2,
        unit: "carton",
        category: "dairy",
      },
    ];

    const merged = mergeShoppingLists(existingList, lowStockItems, [], () => 2);

    expect(merged.length).toBe(2);
    expect(merged.find(i => i.name === "Milk")?.isChecked).toBe(false);
    expect(merged.find(i => i.name === "Eggs")?.name).toBe("Eggs");
  });

  it("preserves manual items", () => {
    const existingList: ShoppingListItem[] = [
      {
        id: "manual-cookies-123",
        name: "Cookies",
        category: "snacks",
        currentQuantity: 0,
        suggestedQuantity: 1,
        unit: "pack",
        isManual: true,
        isChecked: false,
        addedAt: new Date().toISOString(),
        reason: "manual",
      },
    ];

    const merged = mergeShoppingLists(existingList, [], [], () => 2);

    expect(merged.length).toBe(1);
    expect(merged[0].name).toBe("Cookies");
    expect(merged[0].isManual).toBe(true);
  });
});
