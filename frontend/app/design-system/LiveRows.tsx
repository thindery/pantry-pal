"use client";

import { PantryListRow } from "@/components/dashboard/PantryListRow";
import { ShoppingListRow } from "@/components/dashboard/ShoppingListRow";
import type { PantryItem, ShoppingListItem } from "@/types";

/**
 * PP-146: the real, shipped row components rendered with static sample data
 * and no-op handlers, so this reference cannot drift from the app.
 */

const SAMPLE_DATE = "2026-11-22T00:00:00.000Z";

const PANTRY_SAMPLES: { item: PantryItem; isLowStock: boolean }[] = [
  {
    item: { id: "ds-milk", name: "Milk", quantity: 2, unit: "cartons", category: "dairy", lastUpdated: SAMPLE_DATE },
    isLowStock: false,
  },
  {
    item: { id: "ds-eggs", name: "Eggs", quantity: 3, unit: "pieces", category: "dairy", lastUpdated: SAMPLE_DATE },
    isLowStock: true,
  },
  {
    item: { id: "ds-rice", name: "Rice", quantity: 0, unit: "lbs", category: "pantry", lastUpdated: SAMPLE_DATE },
    isLowStock: true,
  },
];

const SHOPPING_SAMPLES: ShoppingListItem[] = [
  {
    id: "ds-shop-eggs",
    name: "Eggs",
    category: "dairy",
    currentQuantity: 3,
    suggestedQuantity: 12,
    unit: "pieces",
    isManual: false,
    isChecked: false,
    addedAt: SAMPLE_DATE,
    reason: "low_stock",
  },
  {
    id: "ds-shop-coffee",
    name: "Coffee filters",
    category: "household",
    currentQuantity: 0,
    suggestedQuantity: 1,
    unit: "boxes",
    isManual: true,
    isChecked: true,
    addedAt: SAMPLE_DATE,
    reason: "manual",
  },
];

const noopAsync = async () => {};
const noop = () => {};

export function LivePantryRows() {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm divide-y divide-[var(--border)] overflow-hidden">
      {PANTRY_SAMPLES.map(({ item, isLowStock }) => (
        <PantryListRow
          key={item.id}
          item={item}
          isLowStock={isLowStock}
          onAdjustQuantity={noopAsync}
          onEdit={noop}
          isUpdating={false}
        />
      ))}
    </div>
  );
}

export function LiveShoppingRows() {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm divide-y divide-[var(--border)] overflow-hidden">
      {SHOPPING_SAMPLES.map((item) => (
        <ShoppingListRow
          key={item.id}
          item={item}
          onToggleChecked={noop}
          onUpdateQuantity={noop}
          onMarkBought={noop}
          onRemove={noop}
        />
      ))}
    </div>
  );
}
