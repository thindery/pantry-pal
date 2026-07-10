"use client";

import React from "react";
import Link from "next/link";
import { usePantry } from "@/contexts/pantry-provider";

import { QuickActionBar, createQuickActions } from "@/components/QuickActionBar";
import { StatCardMini, LowStockPreview, ShoppingListPreview, CategoryPills, InlineQuickAdd, RecentActivityPreview } from "@/components/DashboardComponents";
import { InventoryItemRow } from "@/components/dashboard/inventory-item-row";
import { CATEGORIES, UNITS } from "@/lib/constants";

export function DashboardHome() {
  const {
    router,
    inventory,
    activities,
    featureFlags,
    dashboardInlineFilter,
    handleStatCardClick,
    clearDashboardInlineFilter,
    handleAdjustQuantity,
    handleSetToZero,
    setEditingItem,
    setInfoItem,
    setLinkingBarcodeItem,
    updatingItemIds,
    handleScanReceiptClick,
    handleVoiceAssistantClick,
    statCardFilter,
    setStatCardFilter,
    clearStatCardFilter,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    filteredInventory,
    inventoryError,
    isLoadingInventory,
    loadInventory,
    handleCreateItem,
    isAddingItem,
    shoppingList,
    activeShoppingSession,
    sessionExpanded,
    setSessionExpanded,
    startingSession,
    handleStartSessionInline,
    isGeneratingList,
    generateShoppingList,
    shoppingListBoughtQuantities,
    toggleItemChecked,
    updateShoppingItemQuantity,
    markItemAsBought,
    removeShoppingItem,
    addManualShoppingItem,
    copyToClipboard,
    shareShoppingList,
    clearShoppingList,
    showThresholdSettings,
    setShowThresholdSettings,
    thresholdConfig,
    setThresholdConfig,
  } = usePantry();

  return (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header with Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Your Pantry</h1>
                <p className="text-slate-500 text-sm">Quick overview of your inventory</p>
              </div>
              {featureFlags.fabEnabled && (
                <QuickActionBar
                  actions={[
                    ...createQuickActions(
                      () => router.push("/dashboard/add-item/"),
                      () => router.push("/dashboard/scan-barcode/"),
                      handleScanReceiptClick
                    ),
                    {
                      id: 'voice',
                      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C10.9 2 10 2.9 10 4V12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12V4C14 2.9 13.1 2 12 2Z" fill="currentColor"/><path d="M17 11C17 13.76 14.76 16 12 16C9.24 16 7 13.76 7 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M12 19V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M8 22H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
                      label: 'Voice Assistant',
                      onClick: handleVoiceAssistantClick,
                      shortcut: 'v',
                    },
                  ]}
                />
              )}
            </div>

            {/* Stats Row */}
            <StatCardMini
              stats={[
                { label: 'All Items', value: inventory.length, color: 'sky' },
                { label: 'Low Stock', value: (inventory ?? []).filter((i) => i.quantity > 0 && i.quantity < 3).length, color: 'amber' },
                { label: 'Out of Stock', value: (inventory ?? []).filter((i) => i.quantity === 0).length, color: 'slate' },
                { label: 'Expiring Soon', value: 0, color: 'emerald' },
                { label: 'Expired', value: 0, color: 'rose' },
              ]}
              onStatClick={handleStatCardClick}
              activeFilter={dashboardInlineFilter === 'all-items' ? 'All Items' : dashboardInlineFilter === 'low-stock' ? 'Low Stock' : dashboardInlineFilter === 'out-of-stock' ? 'Out of Stock' : dashboardInlineFilter === 'expiring-soon' ? 'Expiring Soon' : dashboardInlineFilter === 'expired' ? 'Expired' : null}
            />

            {/* Inline Filtered Table */}
            {dashboardInlineFilter && dashboardInlineFilter !== 'all-items' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                {/* Filter Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {dashboardInlineFilter === 'low-stock' && '⚠️'}
                      {dashboardInlineFilter === 'out-of-stock' && '📭'}
                      {dashboardInlineFilter === 'expiring-soon' && '⏰'}
                      {dashboardInlineFilter === 'expired' && '❌'}
                    </span>
                    <span className="text-sm text-slate-600">
                      Showing: <span className="font-semibold text-slate-800 capitalize">{dashboardInlineFilter.replace(/-/g, ' ')} Items</span>
                      <span className="text-slate-400 ml-2">
                        ({(() => {
                          switch(dashboardInlineFilter) {
                            case 'low-stock':
                              return (inventory ?? []).filter((i) => i.quantity > 0 && i.quantity < 3).length;
                            case 'out-of-stock':
                              return (inventory ?? []).filter((i) => i.quantity === 0).length;
                            default:
                              return 0;
                          }
                        })()} items)
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push("/dashboard/inventory/")}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                      View All →
                    </button>
                    <button
                      onClick={clearDashboardInlineFilter}
                      className="text-sm text-slate-600 hover:text-slate-800 font-medium px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 transition-colors"
                    >
                      Clear Filter
                    </button>
                  </div>
                </div>

                {/* Filtered Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                      <tr>
                        <th className="px-3 py-3 md:px-6 md:py-4">Item</th>
                        <th className="px-3 py-3 md:px-6 md:py-4">Quantity</th>
                        <th className="px-3 py-3 md:px-6 md:py-4">Status</th>
                        <th className="px-3 py-3 md:px-6 md:py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filteredItems = (() => {
                          switch(dashboardInlineFilter) {
                            case 'low-stock':
                              return inventory.filter((i) => i.quantity > 0 && i.quantity < 3);
                            case 'out-of-stock':
                              return inventory.filter((i) => i.quantity === 0);
                            case 'expiring-soon':
                              return [];
                            case 'expired':
                              return [];
                            default:
                              return [];
                          }
                        })().slice(0, 10);

                        if (filteredItems.length === 0) {
                          return (
                            <tr>
                              <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                <p className="text-2xl mb-2">{dashboardInlineFilter === 'expiring-soon' || dashboardInlineFilter === 'expired' ? '📅' : '✅'}</p>
                                <p>No {dashboardInlineFilter.replace(/-/g, ' ')} items found</p>
                              </td>
                            </tr>
                          );
                        }

                        return filteredItems.map((item) => (
                          <InventoryItemRow
                            key={item.id}
                            item={item}
                            onAdjustQuantity={handleAdjustQuantity}
                            onSetToZero={handleSetToZero}
                            onEdit={() => setEditingItem(item)}
                            onInfo={() => setInfoItem(item)}
                            onLinkBarcode={() => setLinkingBarcodeItem(item)}
                            isUpdating={updatingItemIds.has(item.id)}
                          />
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* View More Link (if more than 10 items) */}
                {(() => {
                  const totalCount = (() => {
                    switch(dashboardInlineFilter) {
                      case 'low-stock':
                        return inventory.filter((i) => i.quantity > 0 && i.quantity < 3).length;
                      case 'out-of-stock':
                        return inventory.filter((i) => i.quantity === 0).length;
                      default:
                        return 0;
                    }
                  })();
                  if (totalCount > 10) {
                    return (
                      <div className="p-3 border-t border-slate-100 text-center">
                        <button
                          onClick={() => {
                            setStatCardFilter(
                              dashboardInlineFilter === 'low-stock' ? 'Low Stock' :
                              dashboardInlineFilter === 'out-of-stock' ? 'Out of Stock' :
                              dashboardInlineFilter === 'expiring-soon' ? 'Expiring Soon' :
                              'Expired'
                            );
                            router.push("/dashboard/inventory/");
                          }}
                          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          View all {totalCount} items →
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            {/* Two Column Layout: Low Stock + Shopping List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LowStockPreview
                items={inventory}
                onAdjustQuantity={handleAdjustQuantity}
                onViewAll={() => router.push("/dashboard/inventory/")}
              />
              <ShoppingListPreview
                items={shoppingList}
                onToggleItem={toggleItemChecked}
                onViewAll={() => router.push("/dashboard/shopping-list/")}
              />
            </div>

            {/* Category Pills */}
            <CategoryPills
              categories={[...CATEGORIES].map((cat) => {
                const count = (inventory ?? []).filter((i) => i.category === cat).length;
                const lowStockCount = (inventory ?? []).filter((i) => i.category === cat && i.quantity > 0 && i.quantity < 3).length;
                const icons: Record<string, string> = {
                  produce: '🥬',
                  pantry: '🥫',
                  dairy: '🥛',
                  frozen: '🧊',
                  meat: '🥩',
                  beverages: '🥤',
                  snacks: '🍿',
                  other: '📦',
                };
                return {
                  id: cat,
                  name: cat.charAt(0).toUpperCase() + cat.slice(1),
                  icon: icons[cat] || '📦',
                  count,
                  lowStockCount,
                };
              })}
              onCategoryClick={(_catId) => router.push("/dashboard/inventory/")}
            />

            {/* Recent Activity */}
            <RecentActivityPreview activities={activities} maxItems={5} />

            {/* Quick Add Bar */}
            <InlineQuickAdd
              onAdd={(item) => handleCreateItem({ ...item, unit: 'units' })}
              categories={[...CATEGORIES]}
              inventory={inventory}
            />
          </div>
        
  );
}
