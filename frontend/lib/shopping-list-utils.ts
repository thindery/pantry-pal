import type { ShoppingListItem } from "@/types";

export function getShoppingItemReason(
  item: ShoppingListItem,
  threshold: number
): string {
  if (item.isManual) return "Added manually";
  if (item.currentQuantity === 0) return "Out of stock";
  if (item.reason === "recommendation") return "Running low — buy soon";
  return `Need ${item.suggestedQuantity} · have ${item.currentQuantity} · ${item.category} threshold ${threshold}`;
}