"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Loader2,
  Plus,
  RefreshCw,
  Settings,
  Share2,
  ShoppingCart,
} from "lucide-react";
import { usePantry } from "@/contexts/pantry-provider";
import { CATEGORIES, UNITS } from "@/lib/constants";
import {
  groupShoppingListByCategory,
  normalizeShoppingListSort,
  SHOPPING_LIST_SORT_OPTIONS,
  SHOPPING_LIST_SORT_STORAGE_KEY,
  sortShoppingListItems,
} from "@/lib/shopping-list-utils";
import { ShoppingListRow } from "@/components/dashboard/ShoppingListRow";
import type { ShoppingListItem, ShoppingListSortBy } from "@/types";

export function ShoppingListView() {
  const {
    shoppingList,
    setShowThresholdSettings,
    inventory,
    isGeneratingList,
    generateShoppingList,
    toggleItemChecked,
    updateShoppingItemQuantity,
    markItemAsBought,
    removeShoppingItem,
    addManualShoppingItem,
    shareShoppingList,
    clearShoppingList,
  } = usePantry();

  const [showAddForm, setShowAddForm] = useState(false);
  const [sortBy, setSortBy] = useState<ShoppingListSortBy>(() => {
    if (typeof window === "undefined") return "category";
    try {
      return normalizeShoppingListSort(
        localStorage.getItem(SHOPPING_LIST_SORT_STORAGE_KEY)
      );
    } catch {
      return "category";
    }
  });

  const handleSortChange = (newSort: ShoppingListSortBy) => {
    setSortBy(newSort);
    try {
      localStorage.setItem(SHOPPING_LIST_SORT_STORAGE_KEY, newSort);
    } catch {}
  };

  const uncheckedCount = shoppingList.filter((i) => !i.isChecked).length;

  const sortedItems = useMemo(
    () => sortShoppingListItems(shoppingList, sortBy),
    [shoppingList, sortBy]
  );

  const categoryGroups = useMemo(
    () => (sortBy === "category" ? groupShoppingListByCategory(sortedItems) : null),
    [sortedItems, sortBy]
  );

  const renderRows = (items: ShoppingListItem[]) =>
    items.map((item) => {
      const pantryItem =
        item.pantryItemId != null
          ? inventory.find((i) => i.id === item.pantryItemId)
          : inventory.find(
              (i) => i.name.toLowerCase() === item.name.toLowerCase()
            );
      return (
        <ShoppingListRow
          key={item.id}
          item={item}
          pantryItem={pantryItem}
          onToggleChecked={toggleItemChecked}
          onUpdateQuantity={updateShoppingItemQuantity}
          onMarkBought={markItemAsBought}
          onRemove={removeShoppingItem}
        />
      );
    });

  return (
    <div className="space-y-2.5 animate-in fade-in duration-300">
      {/* Tight header like inventory-view */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ShoppingCart className="text-[var(--primary)]" size={18} />
          <h1 className="text-lg font-serif-heading font-bold text-[var(--foreground)]">
            Shopping list
          </h1>
          <span className="text-xs text-[var(--muted)]">
            ({uncheckedCount})
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowThresholdSettings(true)}
          className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary-light)] transition-colors"
          aria-label="Low stock threshold settings"
          title="Threshold settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Action buttons on one row */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={generateShoppingList}
          disabled={isGeneratingList}
          className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)] disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={13} className={isGeneratingList ? "animate-spin" : ""} />
          <span>Regenerate</span>
        </button>
        <button
          type="button"
          onClick={shareShoppingList}
          className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
        >
          <Share2 size={13} />
          <span>Share</span>
        </button>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--primary-light)] text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary-muted)] transition-colors ml-auto"
        >
          <Plus size={13} />
          <span>Add item</span>
        </button>
      </div>

      {/* Subline & sort select */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[var(--muted)]">
          {shoppingList.length === 0
            ? "Auto-generated from low stock"
            : `${uncheckedCount} item${uncheckedCount === 1 ? "" : "s"} to buy`}
        </span>
        <select
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value as ShoppingListSortBy)}
          className="text-xs text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          aria-label="Sort shopping list"
        >
          {SHOPPING_LIST_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {showAddForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const data = new FormData(form);
            addManualShoppingItem(
              data.get("name") as string,
              data.get("category") as string,
              parseFloat(data.get("quantity") as string) || 1,
              data.get("unit") as string
            );
            form.reset();
            setShowAddForm(false);
          }}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 space-y-2.5"
        >
          <input
            name="name"
            type="text"
            placeholder="Item name"
            required
            className="w-full px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted-light)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              name="category"
              className="px-2.5 py-1.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)]"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
            <select
              name="unit"
              className="px-2.5 py-1.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)]"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <input
              name="quantity"
              type="number"
              min={1}
              step={0.5}
              defaultValue={1}
              className="w-24 px-2.5 py-1.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)]"
            />
            <button
              type="submit"
              className="flex-1 bg-[var(--primary)] text-white py-1.5 text-sm rounded-lg font-semibold hover:bg-[var(--primary-hover)] transition-colors"
            >
              Add to list
            </button>
          </div>
        </form>
      )}

      {isGeneratingList && shoppingList.length === 0 ? (
        <div className="flex justify-center py-12 text-[var(--primary)]">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : shoppingList.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 text-center">
          <Check size={36} className="mx-auto mb-2 text-[var(--primary)]" />
          <p className="font-semibold text-[var(--foreground)]">You&apos;re all stocked</p>
          <p className="text-sm text-[var(--muted)] mt-1">
            No items are below your thresholds right now.
          </p>
        </div>
      ) : (
        <div
          className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden"
          data-testid="shopping-list"
        >
          {categoryGroups ? (
            categoryGroups.map((group) => (
              <div key={group.category}>
                <h2
                  className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)] bg-[var(--surface-muted)]"
                  data-testid={`category-header-${group.category}`}
                >
                  {group.category}
                </h2>
                <div className="divide-y divide-[var(--border)]">
                  {renderRows(group.items)}
                </div>
              </div>
            ))
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {renderRows(sortedItems)}
            </div>
          )}
        </div>
      )}

      {shoppingList.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={clearShoppingList}
            className="text-xs text-[var(--danger)] hover:underline"
          >
            Clear entire list
          </button>
        </div>
      )}
    </div>
  );
}
