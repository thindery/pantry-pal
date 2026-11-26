"use client";

import { useState } from "react";
import { ChefHat, Minus, Plus } from "lucide-react";
import type { PantryItem, RecipeIngredientCoverage } from "@/types";
import { buildCookLines, consumeStep, formatConsumeAmount, type CookLine } from "@/lib/consume";

interface CookChecklistProps {
  coverageItems: RecipeIngredientCoverage[];
  inventory: PantryItem[];
  recipeTitle: string;
  onConsume: (
    lines: { itemId: string; amount: number }[],
    options?: { label?: string },
  ) => Promise<boolean>;
  onClose: () => void;
}

/** PP-191: on-page "Mark what you used" checklist (no full-screen overlay). */
export function CookChecklist({ coverageItems, inventory, recipeTitle, onConsume, onClose }: CookChecklistProps) {
  const [lines, setLines] = useState<CookLine[]>(() => buildCookLines(coverageItems, inventory));
  const [busy, setBusy] = useState(false);

  const stockOf = (id: string) => Number(inventory.find((i) => i.id === id)?.quantity) || 0;
  const patch = (key: string, next: Partial<CookLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...next } : l)));

  const selected = lines.filter((l) => l.checked && l.amount > 0);

  const submit = async () => {
    if (busy || selected.length === 0) return;
    setBusy(true);
    try {
      const ok = await onConsume(
        selected.map((l) => ({ itemId: l.itemId, amount: l.amount })),
        { label: recipeTitle },
      );
      if (ok) onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/40 p-3 space-y-2"
      data-testid="cook-checklist"
    >
      <div className="flex items-center gap-2">
        <ChefHat size={16} className="text-[var(--primary)]" />
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Mark what you used</h3>
      </div>
      {lines.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">
          None of these ingredients match something in stock. Use the pantry search to mark items used.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {lines.map((line) => {
            const item = inventory.find((i) => i.id === line.itemId);
            const step = consumeStep(item?.unit);
            const stock = stockOf(line.itemId);
            const remaining = Math.max(0, stock - line.amount);
            return (
              <li key={line.key} className="py-2 flex items-start gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={line.checked}
                  onChange={(e) => patch(line.key, { checked: e.target.checked })}
                  aria-label={`Use ${line.ingredientRaw}`}
                  className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)]"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm text-[var(--foreground)] break-words">{line.ingredientRaw}</p>
                  {line.candidates.length > 1 ? (
                    <select
                      value={line.itemId}
                      onChange={(e) => {
                        const next = line.candidates.find((c) => c.id === e.target.value);
                        patch(line.key, {
                          itemId: e.target.value,
                          amount: Math.min(line.amount, Number(next?.quantity) || 0) || 1,
                        });
                      }}
                      aria-label={`Pantry item for ${line.ingredientRaw}`}
                      className="w-full max-w-full text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5"
                    >
                      {line.candidates.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({formatConsumeAmount(Number(c.quantity) || 0)} left)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-[var(--muted)] truncate" title={item?.name}>
                      {item?.name} · {formatConsumeAmount(stock)} in stock
                    </p>
                  )}
                  {line.checked && remaining === 0 && (
                    <p className="text-[11px] text-amber-700">You&apos;ll have 0 left</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => patch(line.key, { amount: Math.max(step, line.amount - step) })}
                    disabled={line.amount <= step}
                    aria-label={`Use less ${line.ingredientRaw}`}
                    className="min-h-[44px] min-w-[44px] rounded-lg border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center disabled:opacity-40"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums">
                    {formatConsumeAmount(line.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => patch(line.key, { amount: Math.min(stock, line.amount + step) })}
                    disabled={line.amount >= stock}
                    aria-label={`Use more ${line.ingredientRaw}`}
                    className="min-h-[44px] min-w-[44px] rounded-lg border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center disabled:opacity-40"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={submit}
          disabled={busy || selected.length === 0}
          className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-50"
        >
          {busy ? "Deducting…" : "Deduct from pantry"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
