"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { PantryItem } from "@/types";
export const OPTION_LABEL_MAX = 40;

/** Keep long pantry names from widening the picker. */
export function truncateOptionLabel(name: string, max = OPTION_LABEL_MAX): string {
  const text = name.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}


const PERISHABLE = new Set([
  "produce",
  "dairy",
  "meat",
  "seafood",
  "bakery",
  "deli",
  "fruit",
  "vegetables",
]);

const MAX_SELECTED = 5;
const MAX_RESULTS = 8;
const MAX_POPULAR = 6;

function inStock(inventory: PantryItem[]): PantryItem[] {
  return inventory.filter((item) => item.quantity > 0 && item.name.trim());
}

function uniqueByName(items: PantryItem[]): PantryItem[] {
  const seen = new Set<string>();
  const out: PantryItem[] = [];
  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Use-soon order: perishable categories first, then oldest last update. */
export function popularPantryItems(inventory: PantryItem[], selected: string[], limit = MAX_POPULAR): PantryItem[] {
  const taken = new Set(selected.map((name) => name.trim().toLowerCase()));
  const items = uniqueByName(inStock(inventory)).filter((item) => !taken.has(item.name.trim().toLowerCase()));
  items.sort((a, b) => {
    const pa = PERISHABLE.has((a.category || "").toLowerCase()) ? 0 : 1;
    const pb = PERISHABLE.has((b.category || "").toLowerCase()) ? 0 : 1;
    if (pa !== pb) return pa - pb;
    const ta = a.lastUpdated || "";
    const tb = b.lastUpdated || "";
    if (ta !== tb) return ta.localeCompare(tb);
    return a.name.localeCompare(b.name);
  });
  return items.slice(0, limit);
}

export function filterPantryItems(
  inventory: PantryItem[],
  query: string,
  selected: string[],
  limit = MAX_RESULTS,
): PantryItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const taken = new Set(selected.map((name) => name.trim().toLowerCase()));
  const starts: PantryItem[] = [];
  const contains: PantryItem[] = [];
  for (const item of uniqueByName(inStock(inventory))) {
    const name = item.name.trim();
    if (taken.has(name.toLowerCase())) continue;
    const lower = name.toLowerCase();
    if (lower.startsWith(q)) starts.push(item);
    else if (lower.includes(q)) contains.push(item);
  }
  return [...starts, ...contains].slice(0, limit);
}

export interface MustUsePickerProps {
  inventory: PantryItem[];
  selected: string[];
  onChange: (names: string[]) => void;
}

export function MustUsePicker({ inventory, selected, onChange }: MustUsePickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const atCap = selected.length >= MAX_SELECTED;

  const popular = useMemo(() => popularPantryItems(inventory, selected, MAX_POPULAR), [inventory, selected]);
  const results = useMemo(() => {
    if (atCap) return [];
    if (query.trim()) return filterPantryItems(inventory, query, selected, MAX_RESULTS);
    // On focus with an empty query, the listbox shows the same popular items for keyboard users.
    return open ? popularPantryItems(inventory, selected, MAX_RESULTS) : [];
  }, [inventory, query, selected, open, atCap]);

  const showList = open && !atCap && results.length > 0;

  useEffect(() => {
    setActive(0);
  }, [query, open, results.length]);

  useEffect(() => {
    if (!showList) return;
    const input = rootRef.current?.querySelector("input");
    if (input && typeof input.scrollIntoView === "function") {
      input.scrollIntoView({ block: "center", inline: "nearest" });
    }
  }, [showList]);

  useEffect(() => {
    const onPointer = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  const add = (name: string) => {
    const clean = name.trim();
    if (!clean || atCap) return;
    if (selected.some((item) => item.toLowerCase() === clean.toLowerCase())) return;
    onChange([...selected, clean]);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (atCap) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      if (showList) setActive((i) => Math.min(i + 1, results.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (showList) setActive((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      if (showList && results[active]) {
        event.preventDefault();
        add(results[active].name);
      }
    }
  };

  return (
    <div className="sm:col-span-3 space-y-1 min-w-0" ref={rootRef}>
      <span className="text-xs font-medium text-[var(--muted)]">Must use (up to 5)</span>
      <div className="flex flex-wrap items-center gap-2 min-w-0 w-full">
        {selected.map((name) => (
          <span
            key={name}
            title={name}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-muted)] border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--foreground)] max-w-full min-w-0"
          >
            <span className="truncate">{name}</span>
            <button type="button" aria-label={`Remove ${name}`} onClick={() => onChange(selected.filter((item) => item !== name))}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      {!atCap && (
        <div className="min-w-0 w-full">
          <input
            type="text"
            role="combobox"
            aria-label="Search your pantry"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList ? `${listId}-${active}` : undefined}
            autoComplete="off"
            placeholder="Search your pantry…"
            className="w-full max-w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
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
              {results.map((item, index) => (
                <li
                  key={item.id || item.name}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  title={item.name}
                  className={`px-3 py-1.5 cursor-pointer truncate min-w-0 ${
                    index === active ? "bg-[var(--surface-muted)] text-[var(--foreground)]" : "text-[var(--foreground)]"
                  }`}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => add(item.name)}
                >
                  {truncateOptionLabel(item.name)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {!query.trim() && !atCap && popular.length > 0 && (
        <div className="min-w-0 w-full" data-testid="must-use-popular">
          <p className="text-[11px] font-medium text-[var(--muted)] mb-1">Popular</p>
          <div className="flex flex-wrap gap-1.5 min-w-0">
            {popular.map((item) => (
              <button
                type="button"
                key={item.id || item.name}
                title={item.name}
                onClick={() => add(item.name)}
                className="max-w-full min-w-0 truncate rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--foreground)] hover:border-[var(--accent)]"
              >
                {truncateOptionLabel(item.name, 28)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
