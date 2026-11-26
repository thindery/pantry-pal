"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PantryItem } from "@/types";
import { defaultConsumeAmount, formatConsumeAmount, searchPantryForUse } from "@/lib/consume";
import { truncateOptionLabel } from "@/components/dashboard/MustUsePicker";

interface UsedItTypeaheadProps {
  inventory: PantryItem[];
  /** Deduct the default amount from this item. */
  onUse: (item: PantryItem, amount: number) => Promise<unknown> | void;
  placeholder?: string;
  label?: string;
}

/**
 * PP-191: inline "I used it" typeahead (same pattern as the must-use picker, no popup).
 * Tapping a result deducts 1 pantry unit and the provider shows an Undo toast.
 */
export function UsedItTypeahead({
  inventory,
  onUse,
  placeholder = "I used… (search your pantry)",
  label = "I used it",
}: UsedItTypeaheadProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const results = useMemo(
    () => (open || query.trim() ? searchPantryForUse(inventory, query, 8) : []),
    [inventory, query, open],
  );
  const showList = open && results.length > 0;

  useEffect(() => setActive(0), [query, open]);

  useEffect(() => {
    const onPointer = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  const markUsed = (item: PantryItem) => {
    if ((Number(item.quantity) || 0) <= 0) return;
    void onUse(item, defaultConsumeAmount(item));
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && showList && results[active]) {
      event.preventDefault();
      markUsed(results[active]);
    }
  };

  return (
    <div className="min-w-0 w-full" ref={rootRef} data-testid="used-it-typeahead">
      <input
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        className="w-full max-w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-light)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="relative z-[10000] mt-1 w-full max-w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--background)] py-1 text-sm shadow-md"
        >
          {results.map((item, index) => {
            const qty = Number(item.quantity) || 0;
            const out = qty <= 0;
            return (
              <li
                key={item.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                aria-disabled={out}
                title={item.name}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => markUsed(item)}
                className={`flex items-center gap-2 px-3 min-h-[44px] min-w-0 ${
                  out ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                } ${index === active ? "bg-[var(--surface-muted)]" : ""}`}
              >
                <span className="flex-1 min-w-0 truncate text-[var(--foreground)]">
                  {truncateOptionLabel(item.name)}
                </span>
                <span className="shrink-0 text-xs text-[var(--muted)]">
                  {out ? "Already out" : `${formatConsumeAmount(qty)} left`}
                </span>
                {!out && (
                  <span className="shrink-0 rounded-md bg-[var(--primary-light)] px-2 py-0.5 text-xs font-semibold text-[var(--primary)]">
                    I used it
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
