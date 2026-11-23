import { describe, expect, it } from "vitest";
import {
  buildAutoShoppingListItems,
  calculateNeed,
  migrateShoppingListItems,
  normalizeItemName,
} from "@/lib/shopping-list-utils";
import {
  migrateThresholdConfig,
  OLD_PRE_JULY_THRESHOLDS,
} from "@/lib/threshold-utils";
import type { PantryItem, ShoppingListItem } from "@/types";

describe("PP-156: Unify Shopping List and Need Targets", () => {
  describe("1. need = max(target - have, 0) with default 1", () => {
    it("pure helper calculateNeed computes max(target - have, 0)", () => {
      // Default target 1
      expect(calculateNeed(1, 0)).toBe(1); // Out of stock with target 1 -> need 1
      expect(calculateNeed(1, 1)).toBe(0); // In stock at target -> need 0
      expect(calculateNeed(1, 5)).toBe(0); // Over target -> need 0

      // Custom targets
      expect(calculateNeed(3, 1)).toBe(2);
      expect(calculateNeed(5, 2)).toBe(3);
      expect(calculateNeed(2, 2)).toBe(0);
      expect(calculateNeed(2, 4)).toBe(0);
    });

    it("items with have >= target must NOT appear on the shopping list", () => {
      const inventory: PantryItem[] = [
        {
          id: "item-1",
          name: "Flour",
          quantity: 1, // have 1, default target 1 -> have >= target
          unit: "bag",
          category: "pantry",
          lastUpdated: "2026-01-01T00:00:00Z",
        },
        {
          id: "item-2",
          name: "Sugar",
          quantity: 2, // have 2, default target 1 -> have >= target
          unit: "bag",
          category: "pantry",
          lastUpdated: "2026-01-01T00:00:00Z",
        },
        {
          id: "item-3",
          name: "Salt",
          quantity: 0, // have 0, default target 1 -> have < target
          unit: "box",
          category: "pantry",
          lastUpdated: "2026-01-01T00:00:00Z",
        },
      ];

      const list = buildAutoShoppingListItems(inventory);
      expect(list.length).toBe(1);
      expect(list[0].name).toBe("Salt");
      expect(list[0].currentQuantity).toBe(0);
      expect(list[0].suggestedQuantity).toBe(1);
    });
  });

  describe("2. Produce have 1 with old threshold 3 -> item not listed / need 0", () => {
    it("stale produce threshold 3 resets to 1, causing have-1 item to have need 0 and leave the list", () => {
      // User previously had produce: 3 stored from old pre-July defaults
      const oldConfig = { produce: 3 };
      const migratedConfig = migrateThresholdConfig(oldConfig);
      expect(migratedConfig.produce).toBe(1);

      const inventory: PantryItem[] = [
        {
          id: "apple-1",
          name: "Honeycrisp Apples",
          quantity: 1,
          unit: "lbs",
          category: "produce",
          lastUpdated: "2026-01-01T00:00:00Z",
        },
      ];

      // With migrated config (produce: 1) and have: 1, need is 0, so item is not listed
      const list = buildAutoShoppingListItems(inventory, migratedConfig);
      expect(list).toEqual([]);

      // If out of stock (have 0), need is 1 and it appears on the list
      const outOfStockList = buildAutoShoppingListItems(
        [{ ...inventory[0], quantity: 0 }],
        migratedConfig
      );
      expect(outOfStockList.length).toBe(1);
      expect(outOfStockList[0].name).toBe("Honeycrisp Apples");
      expect(outOfStockList[0].currentQuantity).toBe(0);
      expect(outOfStockList[0].suggestedQuantity).toBe(1);
    });
  });

  describe("3. Stale threshold reset only for exact old defaults (produce 4 stays 4)", () => {
    it("resets exactly-matching pre-July defaults to 1", () => {
      const exactOldDefaults = { ...OLD_PRE_JULY_THRESHOLDS };
      const migrated = migrateThresholdConfig(exactOldDefaults);
      expect(migrated).toEqual({
        produce: 1,
        pantry: 1,
        dairy: 1,
        beverages: 1,
        snacks: 1,
        other: 1,
        frozen: 1,
        meat: 1,
      });
    });

    it("leaves user-customized values untouched (produce 4 stays 4)", () => {
      const userConfig = {
        produce: 4, // User explicitly customized to 4 (old default was 3)
        dairy: 5,   // User explicitly customized to 5 (old default was 2)
        pantry: 2,  // Exactly matches old default 2 -> should reset to 1
        snacks: 2,  // Exactly matches old default 2 -> should reset to 1
        meat: 3,    // Customized to 3 (old default was 1)
      };

      const migrated = migrateThresholdConfig(userConfig);
      expect(migrated.produce).toBe(4); // Stays 4!
      expect(migrated.dairy).toBe(5);   // Stays 5!
      expect(migrated.pantry).toBe(1);  // Reset to 1
      expect(migrated.snacks).toBe(1);  // Reset to 1
      expect(migrated.meat).toBe(3);    // Stays 3!
    });
  });

  describe("4. Exact-name grouping", () => {
    it("groups Dole + Always Save Pineapple slices into one row (have 2); Pineapple Chunks stays separate", () => {
      const inventory: PantryItem[] = [
        {
          id: "dole-slices-id",
          name: "Pineapple slices",
          quantity: 1,
          unit: "can",
          category: "produce",
          lastUpdated: "2026-01-01T00:00:00Z",
          barcode: "038900001391",
        },
        {
          id: "always-save-slices-id",
          name: "  pineapple   slices  ", // Extra whitespace and different casing
          quantity: 1,
          unit: "can",
          category: "other", // Category differs across scans
          lastUpdated: "2026-01-02T00:00:00Z",
          barcode: "070038315759",
        },
        {
          id: "chunks-id",
          name: "Pineapple Chunks In 100% Pineapple Juice",
          quantity: 0,
          unit: "can",
          category: "produce",
          lastUpdated: "2026-01-03T00:00:00Z",
          barcode: "038900004699",
        },
      ];

      // With default target 1:
      // Pineapple slices has combined have = 1 + 1 = 2 >= target 1 -> NOT listed!
      // Pineapple chunks has have = 0 < target 1 -> listed with need 1!
      const defaultList = buildAutoShoppingListItems(inventory);
      expect(defaultList.length).toBe(1);
      expect(defaultList[0].name).toBe("Pineapple Chunks In 100% Pineapple Juice");
      expect(defaultList[0].suggestedQuantity).toBe(1);

      // With custom target 3 for Pineapple slices:
      // Combined have = 2, target = 3 -> need = 1!
      const overrides = { "dole-slices-id": 3 };
      const customList = buildAutoShoppingListItems(inventory, undefined, overrides);

      expect(customList.length).toBe(2);
      const slicesRow = customList.find(
        (r) => normalizeItemName(r.name) === "pineapple slices"
      );
      expect(slicesRow).toBeDefined();
      expect(slicesRow?.currentQuantity).toBe(2); // Dole (1) + Always Save (1)
      expect(slicesRow?.suggestedQuantity).toBe(1); // max(3 - 2, 0) = 1
      expect(slicesRow?.pantryItemId).toBe("dole-slices-id"); // Kept first item id

      const chunksRow = customList.find(
        (r) => normalizeItemName(r.name) === "pineapple chunks in 100% pineapple juice"
      );
      expect(chunksRow).toBeDefined();
      expect(chunksRow?.currentQuantity).toBe(0);
      expect(chunksRow?.suggestedQuantity).toBe(1);
    });

    it("does not fuzzy-match distinct tomato products", () => {
      const inventory: PantryItem[] = [
        {
          id: "tomato-1",
          name: "Diced tomatoes",
          quantity: 0,
          unit: "can",
          category: "pantry",
          lastUpdated: "2026-01-01T00:00:00Z",
        },
        {
          id: "tomato-2",
          name: "Petite Diced Tomatoes",
          quantity: 0,
          unit: "can",
          category: "pantry",
          lastUpdated: "2026-01-01T00:00:00Z",
        },
      ];

      const list = buildAutoShoppingListItems(inventory);
      expect(list.length).toBe(2);
      expect(list.map((i) => i.name)).toEqual([
        "Diced tomatoes",
        "Petite Diced Tomatoes",
      ]);
    });
  });

  describe("5. Manual shopping-list items keep typed quantity", () => {
    it("preserves manual items and drops auto rows during migration", () => {
      const mixedList: ShoppingListItem[] = [
        {
          id: "auto-1",
          name: "Milk",
          category: "dairy",
          currentQuantity: 1,
          suggestedQuantity: 5, // Stale 5
          unit: "gallons",
          isManual: false,
          isChecked: false,
          addedAt: "2026-01-01T00:00:00Z",
          reason: "low_stock",
        },
        {
          id: "manual-1",
          name: "Birthday Candles",
          category: "other",
          currentQuantity: 0,
          suggestedQuantity: 24, // User-typed quantity
          unit: "pack",
          isManual: true,
          isChecked: false,
          addedAt: "2026-01-02T00:00:00Z",
          reason: "manual",
        },
      ];

      const migrated = migrateShoppingListItems(mixedList);
      expect(migrated.length).toBe(1);
      expect(migrated[0].id).toBe("manual-1");
      expect(migrated[0].suggestedQuantity).toBe(24);
    });
  });
});
