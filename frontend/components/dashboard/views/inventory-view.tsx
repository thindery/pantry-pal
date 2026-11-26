"use client";

import { useMemo, useState } from "react";
import { Barcode, Loader2, Package, Plus, Search, Settings } from "lucide-react";
import { PantryListRow } from "@/components/dashboard/PantryListRow";
import { UsedItTypeahead } from "@/components/dashboard/UsedItTypeahead";
import { GroupListRow } from "@/components/dashboard/GroupListRow";
import { DashboardLink } from "@/components/dashboard/dashboard-link";
import { usePantry } from "@/contexts/pantry-provider";
import { BRAND_NAME } from "@/lib/site-content";
import { toTitleCase } from "@/lib/item-group-match";
import { INVENTORY_SORT_OPTIONS } from "@/lib/inventory-sort";
import { clusterSimilarItems } from "@/lib/combine-similar";
import type { InventorySortBy, ItemGroup, PantryItem } from "@/types";

type PantryEntry =
  | {
      type: "group";
      id: string;
      group: ItemGroup;
      combined?: boolean;
      members: PantryItem[];
      name: string;
      category: string;
      quantity: number;
      lastUpdated: string;
    }
  | {
      type: "item";
      id: string;
      item: PantryItem;
      name: string;
      category: string;
      quantity: number;
      lastUpdated: string;
    };

