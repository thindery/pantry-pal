"use client";

import React from "react";
import Link from "next/link";
import { usePantry } from "@/contexts/pantry-provider";

import type { ShoppingListItem } from "@/types";
import { CATEGORIES, DEFAULT_THRESHOLDS, UNITS } from "@/lib/constants";

export function ShoppingListView() {
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
    setActiveShoppingSession,
    success,
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
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {activeShoppingSession && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <div 
                  onClick={() => setSessionExpanded(!sessionExpanded)}
                  className="cursor-pointer bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🛒</span>
                    <span className="text-sm font-medium text-emerald-800">
                      Shopping session in progress ({activeShoppingSession.items?.length || 0} items)
                    </span>
                  </div>
                  <div className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
                    {sessionExpanded ? 'Collapse ▴' : 'Continue Session ▾'}
                  </div>
                </div>
                
                {sessionExpanded && (
                  <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {activeShoppingSession.items?.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">No items scanned yet</p>
                      ) : (
                        activeShoppingSession.items?.map((item) => (
                          <div key={item.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg text-sm">
                            <span className="text-slate-700 font-medium">{item.name}</span>
                            <span className="text-slate-500">{item.quantity}</span>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                      <button 
                        onClick={() => router.push("/dashboard/scan-barcode/")}
                        className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                      >
                        Scan Barcode
                      </button>
                      <button 
                        onClick={() => {
                          setActiveShoppingSession(null);
                          setSessionExpanded(false);
                          success('Shopping session completed!');
                        }}
                        className="flex-1 px-3 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors"
                      >
                        Complete Session
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Clean Toolbar - 40% height reduction */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
              {/* Title Row */}
              <div className="flex items-center gap-2">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <span className="text-xl">🛒</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Shopping List</h2>
                  <p className="text-slate-500 text-xs">
                    {shoppingList.length === 0 
                      ? 'Auto-generated from low stock'
                      : `${shoppingList.filter(i => i.isChecked).length}/${shoppingList.length} items checked`}
                  </p>
                </div>
              </div>

              {/* Toolbar Actions */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                {/* Primary: Live Session */}
                <button
                  onClick={activeShoppingSession ? () => setSessionExpanded(!sessionExpanded) : handleStartSessionInline}
                  disabled={startingSession}
                  className="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all shadow-sm flex items-center justify-center gap-1.5 text-sm whitespace-nowrap disabled:opacity-50"
                  title={activeShoppingSession ? 'View Session' : 'Start Shopping Session'}
                >
                  <span>{startingSession ? '⏳' : '▶️'}</span>
                  <span className="hidden sm:inline">{startingSession ? 'Starting...' : activeShoppingSession ? 'Session' : 'Start Session'}</span>
                </button>
                
                {/* Icon-only: Refresh */}
                <button
                  onClick={generateShoppingList}
                  disabled={isGeneratingList}
                  className="p-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                  title={isGeneratingList ? 'Refreshing...' : 'Refresh List'}
                >
                  <span className={`text-base ${isGeneratingList ? 'animate-spin' : ''}`}>🔄</span>
                </button>

                {/* More Dropdown */}
                <div className="relative group">
                  <button 
                    className="px-2 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-0.5 text-sm"
                    title="More actions"
                  >
                    <span className="inline">More..</span>
                    <span>▾</span>
                  </button>
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-1">
                    <button
                      onClick={() => router.push("/dashboard/session-history/")}
                      className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span>📜</span> View History
                    </button>
                    <button
                      onClick={() => setShowThresholdSettings(true)}
                      className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span>⚙️</span> Thresholds
                    </button>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                      onClick={copyToClipboard}
                      className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span>📋</span> Copy Text
                    </button>
                    <button
                      onClick={shareShoppingList}
                      className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span>📤</span> Share List
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span>🖨️</span> Print PDF
                    </button>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                      onClick={clearShoppingList}
                      className="w-full text-left px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <span>🗑️</span> Clear All
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {shoppingList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <p className="text-4xl mb-4">✅</p>
                <p className="text-slate-600 font-semibold mb-2">You're all stocked!</p>
                <p className="text-slate-400 text-sm">
                  No low stock items found in your inventory
                </p>
              </div>
            ) : (
              <>
                {/* Shopping List Items by Category */}
                {(() => {
                  const grouped: Record<string, ShoppingListItem[]> = shoppingList.reduce((acc, item) => {
                    if (acc[item.category] == null) acc[item.category] = [];
                    acc[item.category].push(item);
                    return acc;
                  }, {} as Record<string, ShoppingListItem[]>);
                  
                  return Object.entries(grouped)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([category, items]: [string, ShoppingListItem[]]) => (
                  <div key={category} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm print:border-gray-400">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 print:bg-gray-100">
                      <h3 className="font-bold text-slate-700 capitalize flex items-center gap-2">
                        {category === 'produce' && '🥬'}
                        {category === 'dairy' && '🥛'}
                        {category === 'pantry' && '🥫'}
                        {category === 'frozen' && '🧊'}
                        {category === 'meat' && '🥩'}
                        {category === 'beverages' && '🥤'}
                        {category === 'snacks' && '🍿'}
                        {category === 'other' && '📦'}
                        {category}
                        <span className="text-xs font-normal text-slate-400">
                          ({items.length} items)
                        </span>
                      </h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={`px-4 py-3 flex items-center gap-3 transition-colors ${
                            item.isChecked ? 'bg-slate-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <button
                            onClick={() => toggleItemChecked(item.id)}
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                              item.isChecked
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-slate-300 hover:border-emerald-400'
                            }`}
                          >
                            {item.isChecked && '✓'}
                          </button>
                          <div className="flex-1">
                            <p className={`font-medium ${item.isChecked ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                              {item.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {item.isManual ? 'Manual add' : item.reason === 'recommendation' ? '🤖 Recommendation' : `Current: ${item.currentQuantity}`}
                              {shoppingListBoughtQuantities[item.id] ? ` • Buying: ${shoppingListBoughtQuantities[item.id]}` : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => updateShoppingItemQuantity(item.id, Math.max(1, item.suggestedQuantity - 1))}
                                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold transition-colors"
                                title="Decrease quantity"
                              >
                                −
                              </button>
                              <p className={`font-bold ${item.isChecked ? 'text-slate-400' : 'text-emerald-600'}`}>
                                {item.suggestedQuantity} {item.unit}
                              </p>
                              <button
                                onClick={() => updateShoppingItemQuantity(item.id, item.suggestedQuantity + 1)}
                                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold transition-colors"
                                title="Increase quantity"
                              >
                                +
                              </button>
                            </div>
                            {item.reason === 'recommendation' && (
                              <span className="text-xs text-amber-500 font-medium">Buy soon</span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => markItemAsBought(item)}
                              disabled={item.isChecked}
                              className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-50 disabled:opacity-30 transition-colors"
                              title="Mark as bought and add to inventory"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                            <button
                              onClick={() => removeShoppingItem(item.id)}
                              className="p-2 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Remove from list"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              );
            })()}

                {/* Add Manual Item Form */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="font-bold text-slate-700 mb-4">➕ Add Item Manually</h3>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const formData = new FormData(form);
                      addManualShoppingItem(
                        formData.get('name') as string,
                        formData.get('category') as string,
                        parseFloat(formData.get('quantity') as string) || 1,
                        formData.get('unit') as string
                      );
                      form.reset();
                    }}
                    className="grid grid-cols-1 sm:grid-cols-5 gap-3"
                  >
                    <input
                      name="name"
                      type="text"
                      placeholder="Item name"
                      required
                      className="sm:col-span-2 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                    <select
                      name="category"
                      className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        name="quantity"
                        type="number"
                        min="1"
                        step="0.5"
                        placeholder="Qty"
                        className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <select
                        name="unit"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm"
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="bg-emerald-600 text-white py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                    >
                      Add
                    </button>
                  </form>
                </div>
              </>
            )}

            {/* Threshold Settings Modal */}
            {showThresholdSettings && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">⚙️ Low Stock Thresholds</h2>
                    <button
                      onClick={() => setShowThresholdSettings(false)}
                      className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-slate-500 text-sm mb-4">
                    Items at or below these thresholds will be flagged for shopping.
                  </p>
                  <div className="space-y-3 mb-6">
                    {CATEGORIES.map((category) => (
                      <div key={category} className="flex items-center justify-between">
                        <label className="capitalize text-slate-700 font-medium flex items-center gap-2">
                          {category === 'produce' && '🥬'}
                          {category === 'dairy' && '🥛'}
                          {category === 'pantry' && '🥫'}
                          {category === 'frozen' && '🧊'}
                          {category === 'meat' && '🥩'}
                          {category === 'beverages' && '🥤'}
                          {category === 'snacks' && '🍿'}
                          {category === 'other' && '📦'}
                          {category}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={thresholdConfig[category] ?? DEFAULT_THRESHOLDS[category]}
                          onChange={(e) => {
                            setThresholdConfig((prev) => ({
                              ...prev,
                              [category]: parseInt(e.target.value) || 0,
                            }));
                          }}
                          className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-center"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setThresholdConfig(DEFAULT_THRESHOLDS)}
                      className="px-4 py-3 border border-slate-300 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                    >
                      Reset to Default
                    </button>
                    <button
                      onClick={() => setShowThresholdSettings(false)}
                      className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        
  );
}
