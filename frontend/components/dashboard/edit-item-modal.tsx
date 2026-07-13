"use client";

import React, { useEffect, useState } from "react";
import type { BarcodeProduct, PantryItem } from "@/types";
import { UNITS, CATEGORIES } from "@/lib/constants";
import { getProductByBarcode } from "@/services/apiService";

interface EditItemModalProps {
  item: PantryItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<PantryItem>) => Promise<void>;
  isLoading: boolean;
  lowStockThreshold: number;
  categoryDefaultThreshold: number;
  hasCustomThreshold: boolean;
  onThresholdChange: (threshold: number | null) => void;
}

type DetailTab = "overview" | "nutrition" | "ingredients";

function formatDate(dateString?: string) {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return "—";
  }
}

function ProductNutrition({ nutrition }: { nutrition: NonNullable<BarcodeProduct["nutrition"]> }) {
  return (
    <div className="space-y-4">
      {(nutrition.servingSize || nutrition.servingUnit) && (
        <div className="p-3 bg-slate-50 rounded-lg text-center border border-slate-200">
          <p className="text-sm text-slate-500">Serving Size</p>
          <p className="font-medium text-slate-700">
            {nutrition.servingSize || nutrition.servingUnit}
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ["calories", "Calories", false],
            ["protein", "Protein (g)", true],
            ["carbs", "Carbs (g)", true],
            ["fat", "Fat (g)", true],
            ["fiber", "Fiber (g)", true],
            ["sodium", "Sodium (mg)", true],
          ] as const
        ).map(([key, label, isDecimal]) => {
          const value = nutrition[key];
          const hasValue = value !== undefined;
          return (
            <div
              key={key}
              className={`p-3 rounded-lg text-center ${
                hasValue ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50"
              }`}
            >
              <p
                className={`text-2xl font-bold ${
                  hasValue ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                {hasValue
                  ? isDecimal
                    ? Math.round(value * 10) / 10
                    : Math.round(value)
                  : "—"}
              </p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-400 text-center">Values per 100g</p>
    </div>
  );
}

export function EditItemModal({
  item,
  isOpen,
  onClose,
  onSave,
  isLoading,
  lowStockThreshold,
  categoryDefaultThreshold,
  hasCustomThreshold,
  onThresholdChange,
}: EditItemModalProps) {
  const [name, setName] = useState(item.name);
  const [unit, setUnit] = useState(item.unit);
  const [category, setCategory] = useState(item.category);
  const [useCustomThreshold, setUseCustomThreshold] = useState(hasCustomThreshold);
  const [customThreshold, setCustomThreshold] = useState(String(lowStockThreshold));
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const isNameLocked = Boolean(item.barcode?.trim());
  const hasBarcode = Boolean(item.barcode?.trim());

  useEffect(() => {
    if (isOpen) {
      setName(item.name);
      setUnit(item.unit);
      setCategory(item.category);
      setUseCustomThreshold(hasCustomThreshold);
      setCustomThreshold(String(lowStockThreshold));
      setError(null);
      setActiveTab("overview");
    }
  }, [
    isOpen,
    item.id,
    item.name,
    item.unit,
    item.category,
    hasCustomThreshold,
    lowStockThreshold,
  ]);

  useEffect(() => {
    if (!isOpen || !hasBarcode) {
      setProduct(null);
      return;
    }

    let cancelled = false;

    const fetchProduct = async () => {
      setProductLoading(true);
      try {
        const result = await getProductByBarcode(item.barcode!);
        if (cancelled) return;

        if (result.product != null) {
          setProduct(result.product);
        } else {
          setProduct({
            barcode: item.barcode!,
            name: item.name,
            category: item.category,
          });
        }
      } catch (err) {
        console.error("Failed to fetch product info:", err);
        if (!cancelled) {
          setProduct({
            barcode: item.barcode!,
            name: item.name,
            category: item.category,
          });
        }
      } finally {
        if (!cancelled) {
          setProductLoading(false);
        }
      }
    };

    fetchProduct();

    return () => {
      cancelled = true;
    };
  }, [isOpen, item.barcode, item.name, item.category, hasBarcode]);

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const displayName = product?.name || name;

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError("Item name is required");
      return;
    }

    if (useCustomThreshold) {
      const parsed = parseInt(customThreshold, 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        setError("Low stock alert must be 0 or higher");
        return;
      }
      onThresholdChange(parsed);
    } else {
      onThresholdChange(null);
    }

    try {
      const updates: Partial<PantryItem> = { unit, category };
      if (!isNameLocked) {
        updates.name = name.trim();
      }
      await onSave(item.id, updates);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update item");
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-slate-800">Item Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm">
              {error}
            </div>
          )}

          {hasBarcode && (
            <div>
              {productLoading ? (
                <div className="py-6 flex flex-col items-center justify-center">
                  <div className="animate-spin text-3xl mb-2">⏳</div>
                  <p className="text-sm text-slate-500">Loading product info...</p>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  {product?.image ? (
                    <img
                      src={product.image}
                      alt={displayName}
                      className="w-20 h-20 object-contain bg-slate-50 rounded-xl flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
                      📦
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-slate-800 leading-tight">
                      {displayName}
                    </h3>
                    {product?.brand && (
                      <p className="text-slate-500 text-sm mt-1">{product.brand}</p>
                    )}
                    {item.barcode && (
                      <p className="text-xs text-slate-400 mt-2 font-mono">{item.barcode}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            {!hasBarcode && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  disabled={isLoading}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                disabled={isLoading}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                disabled={isLoading}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Low stock alert</p>
                <p className="text-xs text-slate-500 mt-1">
                  We flag this item and add it to your shopping list when quantity is at
                  or below this number.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={!useCustomThreshold}
                  onChange={(e) => setUseCustomThreshold(!e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Use category default ({categoryDefaultThreshold} for {category})
              </label>

              {useCustomThreshold && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Alert when at or below
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={customThreshold}
                    onChange={(e) => setCustomThreshold(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Set to 0 to only alert when completely out of stock.
                  </p>
                </div>
              )}
            </div>
          </div>

          {hasBarcode && !productLoading && (
            <div>
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-4">
                {(["overview", "nutrition", "ingredients"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all ${
                      activeTab === tab
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="min-h-[120px]">
                {activeTab === "overview" && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Brand</span>
                      <span className="text-slate-700">{product?.brand || "—"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Category</span>
                      <span className="text-slate-700 capitalize">{category}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Quantity in Stock</span>
                      <span className="font-semibold text-emerald-600">
                        {item.quantity} {unit}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Last Updated</span>
                      <span className="text-slate-700 text-sm">
                        {formatDate(item.lastUpdated)}
                      </span>
                    </div>
                  </div>
                )}

                {activeTab === "nutrition" && (
                  product?.nutrition != null ? (
                    <ProductNutrition nutrition={product.nutrition} />
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-slate-500 text-sm">
                        No nutrition information available for this product.
                      </p>
                    </div>
                  )
                )}

                {activeTab === "ingredients" && (
                  product?.ingredients != null && product.ingredients.length > 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                        Ingredients
                      </p>
                      <ul className="space-y-2">
                        {product.ingredients.map((ingredient, index) => (
                          <li
                            key={index}
                            className="text-sm text-slate-700 border-b border-slate-200 pb-2 last:border-0 last:pb-0 leading-relaxed"
                          >
                            {ingredient}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-slate-500 text-sm">
                        No ingredient information available for this product.
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-3 border border-slate-300 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}