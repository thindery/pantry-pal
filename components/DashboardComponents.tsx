import React from 'react';
import { PantryItem, Activity, ShoppingListItem } from '../types';

// --- Types ---
interface QuickAction {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'accent';
}

interface StatData {
  label: string;
  value: number;
  color: 'emerald' | 'amber' | 'slate' | 'sky';
  icon?: string;
}

// --- Component: QuickActionBar ---
// Horizontal row of compact icon buttons replacing giant colored cards
interface QuickActionBarProps {
  actions: QuickAction[];
}

export const QuickActionBar: React.FC<QuickActionBarProps> = ({ actions }) => {
  const variantStyles = {
    primary: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    accent: 'bg-sky-100 text-sky-700 hover:bg-sky-200',
  };

  return (
    <div className="flex items-center gap-3">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.onClick}
          title={action.label}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
            variantStyles[action.variant || 'secondary']
          }`}
        >
          <span className="text-lg">{action.icon}</span>
          <span className="text-sm">{action.label}</span>
        </button>
      ))}
    </div>
  );
};

// --- Component: StatCardMini ---
// Compact stat cards in a row (moved to top of dashboard)
interface StatCardMiniProps {
  stats: StatData[];
  onStatClick?: (label: string) => void;
}

export const StatCardMini: React.FC<StatCardMiniProps> = ({ stats, onStatClick }) => {
  const colorStyles = {
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
    slate: 'text-slate-500 bg-slate-50 border-slate-200',
    sky: 'text-sky-600 bg-sky-50 border-sky-100',
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <button
          key={stat.label}
          onClick={() => onStatClick?.(stat.label)}
          className={`p-4 rounded-xl border text-left transition-all hover:shadow-sm ${colorStyles[stat.color]}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">
            {stat.label}
          </p>
          <p className="text-2xl font-bold">{stat.value}</p>
        </button>
      ))}
    </div>
  );
};

// --- Component: LowStockPreview ---
// Shows low stock items with quick +/- controls
interface LowStockPreviewProps {
  items: PantryItem[];
  maxItems?: number;
  onAdjustQuantity: (id: string, delta: number) => void;
  onViewAll: () => void;
}

export const LowStockPreview: React.FC<LowStockPreviewProps> = ({
  items,
  maxItems = 5,
  onAdjustQuantity,
  onViewAll,
}) => {
  const lowStockItems = items
    .filter((item) => item.quantity > 0 && item.quantity < 3)
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
            {items.filter((i) => i.quantity > 0 && i.quantity < 3).length} items
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

// --- Component: InlineQuickAdd ---
// Single-row quick entry form
interface InlineQuickAddProps {
  onAdd: (item: { name: string; quantity: number; category: string }) => void;
  categories: string[];
}

export const InlineQuickAdd: React.FC<InlineQuickAddProps> = ({ onAdd, categories }) => {
  const [name, setName] = React.useState('');
  const [quantity, setQuantity] = React.useState('1');
  const [category, setCategory] = React.useState(categories[0] || 'pantry');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      quantity: parseFloat(quantity) || 1,
      category,
    });

    setName('');
    setQuantity('1');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
        ⚡ Quick Add
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name..."
          className="flex-1 px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
        />
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          min="0"
          step="0.5"
          className="w-20 px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm text-center"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
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
          disabled={!name.trim()}
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
  const recentActivities = activities.slice(0, maxItems);

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
        {recentActivities.map((activity) => (
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
