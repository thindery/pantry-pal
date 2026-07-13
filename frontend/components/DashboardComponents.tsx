import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import type { FuseResult, FuseResultMatch } from 'fuse.js';
import Fuse from 'fuse.js';
import type { PantryItem, Activity, ShoppingListItem } from '../types';

// --- Types ---
export interface DashboardStatData {
  label: string;
  value: number;
  color: 'emerald' | 'amber' | 'slate' | 'sky' | 'rose';
  icon?: string;
}

// --- Component: StatCardMini ---
// Compact stat cards in a row (moved to top of dashboard)
interface StatCardMiniProps {
  stats: DashboardStatData[];
  onStatClick?: (label: string) => void;
  activeFilter?: string | null;
}

export const StatCardMini: React.FC<StatCardMiniProps> = ({ stats, onStatClick, activeFilter }) => {
  const colorStyles = {
    emerald: {
      base: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      active: 'ring-2 ring-emerald-500 ring-offset-2 bg-emerald-100 border-emerald-300 shadow-md',
    },
    amber: {
      base: 'text-amber-600 bg-amber-50 border-amber-100',
      active: 'ring-2 ring-amber-500 ring-offset-2 bg-amber-100 border-amber-300 shadow-md',
    },
    slate: {
      base: 'text-slate-500 bg-slate-50 border-slate-200',
      active: 'ring-2 ring-slate-500 ring-offset-2 bg-slate-100 border-slate-300 shadow-md',
    },
    sky: {
      base: 'text-sky-600 bg-sky-50 border-sky-100',
      active: 'ring-2 ring-sky-500 ring-offset-2 bg-sky-100 border-sky-300 shadow-md',
    },
    rose: {
      base: 'text-rose-600 bg-rose-50 border-rose-100',
      active: 'ring-2 ring-rose-500 ring-offset-2 bg-rose-100 border-rose-300 shadow-md',
    },
  };

  // Filter out zero values to save space
  const visibleStats = stats.filter((stat) => stat.value > 0);

  // If all stats are zero, show a minimal "All clear" state
  if (visibleStats.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm">
        <span className="text-lg">✅</span>
        <span>All caught up — nothing to worry about</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visibleStats.map((stat) => {
        const isActive = activeFilter === stat.label;
        return (
          <button
            key={stat.label}
            onClick={() => onStatClick?.(stat.label)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all hover:shadow-sm ${
              colorStyles[stat.color].base
            } ${isActive ? colorStyles[stat.color].active : ''}`}
          >
            {stat.icon && <span className="text-lg">{stat.icon}</span>}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider opacity-70">
                {stat.label}
              </p>
              <p className="text-lg font-bold leading-tight">{stat.value}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

// --- Component: LowStockPreview ---
// Shows low stock items with quick +/- controls
interface LowStockPreviewProps {
  items: PantryItem[];
  maxItems?: number;
  isItemLowStock: (item: PantryItem) => boolean;
  onAdjustQuantity: (id: string, delta: number) => void;
  onViewAll: () => void;
}

export const LowStockPreview: React.FC<LowStockPreviewProps> = ({
  items,
  maxItems = 5,
  isItemLowStock,
  onAdjustQuantity,
  onViewAll,
}) => {
  const lowStockItems = items
    .filter((item) => isItemLowStock(item))
    .slice(0, maxItems);

  if (lowStockItems.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
          Low Stock
        </h3>
        <div className="text-center py-4 text-slate-500">
          <span className="text-3xl mb-2 block">✅</span>
          <p className="text-sm">All items well stocked!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            ⚠️ Low Stock
          </h3>
          <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full">
            {items.filter((i) => isItemLowStock(i)).length} items
          </span>
        </div>
      </div>
      <div className="p-2">
        {lowStockItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 truncate">{item.name}</p>
              <p className="text-xs text-slate-500 capitalize">{item.category}</p>
            </div>
            <div className="flex items-center gap-2 ml-3">
              <button
                onClick={() => onAdjustQuantity(item.id, -1)}
                disabled={item.quantity <= 0}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30 text-sm font-bold"
              >
                −
              </button>
              <span className="min-w-[2rem] text-center font-semibold text-slate-700 text-sm">
                {item.quantity}
              </span>
              <button
                onClick={() => onAdjustQuantity(item.id, 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-sm font-bold"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={onViewAll}
          className="text-sm text-emerald-600 font-medium hover:text-emerald-700 transition-colors w-full text-center py-1"
        >
          View all low stock →
        </button>
      </div>
    </div>
  );
};

// --- Component: ShoppingListPreview ---
// Shows quick preview of shopping list
interface ShoppingListPreviewProps {
  items: ShoppingListItem[];
  maxItems?: number;
  onToggleItem: (id: string) => void;
  onViewAll: () => void;
}

export const ShoppingListPreview: React.FC<ShoppingListPreviewProps> = ({
  items,
  maxItems = 5,
  onToggleItem,
  onViewAll,
}) => {
  const uncheckedItems = items.filter((item) => !item.isChecked).slice(0, maxItems);
  const progress = items.length > 0 
    ? Math.round((items.filter(i => i.isChecked).length / items.length) * 100)
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            🛒 Shopping List
          </h3>
          <span className="text-xs text-slate-500">
            {items.filter((i) => i.isChecked).length}/{items.length} checked
          </span>
        </div>
        {items.length > 0 && (
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {uncheckedItems.length === 0 ? (
        <div className="p-6 text-center">
          {items.length === 0 ? (
            <p className="text-slate-500 text-sm">Your list is empty</p>
          ) : (
            <p className="text-emerald-600 text-sm font-medium">🎉 All items checked!</p>
          )}
        </div>
      ) : (
        <div className="p-2">
          {uncheckedItems.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={item.isChecked}
                onChange={() => onToggleItem(item.id)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{item.name}</p>
                <p className="text-xs text-slate-500">
                  {item.suggestedQuantity} {item.unit}
                </p>
              </div>
            </label>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-slate-100">
        <button
          onClick={onViewAll}
          className="text-sm text-emerald-600 font-medium hover:text-emerald-700 transition-colors w-full text-center py-1"
        >
          View full list →
        </button>
      </div>
    </div>
  );
};

// --- Component: CategoryPills ---
// Horizontal scrollable category breakdown
interface CategoryPillsProps {
  categories: Array<{
    id: string;
    name: string;
    icon: string;
    count: number;
    lowStockCount: number;
  }>;
  onCategoryClick?: (categoryId: string) => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  categories,
  onCategoryClick,
}) => {
  const sortedCategories = [...categories].sort((a, b) => b.count - a.count);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
        Categories
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {sortedCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryClick?.(cat.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border whitespace-nowrap transition-all hover:shadow-sm ${
              cat.lowStockCount > 0
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span className="text-lg">{cat.icon}</span>
            <span className="font-medium text-sm">{cat.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              cat.lowStockCount > 0 
                ? 'bg-amber-200 text-amber-800' 
                : 'bg-slate-200 text-slate-600'
            }`}>
              {cat.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Fuse.js Configuration ---
const fuseOptions = {
  keys: ['name', 'barcode'],
  includeMatches: true,
  threshold: 0.4,
  minMatchCharLength: 2,
};

// Highlight matched text from Fuse.js results
function highlightMatch(
  text: string,
  matches: FuseResultMatch[] | undefined,
  key: 'name' | 'barcode'
): React.ReactNode {
  if (matches == null || matches.length === 0) {
    return text;
  }

  const keyMatches = matches.filter((m) => m.key === key);
  if (keyMatches.length === 0) {
    return text;
  }

  const allIndices: Array<[number, number]> = [];
  keyMatches.forEach((m) => {
    if (!Array.isArray(m.indices)) return;
    for (const index of m.indices) {
      if (Array.isArray(index) && index.length >= 2) {
        allIndices.push([index[0], index[1]]);
      }
    }
  });

  if (allIndices.length === 0) {
    return text;
  }

  const sortedIndices = allIndices.sort((a, b) => a[0] - b[0]);
  const mergedIndices: Array<[number, number]> = [];

  let current: [number, number] = [sortedIndices[0][0], sortedIndices[0][1]];
  for (let i = 1; i < sortedIndices.length; i++) {
    if (current[1] >= sortedIndices[i][0] - 1) {
      current[1] = Math.max(current[1], sortedIndices[i][1]);
    } else {
      mergedIndices.push([current[0], current[1]]);
      current = [sortedIndices[i][0], sortedIndices[i][1]];
    }
  }
  mergedIndices.push(current);

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  mergedIndices.forEach(([start, end], i) => {
    if (start > lastIndex) {
      parts.push(
        <span key={`text-${i}`}>{text.slice(lastIndex, start)}</span>
      );
    }

    parts.push(
      <span
        key={`highlight-${i}`}
        className="font-bold bg-yellow-200 text-slate-900 rounded px-0.5"
      >
        {text.slice(start, end + 1)}
      </span>
    );

    lastIndex = end + 1;
  });

  if (lastIndex < text.length) {
    parts.push(<span key="text-end">{text.slice(lastIndex)}</span>);
  }

  return parts;
}

// --- Component: InlineQuickAdd ---
// Single-row quick entry form with fuzzy autocomplete
interface InlineQuickAddProps {
  onAdd: (item: { name: string; quantity: number; category: string; barcode?: string }) => void;
  categories: string[];
  inventory?: PantryItem[];
}

export const InlineQuickAdd: React.FC<InlineQuickAddProps> = ({
  onAdd,
  categories,
  inventory = [],
}) => {
  const [searchText, setSearchText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [quantity, setQuantity] = useState('1');
  const [selectedCategory, setSelectedCategory] = useState(categories[0] || 'pantry');

  const inputRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fuse = useMemo(() => {
    return new Fuse(inventory ?? [], fuseOptions);
  }, [inventory]);

  const suggestions = useMemo<FuseResult<PantryItem>[]>(() => {
    if (!searchText.trim() || searchText.trim().length < 2) {
      return [];
    }
    return fuse.search(searchText.trim());
  }, [fuse, searchText]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
    setShowSuggestions(value.trim().length >= 2);
    setSelectedIndex(-1);
  }, []);

  const selectProduct = useCallback((result: FuseResult<PantryItem>) => {
    const product = result.item;
    setSearchText(product.name);
    setShowSuggestions(false);

    if (product.category) {
      setSelectedCategory(product.category);
    }

    setTimeout(() => {
      quantityRef.current?.focus();
      quantityRef.current?.select();
    }, 0);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!searchText.trim()) return;

    const exactMatch = suggestions.find(
      (s) => s.item.name.toLowerCase() === searchText.trim().toLowerCase()
    )?.item;

    onAdd({
      name: searchText.trim(),
      quantity: parseFloat(quantity) || 1,
      category: selectedCategory,
      barcode: exactMatch?.barcode,
    });

    setSearchText('');
    setQuantity('1');
    setSelectedCategory(categories[0] || 'pantry');
    setShowSuggestions(false);

    inputRef.current?.focus();
  }, [searchText, quantity, selectedCategory, suggestions, onAdd, categories]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter' && searchText.trim()) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectProduct(suggestions[selectedIndex]);
        } else if (searchText.trim()) {
          handleSubmit(e as unknown as React.FormEvent);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  }, [showSuggestions, suggestions, selectedIndex, selectProduct, handleSubmit, searchText]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current != null && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedIndex >= 0 && showSuggestions) {
      const element = document.getElementById(`suggestion-${selectedIndex}`);
      element?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, showSuggestions]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
        ⚡ Quick Add
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <div ref={containerRef} className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={searchText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchText.trim().length >= 2) {
                setShowSuggestions(true);
              }
            }}
            placeholder="Type to search products..."
            className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
            autoComplete="off"
          />

          {/* Dropdown suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-50 w-full bg-white border border-slate-200 shadow-lg rounded-xl mt-1 max-h-60 overflow-y-auto">
              {suggestions.slice(0, 8).map((result, index) => (
                <li
                  key={result.item.id || result.item.barcode || `suggestion-${index}`}
                  id={`suggestion-${index}`}
                  onClick={() => selectProduct(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`px-4 py-2 cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? 'bg-emerald-50'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Product name with highlighted matches */}
                  <div className="font-medium text-slate-800">
                    {highlightMatch(result.item.name, Array.isArray(result.matches) ? result.matches : undefined, 'name')}
                  </div>

                  {/* Barcode shown underneath if available */}
                  {result.item.barcode && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      Barcode: {' '}
                      {highlightMatch(result.item.barcode, Array.isArray(result.matches) ? result.matches : undefined, 'barcode')}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* No results message */}
          {showSuggestions && searchText.trim().length >= 2 && suggestions.length === 0 && (
            <div className="absolute z-50 w-full bg-white border border-slate-200 shadow-lg rounded-xl mt-1 px-4 py-3 text-sm text-slate-500">
              No matching products found
            </div>
          )}
        </div>

        <input
          ref={quantityRef}
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          min="0"
          step="0.5"
          className="w-20 px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm text-center"
        />

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-white"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={!searchText.trim()}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
        >
          <span>+</span>
          <span>Add</span>
        </button>
      </form>
    </div>
  );
};

// --- Component: RecentActivityPreview ---
// Shows last few activities
interface RecentActivityPreviewProps {
  activities: Activity[];
  maxItems?: number;
}

export const RecentActivityPreview: React.FC<RecentActivityPreviewProps> = ({
  activities,
  maxItems = 5,
}) => {
  const recentActivities = (Array.isArray(activities) ? activities : []).slice(0, maxItems);

  const activityIcons: Record<string, string> = {
    ADD: '➕',
    REMOVE: '➖',
    ADJUST: '📝',
    CREATE: '🆕',
    UPDATE: '✏️',
    DELETE: '🗑️',
  };

  const formatRelativeTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (recentActivities.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
          Recent Activity
        </h3>
        <p className="text-slate-500 text-sm text-center py-4">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
        📜 Recent Activity
      </h3>
      <div className="space-y-2">
        {recentActivities.filter(Boolean).map((activity) => (
          <div key={activity.id} className="flex items-center gap-3 py-1">
            <span className="text-lg">{activityIcons[activity.type] || '📝'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-800 truncate">
                <span className="font-medium">{activity.itemName}</span>
                <span className="text-slate-500">
                  {' '}
                  {activity.type === 'ADD' && `+${activity.amount} added`}
                  {activity.type === 'REMOVE' && `-${activity.amount} used`}
                  {activity.type === 'ADJUST' && 'adjusted'}
                  {activity.type === 'CREATE' && 'created'}
                  {activity.type === 'UPDATE' && 'updated'}
                  {activity.type === 'DELETE' && 'deleted'}
                </span>
              </p>
            </div>
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {formatRelativeTime(activity.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
