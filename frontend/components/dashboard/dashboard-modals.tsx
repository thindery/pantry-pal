"use client";

import React from "react";
import { usePantry } from "@/contexts/pantry-provider";
import { EditItemModal } from "@/components/dashboard/edit-item-modal";
import ProductInfoModal from "@/components/ProductInfoModal";
import LinkBarcodeModal from "@/components/LinkBarcodeModal";
import { updateItem } from "@/services/apiService";

const emptyItem = {
  id: "",
  name: "",
  quantity: 0,
  unit: "units",
  category: "",
  lastUpdated: "",
};

export function DashboardModals() {
  const {
    editingItem,
    setEditingItem,
    handleEditItem,
    isEditing,
    infoItem,
    setInfoItem,
    linkingBarcodeItem,
    setLinkingBarcodeItem,
    handleLinkBarcode,
    isLinkingBarcode,
    isConfirmingScan,
    setIsConfirmingScan,
    scannedProduct,
    setScannedProduct,
    scanQuantity,
    setScanQuantity,
    activeShoppingSession,
    shoppingList,
    inventory,
    toggleItemChecked,
    setShoppingListBoughtQuantities,
    success,
    showToast,
    handleAdjustQuantity,
    handleCreateItem,
    router,
  } = usePantry();

  return (
    <>
      <EditItemModal
        key={editingItem?.id}
        item={editingItem ?? emptyItem}
        isOpen={editingItem != null}
        onClose={() => setEditingItem(null)}
        onSave={handleEditItem}
        isLoading={isEditing}
      />

      <ProductInfoModal
        item={infoItem ?? emptyItem}
        isOpen={infoItem != null}
        onClose={() => setInfoItem(null)}
      />

      {linkingBarcodeItem != null && (
        <LinkBarcodeModal
          item={linkingBarcodeItem}
          isOpen
          onClose={() => setLinkingBarcodeItem(null)}
          onSave={handleLinkBarcode}
          isLoading={isLinkingBarcode}
        />
      )}

      {isConfirmingScan && scannedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              Add to Inventory
            </h3>

            <div className="flex items-start gap-4 mb-6">
              {scannedProduct.image && (
                <img
                  src={scannedProduct.image}
                  alt={scannedProduct.name}
                  className="w-20 h-20 object-contain rounded-lg border border-slate-200 bg-white"
                />
              )}
              <div className="flex-1">
                <p className="font-semibold text-slate-800">
                  {scannedProduct.name}
                </p>
                <p className="text-sm text-slate-500">{scannedProduct.brand}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {scannedProduct.category}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setScanQuantity(Math.max(1, scanQuantity - 1))}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-lg sm:text-xl font-bold text-slate-600 transition-colors flex-shrink-0"
                  disabled={scanQuantity <= 1}
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  value={scanQuantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1) setScanQuantity(val);
                  }}
                  className="flex-1 min-w-0 h-10 sm:h-12 text-center text-xl sm:text-2xl font-bold text-slate-800 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                />
                <button
                  onClick={() => setScanQuantity(scanQuantity + 1)}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-lg sm:text-xl font-bold text-slate-600 transition-colors flex-shrink-0"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsConfirmingScan(false);
                  setScannedProduct(null);
                }}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!scannedProduct) return;

                  const product = scannedProduct;
                  const quantity = scanQuantity;

                  if (activeShoppingSession != null) {
                    const matchedItem = shoppingList.find(
                      (item) =>
                        item.name.toLowerCase() ===
                          product.name.toLowerCase() ||
                        (product.barcode &&
                          inventory.some(
                            (i) =>
                              i.barcode === product.barcode &&
                              i.name.toLowerCase() ===
                                item.name.toLowerCase()
                          ))
                    );

                    if (matchedItem != null) {
                      if (!matchedItem.isChecked) {
                        toggleItemChecked(matchedItem.id);
                      }
                      setShoppingListBoughtQuantities((prev) => ({
                        ...prev,
                        [matchedItem.id]:
                          (prev[matchedItem.id] || 0) + quantity,
                      }));
                      const unitText =
                        quantity === 1
                          ? matchedItem.unit.replace(/s$/, "")
                          : matchedItem.unit;
                      success(
                        `Added ${quantity} ${unitText} to ${matchedItem.name}`
                      );
                      router.push("/dashboard/shopping-list/");
                      setIsConfirmingScan(false);
                      setScannedProduct(null);
                      return;
                    }
                  }

                  try {
                    const existing = inventory.find(
                      (i) =>
                        i.barcode === product.barcode ||
                        i.name.toLowerCase() === product.name.toLowerCase()
                    );

                    if (existing != null) {
                      if (!existing.barcode && product.barcode) {
                        await updateItem(existing.id, {
                          barcode: product.barcode,
                        });
                      }
                      await handleAdjustQuantity(existing.id, quantity);
                      const unitText =
                        quantity === 1
                          ? existing.unit.replace(/s$/, "")
                          : existing.unit;
                      success(
                        `Added ${quantity} ${unitText} to ${existing.name}`
                      );
                    } else {
                      await handleCreateItem({
                        name:
                          product.name.charAt(0).toUpperCase() +
                          product.name.slice(1),
                        quantity,
                        unit: "units",
                        category: product.category || "other",
                        barcode: product.barcode,
                        productInfo: {
                          barcode: product.barcode,
                          name: product.name,
                          brand: product.brand,
                          category: product.category,
                          imageUrl: product.image,
                          ingredients: product.ingredients,
                          nutrition: product.nutrition,
                          source: (product.source ||
                            "openfoodfacts") as "openfoodfacts" | "manual",
                          infoLastSynced:
                            product.infoLastSynced ||
                            new Date().toISOString(),
                        },
                      });
                      const unitText = quantity === 1 ? "unit" : "units";
                      showToast(
                        `${product.name} (${quantity} ${unitText}) added to inventory`,
                        "success"
                      );
                    }
                    router.push("/dashboard/");
                  } catch {
                    showToast(
                      "Failed to add item to inventory. Please try again.",
                      "error"
                    );
                  } finally {
                    setIsConfirmingScan(false);
                    setScannedProduct(null);
                  }
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
              >
                Add {scanQuantity} to Inventory
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}