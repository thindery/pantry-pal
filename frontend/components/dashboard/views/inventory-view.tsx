"use client";

import React from "react";
import Link from "next/link";
import { usePantry } from "@/contexts/pantry-provider";

import { InventoryItemRow } from "@/components/dashboard/inventory-item-row";
import InventoryCard from "@/components/InventoryCard";

export function InventoryView() {
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
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold text-slate-800">Your Pantry</h2>
                {statCardFilter && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">
                      Filtered by: <span className="font-semibold text-emerald-600">{statCardFilter}</span>
                    </span>
                    <button
                      onClick={clearStatCardFilter}
                      className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                    >
                      Clear filter
                    </button>
                  </div>
                )}
              </div>
              {/* Compact Action Buttons Toolbar */}
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => router.push("/dashboard/scan-barcode/")}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-white text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
                  title="Scan Barcode"
                >
                  <span className="text-base">📱</span>
                  <span className="hidden sm:inline">Barcode</span>
                </button>
                <button
                  onClick={() => router.push("/dashboard/scan-receipt/")}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-white text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
                  title="Scan Receipt"
                >
                  <span className="text-base">📷</span>
                  <span className="hidden sm:inline">Receipt</span>
                </button>
                <button
                  onClick={() => router.push("/dashboard/add-item/")}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
                  title="Add Item"
                >
                  <span className="text-base">➕</span>
                  <span className="hidden sm:inline">Add</span>
                </button>
              </div>
            </div>

            {/* Controls Toolbar - Sort + View Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
              {/* Sort By */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">Sort by:</span>
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                  {(['recent', 'quantity', 'alphabetical'] as const).map((sort) => (
                    <button
                      key={sort}
                      onClick={() => setSortBy(sort)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        sortBy === sort
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {sort === 'recent' ? 'Recent' : sort === 'quantity' ? 'Quantity' : 'Name'}
                    </button>
                  ))}
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">View:</span>
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                      viewMode === 'table'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <span>📋</span> Table
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                      viewMode === 'cards'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <span>🃏</span> Cards
                  </button>
                </div>
              </div>
            </div>

            {inventoryError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm flex justify-between items-center">
                <span>Error loading inventory: {inventoryError}</span>
                <button
                  onClick={loadInventory}
                  className="px-3 py-1 bg-rose-100 rounded-lg hover:bg-rose-200 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {isLoadingInventory ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin text-4xl">⏳</div>
              </div>
            ) : inventory.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <p className="text-4xl mb-4">📦</p>
                <p className="text-slate-500 mb-4">Your pantry is empty</p>
                <button
                  onClick={() => router.push("/dashboard/add-item/")}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Add Your First Item
                </button>
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <p className="text-4xl mb-4">🔍</p>
                <p className="text-slate-500 mb-4">No items match the "{statCardFilter}" filter</p>
                <button
                  onClick={clearStatCardFilter}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Clear Filter
                </button>
              </div>
            ) : viewMode === 'table' ? (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
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
                      {filteredInventory.map((item) => (
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInventory.map((item) => (
                  <InventoryCard
                    key={item.id}
                    item={item}
                    onAdjustQuantity={handleAdjustQuantity}
                    onSetToZero={handleSetToZero}
                    onEdit={() => setEditingItem(item)}
                    onInfo={() => setInfoItem(item)}
                    onLinkBarcode={() => setLinkingBarcodeItem(item)}
                    isUpdating={updatingItemIds.has(item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        
  );
}
