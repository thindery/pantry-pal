"use client";

import React from "react";
import Link from "next/link";
import { usePantry } from "@/contexts/pantry-provider";

import { AddItemForm } from "@/components/dashboard/add-item-form";

export function AddItemView() {
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
          <div className="max-w-lg mx-auto animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => router.push("/dashboard/")}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ← Back to Inventory
              </button>
            </div>
            <AddItemForm
              onSubmit={handleCreateItem}
              onCancel={() => router.push("/dashboard/")}
              isLoading={isAddingItem}
            />
          </div>
        
  );
}
