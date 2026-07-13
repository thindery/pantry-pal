"use client";

import React, { useState } from "react";
import { usePantry } from "@/contexts/pantry-provider";
import { EditItemModal } from "@/components/dashboard/edit-item-modal";
import ProductInfoModal from "@/components/ProductInfoModal";
import LinkBarcodeModal from "@/components/LinkBarcodeModal";
import { ApiError } from "@/services/apiService";
import { getCategoryThreshold } from "@/lib/threshold-utils";

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
    getThresholdForItem,
    setItemThreshold,
    itemThresholdOverrides,
    thresholdConfig,
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
    handleSaveScannedProduct,
    router,
  } = usePantry();

  const [scanSaveError, setScanSaveError] = useState<string | null>(null);
  const [isSavingScan, setIsSavingScan] = useState(false);

  return (
    <>
      <EditItemModal
        key={editingItem?.id}
        item={editingItem ?? emptyItem}
        isOpen={editingItem != null}
        onClose={() => setEditingItem(null)}
        onSave={handleEditItem}
        isLoading={isEditing}
        lowStockThreshold={
          editingItem != null ? getThresholdForItem(editingItem) : 2
        }
        categoryDefaultThreshold={
          editingItem != null
            ? getCategoryThreshold(editingItem.category, thresholdConfig)
            : 2
        }
        hasCustomThreshold={
          editingItem != null && itemThresholdOverrides[editingItem.id] != null
        }
        onThresholdChange={(threshold) => {
          if (editingItem != null) {
            setItemThreshold(editingItem.id, threshold);
          }
        }}
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

            {scanSaveError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
                {scanSaveError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setScanSaveError(null);
                  setIsConfirmingScan(false);
                  setScannedProduct(null);
                }}
                disabled={isSavingScan}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!scannedProduct || isSavingScan) return;

                  const product = scannedProduct;
                  const quantity = scanQuantity;
                  setScanSaveError(null);
                  setIsSavingScan(true);

                  try {
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

                    await handleSaveScannedProduct(product, quantity);
                    router.push("/dashboard/");
                    setIsConfirmingScan(false);
                    setScannedProduct(null);
                  } catch (err) {
                    const message =
                      err instanceof ApiError
                        ? err.message
                        : "Failed to add item to inventory. Please try again.";
                    setScanSaveError(message);
                  } finally {
                    setIsSavingScan(false);
                  }
                }}
                disabled={isSavingScan}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isSavingScan
                  ? "Saving..."
                  : `Add ${scanQuantity} to Inventory`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}