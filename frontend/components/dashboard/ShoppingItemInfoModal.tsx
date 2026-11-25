"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil } from "lucide-react";
import type { BarcodeProduct, PantryItem, ShoppingListItem } from "@/types";
import { categoryIcon } from "@/lib/category-icons";
import { getProductByBarcode } from "@/services/apiService";
import { usePantry } from "@/contexts/pantry-provider";
import { getShoppingItemPopupReason } from "@/lib/shopping-list-utils";

export interface ShoppingItemInfoModalProps {
  item: ShoppingListItem;
  pantryItem?: PantryItem;
  isOpen: boolean;
  onClose: () => void;
  onEditInPantry?: (pantryItem: PantryItem) => void;
}

type DetailTab = "overview" | "nutrition" | "ingredients";

function useSafePantry() {
  try {
    return usePantry();
  } catch {
    return null;
  }
}

function formatDate(dateString?: string) {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return "—";
  }
}

function ProductNutrition({
  nutrition,
}: {
  nutrition: NonNullable<BarcodeProduct["nutrition"]>;
}) {
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
                hasValue
                  ? "bg-emerald-50 border border-emerald-200"
                  : "bg-slate-50"
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

export function ShoppingItemInfoModal({
  item,
  pantryItem,
  isOpen,
  onClose,
  onEditInPantry,
}: ShoppingItemInfoModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [product, setProduct] = useState<BarcodeProduct | null>(() => {
    if (pantryItem?.productInfo) {
      return {
        barcode: pantryItem.barcode || pantryItem.productInfo.barcode,
        name: pantryItem.productInfo.name || pantryItem.name,
        brand: pantryItem.productInfo.brand,
        category: pantryItem.productInfo.category || pantryItem.category,
        image: pantryItem.productInfo.imageUrl,
        nutrition: pantryItem.productInfo.nutrition,
        ingredients: pantryItem.productInfo.ingredients,
      };
    }
    return null;
  });
  const [productLoading, setProductLoading] = useState(false);

  const safePantry = useSafePantry();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveTab("overview");
    }
  }, [isOpen, item.id]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Prevent background scrolling
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Fetch product information if barcode exists and not already provided
  useEffect(() => {
    if (!isOpen || !pantryItem?.barcode || pantryItem.productInfo != null) {
      return;
    }

    let cancelled = false;

    const fetchProduct = async () => {
      setProductLoading(true);
      try {
        const result = await getProductByBarcode(pantryItem.barcode!);
        if (cancelled) return;
        if (result.product != null) {
          setProduct(result.product);
        }
      } catch {
        // Fall back gracefully to pantry item info
      } finally {
        if (!cancelled) setProductLoading(false);
      }
    };

    fetchProduct();

    return () => {
      cancelled = true;
    };
  }, [isOpen, pantryItem?.barcode, pantryItem?.productInfo]);

  if (!isOpen || !mounted || typeof document === "undefined") {
    return null;
  }

  // Manual items with no linked pantry item show name, quantity and "Added manually" only
  const isManualOnly = (item.isManual || !pantryItem) && !pantryItem;

  if (isManualOnly) {
    return createPortal(
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        data-testid="shopping-item-info-modal-backdrop"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shopping-item-info-title"
          className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 p-6 space-y-4"
        >
          <div className="flex justify-between items-start gap-2">
            <div>
              <h2
                id="shopping-item-info-title"
                className="text-lg font-bold text-slate-900 leading-snug"
              >
                {item.name}
              </h2>
              <p className="text-xs text-slate-500 mt-1">Added manually</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              data-testid="close-modal-x"
              className="text-slate-400 hover:text-slate-600 text-2xl leading-none p-1 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex justify-between items-center">
            <span className="text-xs text-slate-500 font-medium">Quantity</span>
            <span className="text-sm font-semibold text-slate-800">
              {item.suggestedQuantity} {item.unit || ""}
            </span>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Linked pantry item details
  // Prefer the list row's own threshold so the popup matches the row text.
  const alertLevel =
    item.lowStockThreshold ??
    (safePantry?.getThresholdForItem && pantryItem
      ? safePantry.getThresholdForItem(pantryItem)
      : pantryItem?.targetQuantity ?? 1);

  const imgSrc =
    pantryItem?.imageUrl ||
    product?.image ||
    product?.imageUrl ||
    pantryItem?.productInfo?.imageUrl ||
    item.imageUrl;

  const brand =
    product?.brand ||
    pantryItem?.productInfo?.brand ||
    "—";

  const upc =
    pantryItem?.barcode ||
    product?.barcode ||
    "—";

  const category =
    pantryItem?.category ||
    item.category ||
    "—";

  const unit =
    pantryItem?.unit ||
    item.unit ||
    "units";

  const quantityInStock = pantryItem ? pantryItem.quantity : 0;
  const lastUpdated = formatDate(
    pantryItem?.lastUpdated || pantryItem?.updatedAt
  );

  const reasonLine = getShoppingItemPopupReason(item, {
    threshold: alertLevel,
    activities: safePantry?.activities,
    itemId: pantryItem?.id,
  });

  const nutrition = product?.nutrition || pantryItem?.productInfo?.nutrition;
  const ingredients =
    product?.ingredients || pantryItem?.productInfo?.ingredients;

  const hasBarcode = Boolean(pantryItem?.barcode?.trim());
  const hasTabs =
    hasBarcode ||
    Boolean(nutrition) ||
    Boolean(ingredients && ingredients.length > 0);

  const handleEditInPantry = () => {
    if (!pantryItem) return;
    if (onEditInPantry) {
      onEditInPantry(pantryItem);
    } else if (safePantry?.setEditingItem) {
      safePantry.setEditingItem(pantryItem);
    }
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="shopping-item-info-modal-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shopping-item-info-title"
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10 shrink-0">
          <h2
            id="shopping-item-info-title"
            className="text-xl font-bold text-slate-800"
          >
            Item Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            data-testid="close-modal-x"
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none p-1 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Top card with image, name, brand, barcode */}
          <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
            <div className="flex items-start gap-4">
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={pantryItem?.name || item.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 object-cover bg-white rounded-xl border border-slate-100 shrink-0 shadow-sm"
                />
              ) : (
                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-3xl shrink-0 shadow-sm"
                  aria-hidden
                >
                  {categoryIcon(category, pantryItem?.name || item.name)}
                </div>
              )}

              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="font-bold text-lg text-slate-900 leading-snug line-clamp-2">
                  {pantryItem?.name || product?.name || item.name}
                </h3>
                {brand !== "—" && (
                  <p className="text-slate-500 text-xs sm:text-sm">{brand}</p>
                )}
                {upc !== "—" && (
                  <p className="text-[11px] text-slate-400 font-mono tracking-wide">
                    UPC: {upc}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Plain language "Why it's on your list" */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Why it&apos;s on your list
            </p>
            <p className="text-xs text-slate-700 leading-relaxed">
              {reasonLine}
            </p>
          </div>

          {/* Tabs when available */}
          {hasTabs && (
            <div>
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-4">
                {(["overview", "nutrition", "ingredients"] as const).map(
                  (tab) => (
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
                  )
                )}
              </div>

              <div className="min-h-[120px]">
                {activeTab === "overview" && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Brand</span>
                      <span className="text-slate-700">{brand}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">UPC</span>
                      <span className="font-mono text-xs text-slate-700">
                        {upc}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Category</span>
                      <span className="text-slate-700 capitalize">
                        {category}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Unit</span>
                      <span className="text-slate-700">{unit}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Quantity in Stock</span>
                      <span className="font-semibold text-emerald-600">
                        {quantityInStock} {unit}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">
                        Low-stock Alert Level
                      </span>
                      <span className="font-medium text-slate-700">
                        {alertLevel}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Last Updated</span>
                      <span className="text-slate-700 text-xs">
                        {lastUpdated}
                      </span>
                    </div>
                  </div>
                )}

                {activeTab === "nutrition" &&
                  (productLoading ? (
                    <div className="py-6 text-center text-sm text-slate-500">
                      Loading nutrition data…
                    </div>
                  ) : nutrition != null ? (
                    <ProductNutrition nutrition={nutrition} />
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-slate-500 text-sm">
                        No nutrition information available for this product.
                      </p>
                    </div>
                  ))}

                {activeTab === "ingredients" &&
                  (productLoading ? (
                    <div className="py-6 text-center text-sm text-slate-500">
                      Loading ingredient data…
                    </div>
                  ) : ingredients != null && ingredients.length > 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                        Ingredients
                      </p>
                      <ul className="space-y-2">
                        {ingredients.map((ingredient, index) => (
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

          {/* When no tabs, show overview fields directly */}
          {!hasTabs && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500">Brand</span>
                <span className="text-slate-700">{brand}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500">UPC</span>
                <span className="font-mono text-xs text-slate-700">{upc}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500">Category</span>
                <span className="text-slate-700 capitalize">{category}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500">Unit</span>
                <span className="text-slate-700">{unit}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500">Quantity in Stock</span>
                <span className="font-semibold text-emerald-600">
                  {quantityInStock} {unit}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500">Low-stock Alert Level</span>
                <span className="font-medium text-slate-700">{alertLevel}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500">Last Updated</span>
                <span className="text-slate-700 text-xs">{lastUpdated}</span>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {pantryItem && (
              <button
                type="button"
                onClick={handleEditInPantry}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Pencil size={15} />
                <span>Edit in pantry</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