export function InventoryView() {
  const {
    inventory,
    itemGroups,
    renameGroup,
    setGroupTarget,
    deleteGroup,
    pantryFilter,
    setPantryFilter,
    sortBy,
    setSortBy,
    filteredInventory: _filteredInventory,
    itemIsLowStock,
    inventoryError,
    isLoadingInventory,
    loadInventory,
    handleAdjustQuantity,
    setEditingItem,
    updatingItemIds,
    setShowThresholdSettings,
    combineSimilar: combineSimilarSetting,
    setCombineSimilar,
    consumeItems,
  } = usePantry();
  const combineSimilar = combineSimilarSetting !== false;

  const [searchQuery, setSearchQuery] = useState("");

  const displayedEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const groupMap = new Map(itemGroups.map((g) => [g.id, g]));
    const groupMembersMap = new Map<string, PantryItem[]>();
    const ungroupedItems: PantryItem[] = [];

    for (const item of inventory) {
      if (item.groupId && groupMap.has(item.groupId)) {
        const existing = groupMembersMap.get(item.groupId) || [];
        existing.push(item);
        groupMembersMap.set(item.groupId, existing);
      } else {
        ungroupedItems.push(item);
      }
    }

    const entries: PantryEntry[] = [];

    // Process groups
    for (const group of itemGroups) {
      const allMembers = groupMembersMap.get(group.id) || [];
      if (allMembers.length === 0) continue;

      const combinedQty = allMembers.reduce(
        (sum, m) => sum + (Number(m.quantity) || 0),
        0
      );
      const isGroupOut = combinedQty <= 0;
      const groupTarget = group.targetQuantity ?? 1;
      const isGroupLow = combinedQty <= groupTarget;

      // Filter members based on pantryFilter
      const filterMatchingMembers = allMembers.filter((m) => {
        if (pantryFilter === "low") {
          return itemIsLowStock(m) || isGroupLow;
        }
        if (pantryFilter === "out") {
          return m.quantity <= 0 || isGroupOut;
        }
        return true;
      });

      // Filter by search query
      const groupMatchesQuery = !q || group.name.toLowerCase().includes(q);
      const matchingMembers = filterMatchingMembers.filter(
        (m) => groupMatchesQuery || m.name.toLowerCase().includes(q)
      );

      if (matchingMembers.length > 0) {
        const primaryCategory = allMembers[0]?.category || "other";
        const latestUpdated = allMembers.reduce(
          (latest, m) =>
            !latest || new Date(m.lastUpdated).getTime() > new Date(latest).getTime()
              ? m.lastUpdated
              : latest,
          allMembers[0]?.lastUpdated || ""
        );

        entries.push({
          type: "group",
          id: group.id,
          group,
          members: matchingMembers,
          name: group.name,
          category: primaryCategory,
          quantity: combinedQty,
          lastUpdated: latestUpdated,
        });
      }
    }

    // PP-190: combine similar ungrouped items into display-only rows (rows are never merged).
    const combinedIds = new Set<string>();
    if (combineSimilar) {
      for (const cluster of clusterSimilarItems(ungroupedItems)) {
        const allMembers = cluster.members;
        const combinedQty = allMembers.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
        const rep = cluster.representative;
        const isOutC = combinedQty <= 0;
        const isLowC = combinedQty <= 1 || allMembers.every((m) => itemIsLowStock(m));
        if (pantryFilter === "low" && !(isLowC || allMembers.some((m) => itemIsLowStock(m)))) continue;
        if (pantryFilter === "out" && !isOutC) continue;
        if (q && !allMembers.some((m) => m.name.toLowerCase().includes(q))) continue;
        allMembers.forEach((m) => combinedIds.add(m.id));
        const latestUpdated = allMembers.reduce(
          (latest, m) =>
            !latest || new Date(m.lastUpdated).getTime() > new Date(latest).getTime()
              ? m.lastUpdated
              : latest,
          allMembers[0]?.lastUpdated || ""
        );
        entries.push({
          type: "group",
          id: cluster.id,
          combined: true,
          group: {
            id: cluster.id,
            name: toTitleCase(rep.name),
            targetQuantity: null,
            itemIds: allMembers.map((m) => m.id),
          },
          members: allMembers,
          name: rep.name,
          category: rep.category || "other",
          quantity: combinedQty,
          lastUpdated: latestUpdated,
        });
      }
    }

    // Process ungrouped items
    for (const item of ungroupedItems) {
      if (combinedIds.has(item.id)) continue;
      if (pantryFilter === "low" && !itemIsLowStock(item)) continue;
      if (pantryFilter === "out" && item.quantity > 0) continue;
      if (q && !item.name.toLowerCase().includes(q)) continue;

      entries.push({
        type: "item",
        id: item.id,
        item,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        lastUpdated: item.lastUpdated,
      });
    }

    // Sort entries
    return entries.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "qty-asc":
          return a.quantity - b.quantity || a.name.localeCompare(b.name);
        case "qty-desc":
          return b.quantity - a.quantity || a.name.localeCompare(b.name);
        case "recent":
          return (
            new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
          );
        case "category":
        default:
          return (
            a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
          );
      }
    });
  }, [inventory, itemGroups, pantryFilter, searchQuery, sortBy, itemIsLowStock, combineSimilar]);

  const categoryGroups = useMemo(() => {
    if (sortBy !== "category") return null;
    const groups: { category: string; entries: PantryEntry[] }[] = [];
    let currentCategory = "";
    let currentEntries: PantryEntry[] = [];

    for (const entry of displayedEntries) {
      const cat = entry.category || "other";
      if (cat !== currentCategory) {
        currentCategory = cat;
        currentEntries = [];
        groups.push({ category: cat, entries: currentEntries });
      }
      currentEntries.push(entry);
    }
    return groups;
  }, [displayedEntries, sortBy]);

  const filterChips = [
    { id: "all" as const, label: "All" },
    { id: "low" as const, label: "Low" },
    { id: "out" as const, label: "Out" },
  ];

  const renderEntries = (entries: PantryEntry[]) =>
    entries.map((entry) =>
      entry.type === "group" ? (
        <GroupListRow
          key={`group-${entry.id}`}
          group={entry.group}
          members={entry.members}
          itemIsLowStock={itemIsLowStock}
          onAdjustQuantity={handleAdjustQuantity}
          onEditItem={(item) => setEditingItem(item)}
          updatingItemIds={updatingItemIds}
          onRename={renameGroup}
          onSetTarget={setGroupTarget}
          onUngroup={deleteGroup}
          combined={entry.combined}
        />
      ) : (
        <PantryListRow
          key={entry.item.id}
          item={entry.item}
          isLowStock={itemIsLowStock(entry.item)}
          onAdjustQuantity={handleAdjustQuantity}
          onEdit={() => setEditingItem(entry.item)}
          isUpdating={updatingItemIds.has(entry.item.id)}
        />
      )
    );

  return (
    <div className="space-y-2.5 animate-in fade-in duration-300">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Package className="text-[var(--primary)]" size={18} />
          <h1 className="text-lg font-serif-heading font-bold text-[var(--foreground)]">
            <span className="md:hidden">{BRAND_NAME}</span>
            <span className="hidden md:inline">Pantry</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowThresholdSettings(true)}
          className="min-h-11 min-w-11 h-11 w-11 inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary-light)] transition-colors"
          aria-label="Low stock threshold settings"
          title="Category threshold defaults"
        >
          <Settings size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:flex md:w-auto gap-2">
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

      {inventory.length > 0 && consumeItems && (
        <UsedItTypeahead
          inventory={inventory}
          onUse={(item, amount) => consumeItems([{ itemId: item.id, amount }])}
        />
      )}

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
          <button
            type="button"
            role="switch"
            aria-checked={combineSimilar}
            onClick={() => setCombineSimilar?.(!combineSimilar)}
            title="Show near-duplicates like two pie crusts as one row. Your items are never merged."
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              combineSimilar
                ? "bg-[var(--primary-light)] text-[var(--primary)]"
                : "bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Combine similar
          </button>
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
      ) : displayedEntries.length === 0 ? (
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
                <div className="divide-y divide-[var(--border)]">{renderEntries(group.entries)}</div>
              </div>
            ))
          ) : (
            <div className="divide-y divide-[var(--border)]">{renderEntries(displayedEntries)}</div>
          )}
        </div>
      )}
    </div>
  );
}
