"use client";

import React, { useEffect, useState } from "react";
import { Info } from "lucide-react";
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

const LOW_STOCK_TOOLTIP =
  "We flag this item and add it to your shopping list when quantity is at or below this number. Set to 0 to only alert when completely out of stock.";

const compactSelectClass =
  "text-xs py-1 pl-2 pr-6 border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none";

function FieldTooltip({ text }: { text: string }) {
  return (
    <span className="relative group inline-flex">
      <button
        type="button"
        className="text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="More info"
      >
        <Info size={12} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 bottom-full z-20 mb-1.5 w-48 -translate-x-1/2 rounded-lg bg-slate-800 px-2.5 py-2 text-[11px] leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

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

interface ItemSettingsFieldsProps {
  unit: string;
  category: string;
  useCustomThreshold: boolean;
  customThreshold: string;
  categoryDefaultThreshold: number;
  isLoading: boolean;
  onUnitChange: (unit: string) => void;
  onCategoryChange: (category: string) => void;
  onUseCustomThresholdChange: (useCustom: boolean) => void;
  onCustomThresholdChange: (value: string) => void;
}

function ItemSettingsFields({
  unit,
  category,
  useCustomThreshold,
  customThreshold,
  categoryDefaultThreshold,
  isLoading,
  onUnitChange,
  onCategoryChange,
  onUseCustomThresholdChange,
  onCustomThresholdChange,
}: ItemSettingsFieldsProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Unit
          </span>
          <select
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
            className={compactSelectClass}
            disabled={isLoading}
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 shrink-0">
            Category
          </span>
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className={`${compactSelectClass} max-w-[7.5rem]`}
            disabled={isLoading}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="flex items-center gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Alert
          </span>
          <FieldTooltip text={LOW_STOCK_TOOLTIP} />
        </span>

        <label className="flex items-center gap-1 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={!useCustomThreshold}
            onChange={(e) => onUseCustomThresholdChange(!e.target.checked)}
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          Default ({categoryDefaultThreshold})
        </label>

        {useCustomThreshold && (
          <label className="flex items-center gap-1 text-xs text-slate-600">
            <span className="text-slate-400">≤</span>
            <input
              type="number"
              min={0}
              step={1}
              value={customThreshold}
              onChange={(e) => onCustomThresholdChange(e.target.value)}
              className="w-12 text-xs py-1 px-1.5 border border-slate-200 rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              disabled={isLoading}
            />
          </label>
        )}
      </div>
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

  const settingsFields = (
    <ItemSettingsFields
      unit={unit}
      category={category}
      useCustomThreshold={useCustomThreshold}
      customThreshold={customThreshold}
      categoryDefaultThreshold={categoryDefaultThreshold}
      isLoading={isLoading}
      onUnitChange={setUnit}
      onCategoryChange={setCategory}
      onUseCustomThresholdChange={setUseCustomThreshold}
      onCustomThresholdChange={setCustomThreshold}
    />
  );

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

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm">
              {error}
            </div>
          )}

          {hasBarcode ? (
            productLoading ? (
              <div className="py-8 flex flex-col items-center justify-center">
                <div className="animate-spin text-3xl mb-2">⏳</div>
                <p className="text-sm text-slate-500">Loading product info...</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                <div className="flex items-start gap-4">
                  {product?.image ? (
                    <img
                      src={product.image}
                      alt={displayName}
                      className="w-28 h-28 object-contain bg-white rounded-xl border border-slate-100 flex-shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="w-28 h-28 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-4xl flex-shrink-0 shadow-sm">
                      📦
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <h3 className="font-bold text-xl text-slate-900 leading-snug">
                        {displayName}
                      </h3>
                      {product?.brand && (
                        <p className="text-slate-500 text-sm mt-0.5">{product.brand}</p>
                      )}
                      {item.barcode && (
                        <p className="text-[11px] text-slate-400 mt-1.5 font-mono tracking-wide">
                          {item.barcode}
                        </p>
                      )}
                    </div>

                    {settingsFields}
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm space-y-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-lg font-semibold px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  disabled={isLoading}
                />
              </div>
              {settingsFields}
            </div>
          )}

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

                {activeTab === "nutrition" &&
                  (product?.nutrition != null ? (
                    <ProductNutrition nutrition={product.nutrition} />
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-slate-500 text-sm">
                        No nutrition information available for this product.
                      </p>
                    </div>
                  ))}

                {activeTab === "ingredients" &&
                  (product?.ingredients != null && product.ingredients.length > 0 ? (
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
                  ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
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