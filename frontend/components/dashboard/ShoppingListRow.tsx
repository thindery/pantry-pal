"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Minus, MoreVertical, Plus, Trash2 } from "lucide-react";
import type { PantryItem, ShoppingListItem } from "@/types";
import { categoryIcon } from "@/lib/category-icons";
import { getShoppingItemReason } from "@/lib/shopping-list-utils";

interface ShoppingListRowProps {
  item: ShoppingListItem;
  pantryItem?: PantryItem;
  onToggleChecked: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onMarkBought: (item: ShoppingListItem) => void;
  onRemove: (id: string) => void;
}

function ItemThumb({
  item,
  pantryItem,
}: {
  item: ShoppingListItem;
  pantryItem?: PantryItem;
}) {
  const src =
    pantryItem?.imageUrl ||
    pantryItem?.productInfo?.imageUrl ||
    item.imageUrl;

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

export function ShoppingListRow({
  item,
  pantryItem,
  onToggleChecked,
  onUpdateQuantity,
  onMarkBought,
  onRemove,
}: ShoppingListRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointer(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  return (
    <div
      className={`relative flex items-center gap-2 px-2.5 py-1.5 min-h-[52px] ${
        item.isChecked ? "opacity-60" : ""
      }`}
      data-testid={`shopping-row-${item.id}`}
    >
      <button
        type="button"
        onClick={() => onToggleChecked(item.id)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          item.isChecked
            ? "bg-[var(--primary)] border-[var(--primary)] text-white"
            : "border-[var(--border)] hover:border-[var(--primary)]"
        }`}
        aria-label={item.isChecked ? "Uncheck item" : "Check item"}
      >
        {item.isChecked && <Check size={12} strokeWidth={3} />}
      </button>

      <ItemThumb item={item} pantryItem={pantryItem} />

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium leading-snug line-clamp-2 ${
            item.isChecked
              ? "line-through text-[var(--muted)]"
              : "text-[var(--foreground)]"
          }`}
        >
          {item.name}
        </p>
        <p className="text-xs text-[var(--muted)] leading-tight mt-0.5">
          {getShoppingItemReason(item)}
        </p>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={() =>
            onUpdateQuantity(item.id, Math.max(1, item.suggestedQuantity - 1))
          }
          disabled={item.suggestedQuantity <= 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--muted)] hover:bg-[var(--border)] disabled:opacity-30 transition-colors"
          aria-label="Decrease quantity"
        >
          <Minus size={14} />
        </button>
        <span
          className="w-6 text-center text-sm font-semibold text-[var(--foreground)]"
          aria-label={`Quantity ${item.suggestedQuantity}`}
        >
          {item.suggestedQuantity}
        </span>
        <button
          type="button"
          onClick={() =>
            onUpdateQuantity(item.id, item.suggestedQuantity + 1)
          }
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary-muted)] disabled:opacity-30 transition-colors"
          aria-label="Increase quantity"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
          aria-label={`Actions for ${item.name}`}
          aria-expanded={menuOpen}
        >
          <MoreVertical size={16} />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 z-30 min-w-[140px] rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onMarkBought(item);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors text-left"
            >
              <Check size={14} className="text-[var(--primary)]" />
              <span>Mark bought</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onRemove(item.id);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger-light)] transition-colors text-left"
            >
              <Trash2 size={14} />
              <span>Remove</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
