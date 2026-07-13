import type { ShoppingListItem } from "@/types";

export function getShoppingItemReason(
  item: ShoppingListItem,
  threshold: number
): string {
  if (item.isManual) return "Added manually";
  if (item.currentQuantity === 0) return "Out of stock";
  if (item.reason === "recommendation") return "Running low — buy soon";
  const scope =
    item.lowStockThreshold != null && item.pantryItemId != null
      ? "your alert"
      : `${item.category} default`;
  return `Need ${item.suggestedQuantity} · have ${item.currentQuantity} · ${scope}: warn at or below ${threshold}`;
}