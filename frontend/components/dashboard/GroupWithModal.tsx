"use client";

import React, { useMemo, useState } from "react";
import { FolderPlus, Layers, Search, X } from "lucide-react";
import type { ItemGroup, PantryItem } from "@/types";
import { productMatchKey, toTitleCase } from "@/lib/item-group-match";

interface GroupWithModalProps {
  item: PantryItem;
  isOpen: boolean;
  onClose: () => void;
  inventory: PantryItem[];
  itemGroups: ItemGroup[];
  onAddToGroup: (groupId: string, itemId: string) => Promise<ItemGroup | null>;
  onCreateGroup: (
    name: string,
    itemIds: string[],
    targetQuantity?: number | null
  ) => Promise<ItemGroup | null>;
}

export function GroupWithModal({
  item,
  isOpen,
  onClose,
  inventory,
  itemGroups,
  onAddToGroup,
  onCreateGroup,
}: GroupWithModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<PantryItem | null>(null);
  const [groupName, setGroupName] = useState("");
  const [targetQuantity, setTargetQuantity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableItems = useMemo(() => {
    return inventory.filter((i) => i.id !== item.id && !i.groupId);
  }, [inventory, item.id]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return itemGroups;
    return itemGroups.filter((g) => g.name.toLowerCase().includes(q));
  }, [itemGroups, searchQuery]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return availableItems;
    return availableItems.filter((i) => i.name.toLowerCase().includes(q));
  }, [availableItems, searchQuery]);

  if (!isOpen) return null;

  const handlePickItem = (picked: PantryItem) => {
    setSelectedItem(picked);
    const key = productMatchKey(picked.name);
    const defaultName = key ? toTitleCase(key) : picked.name;
    setGroupName(defaultName);
    setTargetQuantity("");
  };

  const handlePickGroup = async (group: ItemGroup) => {
    setIsSubmitting(true);
    try {
      await onAddToGroup(group.id, item.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNewGroup = async () => {
    if (!selectedItem) return;
    const finalName = groupName.trim() || selectedItem.name;
    const target = targetQuantity.trim() ? parseFloat(targetQuantity) : null;

    setIsSubmitting(true);
    try {
      await onCreateGroup(finalName, [item.id, selectedItem.id], target);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--surface)] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Layers className="text-[var(--primary)]" size={20} />
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              {selectedItem ? "Create Item Group" : `Group "${item.name}" with…`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {selectedItem ? (
          <div className="space-y-4 overflow-y-auto">
            <p className="text-sm text-[var(--muted)]">
              Combine <strong className="text-[var(--foreground)]">{item.name}</strong> and{" "}
              <strong className="text-[var(--foreground)]">{selectedItem.name}</strong> into a single group on your pantry and shopping list.
            </p>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-1">
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Cream of Chicken Soup"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-1">
                Target Quantity (optional)
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(e.target.value)}
                placeholder="Default: 1"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] outline-none text-sm"
              />
              <p className="text-[11px] text-[var(--muted)] mt-1">
                Combined quantity needed on your shopping list.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                disabled={isSubmitting}
                className="px-4 py-2.5 border border-[var(--border)] text-[var(--muted)] rounded-xl font-medium text-sm hover:bg-[var(--surface-muted)] transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCreateNewGroup}
                disabled={isSubmitting || !groupName.trim()}
                className="flex-1 bg-[var(--primary)] text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Creating…" : "Create Group"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            <div className="relative shrink-0">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search groups or pantry items…"
                className="w-full pl-9 pr-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {filteredGroups.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">
                    Existing Groups
                  </h3>
                  <div className="space-y-1">
                    {filteredGroups.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handlePickGroup(g)}
                        disabled={isSubmitting}
                        className="w-full text-left p-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-muted)] hover:border-[var(--primary-light)] transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground)]">{g.name}</p>
                          <p className="text-xs text-[var(--muted)]">
                            {g.itemIds.length} {g.itemIds.length === 1 ? "item" : "items"}
                            {g.targetQuantity != null ? ` · Target ${g.targetQuantity}` : ""}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-[var(--primary)] bg-[var(--primary-light)] px-2.5 py-1 rounded-lg">
                          Add to group
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">
                  Ungrouped Items
                </h3>
                {filteredItems.length === 0 ? (
                  <p className="text-xs text-[var(--muted)] py-4 text-center">
                    No other items available to group with.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {filteredItems.map((other) => (
                      <button
                        key={other.id}
                        type="button"
                        onClick={() => handlePickItem(other)}
                        className="w-full text-left p-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-muted)] hover:border-[var(--primary-light)] transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground)]">{other.name}</p>
                          <p className="text-xs text-[var(--muted)]">
                            {other.quantity} {other.unit} · {other.category}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)] flex items-center gap-1">
                          <FolderPlus size={14} />
                          Group
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
