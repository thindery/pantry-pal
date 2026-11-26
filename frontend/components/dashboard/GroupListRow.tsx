"use client";

import React, { useState } from "react";
import { ChevronRight, Layers, MoreVertical, Settings, Trash2, X } from "lucide-react";
import type { ItemGroup, PantryItem } from "@/types";
import { formatQuantity } from "@/lib/format-quantity";
import { PantryListRow } from "@/components/dashboard/PantryListRow";

interface GroupListRowProps {
  group: ItemGroup;
  members: PantryItem[];
  itemIsLowStock: (item: PantryItem) => boolean;
  onAdjustQuantity: (id: string, delta: number) => Promise<void>;
  onEditItem: (item: PantryItem) => void;
  updatingItemIds: Set<string>;
  onRename: (groupId: string, name: string) => Promise<void>;
  onSetTarget: (groupId: string, target: number | null) => Promise<void>;
  onUngroup: (groupId: string) => Promise<void>;
  /** PP-190: automatic "combine similar" row; display only, nothing to rename/ungroup. */
  combined?: boolean;
}

export function GroupListRow({
  group,
  members,
  itemIsLowStock,
  onAdjustQuantity,
  onEditItem,
  updatingItemIds,
  onRename,
  onSetTarget,
  onUngroup,
  combined = false,
}: GroupListRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editTarget, setEditTarget] = useState(
    group.targetQuantity != null ? String(group.targetQuantity) : ""
  );
  const [isSaving, setIsSaving] = useState(false);

  const combinedQty = members.reduce(
    (sum, m) => sum + (Number(m.quantity) || 0),
    0
  );
  const primaryUnit = members[0]?.unit || "units";
  const isOut = combinedQty <= 0;
  const target = group.targetQuantity ?? 1;
  const isLow = combinedQty <= target;

  const statusBorder = isOut
    ? "border-l-[3px] border-l-[var(--danger)]"
    : isLow
      ? "border-l-[3px] border-l-[var(--accent)]"
      : "border-l-[3px] border-l-transparent";

  const handleOpenManage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(group.name);
    setEditTarget(group.targetQuantity != null ? String(group.targetQuantity) : "");
    setShowManageModal(true);
  };

  const handleSaveManage = async () => {
    setIsSaving(true);
    try {
      const trimmedName = editName.trim();
      if (trimmedName && trimmedName !== group.name) {
        await onRename(group.id, trimmedName);
      }
      const parsedTarget = editTarget.trim() ? parseFloat(editTarget) : null;
      if (parsedTarget !== group.targetQuantity) {
        await onSetTarget(group.id, parsedTarget);
      }
      setShowManageModal(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUngroupClick = async () => {
    setShowManageModal(false);
    await onUngroup(group.id);
  };

  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden transition-all ${statusBorder}`}
      data-testid={`group-row-${group.id}`}
    >
      <div className="flex items-center min-h-[52px] pl-1 pr-2 py-1.5 gap-1.5">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse group members" : "Expand group members"}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg transition-transform touch-manipulation"
        >
          <ChevronRight
            size={18}
            className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
          />
        </button>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="min-w-0 flex-1 flex items-center gap-2.5 text-left py-1"
        >
          <div className="w-9 h-9 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center shrink-0">
            <Layers size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm font-semibold leading-snug line-clamp-1 ${
                isOut ? "text-[var(--muted)]" : "text-[var(--foreground)]"
              }`}
            >
              {group.name}
            </p>
            <p className="text-xs text-[var(--muted)] leading-tight mt-0.5">
              <span>have {formatQuantity(combinedQty, primaryUnit)}</span>
              <span className="mx-1">·</span>
              <span>
                {combined ? `${members.length} similar items combined` : `${members.length} ${members.length === 1 ? "item" : "items"}`}
              </span>
              {group.targetQuantity != null && (
                <>
                  <span className="mx-1">·</span>
                  <span>target {group.targetQuantity}</span>
                </>
              )}
            </p>
          </div>
        </button>

        {!combined && (
        <button
          type="button"
          onClick={handleOpenManage}
          aria-label={`Manage ${group.name}`}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] rounded-lg transition-colors touch-manipulation shrink-0"
        >
          <Settings size={16} />
        </button>
        )}
      </div>

      {isExpanded && (
        <div className="border-t border-[var(--border)] bg-[var(--surface-muted)]/40 p-2 space-y-1">
          <div className="pl-3 border-l-2 border-[var(--border)] ml-3 space-y-1">
            {members.map((member) => (
              <PantryListRow
                key={member.id}
                item={member}
                isLowStock={itemIsLowStock(member)}
                onAdjustQuantity={onAdjustQuantity}
                onEdit={() => onEditItem(member)}
                isUpdating={updatingItemIds.has(member.id)}
              />
            ))}
          </div>
        </div>
      )}

      {!combined && showManageModal && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface)] rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[var(--foreground)]">
                Manage Group
              </h3>
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="p-1 text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-1">
                Group Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
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
                value={editTarget}
                onChange={(e) => setEditTarget(e.target.value)}
                placeholder="Leave blank for default"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
              />
              <p className="text-[11px] text-[var(--muted)] mt-1">
                Combined quantity needed on your shopping list.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleSaveManage}
                disabled={isSaving || !editName.trim()}
                className="w-full bg-[var(--primary)] text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={handleUngroupClick}
                disabled={isSaving}
                className="w-full border border-rose-200 text-rose-600 hover:bg-rose-50 py-2.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 size={15} />
                Ungroup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
