import type { Activity, ItemGroup, PantryItem, ShoppingListItem, ShoppingListSortBy, ThresholdConfig } from "@/types";
import type { ItemThresholdOverrides } from "@/lib/threshold-utils";
import { getItemTarget } from "@/lib/threshold-utils";

export const SHOPPING_LIST_SORT_STORAGE_KEY = "pantry-shopping-list-sort";

/**
 * Exact normalized item name: lowercase, trim, and collapse internal whitespace.
 * Category/brand differences are ignored; similar names stay distinct.
 */
export function normalizeItemName(name: string): string {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Pure helper for shopping-list need: max(target - have, 0).
 */
export function calculateNeed(target: number, have: number): number {
  return Math.max(target - have, 0);
}

/**
 * Build auto-generated shopping-list rows from inventory:
 * - Groups by EXACT normalized name only (no fuzzy matching).
 * - Combined have = sum of quantities across items with the same normalized name.
 * - Need = max(target - combined have, 0).
 * - Items with have >= target do NOT appear on the shopping list.
 * - Out of stock with target 1 shows need 1.
 * - Keeps pantryItemId of the first row for markItemAsBought etc.
 * - Recomputes quantity from target (no mergePreservedQuantity).
 * - Preserves isChecked / addedAt from previously existing row if present.
 */
export function buildAutoShoppingListItems(
  inventory: PantryItem[],
  thresholdConfig?: ThresholdConfig,
  itemOverrides?: ItemThresholdOverrides,
  existingShoppingList: ShoppingListItem[] = [],
  groups?: ItemGroup[],
): ShoppingListItem[] {
  const knownGroups = new Map<string, ItemGroup>();
  if (groups) {
    for (const g of groups) {
      knownGroups.set(g.id, g);
    }
  }

  const buckets = new Map<string, PantryItem[]>();

  for (const item of inventory) {
    let key: string;
    if (item.groupId && knownGroups.has(item.groupId)) {
      key = `group:${item.groupId}`;
    } else {
      key = `name:${normalizeItemName(item.name)}`;
    }

    const existing = buckets.get(key);
    if (existing) {
      existing.push(item);
    } else {
      buckets.set(key, [item]);
    }
  }

  const existingByPantryId = new Map<string, ShoppingListItem>();
  const existingByNormName = new Map<string, ShoppingListItem>();
  const existingByGroupId = new Map<string, ShoppingListItem>();

  for (const item of existingShoppingList) {
    if (!item.isManual) {
      if (item.groupId) existingByGroupId.set(item.groupId, item);
      if (item.pantryItemId) existingByPantryId.set(item.pantryItemId, item);
      existingByNormName.set(normalizeItemName(item.name), item);
    }
  }

  const result: ShoppingListItem[] = [];

  for (const [bucketKey, items] of buckets.entries()) {
    const primaryItem = items[0];
    const combinedHave = items.reduce(
      (sum, i) => sum + (Number(i.quantity) || 0),
      0
    );

    if (bucketKey.startsWith("group:")) {
      const groupId = bucketKey.slice(6);
      const group = knownGroups.get(groupId)!;

      let target = 1;
      if (group.targetQuantity != null && !Number.isNaN(group.targetQuantity)) {
        target = group.targetQuantity;
      } else {
        target = getItemTarget(primaryItem, thresholdConfig, itemOverrides);
      }

      const need = calculateNeed(target, combinedHave);
      if (need <= 0) {
        continue;
      }

      const existingRow =
        existingByGroupId.get(groupId) ||
        existingByPantryId.get(primaryItem.id) ||
        existingByNormName.get(normalizeItemName(group.name));

      result.push({
        id: existingRow?.id || `group-${groupId}`,
        name: group.name,
        category: primaryItem.category,
        currentQuantity: combinedHave,
        suggestedQuantity: need,
        unit: primaryItem.unit,
        isManual: false,
        isChecked: existingRow ? existingRow.isChecked : false,
        addedAt: existingRow ? existingRow.addedAt : new Date().toISOString(),
        reason: "low_stock",
        pantryItemId: primaryItem.id,
        groupId: groupId,
        lowStockThreshold: target,
        imageUrl: primaryItem.imageUrl || primaryItem.productInfo?.imageUrl,
      });
    } else {
      const normName = bucketKey.slice(5);

      // Resolve target: check overrides across all items in group, then targetQuantity, then thresholdConfig, then default 1
      let target = 1;
      let foundExplicit = false;

      for (const item of items) {
        if (itemOverrides && itemOverrides[item.id] != null && !Number.isNaN(itemOverrides[item.id])) {
          target = itemOverrides[item.id];
          foundExplicit = true;
          break;
        }
        if (item.targetQuantity != null && !Number.isNaN(item.targetQuantity)) {
          target = item.targetQuantity;
          foundExplicit = true;
          break;
        }
      }

      if (!foundExplicit) {
        target = getItemTarget(primaryItem, thresholdConfig, itemOverrides);
      }

      const need = calculateNeed(target, combinedHave);
      if (need <= 0) {
        // Items with have >= target must NOT appear on the shopping list
        continue;
      }

      const existingRow =
        existingByPantryId.get(primaryItem.id) || existingByNormName.get(normName);

      result.push({
        id: existingRow?.id || `low-${primaryItem.id}`,
        name: primaryItem.name,
        category: primaryItem.category,
        currentQuantity: combinedHave,
        suggestedQuantity: need,
        unit: primaryItem.unit,
        isManual: false,
        isChecked: existingRow ? existingRow.isChecked : false,
        addedAt: existingRow ? existingRow.addedAt : new Date().toISOString(),
        reason: "low_stock",
        pantryItemId: primaryItem.id,
        lowStockThreshold: target,
        imageUrl: primaryItem.imageUrl || primaryItem.productInfo?.imageUrl,
      });
    }
  }

  return result;
}

/**
 * One-time migration: drop auto-generated (isManual false) rows, keep manual rows.
 */
export function migrateShoppingListItems(items: ShoppingListItem[]): ShoppingListItem[] {
  return items.filter((item) => item.isManual);
}

export const SHOPPING_LIST_SORT_OPTIONS: { value: ShoppingListSortBy; label: string }[] = [
  { value: "category", label: "Category" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "qty-desc", label: "Qty need high→low" },
  { value: "recent", label: "Recently added" },
];

export function normalizeShoppingListSort(value: string | null): ShoppingListSortBy {
  if (value === "category" || value === "name-asc" || value === "qty-desc" || value === "recent") {
    return value;
  }
  return "category";
}

export function sortShoppingListItems<T extends ShoppingListItem>(
  items: T[],
  sortBy: ShoppingListSortBy
): T[] {
  const next = [...items];
  switch (sortBy) {
    case "category":
      return next.sort(
        (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
      );
    case "name-asc":
      return next.sort((a, b) => a.name.localeCompare(b.name));
    case "qty-desc":
      return next.sort(
        (a, b) => b.suggestedQuantity - a.suggestedQuantity || a.name.localeCompare(b.name)
      );
    case "recent":
      return next.sort(
        (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      );
    default:
      return next;
  }
}

export function groupShoppingListByCategory<T extends ShoppingListItem>(
  items: T[]
): { category: string; items: T[] }[] {
  const groups: { category: string; items: T[] }[] = [];
  for (const item of items) {
    const category = item.category || "other";
    const last = groups[groups.length - 1];
    if (!last || last.category !== category) {
      groups.push({ category, items: [item] });
    } else {
      last.items.push(item);
    }
  }
  return groups;
}

export function hasUsageHistory(
  activities: Pick<Activity, "itemId" | "type" | "amount" | "timestamp">[] | undefined,
  itemId?: string | null,
  now: number = Date.now()
): boolean {
  if (!activities || !itemId) return false;
  const removeActivities = activities.filter(
    (a) => a.itemId === itemId && a.type === "REMOVE" && a.amount > 0
  );
  if (removeActivities.length === 0) return false;
  const totalUsed = removeActivities.reduce((sum, a) => sum + a.amount, 0);
  if (totalUsed <= 0) return false;
  const validTimestamps = removeActivities
    .map((a) => new Date(a.timestamp).getTime())
    .filter((t) => !Number.isNaN(t));
  if (validTimestamps.length === 0) return false;
  const oldestTimestamp = Math.min(...validTimestamps);
  const daysOfHistory = (now - oldestTimestamp) / (1000 * 60 * 60 * 24);
  return daysOfHistory >= 7;
}

export function getShoppingItemReason(
  item: Pick<ShoppingListItem, "isManual" | "currentQuantity" | "suggestedQuantity"> & {
    lowStockThreshold?: number;
  },
  threshold?: number
): string {
  if (item.isManual) return "Added manually";
  const alert = threshold ?? item.lowStockThreshold ?? 1;
  return `You have ${item.currentQuantity} · alert at ${alert}`;
}

export interface ShoppingItemPopupReasonOptions {
  threshold?: number;
  hasUsageHistory?: boolean;
  activities?: Pick<Activity, "itemId" | "type" | "amount" | "timestamp">[];
  itemId?: string | null;
  now?: number;
}

export function getShoppingItemPopupReason(
  item: Pick<ShoppingListItem, "isManual" | "currentQuantity" | "suggestedQuantity"> & {
    lowStockThreshold?: number;
  },
  optionsOrThreshold?: number | ShoppingItemPopupReasonOptions,
  legacyHasUsageHistory?: boolean
): string {
  if (item.isManual) return "Added manually";

  let threshold: number | undefined;
  let hasUsage = false;

  if (typeof optionsOrThreshold === "number") {
    threshold = optionsOrThreshold;
    hasUsage = Boolean(legacyHasUsageHistory);
  } else if (optionsOrThreshold) {
    threshold = optionsOrThreshold.threshold;
    if (typeof optionsOrThreshold.hasUsageHistory === "boolean") {
      hasUsage = optionsOrThreshold.hasUsageHistory;
    } else if (optionsOrThreshold.activities && optionsOrThreshold.itemId) {
      hasUsage = hasUsageHistory(
        optionsOrThreshold.activities,
        optionsOrThreshold.itemId,
        optionsOrThreshold.now
      );
    }
  }

  const alert = threshold ?? item.lowStockThreshold ?? 1;
  const explanation = hasUsage
    ? `Suggested: buy ${item.suggestedQuantity}, based on how fast you use it.`
    : `Suggested: buy ${item.suggestedQuantity}, 2× your alert level.`;

  return `Added because you have ${item.currentQuantity} and your alert is ${alert}. ${explanation}`;
}

export function getSuggestedQuantityCap(threshold: number): number {
  return Math.max(12, threshold * 4);
}

export function calculateSuggestedQuantity(
  activities: Pick<Activity, "itemId" | "type" | "amount" | "timestamp">[],
  itemId: string,
  threshold: number,
  now: number = Date.now()
): number {
  const removeActivities = activities.filter(
    (a) => a.itemId === itemId && a.type === "REMOVE" && a.amount > 0
  );

  const fallback = Math.max(threshold * 2, 1);
  const cap = getSuggestedQuantityCap(threshold);

  if (removeActivities.length === 0) {
    return Math.min(fallback, cap);
  }

  const totalUsed = removeActivities.reduce((sum, a) => sum + a.amount, 0);
  if (totalUsed <= 0) {
    return Math.min(fallback, cap);
  }

  const validTimestamps = removeActivities
    .map((a) => new Date(a.timestamp).getTime())
    .filter((t) => !Number.isNaN(t));

  if (validTimestamps.length === 0) {
    return Math.min(fallback, cap);
  }

  const oldestTimestamp = Math.min(...validTimestamps);
  const daysOfHistory = (now - oldestTimestamp) / (1000 * 60 * 60 * 24);

  if (daysOfHistory < 7) {
    return Math.min(fallback, cap);
  }

  const dailyUsage = totalUsed / daysOfHistory;
  const suggested = Math.ceil(dailyUsage * 14);

  return Math.min(Math.max(suggested, 1), cap);
}

export function mergePreservedQuantity(
  existingQuantity: number,
  calculatedQuantity: number,
  threshold: number
): number {
  const cap = getSuggestedQuantityCap(threshold);
  return existingQuantity > cap ? calculatedQuantity : existingQuantity;
}
