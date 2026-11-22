import type { Activity, ShoppingListItem, ShoppingListSortBy } from "@/types";

export const SHOPPING_LIST_SORT_STORAGE_KEY = "pantry-shopping-list-sort";

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

export function getShoppingItemReason(
  item: Pick<ShoppingListItem, "isManual" | "currentQuantity" | "suggestedQuantity">,
  _threshold?: number
): string {
  if (item.isManual) return "Added manually";
  return `Have ${item.currentQuantity} · need ${item.suggestedQuantity}`;
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
