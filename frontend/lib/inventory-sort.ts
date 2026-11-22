import type { InventorySortBy, PantryItem } from "@/types";

export const INVENTORY_SORT_STORAGE_KEY = "pantry-inventory-sort";

export const INVENTORY_SORT_OPTIONS: { value: InventorySortBy; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "qty-asc", label: "Qty low→high" },
  { value: "qty-desc", label: "Qty high→low" },
  { value: "category", label: "Category" },
];

export function normalizeInventorySort(value: string | null): InventorySortBy {
  if (value === "alphabetical") return "name-asc";
  if (value === "quantity") return "qty-desc";
  if (
    value === "recent" ||
    value === "name-asc" ||
    value === "qty-asc" ||
    value === "qty-desc" ||
    value === "category"
  ) {
    return value;
  }
  return "recent";
}

function dateKey(item: Pick<PantryItem, "updatedAt" | "createdAt" | "lastUpdated">): number {
  return new Date(item.updatedAt || item.createdAt || item.lastUpdated || 0).getTime();
}

export function sortInventoryItems<T extends PantryItem>(items: T[], sortBy: InventorySortBy): T[] {
  const next = [...items];
  switch (sortBy) {
    case "recent":
      return next.sort((a, b) => dateKey(b) - dateKey(a));
    case "name-asc":
      return next.sort((a, b) => a.name.localeCompare(b.name));
    case "qty-asc":
      return next.sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name));
    case "qty-desc":
      return next.sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
    case "category":
      return next.sort(
        (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
      );
    default:
      return next;
  }
}

export function groupInventoryByCategory<T extends PantryItem>(
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
