// NEW DASHBOARD VIEW IMPLEMENTATION REFERENCE
// This shows how to replace the existing dashboard view in App.tsx
// Replace the {view === 'dashboard' && (...)} block with this implementation

import React from 'react';
import { PantryItem, Activity, ShoppingListItem } from './types';
import {
  QuickActionBar,
  StatCardMini,
  LowStockPreview,
  ShoppingListPreview,
  CategoryPills,
  InlineQuickAdd,
  RecentActivityPreview,
} from './components/DashboardComponents';

// --- Category Icons Mapping ---
const categoryIcons: Record<string, string> = {
  produce: '🥬',
  pantry: '🥫',
  dairy: '🥛',
  frozen: '🧊',
  meat: '🥩',
  beverages: '🥤',
  snacks: '🍿',
  other: '📦',
};

// --- Dashboard View Component ---
interface DashboardViewProps {
  inventory: PantryItem[];
  activities: Activity[];
  shoppingList: ShoppingListItem[];
  onAdjustQuantity: (id: string, delta: number) => Promise<void>;
  onQuickAdd: (item: { name: string; quantity: number; category: string }) => void;
  onToggleShoppingItem: (id: string) => void;
  setView: (view: View) => void;
  setIsVoiceActive: (active: boolean) => void;
}

type View = 'dashboard' | 'inventory' | 'shopping-list' | 'scan-receipt' | 'scan-barcode' | 'add-item';

export const DashboardView: React.FC<DashboardViewProps> = ({
  inventory,
  activities,
  shoppingList,
  onAdjustQuantity,
  onQuickAdd,
  onToggleShoppingItem,
  setView,
  setIsVoiceActive,
}) => {
  // Build category data with counts
  const categoryData = React.useMemo(() => {
    const cats = ['produce', 'pantry', 'dairy', 'frozen', 'meat', 'beverages', 'snacks', 'other'];
    return cats.map((cat) => ({
      id: cat,
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      icon: categoryIcons[cat] || '📦',
      count: inventory.filter((i) => i.category === cat).length,
      lowStockCount: inventory.filter((i) => i.category === cat && i.quantity > 0 && i.quantity < 3).length,
    })).filter((c) => c.count > 0);
  }, [inventory]);

  // Stat calculations
  const stats = React.useMemo(
    () => [
      { label: 'Total Items', value: inventory.length, color: 'sky' as const, icon: '📦' },
      { label: 'In Stock', value: inventory.filter((i) => i.quantity > 0).length, color: 'emerald' as const, icon: '✅' },
      { label: 'Low Stock', value: inventory.filter((i) => i.quantity > 0 && i.quantity < 3).length, color: 'amber' as const, icon: '⚠️' },
      { label: 'Out of Stock', value: inventory.filter((i) => i.quantity === 0).length, color: 'slate' as const, icon: '📭' },
    ],
    [inventory]
  );

  // Quick actions configuration
  const quickActions = [
    { id: 'add', icon: '➕', label: 'Add Item', onClick: () => setView('add-item'), variant: 'primary' as const },
    { id: 'barcode', icon: '📱', label: 'Scan Barcode', onClick: () => setView('scan-barcode'), variant: 'accent' as const },
    { id: 'receipt', icon: '🧾', label: 'Scan Receipt', onClick: () => setView('scan-receipt'), variant: 'secondary' as const },
    { id: 'voice', icon: '🎙️', label: 'Voice', onClick: () => setIsVoiceActive(true), variant: 'secondary' as const },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header with Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Your Pantry</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <QuickActionBar actions={quickActions} />
      </div>

      {/* Stats Row - Priority Data At Top */}
      <StatCardMini 
        stats={stats} 
        onStatClick={(label) => {
          if (label === 'Low Stock') {
            setView('inventory');
            // Could pass filter state here
          } else {
            setView('inventory');
          }
        }}
      />

      {/* Category Breakdown */}
      <CategoryPills
        categories={categoryData}
        onCategoryClick={(catId) => {
          setView('inventory');
          // Could trigger category filter
        }}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Low Stock Preview */}
        <div className="md:col-span-5 space-y-6">
          <LowStockPreview
            items={inventory}
            maxItems={6}
            onAdjustQuantity={onAdjustQuantity}
            onViewAll={() => setView('inventory')}
          />
        </div>

        {/* Right Column: Shopping List + Activity */}
        <div className="md:col-span-7 space-y-6">
          <ShoppingListPreview
            items={shoppingList}
            maxItems={5}
            onToggleItem={onToggleShoppingItem}
            onViewAll={() => setView('shopping-list')}
          />
          <RecentActivityPreview activities={activities} maxItems={5} />
        </div>
      </div>

      {/* Quick Add Bar */}
      <InlineQuickAdd
        onAdd={onQuickAdd}
        categories={['produce', 'pantry', 'dairy', 'frozen', 'meat', 'beverages', 'snacks', 'other']}
      />
    </div>
  );
};

// --- Integration Example ---
// In App.tsx, replace the dashboard view case with:
/*
{view === 'dashboard' && (
  <DashboardView
    inventory={inventory}
    activities={activities}
    shoppingList={shoppingList}
    onAdjustQuantity={handleAdjustQuantity}
    onQuickAdd={(item) => {
      // Handle quick add - could reuse handleCreateItem
      handleCreateQuickItem(item);
    }}
    onToggleShoppingItem={toggleItemChecked}
    setView={setView}
    setIsVoiceActive={setIsVoiceActive}
  />
)}
*/
