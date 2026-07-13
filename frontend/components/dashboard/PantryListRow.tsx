"use client";

import { Bell, Minus, MoreHorizontal, Plus } from "lucide-react";
import type { PantryItem } from "@/types";

interface PantryListRowProps {
  item: PantryItem;
  isLowStock: boolean;
  lowStockThreshold: number;
  onAdjustQuantity: (id: string, delta: number) => Promise<void>;
  onEdit: () => void;
  isUpdating: boolean;
}

function quantityStep(unit: string): number {
  if (["lbs", "kg", "grams", "oz"].includes(unit)) return 0.5;
  if (unit === "cups") return 0.25;
  return 1;
}

export function PantryListRow({
  item,
  isLowStock,
  lowStockThreshold,
  onAdjustQuantity,
  onEdit,
  isUpdating,
}: PantryListRowProps) {
  const isOut = item.quantity <= 0;
  const step = quantityStep(item.unit);

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3 ${
        isLowStock && !isOut ? "bg-[var(--accent-light)]/40" : ""
      }`}
    >
      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 flex-1 text-left"
      >
        <p
          className={`font-medium truncate ${
            isOut ? "text-[var(--muted)]" : "text-[var(--foreground)]"
          }`}
        >
          {item.name}
        </p>
        <p className="text-sm text-[var(--muted)]">
          {item.quantity} {item.unit}
          <span className="mx-1">·</span>
          <span className="capitalize">{item.category}</span>
          {isLowStock && (
            <>
              <span className="mx-1">·</span>
              <span
                className="inline-flex items-center gap-0.5"
                title={`Low stock alert at or below ${lowStockThreshold}`}
              >
                <Bell size={12} aria-hidden />
                <span>@ {lowStockThreshold}</span>
              </span>
            </>
          )}
        </p>
      </button>

      <div className="flex items-center gap-2 shrink-0">
        {isOut ? (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--muted)]">
            Out
          </span>
        ) : isLowStock ? (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--accent-hover)]">
            Low
          </span>
        ) : null}

        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg md:hidden"
          aria-label="More actions"
        >
          <MoreHorizontal size={16} />
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onAdjustQuantity(item.id, -step)}
            disabled={isUpdating || item.quantity <= 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--muted)] hover:bg-[var(--border)] disabled:opacity-30 transition-colors"
            aria-label="Decrease quantity"
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            onClick={() => onAdjustQuantity(item.id, step)}
            disabled={isUpdating}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary-muted)] disabled:opacity-30 transition-colors"
            aria-label="Increase quantity"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}