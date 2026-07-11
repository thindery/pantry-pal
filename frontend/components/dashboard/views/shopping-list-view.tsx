"use client";

import { useState } from "react";
import {
  Check,
  Loader2,
  Plus,
  RefreshCw,
  Settings,
  Share2,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { usePantry } from "@/contexts/pantry-provider";
import { CATEGORIES, DEFAULT_THRESHOLDS, UNITS } from "@/lib/constants";
import { getShoppingItemReason } from "@/lib/shopping-list-utils";
import type { ShoppingListItem } from "@/types";

export function ShoppingListView() {
  const {
    shoppingList,
    thresholdConfig,
    setThresholdConfig,
    setShowThresholdSettings,
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

  const uncheckedCount = shoppingList.filter((i) => !i.isChecked).length;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart size={22} className="text-[var(--primary)]" />
            <h1 className="text-xl font-bold text-[var(--foreground)]">Shopping list</h1>
          </div>
          <p className="text-sm text-[var(--muted)]">
            {shoppingList.length === 0
              ? "Auto-generated from low stock"
              : `${uncheckedCount} item${uncheckedCount === 1 ? "" : "s"} to buy`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowThresholdSettings(true)}
          className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary-light)] transition-colors"
          aria-label="Threshold settings"
        >
          <Settings size={20} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={generateShoppingList}
          disabled={isGeneratingList}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)] disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={16} className={isGeneratingList ? "animate-spin" : ""} />
          Regenerate
        </button>
        <button
          type="button"
          onClick={shareShoppingList}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
        >
          <Share2 size={16} />
          Share
        </button>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--primary-light)] text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary-muted)] transition-colors"
        >
          <Plus size={16} />
          Add item
        </button>
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
          className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 space-y-3"
        >
          <input
            name="name"
            type="text"
            placeholder="Item name"
            required
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              name="category"
              className="px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)]"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
            <select
              name="unit"
              className="px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)]"
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
              className="w-24 px-3 py-2 border border-[var(--border)] rounded-lg"
            />
            <button
              type="submit"
              className="flex-1 bg-[var(--primary)] text-white py-2 rounded-lg font-semibold hover:bg-[var(--primary-hover)]"
            >
              Add to list
            </button>
          </div>
        </form>
      )}

      {isGeneratingList && shoppingList.length === 0 ? (
        <div className="flex justify-center py-16 text-[var(--primary)]">
          <Loader2 size={32} className="animate-spin" />
        </div>
      ) : shoppingList.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-8 text-center">
          <Check size={40} className="mx-auto mb-3 text-[var(--primary)]" />
          <p className="font-semibold text-[var(--foreground)]">You&apos;re all stocked</p>
          <p className="text-sm text-[var(--muted)] mt-1">
            No items are below your thresholds right now.
          </p>
        </div>
      ) : (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm divide-y divide-[var(--border)]">
          {shoppingList.map((item: ShoppingListItem) => {
            const threshold =
              thresholdConfig[item.category] ??
              DEFAULT_THRESHOLDS[item.category] ??
              2;
            return (
              <div
                key={item.id}
                className={`px-4 py-3 flex items-start gap-3 ${
                  item.isChecked ? "opacity-60" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleItemChecked(item.id)}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    item.isChecked
                      ? "bg-[var(--primary)] border-[var(--primary)] text-white"
                      : "border-[var(--border)] hover:border-[var(--primary)]"
                  }`}
                  aria-label={item.isChecked ? "Uncheck item" : "Check item"}
                >
                  {item.isChecked && <Check size={12} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium ${
                      item.isChecked
                        ? "line-through text-[var(--muted)]"
                        : "text-[var(--foreground)]"
                    }`}
                  >
                    {item.name}
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {getShoppingItemReason(item, threshold)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      updateShoppingItemQuantity(
                        item.id,
                        Math.max(1, item.suggestedQuantity - 1)
                      )
                    }
                    className="w-7 h-7 rounded-lg bg-[var(--surface-muted)] text-[var(--muted)] text-sm font-bold"
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-sm font-semibold text-[var(--primary)]">
                    {item.suggestedQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateShoppingItemQuantity(item.id, item.suggestedQuantity + 1)
                    }
                    className="w-7 h-7 rounded-lg bg-[var(--surface-muted)] text-[var(--muted)] text-sm font-bold"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => markItemAsBought(item)}
                    disabled={item.isChecked}
                    className="p-1.5 text-[var(--primary)] hover:bg-[var(--primary-light)] rounded-lg disabled:opacity-30"
                    title="Mark bought"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeShoppingItem(item.id)}
                    className="p-1.5 text-[var(--danger)] hover:bg-[var(--danger-light)] rounded-lg"
                    title="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {shoppingList.length > 0 && (
        <button
          type="button"
          onClick={clearShoppingList}
          className="text-sm text-[var(--danger)] hover:underline"
        >
          Clear entire list
        </button>
      )}

    </div>
  );
}