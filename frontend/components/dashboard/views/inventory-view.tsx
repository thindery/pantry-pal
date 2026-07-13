"use client";

import { useMemo, useState } from "react";
import { Barcode, Loader2, Package, Plus, Search } from "lucide-react";
import { PantryListRow } from "@/components/dashboard/PantryListRow";
import { usePantry } from "@/contexts/pantry-provider";
import { BRAND_NAME } from "@/lib/site-content";

export function InventoryView() {
  const {
    router,
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
    setInfoItem,
    updatingItemIds,
  } = usePantry();

  const [searchQuery, setSearchQuery] = useState("");

  const displayedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredInventory;
    return filteredInventory.filter((item) =>
      item.name.toLowerCase().includes(q)
    );
  }, [filteredInventory, searchQuery]);

  const filterChips = [
    { id: "all" as const, label: "All" },
    { id: "low" as const, label: "Low" },
    { id: "out" as const, label: "Out" },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-2">
        <Package className="text-[var(--primary)]" size={22} />
        <h1 className="text-xl font-serif-heading font-bold text-[var(--foreground)]">{BRAND_NAME}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => router.push("/dashboard/scan-barcode/")}
          className="inline-flex items-center justify-center gap-2 bg-[var(--primary)] text-white rounded-xl px-4 py-3 font-semibold hover:bg-[var(--primary-hover)] transition-colors"
        >
          <Barcode size={20} />
          Scan item
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/add-item/")}
          className="inline-flex items-center justify-center gap-2 border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] rounded-xl px-4 py-3 font-semibold hover:bg-[var(--surface-muted)] transition-colors"
        >
          <Plus size={20} />
          Add manually
        </button>
      </div>

      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search items..."
          className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-xl bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted-light)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setPantryFilter(chip.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
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
          onChange={(e) =>
            setSortBy(e.target.value as "recent" | "quantity" | "alphabetical")
          }
          className="text-sm text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          aria-label="Sort inventory"
        >
          <option value="recent">Recent</option>
          <option value="alphabetical">Name</option>
          <option value="quantity">Quantity</option>
        </select>
      </div>

      {inventoryError && (
        <div className="p-4 bg-[var(--danger-light)] border border-rose-200 rounded-xl text-[var(--danger)] text-sm flex justify-between items-center gap-3">
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
        <div className="flex items-center justify-center py-16 text-[var(--primary)]">
          <Loader2 size={32} className="animate-spin" />
        </div>
      ) : inventory.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-8 text-center">
          <Package size={40} className="mx-auto mb-4 text-[var(--muted-light)]" />
          <p className="text-[var(--foreground)] font-semibold mb-1">Your pantry is empty</p>
          <p className="text-[var(--muted)] text-sm mb-4">Scan a barcode or add your first item.</p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/add-item/")}
            className="bg-[var(--primary)] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[var(--primary-hover)] transition-colors"
          >
            Add your first item
          </button>
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-8 text-center">
          <Search size={32} className="mx-auto mb-3 text-[var(--muted-light)]" />
          <p className="text-[var(--muted)]">No items match your search or filter.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setPantryFilter("all");
            }}
            className="mt-3 text-sm text-[var(--primary)] font-medium hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm divide-y divide-[var(--border)] overflow-hidden">
          {displayedItems.map((item) => (
            <PantryListRow
              key={item.id}
              item={item}
              isLowStock={itemIsLowStock(item)}
              onAdjustQuantity={handleAdjustQuantity}
              onEdit={() => setEditingItem(item)}
              onInfo={() => setInfoItem(item)}
              isUpdating={updatingItemIds.has(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}