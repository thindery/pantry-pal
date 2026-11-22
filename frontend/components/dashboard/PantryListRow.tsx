"use client";

import { Minus, Plus } from "lucide-react";
import type { PantryItem } from "@/types";
import { formatQuantity } from "@/lib/format-quantity";
import { categoryIcon } from "@/lib/category-icons";

interface PantryListRowProps {
  item: PantryItem;
  isLowStock: boolean;
  onAdjustQuantity: (id: string, delta: number) => Promise<void>;
  onEdit: () => void;
  isUpdating: boolean;
}

function quantityStep(unit: string): number {
  if (["lbs", "kg", "grams", "oz"].includes(unit)) return 0.5;
  if (unit === "cups") return 0.25;
  return 1;
}

function ItemThumb({ item }: { item: PantryItem }) {
  const src = item.imageUrl || item.productInfo?.imageUrl;
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="w-10 h-10 rounded-lg object-cover bg-[var(--surface-muted)] shrink-0"
      />
    );
  }
  return (
    <div
      className="w-10 h-10 rounded-lg bg-[var(--surface-muted)] text-[var(--foreground)] shrink-0 flex items-center justify-center text-base"
      aria-hidden
    >
      {categoryIcon(item.category, item.name)}
    </div>
  );
}

export function PantryListRow({
  item,
  isLowStock,
  onAdjustQuantity,
  onEdit,
  isUpdating,
}: PantryListRowProps) {
  const isOut = item.quantity <= 0;
  const step = quantityStep(item.unit);
  const statusBorder = isOut
    ? "border-l-[3px] border-l-[var(--danger)]"
    : isLowStock
      ? "border-l-[3px] border-l-[var(--accent)]"
      : "border-l-[3px] border-l-transparent";

  return (
    <div
      className={`flex items-center gap-2 pl-2 pr-1.5 py-1.5 min-h-[52px] ${statusBorder}`}
      data-testid={`pantry-row-${item.id}`}
    >
      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 flex-1 flex items-center gap-2 text-left"
      >
        <ItemThumb item={item} />
        <span className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium leading-snug line-clamp-2 ${
              isOut ? "text-[var(--muted)]" : "text-[var(--foreground)]"
            }`}
          >
            {item.name}
          </p>
          <p className="text-xs text-[var(--muted)] leading-tight mt-0.5">
            {formatQuantity(item.quantity, item.unit)}
            <span className="mx-1">·</span>
            <span className="capitalize">{item.category}</span>
          </p>
        </span>
      </button>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={() => onAdjustQuantity(item.id, -step)}
          disabled={isUpdating || item.quantity <= 0}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--muted)] hover:bg-[var(--border)] disabled:opacity-30 transition-colors"
          aria-label="Decrease quantity"
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          onClick={() => onAdjustQuantity(item.id, step)}
          disabled={isUpdating}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary-muted)] disabled:opacity-30 transition-colors"
          aria-label="Increase quantity"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
