"use client";

import { useMemo, useState } from "react";
import { Barcode, Loader2, Package, Plus, Search, Settings } from "lucide-react";
import { PantryListRow } from "@/components/dashboard/PantryListRow";
import { DashboardLink } from "@/components/dashboard/dashboard-link";
import { usePantry } from "@/contexts/pantry-provider";
import { BRAND_NAME } from "@/lib/site-content";
import { groupInventoryByCategory, INVENTORY_SORT_OPTIONS } from "@/lib/inventory-sort";
import type { InventorySortBy } from "@/types";

export function InventoryView() {
  const {
    inventory,
    pantryFilter,
    setPantryFilter,
    sortBy,
    setSortBy,
    filteredInventory,
    itemIsLowStock,
    inventoryError,
    isLoadingInventory,
    loadInventory,
    handleAdjustQuantity,
    setEditingItem,
    updatingItemIds,
    setShowThresholdSettings,
  } = usePantry();

  const [searchQuery, setSearchQuery] = useState("");

  const displayedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredInventory;
    return filteredInventory.filter((item) =>
      item.name.toLowerCase().includes(q)
    );
  }, [filteredInventory, searchQuery]);

  const categoryGroups = useMemo(
    () => (sortBy === "category" ? groupInventoryByCategory(displayedItems) : null),
    [displayedItems, sortBy]
  );

  const filterChips = [
    { id: "all" as const, label: "All" },
    { id: "low" as const, label: "Low" },
    { id: "out" as const, label: "Out" },
  ];

  const renderRows = (items: typeof displayedItems) =>
    items.map((item) => (
      <PantryListRow
        key={item.id}
        item={item}
        isLowStock={itemIsLowStock(item)}
        onAdjustQuantity={handleAdjustQuantity}
        onEdit={() => setEditingItem(item)}
        isUpdating={updatingItemIds.has(item.id)}
      />
    ));

  return (
    <div className="space-y-2.5 animate-in fade-in duration-300">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Package className="text-[var(--primary)]" size={18} />
          <h1 className="text-lg font-serif-heading font-bold text-[var(--foreground)]">{BRAND_NAME}</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowThresholdSettings(true)}
          className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary-light)] transition-colors"
          aria-label="Low stock threshold settings"
          title="Category threshold defaults"
        >
          <Settings size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <DashboardLink
          href="/dashboard/scan-barcode/"
          className="inline-flex items-center justify-center gap-1.5 bg-[var(--primary)] text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[var(--primary-hover)] active:scale-[0.98] transition-colors touch-manipulation"
        >
          <Barcode size={16} />
          Scan item
        </DashboardLink>
        <DashboardLink
          href="/dashboard/add-item/"
          className="inline-flex items-center justify-center gap-1.5 border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-muted)] active:scale-[0.98] transition-colors touch-manipulation"
        >
          <Plus size={16} />
          Add manually
        </DashboardLink>
      </div>

      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search items..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted-light)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setPantryFilter(chip.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                pantryFilter === chip.id
                  ? "bg-[var(--primary-light)] text-[var(--primary)]"
                  : "bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as InventorySortBy)}
          className="text-xs text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          aria-label="Sort inventory"
        >
          {INVENTORY_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {inventoryError && (
        <div className="p-3 bg-[var(--danger-light)] border border-rose-200 rounded-xl text-[var(--danger)] text-sm flex justify-between items-center gap-3">
          <span>Error loading inventory: {inventoryError}</span>
          <button
            type="button"
            onClick={loadInventory}
            className="px-3 py-1 bg-rose-100 rounded-lg hover:bg-rose-200 transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {isLoadingInventory ? (
        <div className="flex items-center justify-center py-12 text-[var(--primary)]">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : inventory.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 text-center">
          <Package size={36} className="mx-auto mb-3 text-[var(--muted-light)]" />
          <p className="text-[var(--foreground)] font-semibold mb-1">Your pantry is empty</p>
          <p className="text-[var(--muted)] text-sm mb-3">Scan a barcode or add your first item.</p>
          <DashboardLink
            href="/dashboard/add-item/"
            className="inline-flex bg-[var(--primary)] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--primary-hover)] active:scale-[0.98] transition-colors touch-manipulation"
          >
            Add your first item
          </DashboardLink>
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 text-center">
          <Search size={28} className="mx-auto mb-2 text-[var(--muted-light)]" />
          <p className="text-[var(--muted)] text-sm">No items match your search or filter.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setPantryFilter("all");
            }}
            className="mt-2 text-sm text-[var(--primary)] font-medium hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div
          className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden"
          data-testid="pantry-list"
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
                <div className="divide-y divide-[var(--border)]">{renderRows(group.items)}</div>
              </div>
            ))
          ) : (
            <div className="divide-y divide-[var(--border)]">{renderRows(displayedItems)}</div>
          )}
        </div>
      )}
    </div>
  );
}
